import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import type { SdkAudit } from "./sdk-audit.ts";
import type { JsonValue } from "./continuation-contract.ts";
import { isJsonValue } from "./json-value.ts";
import type { PlayerCurrentTurnProjection } from "./player-turn-projection.ts";
import { reprojectSdkTranscriptTurns } from "./player-turn-projection.ts";
import { parseSdkTranscript } from "./sdk-transcript.ts";
import { canonicalJson, isJsonRecord, repoRoot } from "../transcript.ts";

export const SDK_REVIEW_PACKET_SCHEMA_VERSION = 1;
export const SDK_REVIEW_PACKET_MAX_BYTES = 921_600;
export const SDK_REVIEW_PACKET_SCENARIO_ARTIFACT_ROLES = [
  "SCENARIO.md",
  "SCENARIO_REVIEW.json",
  "evidence/characters.ts",
] as const;
export const SDK_REVIEW_PACKET_READY_SETUP_ARTIFACT_ROLES = [
  "evidence/setup.ts",
  "evidence/program.ts",
  "evidence/final.json",
  "OBSERVATION.json",
  "agent-final.txt",
] as const;
export const SDK_REVIEW_PACKET_RUN_ARTIFACT_ROLES = [
  ...SDK_REVIEW_PACKET_SCENARIO_ARTIFACT_ROLES,
  ...SDK_REVIEW_PACKET_READY_SETUP_ARTIFACT_ROLES,
] as const;

export type SdkReviewPacketSource = {
  readonly path: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly firstLine: number;
  readonly numberedContent: string;
};

export type SdkReviewPacket = {
  readonly type: "sdk-review-packet";
  readonly schemaVersion: typeof SDK_REVIEW_PACKET_SCHEMA_VERSION;
  readonly audit: SdkAudit;
  readonly retainedHeaderEvidence: JsonValue;
  readonly currentTurnProjections: readonly PlayerCurrentTurnProjection[];
  readonly runArtifacts: readonly SdkReviewPacketSource[];
  readonly domainAuthorities: readonly SdkReviewPacketSource[];
  readonly rawAuthorities: readonly SdkReviewPacketSource[];
};

export type SdkReviewPacketResult =
  | {
      readonly tag: "valid";
      readonly packet: SdkReviewPacket;
      readonly encoded: string;
      readonly byteLength: number;
      readonly sha256: string;
    }
  | {
      readonly tag: "invalid";
      readonly reason: "invalidSource";
      readonly message: string;
    }
  | {
      readonly tag: "invalid";
      readonly reason: "packetTooLarge";
      readonly byteLength: number;
      readonly maximumByteLength: number;
      readonly message: string;
    };

export type SdkReviewPacketValidation =
  | { readonly tag: "valid"; readonly packet: SdkReviewPacket }
  | { readonly tag: "invalid"; readonly message: string };

function packetSourceIsValid(value: unknown): value is SdkReviewPacketSource {
  return (
    isJsonRecord(value) &&
    typeof value.path === "string" &&
    value.path.length > 0 &&
    typeof value.byteLength === "number" &&
    Number.isInteger(value.byteLength) &&
    value.byteLength >= 0 &&
    typeof value.sha256 === "string" &&
    /^[0-9a-f]{64}$/.test(value.sha256) &&
    typeof value.firstLine === "number" &&
    Number.isInteger(value.firstLine) &&
    value.firstLine > 0 &&
    typeof value.numberedContent === "string"
  );
}

function packetShapeIsValid(value: unknown): value is SdkReviewPacket {
  return (
    isJsonRecord(value) &&
    Object.keys(value).sort().join("\0") ===
      [
        "type",
        "schemaVersion",
        "audit",
        "retainedHeaderEvidence",
        "currentTurnProjections",
        "runArtifacts",
        "domainAuthorities",
        "rawAuthorities",
      ]
        .sort()
        .join("\0") &&
    value.type === "sdk-review-packet" &&
    value.schemaVersion === SDK_REVIEW_PACKET_SCHEMA_VERSION &&
    isJsonValue(value.retainedHeaderEvidence) &&
    Array.isArray(value.currentTurnProjections) &&
    value.currentTurnProjections.every((entry) => isJsonValue(entry)) &&
    Array.isArray(value.runArtifacts) &&
    value.runArtifacts.every(packetSourceIsValid) &&
    Array.isArray(value.domainAuthorities) &&
    value.domainAuthorities.every(packetSourceIsValid) &&
    Array.isArray(value.rawAuthorities) &&
    value.rawAuthorities.every(packetSourceIsValid)
  );
}

