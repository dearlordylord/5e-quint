import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

import { Result, Schema } from "effect";

import {
  artifactAuthority,
  ArtifactAuthoritySchema,
  artifactAuthorityForBytes,
  readJsonLines,
  type ArtifactAuthority,
} from "./artifact-authority.ts";
export {
  ArtifactAuthoritySchema,
  type ArtifactAuthority,
} from "./artifact-authority.ts";
import {
  modelInvocationEvidenceFromEvents,
  modelInvocationScenarioReference,
  codexRawRetentionEventFromEvents,
  parseModelInvocationLedgerEntry,
  readCodexRawRetentionArtifact,
  readCodexEventsWithSource,
  type CurrentModelInvocationLedgerEntry,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";
import {
  finalAgentMessage,
  validateRetainedScenarioReviewInvocation,
} from "./review-invocation-binding.ts";
import { reviewInvocationPolicy } from "./review-invocation-policy.ts";
import {
  RetainedScenarioReviewInputSchema,
  retainedScenarioReviewCampaignOwner,
  retainedScenarioReviewMatchesReplayBinding,
  retainedScenarioReviewReplayExpectation,
  retainedScenarioReviewSubject,
  type RetainedScenarioReviewReplayOwner,
  type RetainedScenarioReviewInput,
} from "./scenario-review-input.ts";
import {
  FinalScenarioReviewSchema,
  classifyScenarioReviewOutputSchema,
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
import {
  canonicalRepositoryReadPath,
  canonicalRepositoryReadRelativePath,
} from "./repository-path.ts";
import {
  ScenarioCampaignManifestSchema,
  type ScenarioCampaignManifest,
} from "./evidence-manifests.ts";

// This manifest is the current tracer evidence shape: unlike the fixed
// benchmark's historical documentDeclarationSet path, it retains the packet
// inline and therefore intentionally requires a commandless post-play review.
// The benchmark context-delivery manifest is the separate authority for the
// legacy command-read profile and is not an optional bypass here.
const CURRENT_TRACER_REVIEW_INVOCATION_POLICY = {
  profile: "boundedCapabilityProjection",
} as const;

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
  campaign: ArtifactAuthoritySchema,
  prePlayReviews: Schema.Tuple([
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
  ]),
  invocationLedgers: Schema.Tuple([ArtifactAuthoritySchema]),
  invocationEvents: Schema.NonEmptyArray(ArtifactAuthoritySchema),
  invocationRawArtifacts: Schema.Array(ArtifactAuthoritySchema),
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
  readonly executionArtifacts: readonly { readonly path: string }[];
}): {
  readonly scenarioId: ScenarioId;
  readonly scenarioSha256: string;
  readonly gitSha: GitSha;
} {
  const sources = packet.executionArtifacts.filter(({ path }) =>
    path.endsWith("/SCENARIO_REVIEW.json"),
  );
  const source = sources[0];
  if (sources.length !== 1 || source === undefined)
    fail("Review evidence packet requires one scenario review authority.");
  const decoded = Schema.decodeUnknownResult(FinalScenarioReviewSchema, {
    onExcessProperty: "error",
  })(json(source.path));
  if (Result.isFailure(decoded))
    fail(`Scenario review authority is invalid: ${decoded.failure.message}`);
  return {
    scenarioId: decoded.success.scenarioId,
    scenarioSha256: decoded.success.scenarioSha256,
    gitSha: decoded.success.gitSha,
  };
}

function retainedScenarioReviewScenarioReference(
  input: RetainedScenarioReviewInput,
): string {
  const subject = retainedScenarioReviewSubject(input);
  return String(
    subject.tag === "scenarioCandidate"
      ? subject.plannedScenarioId
      : subject.scenarioId,
  );
}

function ledgerEntries(path: string): readonly ModelInvocationLedgerEntry[] {
  const lines = readJsonLines(path);
  if (lines.length === 0) fail("Review invocation ledgers must be nonempty.");
  return lines.map((value) => {
    const decoded = parseModelInvocationLedgerEntry(value);
    if (Result.isFailure(decoded)) fail(decoded.failure.message);
    return decoded.success;
  });
}

