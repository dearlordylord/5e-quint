import { Result, Schema } from "effect";

import { BATTLE_TOOL_NAMES } from "./battle-tool-input.ts";
import { CHARACTER_TOOL_NAMES } from "./character-tool-input.ts";
import { RollDiceArgsSchema, diceToolNames } from "./dice-tool-input.ts";
import { type PlaySessionCommand, type PlaySessionId } from "./play-session.ts";
import {
  DICE_RANDOM_SOURCE,
  decodeDiceSeed,
  type DiceSeed,
} from "./dice-sampling-service.ts";
import {
  GuestAccessGrantDigestSchema,
  EpochMillisecondsSchema,
  decodePrincipalId,
  type EpochMilliseconds,
  type PlaySessionRateLimitKeyDigest,
  type PrincipalId,
  type StoredPlaySessionTenure,
} from "./play-session-access.ts";

export const RECOVERABLE_PLAY_SESSION_FORMAT_VERSION = 3 as const;

const RecoverableStateOperationNameSchema = Schema.Literals([
  ...CHARACTER_TOOL_NAMES,
  ...BATTLE_TOOL_NAMES,
]);
const RecoverablePlaySessionOperationsSchema = Schema.Array(
  Schema.Union([
    Schema.Struct({
      name: RecoverableStateOperationNameSchema,
      args: Schema.Record(Schema.String, Schema.Unknown),
    }),
    Schema.Struct({
      name: Schema.Literal(diceToolNames.rollDice),
      args: RollDiceArgsSchema,
    }),
  ]),
);
const StoredDiceSeedSchema = Schema.String.pipe(
  Schema.pattern(/^[0-9a-f]{32}$/u),
);
const StoredPlaySessionRowSchema = Schema.Struct({
  format_version: Schema.Literal(RECOVERABLE_PLAY_SESSION_FORMAT_VERSION),
  dice_seed: StoredDiceSeedSchema,
  dice_group_semantic_profile: Schema.Literal(
    DICE_RANDOM_SOURCE.diceGroupSemanticProfile,
  ),
  prng_sequence_profile: Schema.Literal(DICE_RANDOM_SOURCE.prngSequenceProfile),
  state_schema_version: Schema.Literal(DICE_RANDOM_SOURCE.stateSchemaVersion),
  revision: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0),
  ),
  operations_json: Schema.String,
  tenure_kind: Schema.Literals(["guest", "saved"]),
  guest_access_grant_digest: Schema.NullOr(GuestAccessGrantDigestSchema),
  principal_id: Schema.NullOr(Schema.String),
  last_activity_at_ms: EpochMillisecondsSchema,
});

export type PlaySessionDiceReplay = {
  readonly seed: DiceSeed;
  readonly randomSource: typeof DICE_RANDOM_SOURCE;
};
export type RecoverablePlaySessionRecord = {
  readonly playSessionId: PlaySessionId;
  readonly formatVersion: typeof RECOVERABLE_PLAY_SESSION_FORMAT_VERSION;
  readonly diceReplay: PlaySessionDiceReplay;
  readonly revision: number;
  readonly operations: readonly PlaySessionCommand[];
  readonly tenure: StoredPlaySessionTenure;
};

export type PlaySessionRepositoryIssue = {
  readonly tag: "playSessionRepositoryIssue";
  readonly reason: "unreadable" | "invalidStoredRecord" | "closed";
  readonly message: string;
};
export type PlaySessionRepositoryCreateResult =
  | { readonly tag: "created" }
  | { readonly tag: "playSessionIdCollision" }
  | { readonly tag: "playSessionLimitExceeded" };
export type PlaySessionRepositoryLoadResult =
  | { readonly tag: "found"; readonly record: RecoverablePlaySessionRecord }
  | { readonly tag: "absent" };
export type PlaySessionRepositoryAppendResult =
  | { readonly tag: "committed" }
  | { readonly tag: "revisionConflict" };
export type PlaySessionRepositorySaveResult =
  | { readonly tag: "saved" }
  | { readonly tag: "revisionConflict" }
  | { readonly tag: "savedSessionQuotaExceeded" };
export type PlaySessionRepositoryCommit = {
  readonly tenure: StoredPlaySessionTenure;
  readonly operation?: PlaySessionCommand;
};
export type PlaySessionRepositoryRateAdmission =
  | { readonly tag: "admitted" }
  | { readonly tag: "rateExceeded"; readonly retryAfterSeconds: number };

