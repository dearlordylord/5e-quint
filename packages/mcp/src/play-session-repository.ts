import { Either, Schema } from "effect";

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

const RecoverableStateOperationNameSchema = Schema.Literal(
  ...CHARACTER_TOOL_NAMES,
  ...BATTLE_TOOL_NAMES,
);
const RecoverablePlaySessionOperationsSchema = Schema.Array(
  Schema.Union(
    Schema.Struct({
      name: RecoverableStateOperationNameSchema,
      args: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    }),
    Schema.Struct({
      name: Schema.Literal(diceToolNames.rollDice),
      args: RollDiceArgsSchema,
    }),
  ),
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
  revision: Schema.NonNegativeInt,
  operations_json: Schema.String,
  tenure_kind: Schema.Literal("guest", "saved"),
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
  ): Either.Either<
    PlaySessionRepositoryCreateResult,
    PlaySessionRepositoryIssue
  >;
  load(
    playSessionId: PlaySessionId,
  ): Either.Either<PlaySessionRepositoryLoadResult, PlaySessionRepositoryIssue>;
  commit(
    record: RecoverablePlaySessionRecord,
    change: PlaySessionRepositoryCommit,
  ): Either.Either<
    PlaySessionRepositoryAppendResult,
    PlaySessionRepositoryIssue
  >;
  save(
    record: RecoverablePlaySessionRecord,
    tenure: Extract<StoredPlaySessionTenure, { tag: "saved" }>,
    maximumSavedSessionsPerPrincipal: number,
  ): Either.Either<PlaySessionRepositorySaveResult, PlaySessionRepositoryIssue>;
  listSaved(
    principalId: PrincipalId,
  ): Either.Either<
    readonly RecoverablePlaySessionRecord[],
    PlaySessionRepositoryIssue
  >;
  delete(
    playSessionId: PlaySessionId,
    revision: number,
  ): Either.Either<boolean, PlaySessionRepositoryIssue>;
  pruneGuestPressure(
    nowMs: EpochMilliseconds,
    maximumGuestSessions: number,
  ): Either.Either<void, PlaySessionRepositoryIssue>;
  pruneExpired(
    nowMs: EpochMilliseconds,
  ): Either.Either<void, PlaySessionRepositoryIssue>;
  admitRequest(
    accessKeyDigest: PlaySessionRateLimitKeyDigest,
    nowMs: EpochMilliseconds,
    maximumRequestsPerWindow: number,
  ): Either.Either<
    PlaySessionRepositoryRateAdmission,
    PlaySessionRepositoryIssue
  >;
  close(): void;
};

export function decodeStoredPlaySessionRecord(
  row: unknown,
  playSessionId: PlaySessionId,
): Either.Either<RecoverablePlaySessionRecord, PlaySessionRepositoryIssue> {
  const decodedRow = Schema.decodeUnknownEither(StoredPlaySessionRowSchema)(
    row,
  );
  if (Either.isLeft(decodedRow)) {
    return Either.left(invalidStoredRecordIssue(decodedRow.left.message));
  }
  let parsedOperations: unknown;
  try {
    parsedOperations = JSON.parse(decodedRow.right.operations_json);
  } catch (cause) {
    return Either.left(invalidStoredRecordIssue(String(cause)));
  }
  const decodedOperations = Schema.decodeUnknownEither(
    RecoverablePlaySessionOperationsSchema,
  )(parsedOperations);
  if (Either.isLeft(decodedOperations)) {
    return Either.left(
      invalidStoredRecordIssue(decodedOperations.left.message),
    );
  }
  const tenure = decodeStoredTenure(decodedRow.right);
  if (Either.isLeft(tenure)) return Either.left(tenure.left);
  const diceSeed = decodeDiceSeed(
    splitStoredDiceSeed(decodedRow.right.dice_seed),
  );
  if (Either.isLeft(diceSeed)) {
    return Either.left(invalidStoredRecordIssue(diceSeed.left.message));
  }
  return Either.right({
    playSessionId,
    formatVersion: decodedRow.right.format_version,
    diceReplay: {
      seed: diceSeed.right,
      randomSource: DICE_RANDOM_SOURCE,
    },
    revision: decodedRow.right.revision,
    operations: decodedOperations.right,
    tenure: tenure.right,
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
): Either.Either<StoredPlaySessionTenure, PlaySessionRepositoryIssue> {
  if (
    row.tenure_kind === "guest" &&
    row.guest_access_grant_digest !== null &&
    row.principal_id === null
  ) {
    return Either.right({
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
    return Either.mapLeft(principalId, invalidStoredRecordIssue).pipe(
      Either.map((decodedPrincipalId) => ({
        tag: "saved" as const,
        principalId: decodedPrincipalId,
        lastActivityAtMs: row.last_activity_at_ms,
      })),
    );
  }
  return Either.left(
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