type ControlledCampaignAuthority = Readonly<{
  readonly manifest: ScenarioCampaignManifest;
  readonly authority: ArtifactAuthority;
}>;

function campaignAuthorityForControlledReview(
  retainedReviewInputPath: string,
): ControlledCampaignAuthority {
  const canonicalReviewInputPath = canonicalRepositoryReadPath(
    repoRoot,
    retainedReviewInputPath,
  );
  if (Result.isFailure(canonicalReviewInputPath)) {
    fail(
      `Controlled review invocations require a repository-owned retained review input: ${canonicalReviewInputPath.failure}`,
    );
  }
  const reviewInputDirectory = dirname(canonicalReviewInputPath.success);
  const campaignDirectory = basename(reviewInputDirectory).endsWith(
    "-review-inputs",
  )
    ? dirname(reviewInputDirectory)
    : reviewInputDirectory;
  const campaignPath = resolve(campaignDirectory, "campaign.json");
  const canonicalCampaignPath = canonicalRepositoryReadPath(
    repoRoot,
    campaignPath,
  );
  if (Result.isFailure(canonicalCampaignPath)) {
    fail(
      `Controlled review invocations require the Campaign manifest adjacent to ${retainedReviewInputPath}: ${canonicalCampaignPath.failure}`,
    );
  }
  const bytes = readFileSync(canonicalCampaignPath.success);
  const value: unknown = (() => {
    try {
      return JSON.parse(bytes.toString("utf8")) as unknown;
    } catch {
      fail(
        `Controlled review Campaign manifest is malformed JSON: ${canonicalCampaignPath.success}`,
      );
    }
  })();
  const decoded = Schema.decodeUnknownResult(ScenarioCampaignManifestSchema, {
    onExcessProperty: "error",
  })(value);
  if (Result.isFailure(decoded)) {
    fail(
      `Controlled review Campaign manifest is invalid: ${decoded.failure.message}`,
    );
  }
  const relativePath = canonicalRepositoryReadRelativePath(
    repoRoot,
    canonicalCampaignPath.success,
  );
  if (Result.isFailure(relativePath)) fail(relativePath.failure);
  return {
    manifest: decoded.success,
    authority: artifactAuthorityForBytes(relativePath.success, bytes),
  };
}

type RetainedReviewInputArtifact = Readonly<{
  readonly input: RetainedScenarioReviewInput;
  readonly authority: ArtifactAuthority;
}>;

function readRetainedReviewBytes(
  path: string,
  expectedStage: "milestone" | "final",
): Result.Result<Buffer, string> {
  const canonicalPath = canonicalRepositoryReadPath(repoRoot, path);
  if (Result.isFailure(canonicalPath))
    return Result.fail(canonicalPath.failure);
  try {
    return Result.succeed(readFileSync(canonicalPath.success));
  } catch {
    return Result.fail(`Retained ${expectedStage} review input is unreadable.`);
  }
}

function retainedReviewInputArtifact(
  path: string,
  expectedStage: "milestone" | "final",
): RetainedReviewInputArtifact {
  const bytes = readRetainedReviewBytes(path, expectedStage);
  if (Result.isFailure(bytes)) fail(bytes.failure);
  const value: Result.Result<unknown, string> = (() => {
    try {
      return Result.succeed(
        JSON.parse(bytes.success.toString("utf8")) as unknown,
      );
    } catch {
      return Result.fail(
        `Retained ${expectedStage} review input is malformed JSON.`,
      );
    }
  })();
  if (Result.isFailure(value)) fail(value.failure);
  const decoded = Schema.decodeUnknownResult(
    RetainedScenarioReviewInputSchema,
    { onExcessProperty: "error" },
  )(value.success);
  if (Result.isFailure(decoded)) {
    fail(
      `Retained ${expectedStage} review input is invalid: ${decoded.failure.message}`,
    );
  }
  if (decoded.success.reviewStage !== expectedStage) {
    fail(`Retained ${expectedStage} review input has the wrong stage.`);
  }
  const repositoryPath = canonicalRepositoryReadRelativePath(repoRoot, path);
  if (Result.isFailure(repositoryPath)) fail(repositoryPath.failure);
  return {
    input: decoded.success,
    authority: artifactAuthorityForBytes(repositoryPath.success, bytes.success),
  };
}

