import { createHash } from "node:crypto";

import type { SdkAudit } from "./sdk-audit.ts";
import type { JsonValue } from "./continuation-contract.ts";
import { isJsonValue } from "./json-value.ts";
import type { PlayerCurrentTurnProjection } from "./player-turn-projection.ts";
import { canonicalJson, isJsonRecord } from "../transcript.ts";

export const SDK_REVIEW_PACKET_SCHEMA_VERSION = 1;
export const SDK_REVIEW_PACKET_MAX_BYTES = 921_600;

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
      readonly reason: "packetTooLarge";
      readonly byteLength: number;
      readonly maximumByteLength: number;
      readonly message: string;
    };

export type SdkReviewPacketValidation =
  | { readonly tag: "valid" }
  | { readonly tag: "invalid"; readonly message: string };

function packetSourceIsValid(value: unknown): boolean {
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

export function validateSdkReviewPacket(
  value: unknown,
  audit: SdkAudit,
): SdkReviewPacketValidation {
  if (
    !isJsonRecord(value) ||
    Object.keys(value).sort().join("\0") !==
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
        .join("\0") ||
    value.type !== "sdk-review-packet" ||
    value.schemaVersion !== SDK_REVIEW_PACKET_SCHEMA_VERSION ||
    canonicalJson(value.audit) !== canonicalJson(audit) ||
    !isJsonValue(value.retainedHeaderEvidence) ||
    !Array.isArray(value.currentTurnProjections) ||
    !Array.isArray(value.runArtifacts) ||
    !value.runArtifacts.every(packetSourceIsValid) ||
    !Array.isArray(value.domainAuthorities) ||
    !value.domainAuthorities.every(packetSourceIsValid) ||
    !Array.isArray(value.rawAuthorities) ||
    !value.rawAuthorities.every(packetSourceIsValid)
  ) {
    return {
      tag: "invalid",
      message: "Review evidence packet does not match the verified audit.",
    };
  }
  return { tag: "valid" };
}

function sha256(value: string): string {
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
}): SdkReviewPacketSource {
  const firstLine = input.firstLine ?? 1;
  return {
    path: input.path,
    byteLength: Buffer.byteLength(input.content, "utf8"),
    sha256: sha256(input.content),
    firstLine,
    numberedContent: numbered(input.content, firstLine),
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
