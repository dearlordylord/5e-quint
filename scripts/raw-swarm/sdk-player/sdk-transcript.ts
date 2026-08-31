import { Result, Schema } from "effect";

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

function sdkOperationPublishesBattleEnvelope(
  operation: SdkPlayerOperation,
): boolean {
  return operation !== "scenarioRelation" && operation !== "discoverBattleActs";
}

export type BattleEnvelopeSessionIdentityCheck = {
  /** Whether the session's current actor must match the checkpoint actor. */
  readonly kind: "battleOnly" | "battleAndCurrentActor";
};

const HashSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[0-9a-f]{64}$/)),
);
const PositiveIntegerSchema = Schema.Number.pipe(
  Schema.check(Schema.isInt()),
  Schema.check(Schema.isGreaterThan(0)),
);

const HeaderCommonFields = {
  type: Schema.Literal("sdk-player-header"),
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  startedAt: StartedAtSchema,
  consumerIsolation: Schema.Literals([
    "permissionProfile",
    "instructionalFallback",
  ]),
  replaySupervisorSha256: HashSchema,
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
export const SdkPlayerTranscriptHeaderSchema = Schema.Union([
  Schema.Struct({
    ...ReadyCharacterFields,
    setupOutcome: Schema.Literal("ready"),
    initialSession: Schema.Unknown,
    initialSessionSha256: HashSchema,
    initialTurnProjection: Schema.Unknown,
    initialTurnProjectionSha256: HashSchema,
  }),
  Schema.Struct({
    ...ReadyCharacterFields,
    setupOutcome: Schema.Literal("ready"),
    initialSession: Schema.Unknown,
    initialSessionSha256: HashSchema,
    initialTurnProjection: Schema.optionalKey(Schema.Never),
    initialTurnProjectionSha256: Schema.optionalKey(Schema.Never),
  }),
  Schema.Struct({
    ...ReadyCharacterFields,
    setupOutcome: Schema.Literal("obstructed"),
    obstruction: Schema.Trimmed.check(Schema.isNonEmpty()),
  }),
  Schema.Struct({
    ...HeaderCommonFields,
    characterOutcome: Schema.Literal("obstructed"),
    obstruction: Schema.Trimmed.check(Schema.isNonEmpty()),
  }),
]);
const CallCommonFields = {
  type: Schema.Literal("sdk-call"),
  seq: PositiveIntegerSchema,
  continuation: PositiveIntegerSchema,
  operation: Schema.Literals(SDK_PLAYER_OPERATIONS),
  inputSession: Schema.Unknown,
  inputSessionSha256: HashSchema,
  input: Schema.Unknown,
} as const;
const CallSchema = Schema.Union([
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
    rejection: Schema.Literals(["sessionConflict", "operationFailure"]),
    error: Schema.Struct({
      name: Schema.Trimmed.check(Schema.isNonEmpty()),
      message: Schema.Trimmed.check(Schema.isNonEmpty()),
    }),
  }),
]);

type SdkTranscriptHeader = Schema.Schema.Type<
  typeof SdkPlayerTranscriptHeaderSchema
>;
export type SdkCallRecord = Schema.Schema.Type<typeof CallSchema>;

export type ReadySdkTranscriptHeader = Omit<
  Extract<SdkTranscriptHeader, { readonly setupOutcome: "ready" }>,
  | "characterObservation"
  | "characterSheets"
  | "initialSession"
  | "initialTurnProjection"
  | "setupObservation"
> & {
  readonly characterObservation: JsonValue;
  readonly characterSheets: JsonValue;
  readonly initialSession: JsonValue;
  readonly setupObservation: JsonValue;
} & (
    | {
        readonly initialTurnProjection: JsonValue;
        readonly initialTurnProjectionSha256: string;
      }
    | {
        readonly initialTurnProjection?: never;
        readonly initialTurnProjectionSha256?: never;
      }
  );

