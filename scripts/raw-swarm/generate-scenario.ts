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
import { Either, Match, Schema } from "effect";

import { capabilityContextForRole } from "./capability-projection.ts";
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
  CurrentScenarioCompositeReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
  verifyFinalScenarioReview,
  type ContentAvailabilityIntent,
  type ScenarioCampaignCandidateRejection,
  type ScenarioCampaignAgents,
  type ScenarioCampaignResult,
  type ScenarioCatalogueAdmissionContext,
  type ScenarioCompositeReview,
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
  canonicalJson,
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
  if (Either.isLeft(artifact)) fail(artifact.left);
  const retainedArtifactPath = codexRawRetentionArtifactPath(
    input.retainedEventPath,
    retention.event,
  );
  writeFileSync(retainedArtifactPath, artifact.right.contents, { flag: "wx" });
  const retainedArtifact = readCodexRawRetentionArtifact({
    eventPath: input.retainedEventPath,
    event: retention.event,
  });
  if (Either.isLeft(retainedArtifact)) fail(retainedArtifact.left);
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
  schema: Schema.Schema<A, I>,
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

function generationPreamble(
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

${sdkCapabilityIntent === "supportedOnly" ? "Use only scenario facts and interactions representable through the current public SDK described below. Do not repeat known unsupported mechanics merely because a prior scenario used them." : "Deliberately exercise one capability absent from the current public SDK described below, and explicitly name that capability as the intended probe. Keep the remaining scenario representable."}

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
    reviewScenario: async ({
      scenario,
      campaignId,
      candidateId,
      candidateScenarioSha256,
      plannedScenarioId,
      finalReview,
      distributionPreference,
      contentAvailabilityIntent,
      sdkCapabilityIntent,
      catalogueComparison,
    }) =>
      runCodexJson(
        `Perform one ${finalReview ? "final pre-play" : "milestone"} review invocation with five mandatory, independently scoped assessments. Do not produce an aggregate verdict and do not merge their evidence or responsibilities.

RAW: use only .references/srd-5.2.1/ and ASSUMPTIONS.md. Check legality, coherence, executability, and missing Table Decisions. Do not choose tactics, predict an outcome, rewrite prose, or decide artifact policy.

Content availability: compare selected canonical identities with the supplied availability list and the exact campaign intent. Do not infer a product obligation from an accidental unavailable selection.

SDK capability: compare required setup/play facts with the current public SDK documentation below, not historical run verdicts. Do not inspect implementation files.

Artifact policy: apply docs/mushroom-playbook/AUTHORING.md only to public identity/expression safety. Do not judge mechanics or tactics.

Scenario quality: independently classify the setup and encounter as ready only when it is mechanically meaningful, every represented combatant or group seriously pursues an authored strategy-bearing objective, and fixed versus delegated choices fit the campaign distribution preference. Do not impose generic balance: a deliberately loose or highly prescribed scenario can be ready. Do not choose tactics, predict an outcome, or rewrite prose. Return one concise critique when this quality responsibility needs a material revision.

Content-availability intent: ${contentAvailabilityIntent}
SDK-capability intent: ${sdkCapabilityIntent}
Campaign distribution preference: ${distributionPreference}

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
        CurrentScenarioCompositeReviewSchema,
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
      ),
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
      if (Either.isLeft(prompt)) fail(prompt.left);
      return runCodexJson(prompt.right, ScenarioCatalogueComparisonSchema, {
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
}): Promise<ScenarioCompositeReview> {
  if (input.retainedInput.schemaVersion === 2) {
    fail(
      "Historical Scenario review input is readable evidence but is not a current executable review subject.",
    );
  }
  const currentOutputSchema = codexOutputJsonSchema(
    CurrentScenarioCompositeReviewSchema,
  );
  const historicalOutputSchema = codexOutputJsonSchema(
    HistoricalScenarioCompositeReviewSchema,
  );
  const isCurrent =
    canonicalJson(input.retainedInput.outputJsonSchema) ===
    canonicalJson(currentOutputSchema);
  const isHistorical =
    canonicalJson(input.retainedInput.outputJsonSchema) ===
    canonicalJson(historicalOutputSchema);
  if (!isCurrent && !isHistorical) {
    fail(
      "Retained scenario review input does not use the production composite-review schema.",
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
  return isCurrent
    ? await runCodexJson(
        input.retainedInput.prompt,
        CurrentScenarioCompositeReviewSchema,
        execution,
      )
    : await runCodexJson(
        input.retainedInput.prompt,
        HistoricalScenarioCompositeReviewSchema,
        execution,
      );
}

function verifyRetainedScenario(
  scenarioId: Schema.Schema.Type<typeof ScenarioIdSchema>,
  scenarioPath: string,
  reviewPath: string,
  gitSha: string,
  catalogue: ScenarioCatalogueAdmissionContext,
): void {
  const scenarioBytes = readFileSync(scenarioPath, "utf8");
  const decodedGitSha = Schema.decodeUnknownEither(GitShaSchema)(gitSha);
  if (Either.isLeft(decodedGitSha)) {
    fail("Retained scenario has an invalid Git revision.");
  }
  const verification = verifyFinalScenarioReview(
    JSON.parse(readFileSync(reviewPath, "utf8")),
    {
      scenarioId,
      gitSha: decodedGitSha.right,
      scenarioBytes,
      catalogue,
    },
  );
  if (Either.isLeft(verification)) {
    fail(verification.left);
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
  const gitSha = Schema.decodeUnknownEither(GitShaSchema)(revision.sha);
  if (Either.isLeft(gitSha)) {
    fail("Scenario generation found an invalid Git revision.");
  }
  const configPath = resolve(repoRoot, configInput);
  const configJson: unknown = JSON.parse(readFileSync(configPath, "utf8"));
  const decodedConfig = Schema.decodeUnknownEither(
    ScenarioCampaignConfigSchema,
    {
      onExcessProperty: "error",
    },
  )(configJson);
  if (Either.isLeft(decodedConfig)) {
    fail(`Invalid scenario campaign: ${decodedConfig.left.message}`);
  }
  const catalogue = readRawSwarmCatalogue({
    repositoryRoot: repoRoot,
    scenarioDirectory: resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios",
    ),
    evidenceDirectory: resolve(repoRoot, "scripts/raw-swarm/out"),
  });
  if (Either.isLeft(catalogue)) {
    fail(
      `Unable to read the complete admitted Scenario catalogue: ${JSON.stringify(catalogue.left)}`,
    );
  }
  const catalogueProjections = projectScenarioCatalogueForAuthoring(
    catalogue.right,
  );
  const catalogueBatches =
    batchScenarioCatalogueProjections(catalogueProjections);
  if (Either.isLeft(catalogueBatches)) fail(catalogueBatches.left);
  const catalogueBoundary = scenarioCatalogueComparisonBoundary({
    projections: catalogueProjections,
    batches: catalogueBatches.right,
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
    `${decodedConfig.right.plannedScenarioId}.md`,
  );
  const rejectedPath = resolve(
    rejectedDirectory,
    `${decodedConfig.right.plannedScenarioId}.md`,
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
    `scripts/raw-swarm/out/${decodedConfig.right.evidenceSetId}/generation-invocations.jsonl`,
  );
  const campaignEvidenceDirectory = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${decodedConfig.right.evidenceSetId}`,
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
        campaignId: decodedConfig.right.campaignId,
        evidenceSetId: decodedConfig.right.evidenceSetId,
        plannedScenarioId: decodedConfig.right.plannedScenarioId,
        gitSha: gitSha.right,
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
    const retainedProjection = Schema.decodeUnknownEither(
      FindingsProjectionSchema,
      { onExcessProperty: "error" },
    )(replacePath(projection));
    if (Either.isLeft(retainedProjection)) {
      fail(
        `Rewritten generation findings projection is invalid: ${retainedProjection.left.message}`,
      );
    }
    const retainedFindingsPath =
      options.path ?? findingsArtifactPath(campaignEvidenceDirectory);
    writeFindingsProjection({
      projection: retainedProjection.right,
      path: retainedFindingsPath,
    });
    if (options.ingest !== false) {
      ingestGenerationFindings({
        findingsPath: retainedFindingsPath,
        dbPath,
      });
    }
  };
  let result: Either.Either<ScenarioCampaignResult, string>;
  try {
    result = await runScenarioCampaign(
      decodedConfig.right,
      scenarioCampaignAgents({
        ledgerPath,
        eventDirectory: resolve(campaignEvidenceDirectory, "invocation-events"),
        campaignId: decodedConfig.right.campaignId,
        evidenceSetId: decodedConfig.right.evidenceSetId,
        plannedScenarioId: decodedConfig.right.plannedScenarioId,
        gitSha: gitSha.right,
      }),
      {
        select: randomInt,
      },
      {
        tag: "required",
        batches: catalogueBatches.right,
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
  if (Either.isLeft(result)) {
    emitGenerationFindings({ tag: "campaignFailure", reason: result.left });
    fail(result.left);
  }
  if (!retentionRevisionMatches(gitSha.right, currentGitRevision())) {
    emitGenerationFindings({
      tag: "campaignFailure",
      reason:
        "Git revision changed during scenario generation; nothing was retained.",
    });
    fail(
      "Git revision changed during scenario generation; nothing was retained.",
    );
  }
  const scenarioBytes = `${result.right.scenario.trim()}\n`;
  const scenarioSha256 = scenarioContentSha256(result.right.scenario);
  if (isCandidateRejection(result.right)) {
    const outputDirectory = rejectedDirectory;
    const outputPath = resolve(
      outputDirectory,
      `${result.right.candidateId}.md`,
    );
    mkdirSync(outputDirectory, { recursive: true });
    const rejectionReason =
      result.right.candidateStagePlan.outcome.tag === "rejected"
        ? result.right.candidateStagePlan.outcome.reason
        : "Candidate stage plan was rejected.";
    if (result.right.catalogueComparison.tag !== "retained") {
      fail("Candidate rejection must retain catalogue comparison evidence.");
    }
    const rejectionRecord = Schema.decodeUnknownEither(
      RejectedScenarioCandidateRecordSchema,
      { onExcessProperty: "error" },
    )({
      schemaVersion: 1,
      candidateId: result.right.candidateId,
      campaignId: result.right.campaignId,
      evidenceSetId: decodedConfig.right.evidenceSetId,
      reason: rejectionReason,
      ...catalogueBoundary,
      catalogueComparison: result.right.catalogueComparison.comparison,
    });
    if (Either.isLeft(rejectionRecord)) fail(rejectionRecord.left.message);
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
      result.right.candidateId,
    );
    const stagePlanFindingsPath = retainedRejectedScenarioStagePlanFindingsPath(
      result.right.candidateId,
    );
    let publication: ScenarioRejectionPublication | undefined;
    try {
      writeFileSync(stagedScenario, scenarioBytes, { flag: "wx" });
      const retainedPlan = retainCandidateScenarioStagePlanAtPaths({
        candidateId: result.right.candidateId,
        candidateScenarioSha256: scenarioSha256,
        plan: result.right.candidateStagePlan,
        stagePlanPath: stagedStagePlan,
        stagePlanFindingsPath: stagedStagePlanFindings,
      });
      if (Either.isLeft(retainedPlan)) fail(retainedPlan.left);
      writeFileSync(
        stagedRejection,
        `${JSON.stringify(rejectionRecord.right, null, 2)}\n`,
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
      `Rejected ${outputPath} before whole-scenario review after ${result.right.iterations} iteration(s): ${result.right.candidateStagePlan.outcome.tag === "rejected" ? result.right.candidateStagePlan.outcome.reason : "candidate stage plan rejection"}.`,
    );
    return;
  }
  const admittedScenarioId = decodeScenarioId(result.right.plannedScenarioId);
  if (Either.isLeft(admittedScenarioId)) {
    fail(
      `Planned Scenario identity cannot become an admitted Scenario: ${admittedScenarioId.left}`,
    );
  }
  const disposition = finalScenarioDisposition(result.right);
  if (result.right.catalogueComparison.tag !== "retained") {
    fail("Scenario admission requires retained catalogue comparison evidence.");
  }
  const reviewInput = {
    ...(disposition === "admitted"
      ? { scenarioId: admittedScenarioId.right, scenarioSha256 }
      : {
          campaignId: result.right.campaignId,
          candidateId: result.right.candidateId,
          candidateScenarioSha256: scenarioSha256,
        }),
    gitSha: gitSha.right,
    reviewScope: result.right.reviewScope,
    contentAvailabilityIntent: result.right.contentAvailabilityIntent,
    sdkCapabilityIntent: result.right.sdkCapabilityIntent,
    admitReviewedUnsupported: result.right.admitReviewedUnsupported,
    rawReview: result.right.rawReview,
    contentReview: result.right.contentReview,
    sdkCapabilityReview: result.right.sdkCapabilityReview,
    policyReview: result.right.policyReview,
    scenarioQuality: result.right.scenarioQuality,
    catalogueComparison: result.right.catalogueComparison.comparison,
  };
  const retainedReview: object = (() => {
    if (disposition === "admitted") {
      const decoded = Schema.decodeUnknownEither(FinalScenarioReviewSchema, {
        onExcessProperty: "error",
      })(reviewInput);
      if (Either.isLeft(decoded)) {
        fail(`Invalid final scenario review: ${decoded.left.message}`);
      }
      return decoded.right;
    }
    const decoded = Schema.decodeUnknownEither(
      RejectedScenarioCandidateReviewSchema,
      { onExcessProperty: "error" },
    )(reviewInput);
    if (Either.isLeft(decoded)) {
      fail(`Invalid final candidate review: ${decoded.left.message}`);
    }
    return decoded.right;
  })();
  const outputDirectory =
    disposition === "admitted" ? admittedDirectory : rejectedDirectory;
  const outputIdentity =
    disposition === "admitted"
      ? admittedScenarioId.right
      : result.right.candidateId;
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
        admittedScenarioId.right,
      );
      const retainedStagePlanFindingsPath =
        retainedScenarioStagePlanFindingsPath(admittedScenarioId.right);
      const retainedFacts = retainScenarioStageFacts({
        scenarioId: admittedScenarioId.right,
        scenarioPath: stagedScenario,
        scenarioSha256,
        facts: result.right.stageFacts,
      });
      if (Either.isLeft(retainedFacts)) fail(retainedFacts.left);
      const retainedPlan = retainAdmittedScenarioStagePlanAtPaths({
        scenarioId: admittedScenarioId.right,
        scenarioPath: stagedScenario,
        scenarioSha256,
        scenarioReviewSha256: createHash("sha256")
          .update(readFileSync(stagedReview))
          .digest("hex"),
        stagePlanPath: stagedStagePlan,
        stagePlanFindingsPath: stagedStagePlanFindings,
      });
      if (Either.isLeft(retainedPlan)) fail(retainedPlan.left);
      if (retainedPlan.right.outcome.tag !== "admitted") {
        fail(
          retainedPlan.right.outcome.tag === "rejected"
            ? retainedPlan.right.outcome.reason
            : "The retained stage plan did not admit the generated scenario.",
        );
      }
      const scenarioRecord = Schema.decodeUnknownEither(
        AdmittedScenarioRecordSchema,
        { onExcessProperty: "error" },
      )({
        schemaVersion: 2,
        scenarioId: admittedScenarioId.right,
        title: result.right.scenarioTitle,
        purpose: result.right.scenarioPurpose,
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
      if (Either.isLeft(scenarioRecord)) fail(scenarioRecord.left.message);
      writeFileSync(
        stagedScenarioRecord,
        `${JSON.stringify(scenarioRecord.right, null, 2)}\n`,
        { flag: "wx" },
      );
      verifyRetainedScenario(
        admittedScenarioId.right,
        stagedScenario,
        stagedReview,
        gitSha.right,
        (() => {
          if (catalogueProjections.length === 0) {
            return { tag: "noAdmittedScenarios" as const };
          }
          const scenarioIds = catalogueProjections.map(
            ({ scenarioId }) => scenarioId,
          );
          const batches = catalogueBatches.right.map((batch, batchIndex) => ({
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
      `RAW=${result.right.rawReview.classification}`,
      `content=${result.right.contentReview.classification}`,
      `SDK=${result.right.sdkCapabilityReview.classification}`,
      `policy=${result.right.policyReview.classification}`,
      `quality=${result.right.scenarioQuality.classification}`,
    ].join(", ");
    const rejectionRecord = Schema.decodeUnknownEither(
      RejectedScenarioCandidateRecordSchema,
      { onExcessProperty: "error" },
    )({
      schemaVersion: 1,
      candidateId: result.right.candidateId,
      campaignId: result.right.campaignId,
      evidenceSetId: decodedConfig.right.evidenceSetId,
      reason: rejectionReason,
      ...catalogueBoundary,
      catalogueComparison: result.right.catalogueComparison.comparison,
    });
    if (Either.isLeft(rejectionRecord)) fail(rejectionRecord.left.message);
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
      result.right.candidateId,
    );
    const stagePlanFindingsPath = retainedRejectedScenarioStagePlanFindingsPath(
      result.right.candidateId,
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
        candidateId: result.right.candidateId,
        candidateScenarioSha256: scenarioSha256,
        plan: result.right.candidateStagePlan,
        stagePlanPath: stagedStagePlan,
        stagePlanFindingsPath: stagedStagePlanFindings,
      });
      if (Either.isLeft(retainedPlan)) fail(retainedPlan.left);
      writeFileSync(
        stagedRejection,
        `${JSON.stringify(rejectionRecord.right, null, 2)}\n`,
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
      `Rejected Candidate ${result.right.candidateId}; no Scenario was admitted.`,
    );
    return;
  }
  console.log(
    `Generated ${outputPath} in ${result.right.iterations} iteration(s), stopped by ${result.right.stopReason}, ${disposition}.`,
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
