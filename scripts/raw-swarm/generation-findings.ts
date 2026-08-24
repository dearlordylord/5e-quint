import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, Match, Schema } from "effect";

import {
  addSource,
  authorityFor,
  deduplicateFindings,
  findingsFromGenerationLedger,
  findingsFromScenarioReviewSource,
  findingsFromStagePlanSource,
  makeFinding,
  pointerForSource,
  readSourceRecord,
  sourcePath,
  unresolvedSource,
  validateFindingsProjection,
  RAW_SWARM_FINDINGS_SCHEMA_VERSION,
  type Finding,
  type FindingCategory,
  type FindingKind,
  type FindingStage,
  type FindingsProjection,
  type FindingsSubject,
  type ScenarioReviewIdentityExpectation,
  type StagePlanIdentityExpectation,
  type Source,
} from "./findings.ts";
import {
  scenarioStagePlanFindings,
  ScenarioStagePlanFindingsSchema,
  validateScenarioStagePlan,
  type ScenarioStagePlan,
} from "./scenario-stage-plan.ts";
import {
  canonicalJson,
  repoRoot,
  ScenarioIdSchema,
  sha256Canonical,
  type ScenarioId,
} from "./transcript.ts";
import {
  FindingsManifestSchema,
  ScenarioCampaignManifestSchema,
  type ScenarioCampaignManifest,
} from "./evidence-manifests.ts";
import { RejectedScenarioCandidateRecordSchema } from "./scenario-catalogue.ts";
import { RejectedScenarioCandidateReviewSchema } from "./scenario-campaign.ts";
import { artifactAuthorityForBytes } from "./artifact-authority.ts";
import {
  codexRawRetentionEventFromEvents,
  modelInvocationEvidenceFromEvents,
  parseModelInvocationLedgerEntry,
  readCodexRawRetentionArtifact,
  readCodexEventsWithSource,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";

type WithoutTranscriptState<A> = A extends FindingsSubject
  ? Omit<A, "sdkCalls">
  : never;
type FindingsManifestIdentity = WithoutTranscriptState<FindingsSubject>;

type GenerationFindingsProjectionCommonInput = {
  readonly authorityPaths: readonly {
    readonly role: string;
    readonly path: string;
  }[];
  readonly generationLedgerPaths: readonly string[];
  /** Retained canonical event streams for Campaign-owned model invocations. */
  readonly generationEventPaths?: readonly string[];
  readonly pointerAuthorityRole?: string;
};

export type GenerationFindingsProjectionInput =
  GenerationFindingsProjectionCommonInput &
    (
      | {
          readonly disposition: { readonly tag: "completed" };
          readonly scenarioReviewPaths: readonly string[];
          readonly stagePlanPaths: readonly string[];
          readonly stagePlanFindingsPaths: readonly string[];
        }
      | {
          readonly disposition: {
            readonly tag: "campaignFailure";
            readonly reason: string;
          };
          readonly scenarioReviewPaths: readonly string[];
          readonly stagePlanPaths: readonly string[];
          readonly stagePlanFindingsPaths: readonly string[];
        }
      | {
          readonly disposition: {
            readonly tag: "candidateStagePlanRejection";
            readonly candidateRejectionPath: string;
            readonly candidateProsePath: string;
            readonly stagePlanPath: string;
            readonly stagePlanFindingsPath: string;
          };
        }
      | {
          readonly disposition: {
            readonly tag: "reviewedCandidateRejection";
            readonly candidateRejectionPath: string;
            readonly candidateProsePath: string;
            readonly candidateReviewPath: string;
            readonly stagePlanPath: string;
            readonly stagePlanFindingsPath: string;
          };
        }
    );

export type TranscriptlessFindingsProjectionInput = {
  readonly authorityPaths: readonly {
    readonly role: string;
    readonly path: string;
  }[];
  readonly stage: FindingStage;
  readonly category: FindingCategory;
  readonly kind: FindingKind;
  readonly summary: string;
  readonly detail?: string;
  readonly pointerAuthorityRole?: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function generationLedgerEntries(
  paths: readonly string[],
): readonly ModelInvocationLedgerEntry[] {
  return paths.flatMap((path) => {
    const canonical = sourcePath(path);
    return readFileSync(resolve(repoRoot, canonical), "utf8")
      .split("\n")
      .flatMap((line, index) => {
        if (line.trim().length === 0) return [];
        let value: unknown;
        try {
          value = JSON.parse(line) as unknown;
        } catch {
          fail(
            `Generation ledger ${canonical} line ${String(index + 1)} is invalid JSON.`,
          );
        }
        const decoded = parseModelInvocationLedgerEntry(value);
        if (Either.isLeft(decoded)) {
          fail(
            `Generation ledger ${canonical} line ${String(index + 1)} is malformed: ${decoded.left.message}`,
          );
        }
        return [decoded.right];
      });
  });
}

/**
 * Admit retained Campaign invocation events and their canonical raw siblings.
 * The event stream hash remains the join to the ledger; the retention event is
 * the sole source of raw artifact metadata and the sibling path is fixed by
 * model-telemetry's parser.
 */
function addGenerationInvocationAuthorities(input: {
  readonly sources: Source[];
  readonly generationLedgerPaths: readonly string[];
  readonly generationEventPaths: readonly string[] | undefined;
}): void {
  if (input.generationEventPaths === undefined) return;
  const eventPaths = input.generationEventPaths;
  if (new Set(eventPaths).size !== eventPaths.length) {
    fail("Generation invocation event authorities must have unique paths.");
  }
  const ledgerEntries = generationLedgerEntries(input.generationLedgerPaths);
  if (eventPaths.length !== ledgerEntries.length) {
    fail(
      `Generation invocation retention requires one event stream per ledger entry (received ${String(eventPaths.length)} for ${String(ledgerEntries.length)}).`,
    );
  }
  const eventHashes = new Set<string>();
  for (const [index, path] of eventPaths.entries()) {
    const canonical = sourcePath(path);
    const parsed = readCodexEventsWithSource(resolve(repoRoot, canonical));
    if (parsed.tag === "invalid") {
      fail(
        `Generation invocation events are invalid: ${canonical}: ${parsed.message}`,
      );
    }
    const authority = artifactAuthorityForBytes(canonical, parsed.rawContents);
    if (eventHashes.has(authority.sha256)) {
      fail("Generation invocation event authorities must have unique hashes.");
    }
    eventHashes.add(authority.sha256);
    const matchingEntries = ledgerEntries.filter(
      ({ eventsSha256 }) => eventsSha256 === authority.sha256,
    );
    if (matchingEntries.length !== 1) {
      fail(
        `Generation invocation event authority does not match exactly one ledger entry: ${canonical}.`,
      );
    }
    const derived = modelInvocationEvidenceFromEvents(parsed.events);
    if (derived.tag === "invalid") {
      fail(
        `Generation invocation events cannot rederive their ledger: ${derived.message}`,
      );
    }
    const entry = matchingEntries[0]!;
    if (
      canonicalJson(derived.entry) !==
      canonicalJson(
        Object.fromEntries(
          Object.entries(entry).filter(([key]) => key !== "eventsSha256"),
        ),
      )
    ) {
      fail(
        `Generation invocation ledger does not match its event stream: ${canonical}.`,
      );
    }
    const eventRole = addSource(
      input.sources,
      canonical,
      `generationInvocationEvents-${String(index + 1)}`,
    );
    if (eventRole === undefined) {
      fail(
        `Generation invocation event authority is unreadable: ${canonical}.`,
      );
    }
    const retention = codexRawRetentionEventFromEvents(parsed.events);
    if (retention.tag === "invalid") fail(retention.message);
    const requiresRetention =
      entry.schemaVersion === 5 && entry.result.tag === "failed";
    if (requiresRetention !== (retention.event !== undefined)) {
      fail(
        `Generation invocation ${entry.invocationId} must retain exactly one raw sidecar or immutable snapshot when failed.`,
      );
    }
    if (retention.event !== undefined) {
      const artifact = readCodexRawRetentionArtifact({
        eventPath: resolve(repoRoot, canonical),
        event: retention.event,
      });
      if (Either.isLeft(artifact)) fail(artifact.left);
      const rawPath = sourcePath(artifact.right.path);
      const rawRole = addSource(
        input.sources,
        rawPath,
        `generationInvocationRawArtifact-${String(index + 1)}`,
      );
      if (rawRole === undefined) {
        fail(`Generation invocation raw artifact is unreadable: ${rawPath}.`);
      }
    }
  }
}

function sourceFindingsFromScenarioReview(
  path: string,
  role: string,
  findings: Finding[],
  expectedIdentity: ScenarioReviewIdentityExpectation,
): void {
  findings.push(
    ...findingsFromScenarioReviewSource(path, role, expectedIdentity),
  );
}

function findingsManifestIdentity(
  sources: readonly Source[],
): FindingsManifestIdentity {
  const source = sources.find(
    (candidate) =>
      candidate.role === "campaign" || candidate.role === "execution",
  );
  if (source === undefined) {
    fail(
      "Transcriptless findings require a campaign or execution manifest authority.",
    );
  }
  const decoded = Schema.decodeUnknownEither(FindingsManifestSchema, {
    onExcessProperty: "error",
  })(readSourceRecord(source.path));
  if (Either.isLeft(decoded)) {
    fail(
      `Findings manifest is invalid: ${source.path}: ${decoded.left.message}`,
    );
  }
  return Match.value(decoded.right).pipe(
    Match.when(
      { type: "raw-swarm-scenario-campaign" },
      (campaign): FindingsManifestIdentity => ({
        tag: "scenarioCampaign",
        campaignId: campaign.campaignId,
        evidenceSetId: campaign.evidenceSetId,
        plannedScenarioId: campaign.plannedScenarioId,
        gitSha: campaign.gitSha,
        startedAt: campaign.startedAt,
      }),
    ),
    Match.when(
      { type: "raw-swarm-execution-start" },
      (execution): FindingsManifestIdentity => ({
        tag: "execution",
        executionId: execution.executionId,
        evidenceSetId: execution.evidenceSetId,
        scenarioId: execution.scenarioId,
        gitSha: execution.gitSha,
        startedAt: execution.startedAt,
      }),
    ),
    Match.exhaustive,
  );
}

function campaignManifestFromSources(
  sources: readonly Source[],
): ScenarioCampaignManifest {
  const source = sources.find((candidate) => candidate.role === "campaign");
  if (source === undefined) {
    fail("Campaign findings require a Campaign manifest authority.");
  }
  const decoded = Schema.decodeUnknownEither(ScenarioCampaignManifestSchema, {
    onExcessProperty: "error",
  })(readSourceRecord(source.path));
  if (Either.isLeft(decoded)) {
    fail(
      `Campaign manifest authority is invalid: ${source.path}: ${decoded.left.message}`,
    );
  }
  return decoded.right;
}

function authoredScenarioIdentity(identity: FindingsManifestIdentity) {
  return Match.value(identity).pipe(
    Match.when({ tag: "scenarioCampaign" }, (campaign) => ({
      // Generation ledgers and candidate rejection authorities refer to the
      // campaign reservation.  It becomes a Scenario only at admission.
      scenarioId: campaign.plannedScenarioId,
      gitSha: campaign.gitSha,
    })),
    Match.when({ tag: "execution" }, (execution) => ({
      scenarioId: execution.scenarioId,
      gitSha: execution.gitSha,
    })),
    Match.exhaustive,
  );
}

function admittedScenarioIdentity(
  identity: FindingsManifestIdentity,
): ScenarioId {
  const candidate = authoredScenarioIdentity(identity).scenarioId;
  const decoded = Schema.decodeUnknownEither(ScenarioIdSchema)(candidate);
  if (Either.isLeft(decoded)) {
    fail(
      `Completed Scenario evidence requires an admitted Scenario identity: ${decoded.left.message}`,
    );
  }
  return decoded.right;
}

function makeProjection(input: {
  readonly subject: FindingsManifestIdentity;
  readonly authorities: readonly Source[];
  readonly findings: readonly Finding[];
  readonly pointerAuthorityRole?: string;
}): FindingsProjection {
  const subject: FindingsSubject = Match.value(input.subject).pipe(
    Match.when({ tag: "scenarioCampaign" }, (campaign) => ({
      ...campaign,
      sdkCalls: { tag: "transcriptFree" as const },
    })),
    Match.when({ tag: "execution" }, (execution) => ({
      ...execution,
      sdkCalls: { tag: "transcriptFree" as const },
    })),
    Match.exhaustive,
  );
  const pointerRole =
    input.pointerAuthorityRole === undefined
      ? input.authorities.find(
          (source) => source.role === "campaign" || source.role === "execution",
        )?.role
      : input.authorities.find(
          (source) => source.role === input.pointerAuthorityRole,
        )?.role;
  if (pointerRole === undefined && input.findings.length > 0) {
    fail("Generation findings require a pointer authority.");
  }
  const projection: FindingsProjection = {
    type: "raw-swarm-findings",
    schemaVersion: RAW_SWARM_FINDINGS_SCHEMA_VERSION,
    subjectIdentity: sha256Canonical(subject),
    subject,
    authorities: input.authorities
      .map(authorityFor)
      .sort((left, right) => left.role.localeCompare(right.role)),
    findings: deduplicateFindings(input.findings),
  };
  const validation = validateFindingsProjection(projection);
  if (validation.tag === "invalid") fail(validation.message);
  return projection;
}

export function projectGenerationFindings(
  input: GenerationFindingsProjectionInput,
): FindingsProjection {
  const sources: Source[] = [];
  const sourceFindings: Finding[] = [];
  if (input.authorityPaths.some(({ role }) => role === "candidateRejection")) {
    fail(
      "Candidate rejection authority must be owned by the candidateRejection disposition.",
    );
  }
  for (const authority of input.authorityPaths) {
    addSource(sources, authority.path, authority.role);
  }
  const candidateRejection =
    input.disposition.tag === "candidateStagePlanRejection" ||
    input.disposition.tag === "reviewedCandidateRejection"
      ? input.disposition
      : undefined;
  if (candidateRejection !== undefined) {
    addSource(sources, candidateRejection.candidateProsePath, "candidateProse");
    addSource(sources, candidateRejection.stagePlanPath, "stagePlan");
    addSource(
      sources,
      candidateRejection.stagePlanFindingsPath,
      "stagePlanFindings",
    );
    addSource(
      sources,
      candidateRejection.candidateRejectionPath,
      "candidateRejection",
    );
  }
  const manifestIdentity = findingsManifestIdentity(sources);
  const authoredIdentity = authoredScenarioIdentity(manifestIdentity);
  const campaignManifest =
    manifestIdentity.tag === "scenarioCampaign"
      ? campaignManifestFromSources(sources)
      : undefined;
  if (input.disposition.tag === "campaignFailure") {
    const pointerRole =
      input.pointerAuthorityRole === undefined
        ? sources.find((source) => source.role === "campaign")?.role
        : sources.find((source) => source.role === input.pointerAuthorityRole)
            ?.role;
    if (pointerRole === undefined) {
      fail("A generation rejection requires at least one authority.");
    }
    sourceFindings.push(
      makeFinding({
        stage: "generation",
        category: "experiment-boundary-obstruction",
        kind: "generation-invocation-failure",
        summary: "Scenario Campaign failed before admission completed.",
        detail: input.disposition.reason,
        pointer: pointerForSource(pointerRole),
      }),
    );
  }
  const scenarioReviewPaths =
    "scenarioReviewPaths" in input ? input.scenarioReviewPaths : [];
  for (const [index, path] of scenarioReviewPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      `scenarioReview-${String(index + 1)}`,
    );
    if (role !== undefined) {
      const scenarioSource = sources.find(
        (source) =>
          source.role === "scenario" || source.role.startsWith("scenario-"),
      );
      if (scenarioSource === undefined) {
        fail(
          `Scenario-review authority requires the matching scenario authority: ${canonical}`,
        );
      }
      const expectedIdentity: ScenarioReviewIdentityExpectation = {
        scenarioId: admittedScenarioIdentity(manifestIdentity),
        gitSha: authoredIdentity.gitSha,
        scenarioSha256: authorityFor(scenarioSource).sha256,
        scenarioReviewSha256: authorityFor(
          unresolvedSource({ role, path: canonical }),
        ).sha256,
      };
      sourceFindingsFromScenarioReview(
        canonical,
        role,
        sourceFindings,
        expectedIdentity,
      );
    }
  }
  for (const [index, path] of input.generationLedgerPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      `generationLedger-${String(index + 1)}`,
    );
    if (role !== undefined) {
      sourceFindings.push(
        ...findingsFromGenerationLedger(
          unresolvedSource({ role, path: canonical }),
          {
            scenarioId: authoredIdentity.scenarioId,
            gitSha: authoredIdentity.gitSha,
            owner:
              campaignManifest !== undefined
                ? {
                    tag: "campaign" as const,
                    campaign: campaignManifest,
                  }
                : { tag: "scenario" as const },
          },
        ),
      );
    }
  }
  addGenerationInvocationAuthorities({
    sources,
    generationLedgerPaths: input.generationLedgerPaths,
    generationEventPaths: input.generationEventPaths,
  });
  const scenarioSource = sources.find(
    (source) =>
      source.role === "scenario" ||
      source.role === "candidateProse" ||
      source.role.startsWith("scenario-"),
  );
  const scenarioSha256 =
    scenarioSource === undefined
      ? undefined
      : authorityFor(scenarioSource).sha256;
  const rejectionSource = sources.find(
    (source) => source.role === "candidateRejection",
  );
  const rejectionRecord =
    rejectionSource === undefined
      ? undefined
      : Schema.decodeUnknownEither(RejectedScenarioCandidateRecordSchema, {
          onExcessProperty: "error",
        })(
          JSON.parse(
            readFileSync(resolve(repoRoot, rejectionSource.path), "utf8"),
          ),
        );
  if (rejectionRecord !== undefined && Either.isLeft(rejectionRecord)) {
    fail(
      `Candidate rejection authority is malformed: ${rejectionRecord.left.message}`,
    );
  }
  if (candidateRejection !== undefined) {
    if (rejectionRecord === undefined || Either.isLeft(rejectionRecord)) {
      fail("A Candidate rejection requires its rejection authority.");
    }
    sourceFindings.push(
      makeFinding({
        stage: "generation",
        category: "scenario-author-defect",
        kind: "generation-rejection",
        summary: "Scenario Candidate was rejected before admission.",
        detail: rejectionRecord.right.reason,
        pointer: pointerForSource("candidateRejection"),
      }),
    );
  }
  const candidateReviewPaths =
    input.disposition.tag === "reviewedCandidateRejection"
      ? [input.disposition.candidateReviewPath]
      : [];
  for (const [index, path] of candidateReviewPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      `candidateReview-${String(index + 1)}`,
    );
    if (role === undefined) continue;
    const review = Schema.decodeUnknownEither(
      RejectedScenarioCandidateReviewSchema,
      { onExcessProperty: "error" },
    )(JSON.parse(readFileSync(resolve(repoRoot, canonical), "utf8")));
    if (Either.isLeft(review)) {
      fail(`Candidate review authority is malformed: ${review.left.message}`);
    }
    if (
      manifestIdentity.tag !== "scenarioCampaign" ||
      rejectionRecord === undefined ||
      Either.isLeft(rejectionRecord) ||
      review.right.campaignId !== manifestIdentity.campaignId ||
      review.right.candidateId !== rejectionRecord.right.candidateId ||
      review.right.candidateScenarioSha256 !== scenarioSha256 ||
      review.right.gitSha !== manifestIdentity.gitSha
    ) {
      fail("Candidate review authority identity does not match generation.");
    }
  }
  const scenarioReviewSource = sources.find(
    (source) => source.role === "scenarioReview",
  );
  const scenarioReviewSha256 =
    scenarioReviewSource === undefined
      ? undefined
      : authorityFor(scenarioReviewSource).sha256;
  const admittedStagePlanIdentity:
    | Extract<StagePlanIdentityExpectation, { readonly tag: "admitted" }>
    | undefined =
    scenarioSha256 !== undefined && scenarioReviewSha256 !== undefined
      ? {
          tag: "admitted",
          scenarioId: admittedScenarioIdentity(manifestIdentity),
          scenarioSha256,
          scenarioReviewSha256,
        }
      : undefined;
  const retainedPlans: ScenarioStagePlan[] = [];
  const stagePlanPaths =
    "stagePlanPaths" in input
      ? input.stagePlanPaths
      : [input.disposition.stagePlanPath];
  for (const path of stagePlanPaths) {
    const canonical = sourcePath(path);
    if (scenarioSha256 === undefined) {
      fail(
        `Stage-plan authority requires a matching scenario authority: ${canonical}`,
      );
    }
    const plan = validateScenarioStagePlan(
      JSON.parse(readFileSync(resolve(repoRoot, canonical), "utf8")),
    );
    if (Either.isLeft(plan)) fail(plan.left);
    retainedPlans.push(plan.right);
    const identity = plan.right.identity;
    const identityMatches =
      admittedStagePlanIdentity === undefined
        ? identity.tag === "candidate" &&
          identity.candidateScenarioSha256 === scenarioSha256 &&
          manifestIdentity.tag === "scenarioCampaign" &&
          identity.campaignId === manifestIdentity.campaignId &&
          rejectionRecord !== undefined &&
          Either.isRight(rejectionRecord) &&
          identity.candidateId === rejectionRecord.right.candidateId &&
          rejectionRecord.right.campaignId === manifestIdentity.campaignId &&
          rejectionRecord.right.evidenceSetId === manifestIdentity.evidenceSetId
        : identity.tag === "admitted" &&
          identity.scenarioId === admittedStagePlanIdentity.scenarioId &&
          identity.scenarioSha256 ===
            admittedStagePlanIdentity.scenarioSha256 &&
          identity.scenarioReviewSha256 ===
            admittedStagePlanIdentity.scenarioReviewSha256;
    if (!identityMatches) {
      fail(
        `Stage-plan authority identity does not match generation: ${canonical}`,
      );
    }
  }
  const stagePlanFindingsPaths =
    "stagePlanFindingsPaths" in input
      ? input.stagePlanFindingsPaths
      : [input.disposition.stagePlanFindingsPath];
  if (stagePlanFindingsPaths.length !== retainedPlans.length) {
    if (stagePlanFindingsPaths.length > 0 || retainedPlans.length > 0) {
      fail(
        "Retained stage-plan authorities must include one findings authority for each plan.",
      );
    }
  }
  for (const [index, path] of stagePlanFindingsPaths.entries()) {
    const canonical = sourcePath(path);
    const role = addSource(
      sources,
      canonical,
      index === 0
        ? "stagePlanFindings"
        : `stagePlanFindings-${String(index + 1)}`,
    );
    if (role !== undefined) {
      if (scenarioSha256 === undefined) {
        fail(
          `Candidate stage-plan findings require a scenario authority: ${canonical}`,
        );
      }
      const retainedPlan = retainedPlans[index];
      if (retainedPlan === undefined) {
        fail(
          `Stage-plan findings have no matching retained plan: ${canonical}`,
        );
      }
      const decodedFindings = Schema.decodeUnknownEither(
        ScenarioStagePlanFindingsSchema,
        { onExcessProperty: "error" },
      )(readSourceRecord(canonical));
      if (Either.isLeft(decodedFindings)) {
        fail(
          `Invalid stage-plan findings authority: ${canonical}: ${decodedFindings.left.message}`,
        );
      }
      if (
        canonicalJson(decodedFindings.right) !==
        canonicalJson(scenarioStagePlanFindings(retainedPlan))
      ) {
        fail(
          `Stage-plan findings authority does not match the retained plan: ${canonical}`,
        );
      }
      sourceFindings.push(
        ...findingsFromStagePlanSource(
          unresolvedSource({ role, path: canonical }),
          retainedPlan.identity,
        ),
      );
    }
  }
  return makeProjection({
    subject: manifestIdentity,
    authorities: sources,
    findings: sourceFindings,
    ...(input.pointerAuthorityRole === undefined
      ? {}
      : { pointerAuthorityRole: input.pointerAuthorityRole }),
  });
}

export function projectTranscriptlessFindings(
  input: TranscriptlessFindingsProjectionInput,
): FindingsProjection {
  const sources: Source[] = [];
  const addedRoles = new Map<string, string>();
  for (const authority of input.authorityPaths) {
    const role = addSource(sources, authority.path, authority.role);
    if (role !== undefined) addedRoles.set(authority.role, role);
  }
  const manifestIdentity = findingsManifestIdentity(sources);
  const pointerRole =
    input.pointerAuthorityRole === undefined
      ? sources[0]?.role
      : addedRoles.get(input.pointerAuthorityRole);
  if (pointerRole === undefined) {
    fail(
      input.pointerAuthorityRole === undefined
        ? "A transcriptless finding requires at least one authority."
        : `A transcriptless finding requires the requested authority: ${input.pointerAuthorityRole}`,
    );
  }
  const finding = makeFinding({
    stage: input.stage,
    category: input.category,
    kind: input.kind,
    summary: input.summary,
    pointer: pointerForSource(pointerRole),
    ...(input.detail === undefined ? {} : { detail: input.detail }),
  });
  return makeProjection({
    subject: manifestIdentity,
    authorities: sources,
    findings: [finding],
  });
}
