import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";

import { Match } from "effect";

import {
  canonicalJson,
  repoRoot,
  type GitSha,
  type ScenarioId,
} from "../transcript.ts";
import {
  parseSdkTranscript,
  type SdkCallRecord,
  type SdkPlayerOperation,
} from "./sdk-transcript.ts";
import type { JsonValue } from "./continuation-contract.ts";
import { isJsonValue } from "./json-value.ts";

export const SDK_AUDIT_SCHEMA_VERSION = 1;
export const SDK_AUDIT_REVIEW_FACTS_MAX_BYTES = 16 * 1024;

const REVIEW_DIRECTIONS = [
  "same-horizontal-position",
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const;
type ReviewDirection = (typeof REVIEW_DIRECTIONS)[number];
const REVIEW_COVER = ["none", "half", "threeQuarters", "total"] as const;
type ReviewCover = (typeof REVIEW_COVER)[number];
const REVIEW_TRAVERSAL = ["open", "blocked"] as const;
type ReviewTraversal = (typeof REVIEW_TRAVERSAL)[number];

type SdkReviewHole = {
  readonly kind: string;
  readonly label?: string;
  readonly occurrence?: number;
  readonly choiceCount?: number;
};

type SdkReviewActKind = {
  readonly subject: {
    readonly tag: string;
    readonly action?: string;
    readonly command?: string;
    readonly mode?: string;
  };
  readonly count: number;
};

type SdkReviewRelation =
  | {
      readonly tag: "relation";
      readonly source: string;
      readonly target: string;
      readonly direction: ReviewDirection;
      readonly distanceFeet: number;
      readonly attackerCanSeeTarget: boolean;
      readonly cover: ReviewCover;
      readonly traversal: ReviewTraversal;
    }
  | {
      readonly tag: "unknown-token";
      readonly tokenId: string;
    };

const SDK_REVIEW_RESOLUTION_TAGS = [
  "resolved",
  "needsHoles",
  "invalid",
  "scenarioSessionConflict",
  "scenarioMovementRejected",
] as const;

type SdkReviewResolutionFactsBase = {
  readonly kind: "resolution";
  readonly holes: readonly SdkReviewHole[];
  readonly objectDamageCount: number;
  readonly movementCount: number;
};

type SdkReviewResolutionFacts =
  | (SdkReviewResolutionFactsBase & {
      readonly tag: "resolved";
      readonly reason?: never;
      readonly message?: never;
      readonly issueTag?: never;
    })
  | (SdkReviewResolutionFactsBase & {
      readonly tag: "needsHoles";
      readonly reason?: never;
      readonly message?: never;
      readonly issueTag?: never;
    })
  | (SdkReviewResolutionFactsBase & {
      readonly tag: "invalid";
      readonly reason: string;
      readonly message: string;
      readonly issueTag?: never;
    })
  | (SdkReviewResolutionFactsBase & {
      readonly tag: "scenarioSessionConflict";
      readonly reason?: never;
      readonly message?: never;
      readonly issueTag: string;
    })
  | (SdkReviewResolutionFactsBase & {
      readonly tag: "scenarioMovementRejected";
      readonly reason?: never;
      readonly message: string;
      readonly issueTag?: never;
    });

export type SdkCallReviewFacts =
  | {
      readonly kind: "relation";
      readonly relation: SdkReviewRelation;
    }
  | {
      readonly kind: "actFrontier";
      readonly count: number;
      readonly actorCount: number;
      readonly actKinds: readonly SdkReviewActKind[];
      readonly holeKinds: readonly {
        readonly kind: string;
        readonly count: number;
      }[];
    }
  | SdkReviewResolutionFacts
  | {
      readonly kind: "error";
      readonly rejection: "sessionConflict" | "operationFailure";
      readonly name: string;
      readonly messagePreview: string;
      readonly messageByteLength: number;
      readonly messageSha256: string;
    };

type SdkReturnedCallReviewFacts = Exclude<
  SdkCallReviewFacts,
  { readonly kind: "error" }
>;
type SdkThrownCallReviewFacts = Extract<
  SdkCallReviewFacts,
  { readonly kind: "error" }
>;

type SdkAuditHeaderCommon = {
  readonly type: "sdk-audit-header";
  readonly schemaVersion: typeof SDK_AUDIT_SCHEMA_VERSION;
  readonly scenarioId: ScenarioId;
  readonly scenarioSha256: string;
  readonly scenarioReviewSha256: string;
  readonly charactersSha256: string;
  readonly gitSha: GitSha;
  readonly startedAt: string;
  readonly transcriptPath: string;
  readonly transcriptByteLength: number;
  readonly transcriptSha256: string;
  readonly replaySupervisorSha256: string;
};

export type SdkAuditHeader =
  | (SdkAuditHeaderCommon & {
      readonly characterOutcome: "ready";
      readonly setupOutcome: "ready";
      readonly setupSha256: string;
      readonly initialSessionSha256: string;
    })
  | (SdkAuditHeaderCommon & {
      readonly characterOutcome: "ready";
      readonly setupOutcome: "obstructed";
      readonly setupSha256: string;
      readonly initialSessionSha256?: never;
    })
  | (SdkAuditHeaderCommon & {
      readonly characterOutcome: "obstructed";
      readonly setupOutcome?: never;
      readonly setupSha256?: never;
      readonly initialSessionSha256?: never;
    });

type SdkAuditCallCommon = {
  readonly type: "sdk-audit-call";
  readonly seq: number;
  readonly continuation: number;
  readonly operation: SdkPlayerOperation;
  readonly inputSessionSha256: string;
  readonly input: JsonValue;
};

export type SdkAuditCall =
  | (SdkAuditCallCommon & {
      readonly outcome: "returned";
      readonly outputSessionSha256: string;
      readonly resultSha256: string;
      readonly rejection?: never;
      readonly reviewFacts: SdkReturnedCallReviewFacts;
    })
  | (SdkAuditCallCommon & {
      readonly outcome: "threw";
      readonly outputSessionSha256?: never;
      readonly resultSha256?: never;
      readonly rejection: "sessionConflict" | "operationFailure";
      readonly reviewFacts: SdkThrownCallReviewFacts;
    });

export type SdkAuditRecord = SdkAuditHeader | SdkAuditCall;

export type SdkAudit = {
  readonly header: SdkAuditHeader;
  readonly calls: readonly SdkAuditCall[];
};

export type SdkAuditFailure = {
  readonly tag: "invalid";
  readonly message: string;
};

export type SdkAuditSuccess = {
  readonly tag: "valid";
  readonly audit: SdkAudit;
};

type JsonObject = { readonly [key: string]: JsonValue };

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDefined<A>(value: A | undefined): value is A {
  return value !== undefined;
}

function isReturnedCallReviewFacts(
  value: SdkCallReviewFacts,
): value is SdkReturnedCallReviewFacts {
  return value.kind !== "error";
}

function isThrownCallReviewFacts(
  value: SdkCallReviewFacts,
): value is SdkThrownCallReviewFacts {
  return value.kind === "error";
}

function optionalString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : undefined;
}

