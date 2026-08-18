import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import { parseModelInvocationLedgerEntry } from "./model-telemetry.ts";
import {
  reviewEvidenceCatalogForAudit,
  validateReviewOutput,
} from "./review-output-validation.ts";
import { readSdkAudit } from "./sdk-player/sdk-audit.ts";
import {
  SDK_REVIEW_PACKET_MAX_BYTES,
  validateSdkReviewPacket,
} from "./sdk-player/sdk-review-packet.ts";
import { repoRoot } from "./transcript.ts";

const HashSchema = Schema.String.pipe(Schema.pattern(/^[0-9a-f]{64}$/));
export const ArtifactAuthoritySchema = Schema.Struct({
  path: Schema.NonEmptyTrimmedString,
  byteLength: Schema.Number.pipe(Schema.int(), Schema.nonNegative()),
  sha256: HashSchema,
});
export type ArtifactAuthority = Schema.Schema.Type<
  typeof ArtifactAuthoritySchema
>;

export const ReviewInvocationEvidenceManifestSchema = Schema.Struct({
  type: Schema.Literal("review-invocation-evidence"),
  schemaVersion: Schema.Literal(1),
  scenarioId: Schema.NonEmptyTrimmedString,
  gitSha: Schema.String.pipe(Schema.pattern(/^[0-9a-f]{40}$/)),
  transcript: ArtifactAuthoritySchema,
  review: ArtifactAuthoritySchema,
  audit: ArtifactAuthoritySchema,
  packet: ArtifactAuthoritySchema,
  invocationLedgers: Schema.Array(ArtifactAuthoritySchema).pipe(
    Schema.minItems(1),
  ),
});

export type ReviewInvocationEvidenceManifest = Schema.Schema.Type<
  typeof ReviewInvocationEvidenceManifestSchema
>;

function fail(message: string): never {
  throw new Error(message);
}

function artifactAuthority(path: string) {
  const bytes = readFileSync(resolve(repoRoot, path));
  return {
    path,
    byteLength: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

function json(path: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(repoRoot, path), "utf8")) as unknown;
  } catch {
    return fail(`Review invocation evidence ${path} is malformed JSON.`);
  }
}

function ledgerIsValid(path: string): boolean {
  const lines = readFileSync(resolve(repoRoot, path), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  return (
    lines.length > 0 &&
    lines.every((line) => {
      try {
        const value: unknown = JSON.parse(line);
        return Either.isRight(parseModelInvocationLedgerEntry(value));
      } catch {
        return false;
      }
    })
  );
}

function deriveManifest(input: {
  readonly transcriptPath: string;
  readonly reviewPath: string;
  readonly auditPath: string;
  readonly packetPath: string;
  readonly invocationLedgerPaths: readonly string[];
}): ReviewInvocationEvidenceManifest {
  const audit = readSdkAudit(resolve(repoRoot, input.auditPath));
  if (audit.tag === "invalid") fail(audit.message);
  const transcript = artifactAuthority(input.transcriptPath);
  if (
    transcript.sha256 !== audit.audit.header.transcriptSha256 ||
    transcript.byteLength !== audit.audit.header.transcriptByteLength
  ) {
    fail("Review invocation transcript does not match the verified audit.");
  }
  const packetAuthority = artifactAuthority(input.packetPath);
  if (packetAuthority.byteLength > SDK_REVIEW_PACKET_MAX_BYTES) {
    fail("Review evidence packet exceeds its public byte limit.");
  }
  const packetValidation = validateSdkReviewPacket(
    json(input.packetPath),
    audit.audit,
  );
  if (packetValidation.tag === "invalid") fail(packetValidation.message);
  const evidence = reviewEvidenceCatalogForAudit(audit.audit);
  if (evidence.tag === "invalid") fail(evidence.message);
  const review = json(input.reviewPath);
  const reviewValidation = validateReviewOutput(
    review,
    {
      scenarioId: audit.audit.header.scenarioId,
      gitSha: audit.audit.header.gitSha,
      transcriptSha256: audit.audit.header.transcriptSha256,
    },
    evidence.catalog,
  );
  if (reviewValidation.tag === "invalid") fail(reviewValidation.message);
  if (
    new Set(input.invocationLedgerPaths).size !==
      input.invocationLedgerPaths.length ||
    input.invocationLedgerPaths.length === 0 ||
    input.invocationLedgerPaths.some((path) => !ledgerIsValid(path))
  ) {
    fail("Review invocation ledgers must be nonempty, unique, and valid.");
  }
  return {
    type: "review-invocation-evidence",
    schemaVersion: 1,
    scenarioId: audit.audit.header.scenarioId,
    gitSha: audit.audit.header.gitSha,
    transcript,
    review: artifactAuthority(input.reviewPath),
    audit: artifactAuthority(input.auditPath),
    packet: packetAuthority,
    invocationLedgers: input.invocationLedgerPaths.map(artifactAuthority),
  };
}

export function writeReviewInvocationEvidenceManifest(input: {
  readonly transcriptPath: string;
  readonly reviewPath: string;
  readonly auditPath: string;
  readonly packetPath: string;
  readonly invocationLedgerPaths: readonly string[];
  readonly outputPath: string;
}): ReviewInvocationEvidenceManifest {
  const manifest = deriveManifest(input);
  writeFileSync(
    resolve(repoRoot, input.outputPath),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: "wx" },
  );
  return manifest;
}

export function readReviewInvocationEvidenceManifest(
  path: string,
): ReviewInvocationEvidenceManifest {
  const decoded = Schema.decodeUnknownEither(
    ReviewInvocationEvidenceManifestSchema,
    { onExcessProperty: "error" },
  )(json(path));
  if (Either.isLeft(decoded)) fail(decoded.left.message);
  const manifest = decoded.right;
  const derived = deriveManifest({
    transcriptPath: manifest.transcript.path,
    reviewPath: manifest.review.path,
    auditPath: manifest.audit.path,
    packetPath: manifest.packet.path,
    invocationLedgerPaths: manifest.invocationLedgers.map(({ path }) => path),
  });
  if (JSON.stringify(derived) !== JSON.stringify(manifest)) {
    fail("Review invocation evidence changed from its hash-linked artifacts.");
  }
  return manifest;
}

function main(args: readonly string[]): void {
  const [
    command,
    transcriptPath,
    reviewPath,
    auditPath,
    packetPath,
    outputPath,
    ...ledgers
  ] = args;
  if (
    command !== "create" ||
    transcriptPath === undefined ||
    reviewPath === undefined ||
    auditPath === undefined ||
    packetPath === undefined ||
    outputPath === undefined ||
    ledgers.length === 0
  ) {
    fail(
      "Usage: review-invocation-evidence.ts create <transcript.jsonl> <review.json> <audit.jsonl> <packet.json> <manifest.json> <invocation-ledger.jsonl> [...ledgers]",
    );
  }
  writeReviewInvocationEvidenceManifest({
    transcriptPath,
    reviewPath,
    auditPath,
    packetPath,
    invocationLedgerPaths: ledgers,
    outputPath,
  });
}

if (process.argv[1]?.endsWith("review-invocation-evidence.ts")) {
  main(process.argv.slice(2));
}
