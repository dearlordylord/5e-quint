import { Either, Schema } from "effect";

export const PLAYER_CONTINUATION_LIMIT = 128;

export const PlayerExecutionObstructionSchema = Schema.Struct({
  kind: Schema.Literal("continuationLimit"),
  limit: Schema.Literal(PLAYER_CONTINUATION_LIMIT),
  message: Schema.NonEmptyTrimmedString,
});
export type PlayerExecutionObstruction = Schema.Schema.Type<
  typeof PlayerExecutionObstructionSchema
>;

export const PlayerExecutionStateSchema = Schema.Union(
  Schema.Struct({ kind: Schema.Literal("active") }),
  Schema.Struct({
    kind: Schema.Literal("playerConcluded"),
    conclusion: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    kind: Schema.Literal("playerObstructed"),
    obstruction: PlayerExecutionObstructionSchema,
  }),
);
export type PlayerExecutionState = Schema.Schema.Type<
  typeof PlayerExecutionStateSchema
>;

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));

const PlayerContinuationObservationSchema = Schema.Struct({
  transcriptHeaderSha256: HashSchema,
  continuation: Schema.Number.pipe(Schema.int(), Schema.greaterThan(0)),
  kind: Schema.Union(
    Schema.Literal("continue"),
    Schema.Literal("playerConcluded"),
    Schema.Literal("executionError"),
  ),
});

export type PlayerContinuationEvidence =
  | {
      readonly tag: "valid";
      readonly recordedContinuations: number;
      readonly lastContinuation: number | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

export function playerContinuationEvidence(input: {
  readonly transcriptHeaderSha256: string;
  readonly observations: readonly unknown[];
  readonly callContinuations: readonly number[];
}): PlayerContinuationEvidence {
  const observations = Schema.decodeUnknownEither(
    Schema.Array(PlayerContinuationObservationSchema),
  )(input.observations);
  if (Either.isLeft(observations)) {
    return { tag: "invalid", message: observations.left.message };
  }
  const continuationNumbers = observations.right.map(
    ({ continuation }) => continuation,
  );
  const continuationsWithCalls = new Set(input.callContinuations);
  if (
    observations.right.some(
      ({ transcriptHeaderSha256 }) =>
        transcriptHeaderSha256 !== input.transcriptHeaderSha256,
    ) ||
    continuationNumbers.some(
      (continuation, index) => continuation !== index + 1,
    ) ||
    input.callContinuations.some(
      (continuation) => !continuationNumbers.includes(continuation),
    ) ||
    observations.right.some(
      ({ continuation, kind }) =>
        kind !== "executionError" && !continuationsWithCalls.has(continuation),
    )
  ) {
    return {
      tag: "invalid",
      message: "Player continuation evidence is inconsistent.",
    };
  }
  return {
    tag: "valid",
    recordedContinuations: continuationNumbers.length,
    lastContinuation: continuationNumbers.at(-1),
  };
}

export type PlayerContinuationAdmission =
  | { readonly tag: "admitted" }
  | {
      readonly tag: "limitReached";
      readonly limit: typeof PLAYER_CONTINUATION_LIMIT;
    };

export function playerContinuationAdmission(
  completedContinuations: number,
): PlayerContinuationAdmission {
  return completedContinuations < PLAYER_CONTINUATION_LIMIT
    ? { tag: "admitted" }
    : { tag: "limitReached", limit: PLAYER_CONTINUATION_LIMIT };
}

export function playerInvocationNumberFromEventsArtifact(
  name: string,
): number | undefined {
  const match = /^player-invocation-(\d+)\.events\.jsonl$/.exec(name);
  if (match === null) return undefined;
  const invocation = Number(match[1]);
  return Number.isInteger(invocation) && invocation > 0
    ? invocation
    : undefined;
}

export type PlayerEvidenceState =
  | {
      readonly tag: "active";
      readonly recordedContinuations: number;
    }
  | {
      readonly tag: "concluded";
      readonly recordedContinuations: number;
    }
  | {
      readonly tag: "obstructed";
      readonly recordedContinuations: number;
      readonly obstruction: PlayerExecutionObstruction;
    };