function holes(
  value: JsonValue | undefined,
  presence: "required" | "optional",
): readonly SdkReviewHole[] | undefined {
  if (value === undefined) return presence === "optional" ? [] : undefined;
  if (!Array.isArray(value)) return undefined;
  const projected = value.map((entry): SdkReviewHole | undefined => {
    if (!isJsonObject(entry) || typeof entry.kind !== "string")
      return undefined;
    if (
      (entry.choices !== undefined && !Array.isArray(entry.choices)) ||
      (entry.label !== undefined && typeof entry.label !== "string") ||
      (entry.occurrence !== undefined &&
        optionalNumber(entry.occurrence) === undefined)
    )
      return undefined;
    const choiceCount = Array.isArray(entry.choices)
      ? entry.choices.length
      : undefined;
    const label = optionalString(entry.label);
    const occurrence = optionalNumber(entry.occurrence);
    return {
      kind: entry.kind,
      ...(label === undefined ? {} : { label }),
      ...(occurrence === undefined ? {} : { occurrence }),
      ...(choiceCount === undefined ? {} : { choiceCount }),
    };
  });
  const valid = projected.filter(isDefined);
  return valid.length === projected.length ? valid : undefined;
}

function actFrontier(result: JsonValue): SdkCallReviewFacts | undefined {
  if (!Array.isArray(result)) return undefined;
  const acts = result.map((entry) => {
    if (!isJsonObject(entry) || entry.subject === undefined) return undefined;
    const subject = entry.subject;
    if (
      !isJsonObject(subject) ||
      typeof subject.tag !== "string" ||
      typeof subject.actorId !== "string"
    )
      return undefined;
    const mode =
      isJsonObject(subject.mode) && typeof subject.mode.tag === "string"
        ? subject.mode.tag
        : undefined;
    const projectedHoles = holes(entry.initialHoles, "required");
    return projectedHoles === undefined
      ? undefined
      : {
          subject: {
            tag: subject.tag,
            ...(typeof subject.action === "string"
              ? { action: subject.action }
              : {}),
            ...(typeof subject.command === "string"
              ? { command: subject.command }
              : {}),
            ...(mode === undefined ? {} : { mode }),
          },
          actorId: subject.actorId,
          holes: projectedHoles,
        };
  });
  const validActs = acts.filter(isDefined);
  if (validActs.length !== acts.length) return undefined;
  const countByCanonical = <A>(values: readonly A[]) =>
    [
      ...values
        .reduce((counts, value) => {
          const key = JSON.stringify(value);
          const prior = counts.get(key);
          counts.set(key, { value, count: (prior?.count ?? 0) + 1 });
          return counts;
        }, new Map<string, { readonly value: A; readonly count: number }>())
        .values(),
    ].sort((left, right) =>
      JSON.stringify(left.value).localeCompare(JSON.stringify(right.value)),
    );
  return {
    kind: "actFrontier",
    count: result.length,
    actorCount: new Set(validActs.map(({ actorId }) => actorId)).size,
    actKinds: countByCanonical(validActs.map(({ subject }) => subject)).map(
      ({ value, count }) => ({ subject: value, count }),
    ),
    holeKinds: countByCanonical(
      validActs.flatMap(({ holes: projectedHoles }) =>
        projectedHoles.map(({ kind }) => kind),
      ),
    ).map(({ value, count }) => ({ kind: value, count })),
  };
}

