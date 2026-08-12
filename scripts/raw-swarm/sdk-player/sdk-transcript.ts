import { Either, Schema } from "effect";

import {
  GitShaSchema,
  ScenarioIdSchema,
  StartedAtSchema,
  sha256Canonical,
} from "../transcript.ts";

export const SDK_PLAYER_OPERATIONS = [
  "discoverBattleActs",
  "resolveBattleRuntimeSubject",
  "resolveBattleRuntimeInterrupt",
  "endBattleRuntimeTurn",
] as const;
export type SdkPlayerOperation = (typeof SDK_PLAYER_OPERATIONS)[number];

export const SDK_SESSION_CONFLICT_MESSAGE =
  "SDK call supplied a stale or foreign battle session.";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
);

const HeaderSchema = Schema.Struct({
  type: Schema.Literal("sdk-player-header"),
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
  consumerIsolation: Schema.Literal(
    "permissionProfile",
    "instructionalFallback",
  ),
  replaySupervisorSha256: HashSchema,
});
const CallCommonFields = {
  type: Schema.Literal("sdk-call"),
  seq: PositiveIntegerSchema,
  continuation: PositiveIntegerSchema,
  operation: Schema.Literal(...SDK_PLAYER_OPERATIONS),
  inputSession: Schema.Unknown,
  inputSessionSha256: HashSchema,
  input: Schema.Unknown,
} as const;
const CallSchema = Schema.Union(
  Schema.Struct({
    ...CallCommonFields,
    outcome: Schema.Literal("returned"),
    outputSession: Schema.Unknown,
    outputSessionSha256: HashSchema,
    result: Schema.Unknown,
    resultSha256: HashSchema,
  }),
  Schema.Struct({
    ...CallCommonFields,
    outcome: Schema.Literal("threw"),
    rejection: Schema.Literal("sessionConflict", "operationFailure"),
    error: Schema.Struct({
      name: Schema.NonEmptyTrimmedString,
      message: Schema.NonEmptyTrimmedString,
    }),
  }),
);

export type SdkTranscriptHeader = Schema.Schema.Type<typeof HeaderSchema>;
export type SdkCallRecord = Schema.Schema.Type<typeof CallSchema>;

export type ParsedSdkTranscript = {
  readonly header: SdkTranscriptHeader;
  readonly calls: readonly SdkCallRecord[];
};

type ParseResult<A> =
  | { readonly tag: "valid"; readonly value: A }
  | { readonly tag: "invalid"; readonly message: string };

export function parseSdkTranscript(
  records: readonly unknown[],
): ParseResult<ParsedSdkTranscript> {
  const [headerInput, ...callInputs] = records;
  const header = Schema.decodeUnknownEither(HeaderSchema, {
    onExcessProperty: "error",
  })(headerInput);
  if (Either.isLeft(header)) {
    return { tag: "invalid", message: "SDK transcript requires one header." };
  }
  const calls = callInputs.map((input) =>
    Schema.decodeUnknownEither(CallSchema, { onExcessProperty: "error" })(
      input,
    ),
  );
  const invalidCall = calls.find(Either.isLeft);
  if (invalidCall !== undefined && Either.isLeft(invalidCall)) {
    return { tag: "invalid", message: "SDK transcript has an invalid call." };
  }
  const decodedCalls = calls.flatMap((call) =>
    Either.isRight(call) ? [call.right] : [],
  );
  let replayCursorSha256: string | undefined;
  for (const [index, call] of decodedCalls.entries()) {
    if (call.seq !== index + 1) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} must equal ${index + 1}.`,
      };
    }
    if (
      call.outcome === "returned" &&
      sha256Canonical(call.result) !== call.resultSha256
    ) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} has a mismatched result hash.`,
      };
    }
    if (
      sha256Canonical(call.inputSession) !== call.inputSessionSha256 ||
      (call.outcome === "returned" &&
        sha256Canonical(call.outputSession) !== call.outputSessionSha256)
    ) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} has a mismatched session hash.`,
      };
    }
    const isRecordedSessionConflict =
      call.outcome === "threw" &&
      call.rejection === "sessionConflict" &&
      call.error.message === SDK_SESSION_CONFLICT_MESSAGE;
    if (
      replayCursorSha256 !== undefined &&
      call.inputSessionSha256 !== replayCursorSha256 &&
      !isRecordedSessionConflict
    ) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} does not continue the prior session.`,
      };
    }
    if (call.outcome === "returned") {
      replayCursorSha256 = call.outputSessionSha256;
    } else if (replayCursorSha256 === undefined && !isRecordedSessionConflict) {
      replayCursorSha256 = call.inputSessionSha256;
    }
    const previousContinuation = decodedCalls[index - 1]?.continuation;
    const continuationIsValid =
      previousContinuation === undefined
        ? call.continuation === 1
        : call.continuation === previousContinuation ||
          call.continuation === previousContinuation + 1;
    if (!continuationIsValid) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} has a noncontiguous continuation id.`,
      };
    }
  }
  return {
    tag: "valid",
    value: {
      header: header.right,
      calls: decodedCalls,
    },
  };
}
