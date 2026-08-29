import { createHash, randomInt, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Result, Match, Schema } from "effect";

import {
  capabilityContextForRole,
  SCENARIO_AUTHORITY_RECONCILIATION_BOUNDARY,
  STAT_BLOCK_INITIALIZATION_CAPABILITY_BOUNDARY,
  SUPPORTED_ONLY_CAPABILITY_REVISION_POLICY,
} from "./capability-projection.ts";
import {
  codexOutputJsonSchema,
  finalScenarioDisposition,
  FinalScenarioReviewSchema,
  retentionRevisionMatches,
  runScenarioCampaign,
  scenarioContentSha256,
  ScenarioCandidateBatchSchema,
  ScenarioCampaignConfigSchema,
  RejectedScenarioCandidateReviewSchema,
  classifyScenarioReviewOutputSchema,
  scenarioCompositeReviewSchemaForIntents,
  verifyFinalScenarioReview,
  type ContentAvailabilityIntent,
  type ScenarioCampaignCandidateRejection,
  type ScenarioCampaignAgents,
  type ScenarioCampaignResult,
  type ScenarioCatalogueAdmissionContext,
  type ScenarioReviewInput,
  type CurrentScenarioCompositeReview,
  type SdkCapabilityIntent,
} from "./scenario-campaign.ts";
import {
  batchScenarioCatalogueProjections,
  ScenarioCatalogueComparisonSchema,
  projectScenarioCatalogueForAuthoring,
  scenarioCatalogueComparisonBoundary,
  scenarioCatalogueComparisonPrompt,
} from "./scenario-authoring.ts";
import type { RetainedScenarioReviewInput } from "./scenario-review-input.ts";
import {
  retainCandidateScenarioStagePlanAtPaths,
  retainAdmittedScenarioStagePlanAtPaths,
  retainedRejectedScenarioStagePlanFindingsPath,
  retainedRejectedScenarioStagePlanPath,
  retainedScenarioStagePlanFindingsPath,
  retainedScenarioStagePlanPath,
  retainScenarioStageFacts,
} from "./stage-plan-authority.ts";
import { RAW_SWARM_STAGE_PLAN_REASONS } from "./scenario-stage-plan.ts";
import { scenarioSetupStatBlocks } from "./sdk-player/scenario-setup-runtime.ts";
import {
  currentGitRevision,
  GitShaSchema,
  repoRoot,
  ScenarioIdSchema,
  decodeScenarioId,
  type GitSha,
} from "./transcript.ts";
import {
  invocationIdFromCodexEvents,
  codexRawRetentionArtifactPath,
  codexRawRetentionEventFromEvents,
  jsonModelInvocationLastMessageDecoder,
  readCodexRawRetentionArtifact,
  readCodexEvents,
  runCodexInvocation,
  type CurrentModelInvocationSubject,
  type ModelInvocationPhase,
} from "./model-telemetry.ts";
import {
  findingsArtifactPath,
  FindingsProjectionSchema,
  writeFindingsProjection,
} from "./findings.ts";
import { projectGenerationFindings } from "./generation-findings.ts";
import { ingestGenerationFindings } from "./artifact-index.ts";
import { artifactAuthorityForBytes } from "./artifact-authority.ts";
import {
  readRawSwarmCatalogue,
  RejectedScenarioCandidateRecordSchema,
} from "./scenario-catalogue.ts";
import { AdmittedScenarioRecordSchema } from "./scenario-admission.ts";
import { assertModelEntryPointGuard } from "./model-entrypoint-guard.ts";
import type {
  EvidenceSetId,
  PlannedScenarioId,
  ScenarioCampaignId,
} from "./raw-swarm-identities.ts";

function fail(message: string): never {
  throw new Error(message);
}

function retainedGenerationEventPaths(
  directories: readonly string[],
): readonly string[] {
  return [
    ...new Set(
      directories.flatMap((directory) => {
        if (!existsSync(directory)) return [];
        return readdirSync(directory, { withFileTypes: true })
          .filter(
            (entry) => entry.isFile() && entry.name.endsWith(".events.jsonl"),
          )
          .map((entry) => resolve(directory, entry.name));
      }),
    ),
  ].sort();
}

export type ScenarioAdmissionPublication = readonly (readonly [
  staged: string,
  admitted: string,
])[];

/**
 * Retain a canonical invocation stream together with the runner-owned raw
 * sibling named by its strict retention event. This operation runs before the
 * invocation temporary directory is removed.
 */
export function retainCodexInvocationArtifacts(input: {
  readonly eventPath: string;
  readonly retainedEventPath: string;
}): void {
  mkdirSync(dirname(resolve(input.retainedEventPath)), { recursive: true });
  writeFileSync(input.retainedEventPath, readFileSync(input.eventPath), {
    flag: "wx",
  });
  const retainedEvents = readCodexEvents(input.eventPath);
  if (retainedEvents.tag === "invalid") return;
  const retention = codexRawRetentionEventFromEvents(retainedEvents.events);
  if (retention.tag === "invalid") {
    fail(
      `Retained invocation event stream has an invalid raw-retention fact: ${retention.message}`,
    );
  }
  if (retention.event === undefined) return;
  const artifact = readCodexRawRetentionArtifact({
    eventPath: input.eventPath,
    event: retention.event,
  });
  if (Result.isFailure(artifact)) fail(artifact.failure);
  const retainedArtifactPath = codexRawRetentionArtifactPath(
    input.retainedEventPath,
    retention.event,
  );
  writeFileSync(retainedArtifactPath, artifact.success.contents, {
    flag: "wx",
  });
  const retainedArtifact = readCodexRawRetentionArtifact({
    eventPath: input.retainedEventPath,
    event: retention.event,
  });
  if (Result.isFailure(retainedArtifact)) fail(retainedArtifact.failure);
}

export function rollbackScenarioAdmissionBundle(
  publication: ScenarioAdmissionPublication,
): void {
  const rollbackFailures: string[] = [];
  for (const [source, destination] of [...publication].reverse()) {
    try {
      renameSync(destination, source);
    } catch (error: unknown) {
      rollbackFailures.push(
        `${destination} -> ${source}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (rollbackFailures.length > 0) {
    fail(
      `Scenario admission publication rollback failed: ${rollbackFailures.join("; ")}`,
    );
  }
}

function preparePublicationDestinationParents(
  publication: readonly (readonly [staged: string, destination: string])[],
): void {
  for (const [, destination] of publication) {
    mkdirSync(dirname(resolve(repoRoot, destination)), { recursive: true });
  }
}

export function publishScenarioAdmissionBundle(input: {
  readonly prose: readonly [staged: string, admitted: string];
  readonly review: readonly [staged: string, admitted: string];
  readonly stageFacts: readonly [staged: string, admitted: string];
  readonly stagePlan: readonly [staged: string, admitted: string];
  readonly stagePlanFindings: readonly [staged: string, admitted: string];
  readonly scenarioRecord: readonly [staged: string, admitted: string];
  readonly findings: readonly [staged: string, admitted: string];
}): ScenarioAdmissionPublication {
  const publication = [
    input.prose,
    input.review,
    input.stageFacts,
    input.stagePlan,
    input.stagePlanFindings,
    input.scenarioRecord,
    input.findings,
  ] as const;
  const occupied = publication.find(([, destination]) =>
    existsSync(destination),
  );
  if (occupied !== undefined) {
    fail(`Refusing to overwrite admitted Scenario authority: ${occupied[1]}`);
  }
  preparePublicationDestinationParents(publication);
  const published: Array<readonly [staged: string, admitted: string]> = [];
  try {
    for (const [source, destination] of publication) {
      renameSync(source, destination);
      published.push([source, destination]);
    }
  } catch (error: unknown) {
    try {
      rollbackScenarioAdmissionBundle(published);
    } catch (rollbackError) {
      throw new Error(
        `Scenario admission publication failed and could not restore staged authorities: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        { cause: error },
      );
    }
    throw error;
  }
  return published;
}