/**
 * Binds one retained original composite-review envelope to the event stream
 * and current ledger row that produced it. The event authority remains separate
 * from the envelope authority so callers cannot substitute a copied ledger
 * row or result after the envelope has been parsed.
 */
export function validateRetainedScenarioReviewInvocationEvidence(input: {
  readonly retainedInput: RetainedScenarioReviewInput;
  readonly eventAuthority: ArtifactAuthority;
  readonly events: readonly unknown[];
  readonly reviewStage: "milestone" | "final";
  readonly ledgerEntry: ModelInvocationLedgerEntry;
  /** The admitted Scenario hash used to close a final Candidate binding. */
  readonly admittedScenarioSha256: string;
  readonly replayOwner: RetainedScenarioReviewReplayOwner;
}): ArtifactAuthority {
  const retained = input.retainedInput;
  const binding = retainedScenarioReviewMatchesReplayBinding(
    retained,
    input.ledgerEntry,
    retainedScenarioReviewReplayExpectation(retained, {
      reviewStage: input.reviewStage,
      scenarioId: modelInvocationScenarioReference(input.ledgerEntry),
      admittedScenarioSha256: input.admittedScenarioSha256,
      owner: input.replayOwner,
    }),
  );
  if (Result.isFailure(binding)) fail(binding.failure);
  validateRetainedScenarioReviewInvocation({
    binding: binding.success,
    eventSha256: input.eventAuthority.sha256,
    events: input.events,
  });
  return input.eventAuthority;
}

type InvocationEventEvidence = {
  readonly authority: ArtifactAuthority;
  readonly events: readonly unknown[];
  readonly rawArtifact: ArtifactAuthority | undefined;
};