function isOneOf<const Values extends readonly string[]>(
  values: Values,
  value: unknown,
): value is Values[number] {
  return typeof value === "string" && values.includes(value);
}

function relation(result: JsonValue): SdkReviewRelation | undefined {
  if (
    isJsonObject(result) &&
    result.tag === "unknown-token" &&
    typeof result.tokenId === "string"
  ) {
    return { tag: "unknown-token", tokenId: result.tokenId };
  }
  const value =
    isJsonObject(result) && result.tag === "relation"
      ? result.relation
      : undefined;
  if (
    !isJsonObject(value) ||
    typeof value.source !== "string" ||
    typeof value.target !== "string" ||
    !isOneOf(REVIEW_DIRECTIONS, value.direction) ||
    typeof value.distanceFeet !== "number" ||
    !Number.isFinite(value.distanceFeet) ||
    typeof value.attackerCanSeeTarget !== "boolean" ||
    !isOneOf(REVIEW_COVER, value.cover) ||
    !isOneOf(REVIEW_TRAVERSAL, value.traversal)
  ) {
    return undefined;
  }
  return {
    tag: "relation",
    source: value.source,
    target: value.target,
    direction: value.direction,
    distanceFeet: value.distanceFeet,
    attackerCanSeeTarget: value.attackerCanSeeTarget,
    cover: value.cover,
    traversal: value.traversal,
  };
}