export type SdkInitialTurnProjectionEvidence =
  | {
      readonly kind: "recorded";
      readonly projection: JsonValue;
      readonly sha256: string;
    }
  | { readonly kind: "notRecorded" };

export function sdkInitialTurnProjectionEvidence(
  header: ReadySdkTranscriptHeader,
): SdkInitialTurnProjectionEvidence {
  return "initialTurnProjection" in header &&
    header.initialTurnProjection !== undefined &&
    header.initialTurnProjectionSha256 !== undefined
    ? {
        kind: "recorded",
        projection: header.initialTurnProjection,
        sha256: header.initialTurnProjectionSha256,
      }
    : { kind: "notRecorded" };
}

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

/**
 * Correlate the identity carried by a runtime envelope with a serialized
 * scenario session. Battle ids must always agree; callers may defer the
 * current-actor comparison when checking a pre-resolution session because a
 * successful operation can advance the turn.
 */
export function battleEnvelopeMatchesSessionIdentity(
  envelope: unknown,
  session: unknown,
  check: BattleEnvelopeSessionIdentityCheck = {
    kind: "battleAndCurrentActor",
  },
): boolean {
  if (!isJsonObject(envelope) || !isJsonObject(envelope.checkpoint)) {
    return false;
  }
  const checkpoint = envelope.checkpoint;
  const checkpointBattleId = checkpoint.battleId;
  const checkpointCurrentActorId = checkpoint.currentActorId;
  if (
    typeof checkpointBattleId !== "string" ||
    typeof checkpointCurrentActorId !== "string"
  ) {
    return false;
  }
  const state = jsonObjectAt(session, ["battle", "state"]);
  if (!isJsonObject(state) || typeof state.battleId !== "string") {
    return false;
  }
  if (state.battleId !== checkpointBattleId) {
    return false;
  }
  if (check.kind === "battleOnly") {
    return true;
  }
  const initiative = jsonObjectAt(state, ["initiative"]);
  const stillToAct = initiative?.stillToAct;
  const currentActor = Array.isArray(stillToAct) ? stillToAct[0] : undefined;
  return (
    isJsonObject(currentActor) &&
    typeof currentActor.creature === "string" &&
    currentActor.creature === checkpointCurrentActorId
  );
}

function jsonObjectAt(
  value: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> | undefined {
  let cursor: unknown = value;
  for (const key of keys) {
    if (!isJsonObject(cursor)) return undefined;
    cursor = cursor[key];
  }
  return isJsonObject(cursor) ? cursor : undefined;
}

function isJsonObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSdkCallSequence(input: {
  readonly records: readonly unknown[];
  readonly initialSessionSha256: string;
}): ParseResult<readonly SdkCallRecord[]> {
  const calls = input.records.map((record) =>
    Schema.decodeUnknownResult(CallSchema, { onExcessProperty: "error" })(
      record,
    ),
  );
  const invalidCall = calls.find(Result.isFailure);
  if (invalidCall !== undefined && Result.isFailure(invalidCall)) {
    return { tag: "invalid", message: "SDK transcript has an invalid call." };
  }
  const decodedCalls = calls.flatMap((call) =>
    Result.isSuccess(call) ? [call.success] : [],
  );
  let replayCursorSha256 = input.initialSessionSha256;
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
    if (
      call.outcome === "returned" &&
      sdkOperationPublishesBattleEnvelope(call.operation) &&
      isJsonObject(call.result) &&
      isJsonObject(call.result.envelope) &&
      (!battleEnvelopeMatchesSessionIdentity(
        call.result.envelope,
        call.inputSession,
        { kind: "battleOnly" },
      ) ||
        !battleEnvelopeMatchesSessionIdentity(
          call.result.envelope,
          call.outputSession,
        ))
    ) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} has a Battle envelope/session identity mismatch.`,
      };
    }
    const isRecordedSessionConflict =
      call.outcome === "threw" &&
      call.rejection === "sessionConflict" &&
      call.error.message === SDK_SESSION_CONFLICT_MESSAGE;
    if (
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
    }
    const previousContinuation = decodedCalls[index - 1]?.continuation;
    if (
      previousContinuation !== undefined &&
      call.continuation < previousContinuation
    ) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} has an out-of-order continuation id.`,
      };
    }
  }
  return { tag: "valid", value: decodedCalls };
}