export type PlaySessionRepository = {
  create(
    record: RecoverablePlaySessionRecord,
    limits: {
      readonly maximumGuestSessions: number;
      readonly maximumSavedSessionsPerPrincipal: number;
    },
  ): Result.Result<
    PlaySessionRepositoryCreateResult,
    PlaySessionRepositoryIssue
  >;
  load(
    playSessionId: PlaySessionId,
  ): Result.Result<PlaySessionRepositoryLoadResult, PlaySessionRepositoryIssue>;
  commit(
    record: RecoverablePlaySessionRecord,
    change: PlaySessionRepositoryCommit,
  ): Result.Result<
    PlaySessionRepositoryAppendResult,
    PlaySessionRepositoryIssue
  >;
  save(
    record: RecoverablePlaySessionRecord,
    tenure: Extract<StoredPlaySessionTenure, { tag: "saved" }>,
    maximumSavedSessionsPerPrincipal: number,
  ): Result.Result<PlaySessionRepositorySaveResult, PlaySessionRepositoryIssue>;
  listSaved(
    principalId: PrincipalId,
  ): Result.Result<
    readonly RecoverablePlaySessionRecord[],
    PlaySessionRepositoryIssue
  >;
  delete(
    playSessionId: PlaySessionId,
    revision: number,
  ): Result.Result<boolean, PlaySessionRepositoryIssue>;
  pruneGuestPressure(
    nowMs: EpochMilliseconds,
    maximumGuestSessions: number,
  ): Result.Result<void, PlaySessionRepositoryIssue>;
  pruneExpired(
    nowMs: EpochMilliseconds,
  ): Result.Result<void, PlaySessionRepositoryIssue>;
  admitRequest(
    accessKeyDigest: PlaySessionRateLimitKeyDigest,
    nowMs: EpochMilliseconds,
    maximumRequestsPerWindow: number,
  ): Result.Result<
    PlaySessionRepositoryRateAdmission,
    PlaySessionRepositoryIssue
  >;
  close(): void;
};

export function decodeStoredPlaySessionRecord(
  row: unknown,
  playSessionId: PlaySessionId,
): Result.Result<RecoverablePlaySessionRecord, PlaySessionRepositoryIssue> {
  const decodedRow = Schema.decodeUnknownResult(StoredPlaySessionRowSchema)(
    row,
  );
  if (Result.isFailure(decodedRow)) {
    return Result.fail(invalidStoredRecordIssue(decodedRow.failure.message));
  }
  let parsedOperations: unknown;
  try {
    parsedOperations = JSON.parse(decodedRow.success.operations_json);
  } catch (cause) {
    return Result.fail(invalidStoredRecordIssue(String(cause)));
  }
  const decodedOperations = Schema.decodeUnknownResult(
    RecoverablePlaySessionOperationsSchema,
  )(parsedOperations);
  if (Result.isFailure(decodedOperations)) {
    return Result.fail(
      invalidStoredRecordIssue(decodedOperations.failure.message),
    );
  }
  const tenure = decodeStoredTenure(decodedRow.success);
  if (Result.isFailure(tenure)) return Result.fail(tenure.failure);
  const diceSeed = decodeDiceSeed(
    splitStoredDiceSeed(decodedRow.success.dice_seed),
  );
  if (Result.isFailure(diceSeed)) {
    return Result.fail(invalidStoredRecordIssue(diceSeed.failure.message));
  }
  return Result.succeed({
    playSessionId,
    formatVersion: decodedRow.success.format_version,
    diceReplay: {
      seed: diceSeed.success,
      randomSource: DICE_RANDOM_SOURCE,
    },
    revision: decodedRow.success.revision,
    operations: decodedOperations.success,
    tenure: tenure.success,
  });
}

function splitStoredDiceSeed(seed: string) {
  return [
    seed.slice(0, 8),
    seed.slice(8, 16),
    seed.slice(16, 24),
    seed.slice(24, 32),
  ];
}

function decodeStoredTenure(
  row: typeof StoredPlaySessionRowSchema.Type,
): Result.Result<StoredPlaySessionTenure, PlaySessionRepositoryIssue> {
  if (
    row.tenure_kind === "guest" &&
    row.guest_access_grant_digest !== null &&
    row.principal_id === null
  ) {
    return Result.succeed({
      tag: "guest",
      guestAccessGrantDigest: row.guest_access_grant_digest,
      lastActivityAtMs: row.last_activity_at_ms,
    });
  }
  if (
    row.tenure_kind === "saved" &&
    row.guest_access_grant_digest === null &&
    row.principal_id !== null
  ) {
    const principalId = decodePrincipalId(row.principal_id);
    return Result.mapError(principalId, invalidStoredRecordIssue).pipe(
      Result.map((decodedPrincipalId) => ({
        tag: "saved" as const,
        principalId: decodedPrincipalId,
        lastActivityAtMs: row.last_activity_at_ms,
      })),
    );
  }
  return Result.fail(
    invalidStoredRecordIssue("Stored Play Session tenure is contradictory."),
  );
}

export function closedRepositoryIssue(): PlaySessionRepositoryIssue {
  return {
    tag: "playSessionRepositoryIssue",
    reason: "closed",
    message: "The Play Session repository is closed.",
  };
}

export function unreadableRepositoryIssue(
  cause: unknown,
): PlaySessionRepositoryIssue {
  return {
    tag: "playSessionRepositoryIssue",
    reason: "unreadable",
    message: cause instanceof Error ? cause.message : String(cause),
  };
}

export function invalidStoredRecordIssue(
  message: string,
): PlaySessionRepositoryIssue {
  return {
    tag: "playSessionRepositoryIssue",
    reason: "invalidStoredRecord",
    message,
  };
}