function resolution(result: JsonValue): SdkCallReviewFacts | undefined {
  if (!isJsonObject(result)) return undefined;
  const tag = result.tag;
  if (typeof tag !== "string" || !isOneOf(SDK_REVIEW_RESOLUTION_TAGS, tag)) {
    return undefined;
  }
  const projectedHoles = resolutionFrontierHoles(result, tag);
  if (
    projectedHoles === undefined ||
    result.holes !== undefined ||
    (result.objectDamages !== undefined &&
      !Array.isArray(result.objectDamages)) ||
    (result.movements !== undefined && !Array.isArray(result.movements)) ||
    (result.reason !== undefined && typeof result.reason !== "string") ||
    (result.message !== undefined && typeof result.message !== "string") ||
    (tag === "invalid" &&
      (typeof result.reason !== "string" ||
        typeof result.message !== "string")) ||
    (tag === "scenarioMovementRejected" &&
      typeof result.message !== "string") ||
    (tag !== "invalid" && result.reason !== undefined) ||
    (tag !== "invalid" &&
      tag !== "scenarioMovementRejected" &&
      result.message !== undefined)
  )
    return undefined;
  const reason = optionalString(result.reason);
  const message = optionalString(result.message);
  const issueTag =
    isJsonObject(result.issue) && typeof result.issue.tag === "string"
      ? result.issue.tag
      : undefined;
  if (
    (tag === "scenarioSessionConflict" && issueTag === undefined) ||
    (tag !== "scenarioSessionConflict" && result.issue !== undefined)
  )
    return undefined;
  const details: SdkReviewResolutionFactsBase = {
    kind: "resolution",
    holes: projectedHoles,
    objectDamageCount: Array.isArray(result.objectDamages)
      ? result.objectDamages.length
      : 0,
    movementCount: Array.isArray(result.movements)
      ? result.movements.length
      : 0,
  };
  return Match.value(tag).pipe(
    Match.when("resolved", () => ({ ...details, tag: "resolved" as const })),
    Match.when("needsHoles", () => ({
      ...details,
      tag: "needsHoles" as const,
    })),
    Match.when("invalid", () =>
      reason === undefined || message === undefined
        ? undefined
        : { ...details, tag: "invalid" as const, reason, message },
    ),
    Match.when("scenarioSessionConflict", () =>
      issueTag === undefined
        ? undefined
        : { ...details, tag: "scenarioSessionConflict" as const, issueTag },
    ),
    Match.when("scenarioMovementRejected", () =>
      message === undefined
        ? undefined
        : { ...details, tag: "scenarioMovementRejected" as const, message },
    ),
    Match.exhaustive,
  );
}

function resolutionFrontierHoles(
  result: JsonObject,
  tag: string,
): readonly SdkReviewHole[] | undefined {
  if (result.envelope === undefined) {
    return tag === "scenarioSessionConflict" ||
      tag === "scenarioMovementRejected"
      ? []
      : undefined;
  }
  if (tag === "scenarioSessionConflict" || tag === "scenarioMovementRejected") {
    return undefined;
  }
  if (
    !isJsonObject(result.envelope) ||
    !isJsonObject(result.envelope.frontier)
  ) {
    return undefined;
  }
  const frontier = result.envelope.frontier;
  if (frontier.kind === "acts") {
    if (tag === "needsHoles") return undefined;
    return Array.isArray(frontier.acts)
      ? frontier.acts.reduce<readonly SdkReviewHole[] | undefined>(
          (all, act) => {
            if (all === undefined || !isJsonObject(act)) return undefined;
            const actHoles = holes(act.initialHoles, "required");
            return actHoles === undefined ? undefined : [...all, ...actHoles];
          },
          [],
        )
      : undefined;
  }
  if (frontier.kind === "holes") {
    if (tag === "resolved") return undefined;
    const projected = holes(frontier.holes, "required");
    return projected !== undefined && projected.length > 0
      ? projected
      : undefined;
  }
  if (frontier.kind !== "interruptDecision") return undefined;
  if (tag !== "resolved" && tag !== "needsHoles" && tag !== "invalid")
    return undefined;
  if (!isJsonObject(frontier.decisionHole)) return undefined;
  if (typeof frontier.decisionHole.kind !== "string") return undefined;
  if (frontier.decisionHole.choices !== undefined) return undefined;
  if (!Array.isArray(frontier.choices)) return undefined;
  if (
    !frontier.choices.every(
      (choice) => isJsonObject(choice) && typeof choice.kind === "string",
    )
  ) {
    return undefined;
  }
  return [
    {
      kind: frontier.decisionHole.kind,
      ...(typeof frontier.decisionHole.label === "string"
        ? { label: frontier.decisionHole.label }
        : {}),
      choiceCount: frontier.choices.length,
    },
  ];
}

