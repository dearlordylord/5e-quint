import type { StatementSync } from "node:sqlite";

import { Result, Schema } from "effect";

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
): Result.Result<
  PlaySessionRepositoryRateAdmission,
  PlaySessionRepositoryIssue
> {
  const { database, statements, accessKeyDigest, nowMs } = input;
  statements.prune.run(nowMs - PLAY_SESSION_RATE_LIMIT_WINDOW_MS);
  const current = statements.select.get(accessKeyDigest);
  if (current === undefined) {
    statements.insert.run(accessKeyDigest, nowMs);
    database.exec("COMMIT");
    return Result.succeed({ tag: "admitted" });
  }
  const decoded = Schema.decodeUnknownResult(
    Schema.Struct({
      window_started_at_ms: Schema.Number.check(
        Schema.isInt(),
        Schema.isGreaterThanOrEqualTo(0),
      ),
      request_count: Schema.Number.check(Schema.isGreaterThan(0)),
    }),
  )(current);
  if (Result.isFailure(decoded)) {
    database.exec("ROLLBACK");
    return Result.fail(invalidStoredRecordIssue(decoded.failure.message));
  }
  const expired =
    nowMs >=
    decoded.success.window_started_at_ms + PLAY_SESSION_RATE_LIMIT_WINDOW_MS;
  if (
    !expired &&
    decoded.success.request_count >= input.maximumRequestsPerWindow
  ) {
    database.exec("COMMIT");
    return Result.succeed({
      tag: "rateExceeded",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (decoded.success.window_started_at_ms +
            PLAY_SESSION_RATE_LIMIT_WINDOW_MS -
            nowMs) /
            1_000,
        ),
      ),
    });
  }
  statements.update.run(
    expired ? nowMs : decoded.success.window_started_at_ms,
    expired ? 1 : decoded.success.request_count + 1,
    accessKeyDigest,
  );
  database.exec("COMMIT");
  return Result.succeed({ tag: "admitted" });
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
): Result.Result<PlaySessionRepositorySaveResult, PlaySessionRepositoryIssue> {
  const result = input.save.run(
    input.tenure.principalId,
    input.tenure.lastActivityAtMs,
    input.record.playSessionId,
    input.record.revision,
    input.tenure.principalId,
    input.maximumSavedSessionsPerPrincipal,
  );
  if (result.changes !== 0) return Result.succeed({ tag: "saved" });
  return resolveSaveConflict(input);
}

export function resolveSaveConflict(
  input: SaveInput,
): Result.Result<PlaySessionRepositorySaveResult, PlaySessionRepositoryIssue> {
  const current = input.select.get(input.record.playSessionId);
  if (current === undefined) return Result.succeed({ tag: "revisionConflict" });
  const decodedCurrent = decodeStoredPlaySessionRecord(
    current,
    input.record.playSessionId,
  );
  if (Result.isFailure(decodedCurrent))
    return Result.fail(decodedCurrent.failure);
  if (
    decodedCurrent.success.revision !== input.record.revision ||
    decodedCurrent.success.tenure.tag !== "guest"
  ) {
    return Result.succeed({ tag: "revisionConflict" });
  }
  const savedRecords = input.listSaved.all(input.tenure.principalId);
  return Result.succeed(
    savedRecords.length >= input.maximumSavedSessionsPerPrincipal
      ? { tag: "savedSessionQuotaExceeded" }
      : { tag: "revisionConflict" },
  );
}

type SavedPlaySessionTenure = Extract<
  StoredPlaySessionTenure,
  { readonly tag: "saved" }
>;