export function parseSdkTranscript(
  records: readonly unknown[],
): ParseResult<ParsedSdkTranscript> {
  const [headerInput, ...callInputs] = records;
  const header = Schema.decodeUnknownResult(SdkPlayerTranscriptHeaderSchema, {
    onExcessProperty: "error",
  })(headerInput);
  if (Result.isFailure(header)) {
    return { tag: "invalid", message: "SDK transcript requires one header." };
  }
  if (!isJsonValue(header.success.characterObservation)) {
    return {
      tag: "invalid",
      message: "SDK transcript header has invalid character evidence.",
    };
  }
  const characterObservation = header.success.characterObservation;
  if (header.success.characterOutcome === "obstructed") {
    return callInputs.length === 0
      ? {
          tag: "valid",
          value: {
            header: { ...header.success, characterObservation },
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
    header.success.setupOutcome === "ready" &&
    (!isJsonValue(header.success.initialSession) ||
      sha256Canonical(header.success.initialSession) !==
        header.success.initialSessionSha256 ||
      ("initialTurnProjection" in header.success &&
        (!isJsonValue(header.success.initialTurnProjection) ||
          sha256Canonical(header.success.initialTurnProjection) !==
            header.success.initialTurnProjectionSha256)))
  ) {
    return {
      tag: "invalid",
      message:
        "SDK transcript header has mismatched initial session or recorded turn projection evidence.",
    };
  }
  const setupObservation = header.success.setupObservation;
  const characterSheets = header.success.characterSheets;
  if (
    !isJsonValue(characterSheets) ||
    sha256Canonical(characterSheets) !== header.success.characterSheetsSha256 ||
    !isJsonValue(setupObservation)
  ) {
    return {
      tag: "invalid",
      message: "SDK transcript header has invalid character or setup evidence.",
    };
  }
  if (header.success.setupOutcome === "obstructed") {
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
          ...header.success,
          characterObservation,
          characterSheets,
          setupObservation,
        },
        calls: [],
      },
    };
  }
  const initialSession = header.success.initialSession;
  if (!isJsonValue(initialSession)) {
    return {
      tag: "invalid",
      message: "SDK transcript header has a non-JSON initial session.",
    };
  }
  const calls = parseSdkCallSequence({
    records: callInputs,
    initialSessionSha256: header.success.initialSessionSha256,
  });
  if (calls.tag === "invalid") return calls;
  const {
    initialTurnProjection: _initialTurnProjection,
    initialTurnProjectionSha256: _initialTurnProjectionSha256,
    ...rawReadyHeaderCommon
  } = header.success;
  const commonReadyHeader = {
    ...rawReadyHeaderCommon,
    characterObservation,
    characterSheets,
    initialSession,
    setupObservation,
  };
  if (
    "initialTurnProjection" in header.success &&
    typeof header.success.initialTurnProjectionSha256 === "string"
  ) {
    const initialTurnProjection = header.success.initialTurnProjection;
    if (!isJsonValue(initialTurnProjection)) {
      return {
        tag: "invalid",
        message: "SDK transcript header has a non-JSON turn projection.",
      };
    }
    return {
      tag: "valid",
      value: {
        header: {
          ...commonReadyHeader,
          initialTurnProjection,
          initialTurnProjectionSha256:
            header.success.initialTurnProjectionSha256,
        },
        calls: calls.value,
      },
    };
  }
  return {
    tag: "valid",
    value: {
      header: commonReadyHeader,
      calls: calls.value,
    },
  };
}