function reviewFacts(
  call: SdkCallRecord,
  result: JsonValue,
): SdkCallReviewFacts | undefined {
  if (call.outcome === "threw") {
    const messageBytes = Buffer.from(call.error.message, "utf8");
    return {
      kind: "error",
      rejection: call.rejection,
      name: call.error.name,
      messagePreview: call.error.message.slice(0, 512),
      messageByteLength: messageBytes.byteLength,
      messageSha256: sha256Bytes(messageBytes),
    };
  }
  return Match.value(call.operation).pipe(
    Match.when("scenarioRelation", () => {
      const projected = relation(result);
      return projected === undefined
        ? undefined
        : { kind: "relation" as const, relation: projected };
    }),
    Match.when("discoverBattleActs", () => actFrontier(result)),
    Match.when("resolveBattleRuntimeSubject", () => resolution(result)),
    Match.when("resolveScenarioMovement", () => resolution(result)),
    Match.when("resolveBattleRuntimeInterrupt", () => resolution(result)),
    Match.when("endBattleRuntimeTurn", () => resolution(result)),
    Match.exhaustive,
  );
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function readBytes(
  path: string,
  message: string,
): { readonly tag: "valid"; readonly bytes: Buffer } | SdkAuditFailure {
  try {
    return { tag: "valid", bytes: readFileSync(path) };
  } catch {
    return { tag: "invalid", message };
  }
}

function jsonLines(bytes: Buffer):
  | {
      readonly tag: "valid";
      readonly lines: readonly string[];
      readonly records: readonly unknown[];
    }
  | SdkAuditFailure {
  const lines = bytes
    .toString("utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  try {
    return {
      tag: "valid",
      lines,
      records: lines.map((line): unknown => JSON.parse(line)),
    };
  } catch {
    return {
      tag: "invalid",
      message: "SDK evidence contains malformed JSONL.",
    };
  }
}

function replaySupervisorPath(transcriptPath: string): string {
  return resolve(dirname(dirname(transcriptPath)), "replay-supervisor.mjs");
}

export function sdkAuditTranscript(input: {
  readonly records: readonly unknown[];
  readonly transcriptPath: string;
  readonly transcriptByteLength: number;
  readonly transcriptSha256: string;
  readonly replaySupervisorSha256: string;
  readonly recordedTranscriptPath?: string;
}): SdkAuditSuccess | SdkAuditFailure {
  const parsed = parseSdkTranscript(input.records);
  if (parsed.tag === "invalid") return parsed;
  const { header, calls } = parsed.value;
  const recordedReplaySha = header.replaySupervisorSha256;
  if (input.replaySupervisorSha256 !== recordedReplaySha) {
    return {
      tag: "invalid",
      message:
        "SDK transcript replay supervisor hash does not match its artifact.",
    };
  }
  const auditHeaderCommon: SdkAuditHeaderCommon = {
    type: "sdk-audit-header",
    schemaVersion: SDK_AUDIT_SCHEMA_VERSION,
    scenarioId: header.scenarioId,
    scenarioSha256: header.scenarioSha256,
    scenarioReviewSha256: header.scenarioReviewSha256,
    charactersSha256: header.charactersSha256,
    gitSha: header.gitSha,
    startedAt: header.startedAt,
    transcriptPath: input.recordedTranscriptPath ?? input.transcriptPath,
    transcriptByteLength: input.transcriptByteLength,
    transcriptSha256: input.transcriptSha256,
    replaySupervisorSha256: recordedReplaySha,
  };
  const auditHeader: SdkAuditHeader =
    header.characterOutcome === "obstructed"
      ? { ...auditHeaderCommon, characterOutcome: "obstructed" }
      : header.setupOutcome === "obstructed"
        ? {
            ...auditHeaderCommon,
            characterOutcome: "ready",
            setupOutcome: "obstructed",
            setupSha256: header.setupSha256,
          }
        : {
            ...auditHeaderCommon,
            characterOutcome: "ready",
            setupOutcome: "ready",
            setupSha256: header.setupSha256,
            initialSessionSha256: header.initialSessionSha256,
          };
  const auditCalls: SdkAuditCall[] = [];
  for (const call of calls) {
    if (!isJsonValue(call.input)) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} has non-JSON audit evidence.`,
      };
    }
    const result = call.outcome === "returned" ? call.result : null;
    if (!isJsonValue(result)) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} has non-JSON audit evidence.`,
      };
    }
    const projectedReviewFacts = reviewFacts(call, result);
    if (projectedReviewFacts === undefined) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} cannot be projected into typed audit facts.`,
      };
    }
    const reviewFactsBytes = Buffer.byteLength(
      JSON.stringify(projectedReviewFacts),
      "utf8",
    );
    if (reviewFactsBytes > SDK_AUDIT_REVIEW_FACTS_MAX_BYTES) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} review facts exceed ${SDK_AUDIT_REVIEW_FACTS_MAX_BYTES} bytes.`,
      };
    }
    if (call.outcome === "returned") {
      if (!isReturnedCallReviewFacts(projectedReviewFacts)) {
        return {
          tag: "invalid",
          message: `SDK call seq ${call.seq} has review facts for a thrown outcome.`,
        };
      }
      auditCalls.push({
        type: "sdk-audit-call",
        seq: call.seq,
        continuation: call.continuation,
        operation: call.operation,
        inputSessionSha256: call.inputSessionSha256,
        input: call.input,
        outcome: "returned",
        outputSessionSha256: call.outputSessionSha256,
        resultSha256: call.resultSha256,
        reviewFacts: projectedReviewFacts,
      });
      continue;
    }
    if (!isThrownCallReviewFacts(projectedReviewFacts)) {
      return {
        tag: "invalid",
        message: `SDK call seq ${call.seq} has review facts for a returned outcome.`,
      };
    }
    auditCalls.push({
      type: "sdk-audit-call",
      seq: call.seq,
      continuation: call.continuation,
      operation: call.operation,
      inputSessionSha256: call.inputSessionSha256,
      input: call.input,
      outcome: "threw",
      rejection: call.rejection,
      reviewFacts: projectedReviewFacts,
    });
  }
  return { tag: "valid", audit: { header: auditHeader, calls: auditCalls } };
}