/** Ingest admitted findings while retaining the filesystem rollback receipt. */
export function ingestPublishedScenarioAdmissionBundle(input: {
  readonly publication: ScenarioAdmissionPublication;
  readonly findingsPath: string;
  readonly dbPath: string;
}): void {
  try {
    ingestGenerationFindings({
      findingsPath: input.findingsPath,
      dbPath: input.dbPath,
    });
  } catch (error: unknown) {
    try {
      rollbackScenarioAdmissionBundle(input.publication);
    } catch (rollbackError: unknown) {
      throw new Error(
        `Admitted Scenario findings ingestion failed and publication rollback was incomplete: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        { cause: error },
      );
    }
    throw error;
  }
}

export type ScenarioRejectionPublication = readonly (readonly [
  staged: string,
  rejected: string,
])[];

export function rollbackScenarioRejectionBundle(
  publication: ScenarioRejectionPublication,
): void {
  const rollbackFailures: string[] = [];
  for (const [source, destination] of [...publication].reverse()) {
    try {
      renameSync(destination, source);
    } catch (error: unknown) {
      rollbackFailures.push(
        `${destination} -> ${source}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (rollbackFailures.length > 0) {
    fail(
      `Scenario rejection publication rollback failed: ${rollbackFailures.join("; ")}`,
    );
  }
}

/** Publish every rejected-candidate authority as one recoverable bundle. */
export function publishScenarioRejectionBundle(input: {
  readonly prose: readonly [staged: string, rejected: string];
  readonly review?: readonly [staged: string, rejected: string];
  readonly stagePlan: readonly [staged: string, rejected: string];
  readonly stagePlanFindings: readonly [staged: string, rejected: string];
  readonly candidateRejection: readonly [staged: string, rejected: string];
  readonly findings: readonly [staged: string, rejected: string];
}): ScenarioRejectionPublication {
  const publication = [
    input.prose,
    ...(input.review === undefined ? [] : [input.review]),
    input.stagePlan,
    input.stagePlanFindings,
    input.candidateRejection,
    input.findings,
  ] as const;
  const occupied = publication.find(([, destination]) =>
    existsSync(destination),
  );
  if (occupied !== undefined) {
    fail(`Refusing to overwrite rejected Scenario authority: ${occupied[1]}`);
  }
  preparePublicationDestinationParents(publication);
  const published: Array<readonly [string, string]> = [];
  try {
    for (const [source, destination] of publication) {
      renameSync(source, destination);
      published.push([source, destination]);
    }
  } catch (error: unknown) {
    try {
      rollbackScenarioRejectionBundle(published);
    } catch (rollbackError) {
      throw new Error(
        `Scenario rejection publication failed and could not restore staged authorities: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        { cause: error },
      );
    }
    throw error;
  }
  return published;
}

function isCandidateRejection(
  value: ScenarioCampaignResult,
): value is ScenarioCampaignCandidateRejection {
  return "tag" in value && value.tag === "candidateRejected";
}

async function runCodexJson<A, I>(
  prompt: string,
  schema: Schema.Codec<A, I>,
  execution: {
    readonly model: "gpt-5.6-sol" | "gpt-5.6-luna";
    readonly reasoningEffort: "medium" | "max";
    readonly phase: ModelInvocationPhase;
    readonly ledgerPath: string;
    readonly subject: CurrentModelInvocationSubject;
    readonly gitSha: GitSha;
    readonly stagePlanReason: string;
    readonly retention?: {
      /** Every invocation keeps its raw first-party event stream. */
      readonly directory: string;
      /** Composite reviews additionally retain their exact replay input. */
      readonly reviewStage?: "milestone" | "final";
    };
  },
): Promise<A> {
  const outputSchema = Schema.Struct({ result: schema });
  const temporary = mkdtempSync(resolve(tmpdir(), "dnd-scenario-campaign-"));
  const schemaPath = resolve(temporary, "schema.json");
  const outputPath = resolve(temporary, "output.json");
  const agentLogPath = resolve(temporary, "agent.log");
  const eventPath = resolve(temporary, "events.jsonl");
  try {
    const outputJsonSchema = codexOutputJsonSchema(schema);
    writeFileSync(schemaPath, `${JSON.stringify(outputJsonSchema, null, 2)}\n`);
    const fallbackInvocationId = randomUUID();
    const result = await (async () => {
      try {
        return await runCodexInvocation({
          args: [
            "exec",
            "-C",
            repoRoot,
            "--sandbox",
            "danger-full-access",
            "--ephemeral",
            "--json",
            "--disable",
            "tool_call_mcp_elicitation",
            "-m",
            execution.model,
            "-c",
            `model_reasoning_effort=${JSON.stringify(execution.reasoningEffort)}`,
            "--output-schema",
            schemaPath,
            prompt,
          ],
          cwd: repoRoot,
          env: process.env,
          eventPath,
          logPath: agentLogPath,
          ledgerPath: execution.ledgerPath,
          phase: execution.phase,
          stagePlanReason: execution.stagePlanReason,
          subject: execution.subject,
          gitSha: execution.gitSha,
          fallbackInvocationId,
          model: execution.model,
          reasoningEffort: execution.reasoningEffort,
          operation: {
            tag: "expectedLastMessage",
            expected: {
              path: outputPath,
              decode: jsonModelInvocationLastMessageDecoder(outputSchema),
            },
          },
        });
      } finally {
        if (execution.retention !== undefined && existsSync(eventPath)) {
          const retainedStem = `${execution.phase}-${fallbackInvocationId}`;
          retainCodexInvocationArtifacts({
            eventPath,
            retainedEventPath: resolve(
              execution.retention.directory,
              `${retainedStem}.events.jsonl`,
            ),
          });
        }
      }
    })();
    const parsedEvents = readCodexEvents(eventPath);
    const codexEvents = parsedEvents.tag === "valid" ? parsedEvents.events : [];
    const invocationId = invocationIdFromCodexEvents(
      codexEvents,
      fallbackInvocationId,
    );
    if (result.tag === "failed") {
      fail(`Scenario agent invocation failed: ${result.cause.reason}`);
    }
    const decoded = result.output.value;
    if (
      execution.retention?.reviewStage !== undefined &&
      execution.retention !== undefined
    ) {
      const retainedStem = `${execution.phase}-${fallbackInvocationId}`;
      writeFileSync(
        resolve(execution.retention.directory, `${retainedStem}.json`),
        `${JSON.stringify(
          {
            schemaVersion: 3,
            phase: execution.phase,
            reviewStage: execution.retention.reviewStage,
            subject: execution.subject,
            sourceGitSha: execution.gitSha,
            invocationId,
            model: execution.model,
            reasoningEffort: execution.reasoningEffort,
            prompt,
            outputJsonSchema,
            result: decoded.result,
          },
          null,
          2,
        )}\n`,
        { flag: "wx" },
      );
    }
    return decoded.result;
  } finally {
    rmSync(temporary, { recursive: true });
  }
}

export function generationPreamble(
  statBlockNames: readonly string[],
  contentAvailabilityIntent: ContentAvailabilityIntent,
  sdkCapabilityIntent: SdkCapabilityIntent,
  capabilityContext: string,
): string {
  return `You generate battle-testing scenarios for an SRD 5.2.1 adjudicator SDK.
Return complete prose scenario revisions, not outlines or patches. Bias toward combat, serious pursuit of authored objectives, and materially different or changing tactics. Keep story to mechanically consequential terrain, visibility, distance, objectives, builds, and encounter facts. Mix exact constraints with delegated player choices naturally in prose. Do not invent a stage system, command language, or expected result. Do not describe a winner, victory, winning side, or encounter-wide partition; retain concrete combatants, pairwise relationships, and objective facts. Use only SRD identity or visibly synthetic unsupported material; never copy non-SRD official D&D identity or expression.

Available canonical stat-block identities:
${statBlockNames.join(", ")}

Content-availability intent: ${contentAvailabilityIntent}

${contentAvailabilityIntent === "availableOnly" ? "Use canonical stat blocks only from that availability list. An absent SRD record is a scenario-authoring error, not an implied product request." : "This campaign deliberately probes unavailable content. The prose must explicitly name content availability as the intended unsupported boundary so setup obstruction is interpretable."}

SDK-capability intent: ${sdkCapabilityIntent}

${sdkCapabilityIntent === "supportedOnly" ? `Use only scenario facts and interactions representable through the current public SDK described below. Do not repeat known unsupported mechanics merely because a prior scenario used them. ${STAT_BLOCK_INITIALIZATION_CAPABILITY_BOUNDARY} ${SUPPORTED_ONLY_CAPABILITY_REVISION_POLICY}` : "Deliberately exercise one capability absent from the current public SDK described below, and explicitly name that capability as the intended probe. Keep the remaining scenario representable."}

${capabilityContext}`;
}

export function scenarioCampaignAgents(input: {
  readonly ledgerPath: string;
  readonly eventDirectory: string;
  readonly campaignId: ScenarioCampaignId;
  readonly evidenceSetId: EvidenceSetId;
  readonly plannedScenarioId: PlannedScenarioId;
  readonly gitSha: GitSha;
}): ScenarioCampaignAgents {
  const statBlocks = scenarioSetupStatBlocks();
  if (statBlocks.tag === "invalid") fail(statBlocks.message);
  const eventDirectory = input.eventDirectory;
  const generatorExecution = {
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    phase: "scenarioGeneration",
    stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioGeneration,
    ledgerPath: input.ledgerPath,
    gitSha: input.gitSha,
    subject: {
      tag: "scenarioCampaign",
      campaignId: input.campaignId,
      evidenceSetId: input.evidenceSetId,
      plannedScenarioId: input.plannedScenarioId,
    },
  } as const;
  const reviewerExecution = {
    model: "gpt-5.6-luna",
    reasoningEffort: "max",
    phase: "scenarioCompositeReview",
    stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioCompositeReview,
    ledgerPath: input.ledgerPath,
    gitSha: input.gitSha,
  } as const;
  return {
    generate: async (input) =>
      runCodexJson(
        `${generationPreamble(
          statBlocks.statBlocks.map(({ name }) => name),
          input.contentAvailabilityIntent,
          input.sdkCapabilityIntent,
          capabilityContextForRole("generation"),
        )}

Configured exploratory purpose:
${input.scenarioPurpose}

Distribution preference:
${input.distributionPreference}

Iteration: ${input.iteration}
Requested complete revisions: ${input.candidateCount}

Selected scenario so far:
${input.priorRevision.tag === "initial" ? "No prior scenario; create the first complete revisions." : input.priorRevision.prose}

Independent critiques to address in the next complete revision:
${input.priorRevision.tag === "initial" || input.priorRevision.critiques.length === 0 ? "None." : input.priorRevision.critiques.join("\n\n")}

Produce exactly ${input.candidateCount} materially different candidate objects. Each object must contain complete scenario prose in 'prose' and typed controller facts in 'stageFacts'. Differences must affect mechanics, character choices, encounter composition, or tactical intent—not wording alone. For stageFacts, use characterRequirement statBlocksOnly only when no Character Sheets are needed, otherwise characterSheetsRequired. Use spatialRequirement notRequired when no spatial witness is needed, geometryAssisted when the optional helper is sufficient, outsideExperimentEnvelope/tableAuthored for a coherent Table-owned spatial fact, and outsideExperimentEnvelope/incoherent only for an internally contradictory or fundamentally nonsensical candidate. These are typed planning facts, not a prose parser. Return only the required JSON.`,
        ScenarioCandidateBatchSchema,
        {
          ...generatorExecution,
          retention: { directory: eventDirectory },
        },
      ),
    reviewScenario: async <
      ContentIntent extends ContentAvailabilityIntent,
      SdkIntent extends SdkCapabilityIntent,
    >({
      scenario,
      campaignId,
      candidateId,
      candidateScenarioSha256,
      plannedScenarioId,
      finalReview,
      scenarioPurpose,
      distributionPreference,
      stageFacts,
      contentAvailabilityIntent,
      sdkCapabilityIntent,
      catalogueComparison,
    }: ScenarioReviewInput<ContentIntent, SdkIntent>) => {
      const reviewSchema = scenarioCompositeReviewSchemaForIntents({
        contentAvailabilityIntent,
        sdkCapabilityIntent,
      });
      return runCodexJson(
        `Perform one ${finalReview ? "final pre-play" : "milestone"} review invocation with five mandatory, independently scoped assessments. Do not produce an aggregate verdict and do not merge their evidence or responsibilities.

RAW: use only .references/srd-5.2.1/ and ASSUMPTIONS.md. Check legality, coherence, executability, and missing Table Decisions. Do not choose tactics, predict an outcome, rewrite prose, or decide artifact policy.

Content availability: compare selected canonical identities with the supplied availability list and the exact campaign intent. Do not infer a product obligation from an accidental unavailable selection.

SDK capability: compare required setup/play facts with the current public SDK documentation below, not historical Execution verdicts. Do not inspect implementation files. ${STAT_BLOCK_INITIALIZATION_CAPABILITY_BOUNDARY} Treat a Candidate's requirement for that choice or roll workflow as an absent operation. ${SUPPORTED_ONLY_CAPABILITY_REVISION_POLICY}

Artifact policy: apply docs/mushroom-playbook/AUTHORING.md only to public identity/expression safety. Do not judge mechanics or tactics.

Scenario quality: independently classify the setup and encounter as ready only when it is mechanically meaningful, every represented combatant or group seriously pursues an authored strategy-bearing objective, fixed versus delegated choices fit the campaign distribution preference, and the Candidate's prose and typed stage facts align with the configured exploratory purpose. Treat a contradiction between the configured purpose and either authority as a material needsRevision finding; for example, a purpose requiring delegated Character Sheet choices cannot be ready when the typed character requirement classifies the scenario as stat-block-only. Use the supplied typed stage facts as controller evidence rather than inferring them from prose, and do not repair a contradiction by silently changing the configured purpose. Do not impose generic balance: a deliberately loose or highly prescribed scenario can be ready. Do not choose tactics, predict an outcome, or rewrite prose. Return one concise critique when this quality responsibility needs a material revision.

${SCENARIO_AUTHORITY_RECONCILIATION_BOUNDARY} Inspect stage-fact evidence text and every retained catalogue-comparison dimension as part of that reconciliation. Never mark a Candidate ready after silently removing a requirement.

Content-availability intent: ${contentAvailabilityIntent}
SDK-capability intent: ${sdkCapabilityIntent}
Configured exploratory purpose: ${scenarioPurpose}
Campaign distribution preference: ${distributionPreference}
Typed Candidate stage facts:
${JSON.stringify(stageFacts, null, 2)}

Catalogue comparison evidence supplied by the authoring operator:
${JSON.stringify(catalogueComparison, null, 2)}

Treat the catalogue comparison as a required authoring responsibility. It must
cover every admitted Scenario projection supplied to the comparator, distinguish
meaningfullyDistinct, purposefulOverlap, and redundant, name a differentiator
for purposefulOverlap, and identify the closest admitted Scenario for redundant.
Do not use spatial context as a required difference when the other dimensions
already establish a distinction.

Available canonical stat-block identities:
${statBlocks.statBlocks.map(({ name }) => name).join(", ")}

${capabilityContextForRole("review")}

Scenario:
${scenario}`,
        reviewSchema,
        {
          ...reviewerExecution,
          subject: {
            tag: "scenarioCandidate",
            campaignId,
            evidenceSetId: input.evidenceSetId,
            candidateId,
            candidateScenarioSha256,
            plannedScenarioId,
          },
          stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioCompositeReview,
          retention: {
            directory: `${input.ledgerPath.slice(0, -".jsonl".length)}-review-inputs`,
            reviewStage: finalReview ? "final" : "milestone",
          },
        },
      );
    },
    compareCandidate: async ({
      scenario,
      candidateIndex,
      candidateId,
      candidateScenarioSha256,
      batchIndex,
      batch,
    }) => {
      const prompt = scenarioCatalogueComparisonPrompt({
        candidate: scenario,
        candidateIndex,
        batchIndex,
        batch,
      });
      if (Result.isFailure(prompt)) fail(prompt.failure);
      return runCodexJson(prompt.success, ScenarioCatalogueComparisonSchema, {
        ...reviewerExecution,
        subject: {
          tag: "scenarioCandidate",
          campaignId: input.campaignId,
          evidenceSetId: input.evidenceSetId,
          candidateId,
          candidateScenarioSha256,
          plannedScenarioId: input.plannedScenarioId,
        },
        retention: { directory: eventDirectory },
      });
    },
  };
}

export async function replayRetainedScenarioReview(input: {
  readonly retainedInput: RetainedScenarioReviewInput;
  readonly ledgerPath: string;
  readonly gitSha: GitSha;
}): Promise<CurrentScenarioCompositeReview> {
  if (input.retainedInput.schemaVersion === 2) {
    fail(
      "Historical Scenario review input is readable evidence but is not a current executable review subject.",
    );
  }
  const compatibility = classifyScenarioReviewOutputSchema({
    schemaVersion: input.retainedInput.schemaVersion,
    outputJsonSchema: input.retainedInput.outputJsonSchema,
  });
  if (Result.isFailure(compatibility)) {
    fail(compatibility.failure);
  }
  const retainedResult = compatibility.success.decodeResult(
    input.retainedInput.result,
  );
  if (Result.isFailure(retainedResult)) {
    fail(
      "Retained scenario review result does not match its canonical output schema.",
    );
  }
  const execution = {
    model: input.retainedInput.model,
    reasoningEffort: input.retainedInput.reasoningEffort,
    phase: input.retainedInput.phase,
    ledgerPath: input.ledgerPath,
    subject: input.retainedInput.subject,
    gitSha: input.gitSha,
    stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioCompositeReview,
    retention: {
      directory: `${input.ledgerPath.slice(0, -".jsonl".length)}-review-inputs`,
      reviewStage: input.retainedInput.reviewStage,
    },
  } as const;
  const schema = Match.value(compatibility.success).pipe(
    Match.when({ tag: "intentSpecificCurrent" }, ({ schema }) => schema),
    Match.when({ tag: "legacyCurrent" }, ({ schema }) => schema),
    Match.when({ tag: "historical" }, () =>
      fail(
        "Historical Scenario review input is readable evidence but is not a current executable review subject.",
      ),
    ),
    Match.exhaustive,
  );
  return await runCodexJson(input.retainedInput.prompt, schema, execution);
}

function verifyRetainedScenario(
  scenarioId: Schema.Schema.Type<typeof ScenarioIdSchema>,
  scenarioPath: string,
  reviewPath: string,
  gitSha: string,
  catalogue: ScenarioCatalogueAdmissionContext,
): void {
  const scenarioBytes = readFileSync(scenarioPath, "utf8");
  const decodedGitSha = Schema.decodeUnknownResult(GitShaSchema)(gitSha);
  if (Result.isFailure(decodedGitSha)) {
    fail("Retained scenario has an invalid Git revision.");
  }
  const verification = verifyFinalScenarioReview(
    JSON.parse(readFileSync(reviewPath, "utf8")),
    {
      scenarioId,
      gitSha: decodedGitSha.success,
      scenarioBytes,
      catalogue,
    },
  );
  if (Result.isFailure(verification)) {
    fail(verification.failure);
  }
}

async function main(args: readonly string[]): Promise<void> {
  assertModelEntryPointGuard();
  const [configInput, ...options] = args;
  const dbFlagIndex = options.indexOf("--db");
  const dbPath =
    dbFlagIndex === -1
      ? resolve(repoRoot, "scripts/raw-swarm/out/player-swarm.db")
      : options[dbFlagIndex + 1];
  const unexpected = options.filter(
    (_option, index) =>
      dbFlagIndex === -1 ||
      (index !== dbFlagIndex && index !== dbFlagIndex + 1),
  );
  if (
    configInput === undefined ||
    unexpected.length > 0 ||
    (dbFlagIndex !== -1 &&
      (dbFlagIndex + 1 >= options.length ||
        options.filter((option) => option === "--db").length !== 1)) ||
    dbPath === undefined
  ) {
    fail("Usage: generate-scenario.ts <campaign.json> [--db <sqlite-path>]");
  }
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("Scenario generation requires a clean Git worktree.");
  }
  const gitSha = Schema.decodeUnknownResult(GitShaSchema)(revision.sha);
  if (Result.isFailure(gitSha)) {
    fail("Scenario generation found an invalid Git revision.");
  }
  const configPath = resolve(repoRoot, configInput);
  const configJson: unknown = JSON.parse(readFileSync(configPath, "utf8"));
  const decodedConfig = Schema.decodeUnknownResult(
    ScenarioCampaignConfigSchema,
    {
      onExcessProperty: "error",
    },
  )(configJson);
  if (Result.isFailure(decodedConfig)) {
    fail(`Invalid scenario campaign: ${decodedConfig.failure.message}`);
  }
  const catalogue = readRawSwarmCatalogue({
    repositoryRoot: repoRoot,
    scenarioDirectory: resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios",
    ),
    evidenceDirectory: resolve(repoRoot, "scripts/raw-swarm/out"),
  });
  if (Result.isFailure(catalogue)) {
    fail(
      `Unable to read the complete admitted Scenario catalogue: ${JSON.stringify(catalogue.failure)}`,
    );
  }
  const catalogueProjections = projectScenarioCatalogueForAuthoring(
    catalogue.success,
  );
  const catalogueBatches =
    batchScenarioCatalogueProjections(catalogueProjections);
  if (Result.isFailure(catalogueBatches)) fail(catalogueBatches.failure);
  const catalogueBoundary = scenarioCatalogueComparisonBoundary({
    projections: catalogueProjections,
    batches: catalogueBatches.success,
  });
  const admittedDirectory = resolve(
    repoRoot,
    "scripts/raw-swarm/sdk-player/scenarios",
  );
  const rejectedDirectory = resolve(
    repoRoot,
    "scripts/raw-swarm/out/rejected-scenarios",
  );
  const admittedPath = resolve(
    admittedDirectory,
    `${decodedConfig.success.plannedScenarioId}.md`,
  );
  const rejectedPath = resolve(
    rejectedDirectory,
    `${decodedConfig.success.plannedScenarioId}.md`,
  );
  if (
    existsSync(admittedPath) ||
    existsSync(`${admittedPath}.scenario-review.json`) ||
    existsSync(`${admittedPath}.stage-facts.json`) ||
    existsSync(admittedPath.replace(/\.md$/, ".scenario.json")) ||
    existsSync(rejectedPath) ||
    existsSync(`${rejectedPath}.scenario-review.json`) ||
    existsSync(`${rejectedPath}.stage-facts.json`)
  ) {
    fail("Refusing to overwrite a retained scenario or final scenario review.");
  }
  const ledgerPath = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${decodedConfig.success.evidenceSetId}/generation-invocations.jsonl`,
  );
  const campaignEvidenceDirectory = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${decodedConfig.success.evidenceSetId}`,
  );
  const campaignManifestPath = resolve(
    campaignEvidenceDirectory,
    "campaign.json",
  );
  if (existsSync(ledgerPath)) {
    fail(`Refusing to overwrite scenario invocation ledger: ${ledgerPath}`);
  }
  if (existsSync(campaignEvidenceDirectory)) {
    fail(
      `Refusing to overwrite Scenario Campaign evidence: ${campaignEvidenceDirectory}`,
    );
  }
  const generationStartedAt = new Date().toISOString();
  mkdirSync(campaignEvidenceDirectory, { recursive: true });
  writeFileSync(
    campaignManifestPath,
    `${JSON.stringify(
      {
        type: "raw-swarm-scenario-campaign",
        schemaVersion: 1,
        campaignId: decodedConfig.success.campaignId,
        evidenceSetId: decodedConfig.success.evidenceSetId,
        plannedScenarioId: decodedConfig.success.plannedScenarioId,
        gitSha: gitSha.success,
        startedAt: generationStartedAt,
        configSha256: createHash("sha256")
          .update(readFileSync(configPath))
          .digest("hex"),
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  type GenerationEvidence =
    | { readonly tag: "campaignFailure"; readonly reason: string }
    | {
        readonly tag: "candidateStagePlanRejection";
        readonly candidateProsePath: string;
        readonly stagePlanPath: string;
        readonly stagePlanFindingsPath: string;
        readonly candidateRejectionPath: string;
      }
    | {
        readonly tag: "reviewedCandidateRejection";
        readonly candidateProsePath: string;
        readonly candidateReviewPath: string;
        readonly stagePlanPath: string;
        readonly stagePlanFindingsPath: string;
        readonly candidateRejectionPath: string;
      }
    | {
        readonly tag: "admittedScenario";
        readonly scenarioPath: string;
        readonly scenarioReviewPath: string;
        readonly stageFactsPath: string;
        readonly stagePlanPath: string;
        readonly stagePlanFindingsPath: string;
      };
  const emitGenerationFindings = (
    input: GenerationEvidence,
    options: Readonly<{
      readonly path?: string;
      readonly pathReplacements?: readonly (readonly [string, string])[];
      readonly ingest?: boolean;
    }> = {},
  ): void => {
    const evidence = Match.value(input).pipe(
      Match.when({ tag: "campaignFailure" }, ({ reason }) => ({
        authorityPaths: [] as readonly {
          readonly role: string;
          readonly path: string;
        }[],
        scenarioReviewPaths: [] as readonly string[],
        stagePlanPaths: [] as readonly string[],
        stagePlanFindingsPaths: [] as readonly string[],
        disposition: { tag: "campaignFailure" as const, reason },
      })),
      Match.when({ tag: "candidateStagePlanRejection" }, (rejection) => ({
        authorityPaths: [] as readonly {
          readonly role: string;
          readonly path: string;
        }[],
        scenarioReviewPaths: [] as readonly string[],
        stagePlanPaths: [] as readonly string[],
        stagePlanFindingsPaths: [] as readonly string[],
        disposition: {
          ...rejection,
          tag: "candidateStagePlanRejection" as const,
        },
      })),
      Match.when({ tag: "reviewedCandidateRejection" }, (rejection) => ({
        authorityPaths: [] as readonly {
          readonly role: string;
          readonly path: string;
        }[],
        scenarioReviewPaths: [] as readonly string[],
        stagePlanPaths: [] as readonly string[],
        stagePlanFindingsPaths: [] as readonly string[],
        disposition: {
          ...rejection,
          tag: "reviewedCandidateRejection" as const,
        },
      })),
      Match.when({ tag: "admittedScenario" }, (scenario) => ({
        authorityPaths: [
          { role: "scenario", path: scenario.scenarioPath },
          { role: "scenarioReview", path: scenario.scenarioReviewPath },
          { role: "stageFacts", path: scenario.stageFactsPath },
          { role: "stagePlan", path: scenario.stagePlanPath },
          { role: "stagePlanFindings", path: scenario.stagePlanFindingsPath },
        ],
        scenarioReviewPaths: [scenario.scenarioReviewPath],
        stagePlanPaths: [scenario.stagePlanPath],
        stagePlanFindingsPaths: [scenario.stagePlanFindingsPath],
        disposition: { tag: "completed" as const },
      })),
      Match.exhaustive,
    );
    const authorityPaths = [
      { role: "campaign", path: campaignManifestPath },
      { role: "campaign", path: configPath },
      ...evidence.authorityPaths,
      { role: "generationLedger", path: ledgerPath },
    ];
    const generationEventPaths = retainedGenerationEventPaths([
      resolve(campaignEvidenceDirectory, "invocation-events"),
      `${ledgerPath.slice(0, -".jsonl".length)}-review-inputs`,
    ]);
    const pointerAuthorityRole =
      evidence.stagePlanFindingsPaths[0] !== undefined &&
      existsSync(evidence.stagePlanFindingsPaths[0])
        ? "stagePlanFindings"
        : evidence.scenarioReviewPaths[0] !== undefined &&
            existsSync(evidence.scenarioReviewPaths[0])
          ? "scenarioReview"
          : evidence.stagePlanPaths[0] !== undefined &&
              existsSync(evidence.stagePlanPaths[0])
            ? "stagePlan"
            : existsSync(ledgerPath)
              ? "generationLedger"
              : "campaign";
    const projectionInput = {
      authorityPaths,
      generationLedgerPaths: existsSync(ledgerPath) ? [ledgerPath] : [],
      generationEventPaths,
      stagePlanFindingsPaths: evidence.stagePlanFindingsPaths,
      stagePlanPaths: evidence.stagePlanPaths,
      pointerAuthorityRole,
    } as const;
    const projection = Match.value(evidence.disposition).pipe(
      Match.when({ tag: "completed" }, (disposition) =>
        projectGenerationFindings({
          ...projectionInput,
          disposition,
          scenarioReviewPaths: evidence.scenarioReviewPaths,
        }),
      ),
      Match.when({ tag: "campaignFailure" }, (disposition) =>
        projectGenerationFindings({
          ...projectionInput,
          disposition,
          scenarioReviewPaths: evidence.scenarioReviewPaths,
        }),
      ),
      Match.when({ tag: "candidateStagePlanRejection" }, (disposition) =>
        projectGenerationFindings({
          authorityPaths,
          generationLedgerPaths: projectionInput.generationLedgerPaths,
          generationEventPaths,
          pointerAuthorityRole,
          disposition,
        }),
      ),
      Match.when({ tag: "reviewedCandidateRejection" }, (disposition) =>
        projectGenerationFindings({
          authorityPaths,
          generationLedgerPaths: projectionInput.generationLedgerPaths,
          generationEventPaths,
          pointerAuthorityRole,
          disposition,
        }),
      ),
      Match.exhaustive,
    );
    const pathReplacements =
      options.pathReplacements?.flatMap(([from, to]) => [
        [from, to] as const,
        [
          relative(repoRoot, resolve(from)),
          relative(repoRoot, resolve(to)),
        ] as const,
      ]) ?? [];
    const replacePath = (value: unknown): unknown => {
      if (typeof value === "string") {
        return pathReplacements.find(([from]) => from === value)?.[1] ?? value;
      }
      if (Array.isArray(value)) return value.map(replacePath);
      if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
          Object.entries(value).map(([key, child]) => [
            key,
            replacePath(child),
          ]),
        );
      }
      return value;
    };
    const retainedProjection = Schema.decodeUnknownResult(
      FindingsProjectionSchema,
      { onExcessProperty: "error" },
    )(replacePath(projection));
    if (Result.isFailure(retainedProjection)) {
      fail(
        `Rewritten generation findings projection is invalid: ${retainedProjection.failure.message}`,
      );
    }
    const retainedFindingsPath =
      options.path ?? findingsArtifactPath(campaignEvidenceDirectory);
    writeFindingsProjection({
      projection: retainedProjection.success,
      path: retainedFindingsPath,
    });
    if (options.ingest !== false) {
      ingestGenerationFindings({
        findingsPath: retainedFindingsPath,
        dbPath,
      });
    }
  };
  let result: Result.Result<ScenarioCampaignResult, string>;
  try {
    result = await runScenarioCampaign(
      decodedConfig.success,
      scenarioCampaignAgents({
        ledgerPath,
        eventDirectory: resolve(campaignEvidenceDirectory, "invocation-events"),
        campaignId: decodedConfig.success.campaignId,
        evidenceSetId: decodedConfig.success.evidenceSetId,
        plannedScenarioId: decodedConfig.success.plannedScenarioId,
        gitSha: gitSha.success,
      }),
      {
        select: randomInt,
      },
      {
        tag: "required",
        batches: catalogueBatches.success,
        expectedScenarioIds: catalogueProjections.map(
          ({ scenarioId }) => scenarioId,
        ),
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    emitGenerationFindings({ tag: "campaignFailure", reason: message });
    throw error;
  }
  if (Result.isFailure(result)) {
    emitGenerationFindings({ tag: "campaignFailure", reason: result.failure });
    fail(result.failure);
  }
  if (!retentionRevisionMatches(gitSha.success, currentGitRevision())) {
    emitGenerationFindings({
      tag: "campaignFailure",
      reason:
        "Git revision changed during scenario generation; nothing was retained.",
    });
    fail(
      "Git revision changed during scenario generation; nothing was retained.",
    );
  }
  const scenarioBytes = `${result.success.scenario.trim()}\n`;
  const scenarioSha256 = scenarioContentSha256(result.success.scenario);
  if (isCandidateRejection(result.success)) {
    const outputDirectory = rejectedDirectory;
    const outputPath = resolve(
      outputDirectory,
      `${result.success.candidateId}.md`,
    );
    mkdirSync(outputDirectory, { recursive: true });
    const rejectionReason =
      result.success.candidateStagePlan.outcome.tag === "rejected"
        ? result.success.candidateStagePlan.outcome.reason
        : "Candidate stage plan was rejected.";
    if (result.success.catalogueComparison.tag !== "retained") {
      fail("Candidate rejection must retain catalogue comparison evidence.");
    }
    const rejectionRecord = Schema.decodeUnknownResult(
      RejectedScenarioCandidateRecordSchema,
      { onExcessProperty: "error" },
    )({
      schemaVersion: 1,
      candidateId: result.success.candidateId,
      campaignId: result.success.campaignId,
      evidenceSetId: decodedConfig.success.evidenceSetId,
      reason: rejectionReason,
      ...catalogueBoundary,
      catalogueComparison: result.success.catalogueComparison.comparison,
    });
    if (Result.isFailure(rejectionRecord))
      fail(rejectionRecord.failure.message);
    const candidateRejectionPath = resolve(
      campaignEvidenceDirectory,
      "candidate-rejection.json",
    );
    const staging = mkdtempSync(resolve(outputDirectory, ".rejection-stage-"));
    const stagedScenario = resolve(staging, "scenario.md");
    const stagedStagePlan = resolve(staging, "stage-plan.json");
    const stagedStagePlanFindings = resolve(
      staging,
      "stage-plan-findings.json",
    );
    const stagedRejection = resolve(staging, "candidate-rejection.json");
    const stagedFindings = resolve(staging, "findings.json");
    const findingsPath = findingsArtifactPath(campaignEvidenceDirectory);
    const stagePlanPath = retainedRejectedScenarioStagePlanPath(
      result.success.candidateId,
    );
    const stagePlanFindingsPath = retainedRejectedScenarioStagePlanFindingsPath(
      result.success.candidateId,
    );
    let publication: ScenarioRejectionPublication | undefined;
    try {
      writeFileSync(stagedScenario, scenarioBytes, { flag: "wx" });
      const retainedPlan = retainCandidateScenarioStagePlanAtPaths({
        candidateId: result.success.candidateId,
        candidateScenarioSha256: scenarioSha256,
        plan: result.success.candidateStagePlan,
        stagePlanPath: stagedStagePlan,
        stagePlanFindingsPath: stagedStagePlanFindings,
      });
      if (Result.isFailure(retainedPlan)) fail(retainedPlan.failure);
      writeFileSync(
        stagedRejection,
        `${JSON.stringify(rejectionRecord.success, null, 2)}\n`,
        { flag: "wx" },
      );
      emitGenerationFindings(
        {
          tag: "candidateStagePlanRejection",
          candidateProsePath: stagedScenario,
          stagePlanPath: stagedStagePlan,
          stagePlanFindingsPath: stagedStagePlanFindings,
          candidateRejectionPath: stagedRejection,
        },
        {
          path: stagedFindings,
          ingest: false,
          pathReplacements: [
            [stagedScenario, outputPath],
            [stagedStagePlan, stagePlanPath],
            [stagedStagePlanFindings, stagePlanFindingsPath],
            [stagedRejection, candidateRejectionPath],
            [stagedFindings, findingsPath],
          ],
        },
      );
      publication = publishScenarioRejectionBundle({
        prose: [stagedScenario, outputPath],
        stagePlan: [stagedStagePlan, stagePlanPath],
        stagePlanFindings: [stagedStagePlanFindings, stagePlanFindingsPath],
        candidateRejection: [stagedRejection, candidateRejectionPath],
        findings: [stagedFindings, findingsPath],
      });
      ingestGenerationFindings({ findingsPath, dbPath });
    } catch (error: unknown) {
      if (publication !== undefined)
        rollbackScenarioRejectionBundle(publication);
      throw error;
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
    console.log(
      `Rejected ${outputPath} before whole-scenario review after ${result.success.iterations} iteration(s): ${result.success.candidateStagePlan.outcome.tag === "rejected" ? result.success.candidateStagePlan.outcome.reason : "candidate stage plan rejection"}.`,
    );
    return;
  }
  const admittedScenarioId = decodeScenarioId(result.success.plannedScenarioId);
  if (Result.isFailure(admittedScenarioId)) {
    fail(
      `Planned Scenario identity cannot become an admitted Scenario: ${admittedScenarioId.failure}`,
    );
  }
  const disposition = finalScenarioDisposition(result.success);
  if (result.success.catalogueComparison.tag !== "retained") {
    fail("Scenario admission requires retained catalogue comparison evidence.");
  }
  const reviewInput = {
    ...(disposition === "admitted"
      ? { scenarioId: admittedScenarioId.success, scenarioSha256 }
      : {
          campaignId: result.success.campaignId,
          candidateId: result.success.candidateId,
          candidateScenarioSha256: scenarioSha256,
        }),
    gitSha: gitSha.success,
    reviewScope: result.success.reviewScope,
    contentAvailabilityIntent: result.success.contentAvailabilityIntent,
    sdkCapabilityIntent: result.success.sdkCapabilityIntent,
    admitReviewedUnsupported: result.success.admitReviewedUnsupported,
    rawReview: result.success.rawReview,
    contentReview: result.success.contentReview,
    sdkCapabilityReview: result.success.sdkCapabilityReview,
    policyReview: result.success.policyReview,
    scenarioQuality: result.success.scenarioQuality,
    catalogueComparison: result.success.catalogueComparison.comparison,
  };
  const retainedReview: object = (() => {
    if (disposition === "admitted") {
      const decoded = Schema.decodeUnknownResult(FinalScenarioReviewSchema, {
        onExcessProperty: "error",
      })(reviewInput);
      if (Result.isFailure(decoded)) {
        fail(`Invalid final scenario review: ${decoded.failure.message}`);
      }
      return decoded.success;
    }
    const decoded = Schema.decodeUnknownResult(
      RejectedScenarioCandidateReviewSchema,
      { onExcessProperty: "error" },
    )(reviewInput);
    if (Result.isFailure(decoded)) {
      fail(`Invalid final candidate review: ${decoded.failure.message}`);
    }
    return decoded.success;
  })();
  const outputDirectory =
    disposition === "admitted" ? admittedDirectory : rejectedDirectory;
  const outputIdentity =
    disposition === "admitted"
      ? admittedScenarioId.success
      : result.success.candidateId;
  const outputPath = resolve(outputDirectory, `${outputIdentity}.md`);
  const reviewPath = `${outputPath}.${disposition === "admitted" ? "scenario" : "candidate"}-review.json`;
  mkdirSync(outputDirectory, { recursive: true });
  const staging = mkdtempSync(resolve(outputDirectory, ".scenario-stage-"));
  const stagedScenario = resolve(staging, "scenario.md");
  const stagedReview = resolve(staging, "scenario-review.json");
  let publication: ScenarioAdmissionPublication | undefined;
  try {
    writeFileSync(stagedScenario, scenarioBytes, { flag: "wx" });
    writeFileSync(
      stagedReview,
      `${JSON.stringify(retainedReview, null, 2)}\n`,
      {
        flag: "wx",
      },
    );
    if (disposition === "rejected") {
      // Rejected authorities are published together below, after the stage
      // plan, rejection record, and findings projection have all been staged.
    } else {
      const stagedStagePlan = resolve(staging, "stage-plan.json");
      const stagedStagePlanFindings = resolve(
        staging,
        "stage-plan-findings.json",
      );
      const stagedScenarioRecord = resolve(staging, "scenario.json");
      const stagedFindings = resolve(staging, "findings.json");
      const findingsPath = findingsArtifactPath(campaignEvidenceDirectory);
      const retainedStagePlanPath = retainedScenarioStagePlanPath(
        admittedScenarioId.success,
      );
      const retainedStagePlanFindingsPath =
        retainedScenarioStagePlanFindingsPath(admittedScenarioId.success);
      const retainedFacts = retainScenarioStageFacts({
        scenarioId: admittedScenarioId.success,
        scenarioPath: stagedScenario,
        scenarioSha256,
        facts: result.success.stageFacts,
      });
      if (Result.isFailure(retainedFacts)) fail(retainedFacts.failure);
      const retainedPlan = retainAdmittedScenarioStagePlanAtPaths({
        scenarioId: admittedScenarioId.success,
        scenarioPath: stagedScenario,
        scenarioSha256,
        scenarioReviewSha256: createHash("sha256")
          .update(readFileSync(stagedReview))
          .digest("hex"),
        stagePlanPath: stagedStagePlan,
        stagePlanFindingsPath: stagedStagePlanFindings,
      });
      if (Result.isFailure(retainedPlan)) fail(retainedPlan.failure);
      if (retainedPlan.success.outcome.tag !== "admitted") {
        fail(
          retainedPlan.success.outcome.tag === "rejected"
            ? retainedPlan.success.outcome.reason
            : "The retained stage plan did not admit the generated scenario.",
        );
      }
      const scenarioRecord = Schema.decodeUnknownResult(
        AdmittedScenarioRecordSchema,
        { onExcessProperty: "error" },
      )({
        schemaVersion: 2,
        scenarioId: admittedScenarioId.success,
        title: result.success.scenarioTitle,
        purpose: result.success.scenarioPurpose,
        predecessorScenarioIds: catalogueProjections.map(
          ({ scenarioId }) => scenarioId,
        ),
        authoredSource: artifactAuthorityForBytes(
          relative(repoRoot, outputPath),
          readFileSync(stagedScenario),
        ),
        admissionReview: artifactAuthorityForBytes(
          relative(repoRoot, reviewPath),
          readFileSync(stagedReview),
        ),
        stageFacts: artifactAuthorityForBytes(
          relative(repoRoot, `${outputPath}.stage-facts.json`),
          readFileSync(`${stagedScenario}.stage-facts.json`),
        ),
      });
      if (Result.isFailure(scenarioRecord))
        fail(scenarioRecord.failure.message);
      writeFileSync(
        stagedScenarioRecord,
        `${JSON.stringify(scenarioRecord.success, null, 2)}\n`,
        { flag: "wx" },
      );
      verifyRetainedScenario(
        admittedScenarioId.success,
        stagedScenario,
        stagedReview,
        gitSha.success,
        (() => {
          if (catalogueProjections.length === 0) {
            return { tag: "noAdmittedScenarios" as const };
          }
          const scenarioIds = catalogueProjections.map(
            ({ scenarioId }) => scenarioId,
          );
          const batches = catalogueBatches.success.map((batch, batchIndex) => ({
            batchIndex,
            scenarioIds: batch.map(({ scenarioId }) => scenarioId),
          }));
          const [firstScenarioId, ...remainingScenarioIds] = scenarioIds;
          const [firstBatch, ...remainingBatches] = batches;
          if (firstScenarioId === undefined || firstBatch === undefined) {
            fail(
              "A nonempty admitted catalogue must retain at least one Scenario and one comparison batch.",
            );
          }
          return {
            tag: "admittedScenarios" as const,
            scenarioIds: [firstScenarioId, ...remainingScenarioIds],
            batches: [firstBatch, ...remainingBatches],
          };
        })(),
      );
      emitGenerationFindings(
        {
          tag: "admittedScenario",
          scenarioPath: stagedScenario,
          scenarioReviewPath: stagedReview,
          stageFactsPath: `${stagedScenario}.stage-facts.json`,
          stagePlanPath: stagedStagePlan,
          stagePlanFindingsPath: stagedStagePlanFindings,
        },
        {
          path: stagedFindings,
          ingest: false,
          pathReplacements: [
            [stagedScenario, outputPath],
            [stagedReview, reviewPath],
            [
              `${stagedScenario}.stage-facts.json`,
              `${outputPath}.stage-facts.json`,
            ],
            [stagedStagePlan, retainedStagePlanPath],
            [stagedStagePlanFindings, retainedStagePlanFindingsPath],
            [stagedFindings, findingsPath],
          ],
        },
      );
      publication = publishScenarioAdmissionBundle({
        prose: [stagedScenario, outputPath],
        review: [stagedReview, reviewPath],
        stageFacts: [
          `${stagedScenario}.stage-facts.json`,
          `${outputPath}.stage-facts.json`,
        ],
        stagePlan: [stagedStagePlan, retainedStagePlanPath],
        stagePlanFindings: [
          stagedStagePlanFindings,
          retainedStagePlanFindingsPath,
        ],
        scenarioRecord: [
          stagedScenarioRecord,
          outputPath.replace(/\.md$/, ".scenario.json"),
        ],
        findings: [stagedFindings, findingsPath],
      });
      try {
        ingestPublishedScenarioAdmissionBundle({
          publication,
          findingsPath,
          dbPath,
        });
      } catch (error: unknown) {
        publication = undefined;
        throw error;
      }
      publication = undefined;
    }
  } catch (error: unknown) {
    if (disposition === "admitted") {
      let rollbackError: unknown;
      if (publication !== undefined) {
        try {
          rollbackScenarioAdmissionBundle(publication);
        } catch (error) {
          rollbackError = error;
        }
      }
      try {
        emitGenerationFindings({
          tag: "campaignFailure",
          reason: `Scenario admission finalization failed: ${error instanceof Error ? error.message : String(error)}`,
        });
      } catch {
        // Preserve the admission failure; the authorities have already been
        // rolled back or the rollback error below will make the failure clear.
      }
      if (rollbackError !== undefined) {
        throw new Error(
          `Scenario admission finalization failed and publication rollback was incomplete: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
          { cause: error },
        );
      }
    }
    throw error;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
  if (disposition === "rejected") {
    const rejectionReason = [
      `RAW=${result.success.rawReview.classification}`,
      `content=${result.success.contentReview.classification}`,
      `SDK=${result.success.sdkCapabilityReview.classification}`,
      `policy=${result.success.policyReview.classification}`,
      `quality=${result.success.scenarioQuality.classification}`,
    ].join(", ");
    const rejectionRecord = Schema.decodeUnknownResult(
      RejectedScenarioCandidateRecordSchema,
      { onExcessProperty: "error" },
    )({
      schemaVersion: 1,
      candidateId: result.success.candidateId,
      campaignId: result.success.campaignId,
      evidenceSetId: decodedConfig.success.evidenceSetId,
      reason: rejectionReason,
      ...catalogueBoundary,
      catalogueComparison: result.success.catalogueComparison.comparison,
    });
    if (Result.isFailure(rejectionRecord))
      fail(rejectionRecord.failure.message);
    const candidateRejectionPath = resolve(
      campaignEvidenceDirectory,
      "candidate-rejection.json",
    );
    const staging = mkdtempSync(
      resolve(rejectedDirectory, ".rejection-stage-"),
    );
    const stagedScenario = resolve(staging, "scenario.md");
    const stagedReview = resolve(staging, "candidate-review.json");
    const stagedStagePlan = resolve(staging, "stage-plan.json");
    const stagedStagePlanFindings = resolve(
      staging,
      "stage-plan-findings.json",
    );
    const stagedRejection = resolve(staging, "candidate-rejection.json");
    const stagedFindings = resolve(staging, "findings.json");
    const findingsPath = findingsArtifactPath(campaignEvidenceDirectory);
    const stagePlanPath = retainedRejectedScenarioStagePlanPath(
      result.success.candidateId,
    );
    const stagePlanFindingsPath = retainedRejectedScenarioStagePlanFindingsPath(
      result.success.candidateId,
    );
    let publication: ScenarioRejectionPublication | undefined;
    try {
      writeFileSync(stagedScenario, scenarioBytes, { flag: "wx" });
      writeFileSync(
        stagedReview,
        `${JSON.stringify(retainedReview, null, 2)}\n`,
        { flag: "wx" },
      );
      const retainedPlan = retainCandidateScenarioStagePlanAtPaths({
        candidateId: result.success.candidateId,
        candidateScenarioSha256: scenarioSha256,
        plan: result.success.candidateStagePlan,
        stagePlanPath: stagedStagePlan,
        stagePlanFindingsPath: stagedStagePlanFindings,
      });
      if (Result.isFailure(retainedPlan)) fail(retainedPlan.failure);
      writeFileSync(
        stagedRejection,
        `${JSON.stringify(rejectionRecord.success, null, 2)}\n`,
        { flag: "wx" },
      );
      emitGenerationFindings(
        {
          tag: "reviewedCandidateRejection",
          candidateProsePath: stagedScenario,
          candidateReviewPath: stagedReview,
          stagePlanPath: stagedStagePlan,
          stagePlanFindingsPath: stagedStagePlanFindings,
          candidateRejectionPath: stagedRejection,
        },
        {
          path: stagedFindings,
          ingest: false,
          pathReplacements: [
            [stagedScenario, outputPath],
            [stagedReview, reviewPath],
            [stagedStagePlan, stagePlanPath],
            [stagedStagePlanFindings, stagePlanFindingsPath],
            [stagedRejection, candidateRejectionPath],
            [stagedFindings, findingsPath],
          ],
        },
      );
      publication = publishScenarioRejectionBundle({
        prose: [stagedScenario, outputPath],
        review: [stagedReview, reviewPath],
        stagePlan: [stagedStagePlan, stagePlanPath],
        stagePlanFindings: [stagedStagePlanFindings, stagePlanFindingsPath],
        candidateRejection: [stagedRejection, candidateRejectionPath],
        findings: [stagedFindings, findingsPath],
      });
      ingestGenerationFindings({ findingsPath, dbPath });
    } catch (error: unknown) {
      if (publication !== undefined)
        rollbackScenarioRejectionBundle(publication);
      throw error;
    } finally {
      rmSync(staging, { recursive: true, force: true });
    }
    console.log(
      `Rejected Candidate ${result.success.candidateId}; no Scenario was admitted.`,
    );
    return;
  }
  console.log(
    `Generated ${outputPath} in ${result.success.iterations} iteration(s), stopped by ${result.success.stopReason}, ${disposition}.`,
  );
}

if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
