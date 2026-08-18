import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import { repositoryArtifactPath } from "./artifact-index.ts";
import {
  invocationIdFromCodexEvents,
  modelUsageFromCodexEvents,
  parseModelInvocationLedgerEntry,
  readCodexEvents,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import { reviewInvocationPolicy } from "./review-invocation-policy.ts";
import {
  reviewEvidenceCatalogForAudit,
  validateReviewOutput,
} from "./review-output-validation.ts";
import { readSdkAudit } from "./sdk-player/sdk-audit.ts";
import {
  SDK_REVIEW_PACKET_MAX_BYTES,
  validateSdkReviewPacket,
} from "./sdk-player/sdk-review-packet.ts";
import {
  canonicalJson,
  GitShaSchema,
  repoRoot,
  ScenarioIdSchema,
} from "./transcript.ts";

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
  scenarioId: ScenarioIdSchema,
  gitSha: GitShaSchema,
  transcript: ArtifactAuthoritySchema,
  review: ArtifactAuthoritySchema,
  audit: ArtifactAuthoritySchema,
  packet: ArtifactAuthoritySchema,
  invocationLedgers: Schema.Array(ArtifactAuthoritySchema).pipe(
    Schema.minItems(1),
  ),
  invocationEvents: Schema.Array(ArtifactAuthoritySchema).pipe(
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
  const repositoryPath = repositoryArtifactPath(path);
  const bytes = readFileSync(resolve(repoRoot, repositoryPath));
  return {
    path: repositoryPath,
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

function ledgerEntries(path: string): readonly ModelInvocationLedgerEntry[] {
  const lines = readFileSync(resolve(repoRoot, path), "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) fail("Review invocation ledgers must be nonempty.");
  return lines.map((line) => {
    try {
      const value: unknown = JSON.parse(line);
      const decoded = parseModelInvocationLedgerEntry(value);
      if (Either.isLeft(decoded)) fail(decoded.left.message);
      return decoded.right;
    } catch {
      return fail("Review invocation ledger contains malformed evidence.");
    }
  });
}

function finalAgentMessage(events: readonly unknown[]): unknown {
  const messages = events.flatMap((event): readonly string[] => {
    if (
      typeof event !== "object" ||
      event === null ||
      !("type" in event) ||
      event.type !== "item.completed" ||
      !("item" in event) ||
      typeof event.item !== "object" ||
      event.item === null ||
      !("type" in event.item) ||
      event.item.type !== "agent_message" ||
      !("text" in event.item) ||
      typeof event.item.text !== "string"
    )
      return [];
    return [event.item.text];
  });
  const message = messages.at(-1);
  if (message === undefined)
    fail("Review invocation has no final agent message.");
  try {
    return JSON.parse(message) as unknown;
  } catch {
    return fail("Review invocation final agent message is not JSON.");
  }
}

function deriveManifest(input: {
  readonly transcriptPath: string;
  readonly reviewPath: string;
  readonly auditPath: string;
  readonly packetPath: string;
  readonly invocationLedgerPaths: readonly string[];
  readonly invocationEventPaths: readonly string[];
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
    input.invocationLedgerPaths.length !== 1 ||
    new Set(input.invocationEventPaths).size !==
      input.invocationEventPaths.length ||
    input.invocationEventPaths.length === 0
  ) {
    fail(
      "Review invocation evidence requires one ledger and unique event streams.",
    );
  }
  const entries = input.invocationLedgerPaths.flatMap(ledgerEntries);
  if (
    entries.some(
      (entry) =>
        entry.scenarioId !== audit.audit.header.scenarioId ||
        entry.gitSha !== audit.audit.header.gitSha,
    )
  )
    fail("Review invocation ledger identity does not match the audited run.");
  const eventEvidence = input.invocationEventPaths.map((path) => {
    const parsed = readCodexEvents(resolve(repoRoot, path));
    if (parsed.tag === "invalid") fail(parsed.message);
    return { authority: artifactAuthority(path), events: parsed.events };
  });
  if (
    entries.length !== eventEvidence.length ||
    entries.some((entry) => {
      const evidence = eventEvidence.find(
        ({ authority }) => authority.sha256 === entry.eventsSha256,
      );
      return (
        evidence === undefined ||
        invocationIdFromCodexEvents(evidence.events, "") !==
          entry.invocationId ||
        canonicalJson(modelUsageFromCodexEvents(evidence.events)) !==
          canonicalJson(entry.usage)
      );
    })
  )
    fail("Review invocation ledgers do not match their Codex event streams.");
  const postPlayEntries = entries.filter(
    ({ phase }) => phase === "postPlayReview",
  );
  if (postPlayEntries.length !== 1)
    fail("Review invocation evidence requires exactly one post-play review.");
  const postPlayEvents = eventEvidence.find(
    ({ authority }) => authority.sha256 === postPlayEntries[0]?.eventsSha256,
  );
  if (postPlayEvents === undefined)
    fail("Post-play review events are missing.");
  const policy = reviewInvocationPolicy(postPlayEvents.events);
  if (policy.tag === "invalid") fail(policy.message);
  if (
    canonicalJson(finalAgentMessage(postPlayEvents.events)) !==
    canonicalJson(review)
  )
    fail("Post-play review events do not produce the retained review output.");
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
    invocationEvents: eventEvidence.map(({ authority }) => authority),
  };
}

export function writeReviewInvocationEvidenceManifest(input: {
  readonly transcriptPath: string;
  readonly reviewPath: string;
  readonly auditPath: string;
  readonly packetPath: string;
  readonly invocationLedgerPaths: readonly string[];
  readonly invocationEventPaths: readonly string[];
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
    invocationEventPaths: manifest.invocationEvents.map(({ path }) => path),
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
    ledgerPath,
    ...eventPaths
  ] = args;
  if (
    command !== "create" ||
    transcriptPath === undefined ||
    reviewPath === undefined ||
    auditPath === undefined ||
    packetPath === undefined ||
    outputPath === undefined ||
    ledgerPath === undefined ||
    eventPaths.length === 0
  ) {
    fail(
      "Usage: review-invocation-evidence.ts create <transcript.jsonl> <review.json> <audit.jsonl> <packet.json> <manifest.json> <invocation-ledger.jsonl> <invocation-events.jsonl> [...events]",
    );
  }
  writeReviewInvocationEvidenceManifest({
    transcriptPath,
    reviewPath,
    auditPath,
    packetPath,
    invocationLedgerPaths: [ledgerPath],
    invocationEventPaths: eventPaths,
    outputPath,
  });
}

if (process.argv[1]?.endsWith("review-invocation-evidence.ts")) {
  main(process.argv.slice(2));
}