export function preflightSdkTranscript(input: {
  readonly transcriptPath: string;
  readonly expectedByteLength?: number;
  readonly expectedSha256?: string;
  readonly recordedTranscriptPath?: string;
  readonly replaySupervisorArtifactPath?: string;
}): SdkAuditSuccess | SdkAuditFailure {
  const loaded = (() => {
    try {
      const absolutePath = realpathSync(
        resolve(repoRoot, input.transcriptPath),
      );
      return {
        tag: "valid" as const,
        absolutePath,
        bytes: readFileSync(absolutePath),
      };
    } catch {
      return {
        tag: "invalid" as const,
        message: "SDK transcript artifact is unreadable.",
      };
    }
  })();
  if (loaded.tag === "invalid") return loaded;
  const { absolutePath, bytes } = loaded;
  const byteLength = bytes.byteLength;
  const transcriptSha256 = sha256Bytes(bytes);
  if (
    input.expectedByteLength !== undefined &&
    input.expectedByteLength !== byteLength
  ) {
    return { tag: "invalid", message: "SDK transcript byte length changed." };
  }
  if (
    input.expectedSha256 !== undefined &&
    input.expectedSha256 !== transcriptSha256
  ) {
    return { tag: "invalid", message: "SDK transcript SHA-256 changed." };
  }
  const supervisorPath =
    input.replaySupervisorArtifactPath === undefined
      ? replaySupervisorPath(absolutePath)
      : resolve(input.replaySupervisorArtifactPath);
  if (!existsSync(supervisorPath)) {
    return {
      tag: "invalid",
      message: "SDK replay supervisor artifact is unreadable.",
    };
  }
  const replaySupervisorSha256 = sha256Bytes(readFileSync(supervisorPath));
  const parsedLines = jsonLines(bytes);
  if (parsedLines.tag === "invalid") return parsedLines;
  return sdkAuditTranscript({
    records: parsedLines.records,
    transcriptPath: relative(repoRoot, absolutePath),
    transcriptByteLength: byteLength,
    transcriptSha256,
    replaySupervisorSha256,
    ...(input.recordedTranscriptPath === undefined
      ? {}
      : { recordedTranscriptPath: input.recordedTranscriptPath }),
  });
}

