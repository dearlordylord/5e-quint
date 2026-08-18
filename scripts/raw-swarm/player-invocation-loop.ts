import { Either, Match, Schema } from "effect";

export const PLAYER_INVOCATION_LIMIT = 128;
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

export type PlayerInvocationArtifactNames = {
  readonly events: string;
  readonly log: string;
  readonly finalMessage: string;
};

export function playerInvocationArtifactNames(
  invocation: number,
): PlayerInvocationArtifactNames {
  const stem = `player-invocation-${String(invocation).padStart(4, "0")}`;
  return {
    events: `${stem}.events.jsonl`,
    log: `${stem}.log`,
    finalMessage: `${stem}.final.txt`,
  };
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
    };

export type PlayerInvocationExit =
  | { readonly tag: "completed" }
  | { readonly tag: "exitedWithFailure"; readonly status: number }
  | { readonly tag: "signaled"; readonly signal: string }
  | { readonly tag: "failedToStart"; readonly message: string };

type PlayerInvocationFailure = Exclude<
  PlayerInvocationExit,
  { readonly tag: "completed" }
>;

export type PlayerInvocationLoopResult =
  | { readonly tag: "concluded"; readonly invocationCount: number }
  | {
      readonly tag: "invocationFailed";
      readonly invocation: number;
      readonly exit: PlayerInvocationFailure;
    }
  | { readonly tag: "noProgress"; readonly invocation: number }
  | {
      readonly tag: "multipleContinuationsRecorded";
      readonly invocation: number;
      readonly recordedContinuations: number;
    }
  | { readonly tag: "invocationLimitReached"; readonly limit: number };

export function runPlayerInvocationLoop(input: {
  readonly evidenceState: () => PlayerEvidenceState;
  readonly invoke: (invocation: number) => PlayerInvocationExit;
  readonly invocationLimit?: number;
}): PlayerInvocationLoopResult {
  const invocationLimit = input.invocationLimit ?? PLAYER_INVOCATION_LIMIT;
  for (let invocation = 1; invocation <= invocationLimit; invocation += 1) {
    const before = input.evidenceState();
    const alreadyConcluded = Match.value(before).pipe(
      Match.when({ tag: "concluded" }, () => true),
      Match.when({ tag: "active" }, () => false),
      Match.exhaustive,
    );
    if (alreadyConcluded)
      return { tag: "concluded", invocationCount: invocation - 1 };
    const exit = input.invoke(invocation);
    const after = input.evidenceState();
    const recordedContinuations =
      after.recordedContinuations - before.recordedContinuations;
    if (recordedContinuations === 0) {
      return Match.value(exit).pipe(
        Match.when(
          { tag: "completed" },
          (): PlayerInvocationLoopResult => ({ tag: "noProgress", invocation }),
        ),
        Match.when(
          { tag: "exitedWithFailure" },
          (failure): PlayerInvocationLoopResult => ({
            tag: "invocationFailed",
            invocation,
            exit: failure,
          }),
        ),
        Match.when(
          { tag: "signaled" },
          (failure): PlayerInvocationLoopResult => ({
            tag: "invocationFailed",
            invocation,
            exit: failure,
          }),
        ),
        Match.when(
          { tag: "failedToStart" },
          (failure): PlayerInvocationLoopResult => ({
            tag: "invocationFailed",
            invocation,
            exit: failure,
          }),
        ),
        Match.exhaustive,
      );
    }
    if (recordedContinuations !== 1) {
      return {
        tag: "multipleContinuationsRecorded",
        invocation,
        recordedContinuations,
      };
    }
    const concluded = Match.value(after).pipe(
      Match.when({ tag: "concluded" }, () => true),
      Match.when({ tag: "active" }, () => false),
      Match.exhaustive,
    );
    if (concluded) {
      return { tag: "concluded", invocationCount: invocation };
    }
  }
  return { tag: "invocationLimitReached", limit: invocationLimit };
}
