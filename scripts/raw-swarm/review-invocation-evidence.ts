import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Schema } from "effect";

import {
  artifactAuthority,
  ArtifactAuthoritySchema,
  readJsonLines,
  type ArtifactAuthority,
} from "./artifact-authority.ts";
export {
  ArtifactAuthoritySchema,
  type ArtifactAuthority,
} from "./artifact-authority.ts";
import {
  modelInvocationEvidenceFromEvents,
  parseModelInvocationLedgerEntry,
  readCodexEvents,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import {
  finalAgentMessage,
  retainedReviewInput,
  validateRetainedScenarioReviewInvocation,
} from "./review-invocation-binding.ts";
import { reviewInvocationPolicy } from "./review-invocation-policy.ts";
import {
  codexOutputJsonSchema,
  FinalScenarioReviewSchema,
  ScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import {
  reviewEvidenceCatalogForPacket,
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
  type GitSha,
  type ScenarioId,
} from "./transcript.ts";

export const ReviewInvocationEvidenceManifestSchema = Schema.Struct({
  type: Schema.Literal("review-invocation-evidence"),
  schemaVersion: Schema.Literal(1),
  scenarioId: ScenarioIdSchema,
  transcriptGitSha: GitShaSchema,
  invocationGitSha: GitShaSchema,
  transcript: ArtifactAuthoritySchema,
  review: ArtifactAuthoritySchema,
  audit: ArtifactAuthoritySchema,
  packet: ArtifactAuthoritySchema,
  prePlayReviews: Schema.Tuple(
    Schema.Struct({
      reviewStage: Schema.Literal("milestone"),
      sourceInput: ArtifactAuthoritySchema,
      replayInput: ArtifactAuthoritySchema,
    }),
    Schema.Struct({
      reviewStage: Schema.Literal("final"),
      sourceInput: ArtifactAuthoritySchema,
      replayInput: ArtifactAuthoritySchema,
    }),
  ),
  invocationLedgers: Schema.Tuple(ArtifactAuthoritySchema),
  invocationEvents: Schema.NonEmptyArray(ArtifactAuthoritySchema),
});

export type ReviewInvocationEvidenceManifest = Schema.Schema.Type<
  typeof ReviewInvocationEvidenceManifestSchema
>;

function fail(message: string): never {
  throw new Error(message);
}

function json(path: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
  } catch {
    return fail(`Review invocation evidence ${path} is malformed JSON.`);
  }
}

function scenarioReviewIdentity(packet: {
  readonly runArtifacts: readonly { readonly path: string }[];
}): { readonly scenarioId: ScenarioId; readonly gitSha: GitSha } {
  const sources = packet.runArtifacts.filter(({ path }) =>
    path.endsWith("/SCENARIO_REVIEW.json"),
  );
  const source = sources[0];
  if (sources.length !== 1 || source === undefined)
    fail("Review evidence packet requires one scenario review authority.");
  const decoded = Schema.decodeUnknownEither(FinalScenarioReviewSchema, {
    onExcessProperty: "error",
  })(json(source.path));
  if (Either.isLeft(decoded))
    fail(`Scenario review authority is invalid: ${decoded.left.message}`);
  return {
    scenarioId: decoded.right.scenarioId,
    gitSha: decoded.right.gitSha,
  };
}

function ledgerEntries(path: string): readonly ModelInvocationLedgerEntry[] {
  const lines = readJsonLines(path);
  if (lines.length === 0) fail("Review invocation ledgers must be nonempty.");
  return lines.map((value) => {
    const decoded = parseModelInvocationLedgerEntry(value);
    if (Either.isLeft(decoded)) fail(decoded.left.message);
    return decoded.right;
  });
}

/**
 * Binds one retained original composite-review envelope to the event stream
 * and v2 ledger row that produced it. The event authority remains separate
 * from the envelope authority so callers cannot substitute a copied ledger
 * row or result while retaining the original input path.
 */
export function validateRetainedScenarioReviewInvocationEvidence(input: {
  readonly retainedInputPath: string;
  readonly eventPath: string;
  readonly reviewStage: "milestone" | "final";
  readonly ledgerEntry: ModelInvocationLedgerEntry;
}): ArtifactAuthority {
  const eventAuthority = artifactAuthority(input.eventPath);
  validateRetainedScenarioReviewInvocation({
    ...input,
    eventSha256: eventAuthority.sha256,
  });
  return eventAuthority;
}

function deriveManifest(input: {
  readonly transcriptPath: string;
  readonly reviewPath: string;
  readonly auditPath: string;
  readonly packetPath: string;
  readonly prePlayReviewPaths: readonly [
    { readonly sourceInputPath: string; readonly replayInputPath: string },
    { readonly sourceInputPath: string; readonly replayInputPath: string },
  ];
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
  const scenarioReview = scenarioReviewIdentity(packetValidation.packet);
  if (scenarioReview.scenarioId !== audit.audit.header.scenarioId)
    fail("Scenario review authority does not match the audited run.");
  const evidence = reviewEvidenceCatalogForPacket(packetValidation.packet);
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
  if (entries.some((entry) => entry.schemaVersion !== 2)) {
    fail(
      "Current review invocation evidence requires v2 ledger entries; v1 is historical evidence only.",
    );
  }
  if (
    entries.some((entry) => entry.scenarioId !== audit.audit.header.scenarioId)
  )
    fail("Review invocation ledger identity does not match the audited run.");
  if (
    new Set(entries.map(({ invocationId }) => invocationId)).size !==
    entries.length
  ) {
    fail("Review invocation ledger invocation ids must be distinct.");
  }
  const eventEvidence = input.invocationEventPaths.map((path) => {
    const parsed = readCodexEvents(resolve(repoRoot, path));
    if (parsed.tag === "invalid") fail(parsed.message);
    return { authority: artifactAuthority(path), events: parsed.events };
  });
  const eventHashes = eventEvidence.map(({ authority }) => authority.sha256);
  const evidenceByHash = new Map(
    eventEvidence.map((evidence) => [evidence.authority.sha256, evidence]),
  );
  if (
    new Set(eventHashes).size !== eventHashes.length ||
    entries.length !== eventEvidence.length ||
    entries.some((entry) => {
      const evidence = evidenceByHash.get(entry.eventsSha256);
      if (evidence === undefined) return true;
      const derived = modelInvocationEvidenceFromEvents(evidence.events);
      return (
        derived.tag === "invalid" ||
        canonicalJson(derived.entry) !==
          canonicalJson(
            Object.fromEntries(
              Object.entries(entry).filter(([key]) => key !== "eventsSha256"),
            ),
          )
      );
    })
  )
    fail("Review invocation ledgers do not match their Codex event streams.");
  const invocationGitShas = new Set(entries.map(({ gitSha }) => gitSha));
  const invocationGitSha = entries[0]?.gitSha;
  if (invocationGitShas.size !== 1 || invocationGitSha === undefined)
    fail("Controlled review invocations require one implementation revision.");
  const expectedOutputSchema = codexOutputJsonSchema(
    ScenarioCompositeReviewSchema,
  );
  const scenarioReviewEntries = entries.filter(
    ({ phase }) => phase === "scenarioCompositeReview",
  );
  if (scenarioReviewEntries.length !== 2) {
    fail("Review invocation evidence requires two pre-play reviews.");
  }
  const prePlayReplayInputs = input.prePlayReviewPaths.map(
    ({ replayInputPath }, index) =>
      retainedReviewInput(replayInputPath, index === 0 ? "milestone" : "final"),
  );
  const prePlayReplayInputIds = prePlayReplayInputs.map(
    ({ invocationId }) => invocationId,
  );
  const scenarioReviewEntryIds = new Set(
    scenarioReviewEntries.map(({ invocationId }) => invocationId),
  );
  if (
    new Set(prePlayReplayInputIds).size !== prePlayReplayInputIds.length ||
    prePlayReplayInputIds.some(
      (invocationId) => !scenarioReviewEntryIds.has(invocationId),
    ) ||
    scenarioReviewEntryIds.size !== prePlayReplayInputIds.length
  ) {
    fail(
      "Pre-play review inputs must map one-to-one to distinct scenario-review invocations.",
    );
  }
  const sourceReplayInvocationIds = input.prePlayReviewPaths.flatMap(
    ({ sourceInputPath, replayInputPath }, index) => {
      const expectedStage = index === 0 ? "milestone" : "final";
      const sourceInput = retainedReviewInput(sourceInputPath, expectedStage);
      const replayInput = retainedReviewInput(replayInputPath, expectedStage);
      return [sourceInput.invocationId, replayInput.invocationId];
    },
  );
  if (
    new Set(sourceReplayInvocationIds).size !== sourceReplayInvocationIds.length
  ) {
    fail(
      "Pre-play source and replay invocation identities must be distinct by stage.",
    );
  }
  const prePlayReview = <Stage extends "milestone" | "final">(
    reviewStage: Stage,
    paths: {
      readonly sourceInputPath: string;
      readonly replayInputPath: string;
    },
  ) => {
    const { sourceInputPath, replayInputPath } = paths;
    const sourceInput = retainedReviewInput(sourceInputPath, reviewStage);
    const replayInput = retainedReviewInput(replayInputPath, reviewStage);
    if (
      sourceInput.scenarioId !== audit.audit.header.scenarioId ||
      sourceInput.sourceGitSha !== scenarioReview.gitSha ||
      replayInput.scenarioId !== audit.audit.header.scenarioId ||
      replayInput.sourceGitSha !== invocationGitSha ||
      canonicalJson(sourceInput.prompt) !== canonicalJson(replayInput.prompt) ||
      canonicalJson(sourceInput.outputJsonSchema) !==
        canonicalJson(expectedOutputSchema) ||
      canonicalJson(replayInput.outputJsonSchema) !==
        canonicalJson(expectedOutputSchema)
    ) {
      fail(
        `Retained ${reviewStage} source and replay inputs do not describe the measured review.`,
      );
    }
    const matchingEntries = scenarioReviewEntries.filter(
      ({ invocationId }) => invocationId === replayInput.invocationId,
    );
    const entry = matchingEntries[0];
    const events = eventEvidence.find(
      ({ authority }) => authority.sha256 === entry?.eventsSha256,
    );
    const output =
      events === undefined ? undefined : finalAgentMessage(events.events);
    const decodedOutput = Schema.decodeUnknownEither(
      Schema.Struct({ result: ScenarioCompositeReviewSchema }),
      { onExcessProperty: "error" },
    )(output);
    if (
      entry === undefined ||
      events === undefined ||
      entry.model !== replayInput.model ||
      entry.reasoningEffort !== replayInput.reasoningEffort ||
      Either.isLeft(decodedOutput) ||
      canonicalJson(decodedOutput.right.result) !==
        canonicalJson(replayInput.result)
    ) {
      fail(
        `Retained ${reviewStage} replay input does not match its invocation evidence.`,
      );
    }
    return {
      reviewStage,
      sourceInput: artifactAuthority(sourceInputPath),
      replayInput: artifactAuthority(replayInputPath),
    };
  };
  const prePlayReviews = [
    prePlayReview("milestone", input.prePlayReviewPaths[0]),
    prePlayReview("final", input.prePlayReviewPaths[1]),
  ] as const;
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
    transcriptGitSha: audit.audit.header.gitSha,
    invocationGitSha,
    transcript,
    review: artifactAuthority(input.reviewPath),
    audit: artifactAuthority(input.auditPath),
    packet: packetAuthority,
    prePlayReviews: [prePlayReviews[0]!, prePlayReviews[1]!],
    invocationLedgers: [artifactAuthority(input.invocationLedgerPaths[0]!)],
    invocationEvents: [
      eventEvidence[0]!.authority,
      ...eventEvidence.slice(1).map(({ authority }) => authority),
    ],
  };
}

export function writeReviewInvocationEvidenceManifest(input: {
  readonly transcriptPath: string;
  readonly reviewPath: string;
  readonly auditPath: string;
  readonly packetPath: string;
  readonly prePlayReviewPaths: readonly [
    { readonly sourceInputPath: string; readonly replayInputPath: string },
    { readonly sourceInputPath: string; readonly replayInputPath: string },
  ];
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
    prePlayReviewPaths: [
      {
        sourceInputPath: manifest.prePlayReviews[0].sourceInput.path,
        replayInputPath: manifest.prePlayReviews[0].replayInput.path,
      },
      {
        sourceInputPath: manifest.prePlayReviews[1].sourceInput.path,
        replayInputPath: manifest.prePlayReviews[1].replayInput.path,
      },
    ],
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
    milestoneSourceInputPath,
    milestoneReplayInputPath,
    finalSourceInputPath,
    finalReplayInputPath,
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
    milestoneSourceInputPath === undefined ||
    milestoneReplayInputPath === undefined ||
    finalSourceInputPath === undefined ||
    finalReplayInputPath === undefined ||
    ledgerPath === undefined ||
    eventPaths.length === 0
  ) {
    fail(
      "Usage: review-invocation-evidence.ts create <transcript.jsonl> <review.json> <audit.jsonl> <packet.json> <manifest.json> <milestone-source-input.json> <milestone-replay-input.json> <final-source-input.json> <final-replay-input.json> <invocation-ledger.jsonl> <invocation-events.jsonl> [...events]",
    );
  }
  writeReviewInvocationEvidenceManifest({
    transcriptPath,
    reviewPath,
    auditPath,
    packetPath,
    prePlayReviewPaths: [
      {
        sourceInputPath: milestoneSourceInputPath,
        replayInputPath: milestoneReplayInputPath,
      },
      {
        sourceInputPath: finalSourceInputPath,
        replayInputPath: finalReplayInputPath,
      },
    ],
    invocationLedgerPaths: [ledgerPath],
    invocationEventPaths: eventPaths,
    outputPath,
  });
}

if (process.argv[1]?.endsWith("review-invocation-evidence.ts")) {
  main(process.argv.slice(2));
}