function packetSourceContent(
  source: SdkReviewPacketSource,
): string | undefined {
  const absolutePath = resolve(repoRoot, source.path);
  const canonicalPath = relative(repoRoot, absolutePath);
  if (
    canonicalPath.length === 0 ||
    canonicalPath.startsWith("..") ||
    isAbsolute(canonicalPath)
  ) {
    return undefined;
  }
  let canonicalText: string;
  try {
    const realPath = realpathSync(absolutePath);
    const realRelativePath = relative(repoRoot, realPath);
    if (
      realRelativePath.length === 0 ||
      realRelativePath.startsWith("..") ||
      isAbsolute(realRelativePath)
    ) {
      return undefined;
    }
    canonicalText = readFileSync(realPath, "utf8");
  } catch {
    return undefined;
  }
  const numberedLines = source.numberedContent.split("\n");
  const sourceLines = numberedLines.map((line, index) => {
    const separator = line.indexOf("|");
    const number = separator === -1 ? undefined : line.slice(0, separator);
    const content = separator === -1 ? undefined : line.slice(separator + 1);
    const expectedLine = source.firstLine + index;
    return number === String(expectedLine) && content !== undefined
      ? content
      : undefined;
  });
  if (sourceLines.some((line) => line === undefined)) return undefined;
  const content = sourceLines.join("\n");
  const canonicalLines = canonicalText.split("\n");
  const canonicalSlice = canonicalLines.slice(
    source.firstLine - 1,
    source.firstLine - 1 + sourceLines.length,
  );
  if (
    canonicalSlice.length !== sourceLines.length ||
    canonicalSlice.join("\n") !== content ||
    Buffer.byteLength(content, "utf8") !== source.byteLength ||
    sha256(content) !== source.sha256
  ) {
    return undefined;
  }
  return content;
}

type ParsedSdkTranscript = Extract<
  ReturnType<typeof parseSdkTranscript>,
  { readonly tag: "valid" }
>["value"];

export type SdkReviewPacketTranscriptHeader = ParsedSdkTranscript["header"];

export function sdkReviewPacketHeaderEvidence(
  header: SdkReviewPacketTranscriptHeader,
): JsonValue {
  if (header.characterOutcome === "obstructed") {
    return {
      characterOutcome: "obstructed",
      characterObservation: header.characterObservation,
      obstruction: header.obstruction,
    };
  }
  return header.setupOutcome === "obstructed"
    ? {
        characterOutcome: "ready",
        characterObservation: header.characterObservation,
        characterSheets: header.characterSheets,
        setupOutcome: "obstructed",
        setupObservation: header.setupObservation,
        obstruction: header.obstruction,
      }
    : {
        characterOutcome: "ready",
        characterObservation: header.characterObservation,
        characterSheets: header.characterSheets,
        setupOutcome: "ready",
        setupObservation: header.setupObservation,
      };
}

function exactTranscript(
  audit: SdkAudit,
):
  | { readonly tag: "valid"; readonly transcript: ParsedSdkTranscript }
  | { readonly tag: "invalid"; readonly message: string } {
  let bytes: Buffer;
  try {
    bytes = readFileSync(resolve(repoRoot, audit.header.transcriptPath));
  } catch {
    return {
      tag: "invalid",
      message: "Review evidence packet transcript is unreadable.",
    };
  }
  if (
    bytes.byteLength !== audit.header.transcriptByteLength ||
    sha256(bytes) !== audit.header.transcriptSha256
  ) {
    return {
      tag: "invalid",
      message: "Review evidence packet transcript does not match the audit.",
    };
  }
  const records = bytes
    .toString("utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line): unknown => {
      try {
        return JSON.parse(line);
      } catch {
        return undefined;
      }
    });
  if (records.some((record) => record === undefined)) {
    return {
      tag: "invalid",
      message: "Review evidence packet transcript contains malformed JSON.",
    };
  }
  const parsed = parseSdkTranscript(records);
  return parsed.tag === "valid"
    ? { tag: "valid", transcript: parsed.value }
    : {
        tag: "invalid",
        message: `Review evidence packet transcript is invalid: ${parsed.message}`,
      };
}