export function writeSdkAudit(path: string, audit: SdkAudit): void {
  const records: readonly SdkAuditRecord[] = [audit.header, ...audit.calls];
  writeFileSync(
    path,
    records.map((record) => JSON.stringify(record)).join("\n") + "\n",
    { flag: "wx" },
  );
}

export function readSdkAudit(
  path: string,
  artifacts?: {
    readonly transcriptPath: string;
    readonly replaySupervisorPath: string;
  },
): SdkAuditSuccess | SdkAuditFailure {
  const loaded = readBytes(path, "SDK audit artifact is unreadable.");
  if (loaded.tag === "invalid") return loaded;
  const { bytes } = loaded;
  const parsedLines = jsonLines(bytes);
  if (parsedLines.tag === "invalid") return parsedLines;
  const records = parsedLines.records;
  const header = records[0];
  if (
    !isJsonObject(header) ||
    header.type !== "sdk-audit-header" ||
    header.schemaVersion !== SDK_AUDIT_SCHEMA_VERSION ||
    typeof header.scenarioSha256 !== "string" ||
    typeof header.scenarioReviewSha256 !== "string" ||
    typeof header.charactersSha256 !== "string" ||
    typeof header.transcriptPath !== "string" ||
    typeof header.transcriptByteLength !== "number" ||
    typeof header.transcriptSha256 !== "string"
  ) {
    return { tag: "invalid", message: "SDK audit header is invalid." };
  }
  const validHeaderReadiness =
    header.characterOutcome === "obstructed"
      ? header.setupOutcome === undefined &&
        header.setupSha256 === undefined &&
        header.initialSessionSha256 === undefined
      : header.characterOutcome === "ready" &&
        ((header.setupOutcome === "ready" &&
          typeof header.setupSha256 === "string" &&
          typeof header.initialSessionSha256 === "string") ||
          (header.setupOutcome === "obstructed" &&
            typeof header.setupSha256 === "string" &&
            header.initialSessionSha256 === undefined));
  if (!validHeaderReadiness) {
    return { tag: "invalid", message: "SDK audit header is invalid." };
  }
  const verified = preflightSdkTranscript({
    transcriptPath: artifacts?.transcriptPath ?? header.transcriptPath,
    recordedTranscriptPath: header.transcriptPath,
    ...(artifacts === undefined
      ? {}
      : { replaySupervisorArtifactPath: artifacts.replaySupervisorPath }),
    expectedByteLength: header.transcriptByteLength,
    expectedSha256: header.transcriptSha256,
  });
  if (verified.tag === "invalid") return verified;
  const expectedRecords: readonly SdkAuditRecord[] = [
    verified.audit.header,
    ...verified.audit.calls,
  ];
  if (canonicalJson(records) !== canonicalJson(expectedRecords)) {
    return {
      tag: "invalid",
      message:
        "SDK audit is not the deterministic projection of its transcript.",
    };
  }
  return verified;
}

export type SdkExtractionProvenance = {
  readonly schemaVersion: 1;
  readonly transcriptPath: string;
  readonly transcriptByteLength: number;
  readonly transcriptSha256: string;
  readonly requestedSequences: readonly number[];
  readonly extractedRecordsByteLength: number;
  readonly extractedRecordsSha256: string;
  readonly records: readonly {
    readonly seq: number;
    readonly operation: SdkPlayerOperation;
    readonly outcome: "returned" | "threw";
    readonly extractedByteLength: number;
    readonly extractedSha256: string;
  }[];
};

