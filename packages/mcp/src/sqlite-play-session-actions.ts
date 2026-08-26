import type { StatementSync } from "node:sqlite";

import { Either, Schema } from "effect";

import {
  PLAY_SESSION_RATE_LIMIT_WINDOW_MS,
  type EpochMilliseconds,
  type PlaySessionRateLimitKeyDigest,
  type StoredPlaySessionTenure,
} from "./play-session-access.ts";
import {
  decodeStoredPlaySessionRecord,
  invalidStoredRecordIssue,
  type PlaySessionRepositoryIssue,
  type PlaySessionRepositoryRateAdmission,
  type PlaySessionRepositorySaveResult,
  type RecoverablePlaySessionRecord,
} from "./play-session-repository.ts";

export type RateLimitStatements = {
  readonly select: StatementSync;
  readonly insert: StatementSync;
  readonly update: StatementSync;
  readonly prune: StatementSync;
};

export type RateAdmissionInput = {
  readonly database: { exec(sql: string): void };
  readonly statements: RateLimitStatements;
  readonly accessKeyDigest: PlaySessionRateLimitKeyDigest;
  readonly nowMs: EpochMilliseconds;
  readonly maximumRequestsPerWindow: number;
};

export function runRateAdmission(
  input: RateAdmissionInput,
): Either.Either<
  PlaySessionRepositoryRateAdmission,
  PlaySessionRepositoryIssue
> {
  const { database, statements, accessKeyDigest, nowMs } = input;
  statements.prune.run(nowMs - PLAY_SESSION_RATE_LIMIT_WINDOW_MS);
  const current = statements.select.get(accessKeyDigest);
  if (current === undefined) {
    statements.insert.run(accessKeyDigest, nowMs);
    database.exec("COMMIT");
    return Either.right({ tag: "admitted" });
  }
  const decoded = Schema.decodeUnknownEither(
    Schema.Struct({
      window_started_at_ms: Schema.NonNegativeInt,
      request_count: Schema.Positive,
    }),
  )(current);
  if (Either.isLeft(decoded)) {
    database.exec("ROLLBACK");
    return Either.left(invalidStoredRecordIssue(decoded.left.message));
  }
  const expired =
    nowMs >=
    decoded.right.window_started_at_ms + PLAY_SESSION_RATE_LIMIT_WINDOW_MS;
  if (
    !expired &&
    decoded.right.request_count >= input.maximumRequestsPerWindow
  ) {
    database.exec("COMMIT");
    return Either.right({
      tag: "rateExceeded",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (decoded.right.window_started_at_ms +
            PLAY_SESSION_RATE_LIMIT_WINDOW_MS -
            nowMs) /
            1_000,
        ),
      ),
    });
  }
  statements.update.run(
    expired ? nowMs : decoded.right.window_started_at_ms,
    expired ? 1 : decoded.right.request_count + 1,
    accessKeyDigest,
  );
  database.exec("COMMIT");
  return Either.right({ tag: "admitted" });
}

export type SaveInput = {
  readonly save: StatementSync;
  readonly select: StatementSync;
  readonly listSaved: StatementSync;
  readonly record: RecoverablePlaySessionRecord;
  readonly tenure: SavedPlaySessionTenure;
  readonly maximumSavedSessionsPerPrincipal: number;
};

export function runSave(
  input: SaveInput,
): Either.Either<PlaySessionRepositorySaveResult, PlaySessionRepositoryIssue> {
  const result = input.save.run(
    input.tenure.principalId,
    input.tenure.lastActivityAtMs,
    input.record.playSessionId,
    input.record.revision,
    input.tenure.principalId,
    input.maximumSavedSessionsPerPrincipal,
  );
  if (result.changes !== 0) return Either.right({ tag: "saved" });
  return resolveSaveConflict(input);
}

export function resolveSaveConflict(
  input: SaveInput,
): Either.Either<PlaySessionRepositorySaveResult, PlaySessionRepositoryIssue> {
  const current = input.select.get(input.record.playSessionId);
  if (current === undefined) return Either.right({ tag: "revisionConflict" });
  const decodedCurrent = decodeStoredPlaySessionRecord(
    current,
    input.record.playSessionId,
  );
  if (Either.isLeft(decodedCurrent)) return Either.left(decodedCurrent.left);
  if (
    decodedCurrent.right.revision !== input.record.revision ||
    decodedCurrent.right.tenure.tag !== "guest"
  ) {
    return Either.right({ tag: "revisionConflict" });
  }
  const savedRecords = input.listSaved.all(input.tenure.principalId);
  return Either.right(
    savedRecords.length >= input.maximumSavedSessionsPerPrincipal
      ? { tag: "savedSessionQuotaExceeded" }
      : { tag: "revisionConflict" },
  );
}

type SavedPlaySessionTenure = Extract<
  StoredPlaySessionTenure,
  { readonly tag: "saved" }
>;