function readInvocationEventEvidence(path: string): InvocationEventEvidence {
  const canonicalPath = canonicalRepositoryReadPath(repoRoot, path);
  if (Result.isFailure(canonicalPath)) fail(canonicalPath.failure);
  const parsed = readCodexEventsWithSource(canonicalPath.success);
  if (parsed.tag === "invalid") fail(parsed.message);
  const retention = codexRawRetentionEventFromEvents(parsed.events);
  if (retention.tag === "invalid") fail(retention.message);
  const repositoryPath = canonicalRepositoryReadRelativePath(repoRoot, path);
  if (Result.isFailure(repositoryPath)) fail(repositoryPath.failure);
  const rawArtifact = (() => {
    if (retention.event === undefined) return undefined;
    const artifact = readCodexRawRetentionArtifact({
      eventPath: canonicalPath.success,
      event: retention.event,
    });
    if (Result.isFailure(artifact)) fail(artifact.failure);
    const relativePath = canonicalRepositoryReadRelativePath(
      repoRoot,
      artifact.success.path,
    );
    if (Result.isFailure(relativePath)) fail(relativePath.failure);
    return artifactAuthorityForBytes(
      relativePath.success,
      artifact.success.contents,
    );
  })();
  return {
    authority: artifactAuthorityForBytes(
      repositoryPath.success,
      parsed.rawContents,
    ),
    events: parsed.events,
    rawArtifact,
  };
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
    fail("Scenario review authority does not match the audited execution.");
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
  if (
    entries.some(
      (entry) => entry.schemaVersion !== 4 && entry.schemaVersion !== 5,
    )
  ) {
    fail(
      "Current review invocation evidence requires v4 or v5 current ledger entries; earlier versions are historical evidence only.",
    );
  }
  if (
    entries.some(
      (entry) =>
        modelInvocationScenarioReference(entry) !==
        audit.audit.header.scenarioId,
    )
  )
    fail(
      "Review invocation ledger identity does not match the audited execution.",
    );
  if (
    new Set(entries.map(({ invocationId }) => invocationId)).size !==
    entries.length
  ) {
    fail("Review invocation ledger invocation ids must be distinct.");
  }
  const eventEvidence = input.invocationEventPaths.map((path) => {
    return readInvocationEventEvidence(path);
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
  const rawArtifacts = eventEvidence.flatMap(({ rawArtifact }) =>
    rawArtifact === undefined ? [] : [rawArtifact],
  );
  if (
    new Set(rawArtifacts.map(({ path }) => path)).size !==
      rawArtifacts.length ||
    new Set(rawArtifacts.map(({ sha256 }) => sha256)).size !==
      rawArtifacts.length
  ) {
    fail(
      "Review invocation raw-retention artifacts must have unique authorities.",
    );
  }
  for (const evidence of eventEvidence) {
    const entry = entries.find(
      ({ eventsSha256 }) => eventsSha256 === evidence.authority.sha256,
    );
    if (entry === undefined) {
      fail(
        "Review invocation raw-retention evidence has no matching ledger entry.",
      );
    }
    if (
      (entry.schemaVersion === 5 && entry.result.tag === "failed") !==
      (evidence.rawArtifact !== undefined)
    ) {
      fail(
        "Current failed invocation evidence must retain exactly one verified raw sidecar or immutable snapshot.",
      );
    }
  }
  const invocationGitShas = new Set(entries.map(({ gitSha }) => gitSha));
  const invocationGitSha = entries[0]?.gitSha;
  if (invocationGitShas.size !== 1 || invocationGitSha === undefined)
    fail("Controlled review invocations require one implementation revision.");
  const scenarioReviewEntries = entries.filter(
    ({ phase }) => phase === "scenarioCompositeReview",
  );
  if (scenarioReviewEntries.length !== 2) {
    fail("Review invocation evidence requires two pre-play reviews.");
  }
  const currentScenarioReviewEntries = scenarioReviewEntries.flatMap(
    (entry): readonly CurrentModelInvocationLedgerEntry[] =>
      entry.schemaVersion === 4 || entry.schemaVersion === 5 ? [entry] : [],
  );
  const retainedReviewInputPath = input.prePlayReviewPaths[0]?.sourceInputPath;
  if (retainedReviewInputPath === undefined) {
    fail("Controlled review invocations require a retained review input.");
  }
  const campaignAuthority = campaignAuthorityForControlledReview(
    retainedReviewInputPath,
  );
  if (
    String(campaignAuthority.manifest.plannedScenarioId) !==
    String(audit.audit.header.scenarioId)
  ) {
    fail(
      "Controlled review Campaign manifest does not match the audited Scenario identity.",
    );
  }
  const benchmarkSubjects = currentScenarioReviewEntries.flatMap(
    ({ subject }) => (subject.tag === "benchmark" ? [subject] : []),
  );
  const replayOwner: RetainedScenarioReviewReplayOwner = (() => {
    const benchmark = benchmarkSubjects[0];
    if (benchmark !== undefined) {
      if (benchmarkSubjects.length !== currentScenarioReviewEntries.length) {
        fail(
          "Scenario-review invocations must retain one benchmark lifecycle owner.",
        );
      }
      if (
        benchmarkSubjects.some(
          (subject) =>
            subject.benchmarkId !== benchmark.benchmarkId ||
            subject.profile !== benchmark.profile ||
            subject.scenarioId !== benchmark.scenarioId,
        )
      ) {
        fail("Scenario-review invocations must retain one benchmark identity.");
      }
      return { tag: "benchmark", benchmark };
    }
    return retainedScenarioReviewCampaignOwner(campaignAuthority.manifest);
  })();
  const prePlayReviewArtifacts = input.prePlayReviewPaths.map(
    (paths, index) => {
      const expectedStage = index === 0 ? "milestone" : "final";
      return {
        source: retainedReviewInputArtifact(
          paths.sourceInputPath,
          expectedStage,
        ),
        replay: retainedReviewInputArtifact(
          paths.replayInputPath,
          expectedStage,
        ),
      };
    },
  );
  const prePlayReplayInputs = prePlayReviewArtifacts.map(
    ({ replay }) => replay.input,
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
  const sourceReplayInvocationIds = prePlayReviewArtifacts.flatMap(
    ({ source, replay }) => [
      source.input.invocationId,
      replay.input.invocationId,
    ],
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
    artifacts: {
      readonly source: RetainedReviewInputArtifact;
      readonly replay: RetainedReviewInputArtifact;
    },
  ) => {
    const sourceInput = artifacts.source.input;
    const replayInput = artifacts.replay.input;
    const sourceScenarioReference =
      retainedScenarioReviewScenarioReference(sourceInput);
    const replayScenarioReference =
      retainedScenarioReviewScenarioReference(replayInput);
    const compatibility = classifyScenarioReviewOutputSchema({
      schemaVersion: sourceInput.schemaVersion,
      outputJsonSchema: sourceInput.outputJsonSchema,
    });
    if (Result.isFailure(compatibility)) {
      fail(
        `Retained ${reviewStage} source input does not use a canonical composite-review schema.`,
      );
    }
    const decodedSourceResult = compatibility.success.decodeResult(
      sourceInput.result,
    );
    const decodedReplayResult = compatibility.success.decodeResult(
      replayInput.result,
    );
    if (
      Result.isFailure(decodedSourceResult) ||
      Result.isFailure(decodedReplayResult)
    ) {
      fail(
        `Retained ${reviewStage} input result does not match its canonical composite-review schema.`,
      );
    }
    if (
      sourceScenarioReference !== String(audit.audit.header.scenarioId) ||
      sourceInput.sourceGitSha !== scenarioReview.gitSha ||
      replayScenarioReference !== String(audit.audit.header.scenarioId) ||
      replayInput.sourceGitSha !== invocationGitSha ||
      sourceInput.schemaVersion !== replayInput.schemaVersion ||
      canonicalJson(sourceInput.prompt) !== canonicalJson(replayInput.prompt) ||
      canonicalJson(sourceInput.outputJsonSchema) !==
        canonicalJson(replayInput.outputJsonSchema) ||
      canonicalJson(retainedScenarioReviewSubject(sourceInput)) !==
        canonicalJson(retainedScenarioReviewSubject(replayInput))
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
    const decodedOutput = compatibility.success.decodeOutput(output);
    if (entry !== undefined && events !== undefined) {
      validateRetainedScenarioReviewInvocationEvidence({
        retainedInput: replayInput,
        eventAuthority: events.authority,
        events: events.events,
        reviewStage,
        ledgerEntry: entry,
        admittedScenarioSha256: scenarioReview.scenarioSha256,
        replayOwner,
      });
    }
    if (
      entry === undefined ||
      events === undefined ||
      entry.model !== replayInput.model ||
      entry.reasoningEffort !== replayInput.reasoningEffort ||
      Result.isFailure(decodedOutput) ||
      canonicalJson(decodedOutput.success.result) !==
        canonicalJson(decodedReplayResult.success)
    ) {
      fail(
        `Retained ${reviewStage} replay input does not match its invocation evidence.`,
      );
    }
    return {
      reviewStage,
      sourceInput: artifacts.source.authority,
      replayInput: artifacts.replay.authority,
    };
  };
  const prePlayReviews = [
    prePlayReview("milestone", prePlayReviewArtifacts[0]!),
    prePlayReview("final", prePlayReviewArtifacts[1]!),
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
  const policy = reviewInvocationPolicy(
    postPlayEvents.events,
    CURRENT_TRACER_REVIEW_INVOCATION_POLICY,
  );
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
    campaign: campaignAuthority.authority,
    prePlayReviews: [prePlayReviews[0]!, prePlayReviews[1]!],
    invocationLedgers: [artifactAuthority(input.invocationLedgerPaths[0]!)],
    invocationEvents: [
      eventEvidence[0]!.authority,
      ...eventEvidence.slice(1).map(({ authority }) => authority),
    ],
    invocationRawArtifacts: rawArtifacts,
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
  const decoded = Schema.decodeUnknownResult(
    ReviewInvocationEvidenceManifestSchema,
    { onExcessProperty: "error" },
  )(json(path));
  if (Result.isFailure(decoded)) fail(decoded.failure.message);
  const manifest = decoded.success;
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