export function extractSdkTranscriptSequences(input: {
  readonly audit: SdkAudit;
  readonly sequences: readonly number[];
  readonly transcriptArtifactPath?: string;
  readonly replaySupervisorArtifactPath?: string;
}):
  | {
      readonly tag: "valid";
      readonly records: readonly JsonValue[];
      readonly encodedRecords: string;
      readonly provenance: SdkExtractionProvenance;
    }
  | SdkAuditFailure {
  const requested = [...new Set(input.sequences)].sort(
    (left, right) => left - right,
  );
  if (
    requested.length === 0 ||
    requested.some((seq) => !Number.isInteger(seq) || seq <= 0)
  ) {
    return {
      tag: "invalid",
      message: "SDK extraction needs positive sequences.",
    };
  }
  const verified = preflightSdkTranscript({
    transcriptPath:
      input.transcriptArtifactPath ?? input.audit.header.transcriptPath,
    recordedTranscriptPath: input.audit.header.transcriptPath,
    ...(input.replaySupervisorArtifactPath === undefined
      ? {}
      : {
          replaySupervisorArtifactPath: input.replaySupervisorArtifactPath,
        }),
    expectedByteLength: input.audit.header.transcriptByteLength,
    expectedSha256: input.audit.header.transcriptSha256,
  });
  if (verified.tag === "invalid") return verified;
  const verifiedBySequence = new Map(
    verified.audit.calls.map((call) => [call.seq, call]),
  );
  const auditBySequence = new Map(
    input.audit.calls.map((call) => [call.seq, call]),
  );
  const loaded = readBytes(
    resolve(
      repoRoot,
      input.transcriptArtifactPath ?? input.audit.header.transcriptPath,
    ),
    "SDK transcript artifact is unreadable.",
  );
  if (loaded.tag === "invalid") return loaded;
  const { bytes } = loaded;
  const parsedLines = jsonLines(bytes);
  if (parsedLines.tag === "invalid") return parsedLines;
  const { lines } = parsedLines;
  const parsed = parseSdkTranscript(parsedLines.records);
  if (parsed.tag === "invalid") return parsed;
  const callBySequence = new Map(
    parsed.value.calls.map((call) => [call.seq, call]),
  );
  const records: JsonValue[] = [];
  const recordLines: string[] = [];
  const provenanceRecords: SdkExtractionProvenance["records"][number][] = [];
  for (const seq of requested) {
    const expected = auditBySequence.get(seq);
    const current = verifiedBySequence.get(seq);
    const raw = callBySequence.get(seq);
    const rawLine = lines[seq];
    if (
      expected === undefined ||
      current === undefined ||
      raw === undefined ||
      rawLine === undefined ||
      canonicalJson(expected) !== canonicalJson(current) ||
      raw.operation !== expected.operation ||
      raw.outcome !== expected.outcome ||
      (raw.outcome === "returned" && raw.resultSha256 !== expected.resultSha256)
    ) {
      return {
        tag: "invalid",
        message: `SDK extraction audit correspondence failed at sequence ${seq}.`,
      };
    }
    if (!isJsonValue(raw)) {
      return {
        tag: "invalid",
        message: `SDK extraction record ${seq} is not JSON evidence.`,
      };
    }
    records.push(raw);
    recordLines.push(rawLine);
    provenanceRecords.push({
      seq,
      operation: raw.operation,
      outcome: raw.outcome,
      extractedByteLength: Buffer.byteLength(rawLine),
      extractedSha256: sha256Bytes(Buffer.from(rawLine)),
    });
  }
  const encodedRecords = `${recordLines.join("\n")}\n`;
  const transcriptArtifactPath =
    input.transcriptArtifactPath ?? input.audit.header.transcriptPath;
  return {
    tag: "valid",
    records,
    encodedRecords,
    provenance: {
      schemaVersion: 1,
      transcriptPath: transcriptArtifactPath,
      transcriptByteLength: statSync(resolve(repoRoot, transcriptArtifactPath))
        .size,
      transcriptSha256: input.audit.header.transcriptSha256,
      requestedSequences: requested,
      extractedRecordsByteLength: Buffer.byteLength(encodedRecords),
      extractedRecordsSha256: sha256Bytes(Buffer.from(encodedRecords)),
      records: provenanceRecords,
    },
  };
}