export function validateSdkReviewPacket(
  value: unknown,
  audit: SdkAudit,
): SdkReviewPacketValidation {
  if (
    !packetShapeIsValid(value) ||
    canonicalJson(value.audit) !== canonicalJson(audit) ||
    !isJsonValue(value.retainedHeaderEvidence)
  ) {
    return {
      tag: "invalid",
      message: "Review evidence packet does not match the verified audit.",
    };
  }
  const sourceLists: readonly (readonly SdkReviewPacketSource[])[] = [
    value.runArtifacts,
    value.domainAuthorities,
    value.rawAuthorities,
  ];
  if (
    sourceLists.some((sources) =>
      sources.some((source) => packetSourceContent(source) === undefined),
    )
  ) {
    return {
      tag: "invalid",
      message:
        "Review evidence packet contains a numbered source that does not match its canonical repository file.",
    };
  }
  const transcript = exactTranscript(audit);
  if (transcript.tag === "invalid") return transcript;
  const transcriptCallIdentity = transcript.transcript.calls.map(
    ({ seq, continuation, operation, outcome }) => ({
      seq,
      continuation,
      operation,
      outcome,
    }),
  );
  const auditCallIdentity = audit.calls.map(
    ({ seq, continuation, operation, outcome }) => ({
      seq,
      continuation,
      operation,
      outcome,
    }),
  );
  if (
    canonicalJson(auditCallIdentity) !== canonicalJson(transcriptCallIdentity)
  ) {
    return {
      tag: "invalid",
      message:
        "Review evidence packet audit call identity does not match the exact transcript.",
    };
  }
  const expectedHeaderEvidence = sdkReviewPacketHeaderEvidence(
    transcript.transcript.header,
  );
  if (
    canonicalJson(value.retainedHeaderEvidence) !==
    canonicalJson(expectedHeaderEvidence)
  ) {
    return {
      tag: "invalid",
      message:
        "Review evidence packet retained header evidence does not match the exact transcript.",
    };
  }
  const projections = reprojectSdkTranscriptTurns(transcript.transcript.calls);
  if (projections.tag === "invalid") return projections;
  if (
    canonicalJson(value.currentTurnProjections) !==
    canonicalJson(projections.projections)
  ) {
    return {
      tag: "invalid",
      message:
        "Review evidence packet current-turn projections do not match the exact transcript.",
    };
  }
  return { tag: "valid", packet: value };
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function numbered(content: string, firstLine: number): string {
  return content
    .split("\n")
    .map((line, index) => `${index + firstLine}|${line}`)
    .join("\n");
}

export function sdkReviewPacketSource(input: {
  readonly path: string;
  readonly content: string;
  readonly firstLine?: number;
}):
  | { readonly tag: "valid"; readonly source: SdkReviewPacketSource }
  | { readonly tag: "invalid"; readonly message: string } {
  const firstLine = input.firstLine ?? 1;
  const source = {
    path: input.path,
    byteLength: Buffer.byteLength(input.content, "utf8"),
    sha256: sha256(input.content),
    firstLine,
    numberedContent: numbered(input.content, firstLine),
  };
  return packetSourceIsValid(source)
    ? { tag: "valid", source }
    : {
        tag: "invalid",
        message:
          "Review evidence source requires a nonempty path and a positive integer first line.",
      };
}

export function encodeSdkReviewPacket(input: {
  readonly audit: SdkAudit;
  readonly retainedHeaderEvidence: JsonValue;
  readonly currentTurnProjections: readonly PlayerCurrentTurnProjection[];
  readonly runArtifacts: readonly SdkReviewPacketSource[];
  readonly domainAuthorities: readonly SdkReviewPacketSource[];
  readonly rawAuthorities: readonly SdkReviewPacketSource[];
  readonly maximumByteLength?: number;
}): SdkReviewPacketResult {
  const sourceLists: readonly (readonly SdkReviewPacketSource[])[] = [
    input.runArtifacts,
    input.domainAuthorities,
    input.rawAuthorities,
  ];
  if (sourceLists.some((sources) => !sources.every(packetSourceIsValid))) {
    return {
      tag: "invalid",
      reason: "invalidSource",
      message: "Review evidence packet contains an invalid source.",
    };
  }
  const packet: SdkReviewPacket = {
    type: "sdk-review-packet",
    schemaVersion: SDK_REVIEW_PACKET_SCHEMA_VERSION,
    audit: input.audit,
    retainedHeaderEvidence: input.retainedHeaderEvidence,
    currentTurnProjections: input.currentTurnProjections,
    runArtifacts: input.runArtifacts,
    domainAuthorities: input.domainAuthorities,
    rawAuthorities: input.rawAuthorities,
  };
  const encoded = `${JSON.stringify(packet)}\n`;
  const byteLength = Buffer.byteLength(encoded, "utf8");
  const maximumByteLength =
    input.maximumByteLength ?? SDK_REVIEW_PACKET_MAX_BYTES;
  return byteLength <= maximumByteLength
    ? {
        tag: "valid",
        packet,
        encoded,
        byteLength,
        sha256: sha256(encoded),
      }
    : {
        tag: "invalid",
        reason: "packetTooLarge",
        byteLength,
        maximumByteLength,
        message: `SDK review packet is ${byteLength} bytes; maximum is ${maximumByteLength}.`,
      };
}
