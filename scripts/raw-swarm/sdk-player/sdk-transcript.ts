import { Either, Schema } from "effect";

import {
  GitShaSchema,
  ScenarioIdSchema,
  StartedAtSchema,
  sha256Canonical,
} from "../transcript.ts";
import type { JsonValue } from "./continuation-contract.ts";
import { isJsonValue } from "./json-value.ts";

export const SDK_PLAYER_OPERATIONS = [
  "scenarioRelation",
  "discoverBattleActs",
  "resolveScenarioMovement",
  "resolveBattleRuntimeSubject",
  "resolveBattleRuntimeInterrupt",
  "endBattleRuntimeTurn",
] as const;
export type SdkPlayerOperation = (typeof SDK_PLAYER_OPERATIONS)[number];

export const SDK_SESSION_CONFLICT_MESSAGE =
  "SDK call supplied a stale or foreign scenario session.";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
);

const HeaderCommonFields = {
  type: Schema.Literal("sdk-player-header"),
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
  consumerIsolation: Schema.Literal(
    "permissionProfile",
    "instructionalFallback",
  ),
  replaySupervisorSha256: HashSchema,
  playerRandomSeed: HashSchema,
  scenarioSha256: HashSchema,
  scenarioReviewSha256: HashSchema,
  charactersSha256: HashSchema,
  characterObservation: Schema.Unknown,
} as const;
const ReadyCharacterFields = {
  ...HeaderCommonFields,
  characterOutcome: Schema.Literal("ready"),
  characterSheets: Schema.Unknown,
  characterSheetsSha256: HashSchema,
  setupSha256: HashSchema,
  setupObservation: Schema.Unknown,
} as const;
const HeaderSchema = Schema.Union(
  Schema.Struct({
    ...ReadyCharacterFields,
    setupOutcome: Schema.Literal("ready"),
    initialSession: Schema.Unknown,
    initialSessionSha256: HashSchema,
  }),
  Schema.Struct({
    ...ReadyCharacterFields,
    setupOutcome: Schema.Literal("obstructed"),
    obstruction: Schema.NonEmptyTrimmedString,
  }),
  Schema.Struct({
    ...HeaderCommonFields,
    characterOutcome: Schema.Literal("obstructed"),
    obstruction: Schema.NonEmptyTrimmedString,
  }),
);
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

type SdkTranscriptHeader = Schema.Schema.Type<typeof HeaderSchema>;
export type SdkCallRecord = Schema.Schema.Type<typeof CallSchema>;

type ReadySdkTranscriptHeader = Omit<
  Extract<SdkTranscriptHeader, { readonly setupOutcome: "ready" }>,
  | "characterObservation"
  | "characterSheets"
  | "initialSession"
  | "setupObservation"
> & {
  readonly characterObservation: JsonValue;
  readonly characterSheets: JsonValue;
  readonly initialSession: JsonValue;
  readonly setupObservation: JsonValue;
};

type ObstructedSdkTranscriptHeader = Omit<
  Extract<SdkTranscriptHeader, { readonly setupOutcome: "obstructed" }>,
  "characterObservation" | "characterSheets" | "setupObservation"
> & {
  readonly characterObservation: JsonValue;
  readonly characterSheets: JsonValue;
  readonly setupObservation: JsonValue;
};

type CharacterObstructedSdkTranscriptHeader = Omit<
  Extract<SdkTranscriptHeader, { readonly characterOutcome: "obstructed" }>,
  "characterObservation"
> & { readonly characterObservation: JsonValue };

type ParsedSdkTranscript =
  | {
      readonly header: ReadySdkTranscriptHeader;
      readonly calls: readonly SdkCallRecord[];
    }
  | {
      readonly header: ObstructedSdkTranscriptHeader;
      readonly calls: readonly [];
    }
  | {
      readonly header: CharacterObstructedSdkTranscriptHeader;
      readonly calls: readonly [];
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
  if (!isJsonValue(header.right.characterObservation)) {
    return {
      tag: "invalid",
      message: "SDK transcript header has invalid character evidence.",
    };
  }
  const characterObservation = header.right.characterObservation;
  if (header.right.characterOutcome === "obstructed") {
    return callInputs.length === 0
      ? {
          tag: "valid",
          value: {
            header: { ...header.right, characterObservation },
            calls: [],
          },
        }
      : {
          tag: "invalid",
          message:
            "An obstructed character composition cannot contain player calls.",
        };
  }
  if (
    header.right.setupOutcome === "ready" &&
    (!isJsonValue(header.right.initialSession) ||
      sha256Canonical(header.right.initialSession) !==
        header.right.initialSessionSha256)
  ) {
    return {
      tag: "invalid",
      message: "SDK transcript header has a mismatched initial session hash.",
    };
  }
  const setupObservation = header.right.setupObservation;
  const characterSheets = header.right.characterSheets;
  if (
    !isJsonValue(characterSheets) ||
    sha256Canonical(characterSheets) !== header.right.characterSheetsSha256 ||
    !isJsonValue(setupObservation)
  ) {
    return {
      tag: "invalid",
      message: "SDK transcript header has invalid character or setup evidence.",
    };
  }
  if (header.right.setupOutcome === "obstructed") {
    if (callInputs.length > 0) {
      return {
        tag: "invalid",
        message: "An obstructed SDK setup cannot contain player calls.",
      };
    }
    return {
      tag: "valid",
      value: {
        header: {
          ...header.right,
          characterObservation,
          characterSheets,
          setupObservation,
        },
        calls: [],
      },
    };
  }
  const initialSession = header.right.initialSession;
  if (!isJsonValue(initialSession)) {
    return {
      tag: "invalid",
      message: "SDK transcript header has a non-JSON initial session.",
    };
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
  let replayCursorSha256 =
    header.right.setupOutcome === "ready"
      ? header.right.initialSessionSha256
      : undefined;
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
      header: {
        ...header.right,
        characterObservation,
        characterSheets,
        initialSession,
        setupObservation,
      },
      calls: decodedCalls,
    },
  };
}
