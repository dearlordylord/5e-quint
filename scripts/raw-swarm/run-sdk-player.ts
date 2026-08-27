import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  benchmarkContextDeliveryForRole,
  benchmarkContextForRole,
  BenchmarkContextDeliveryEvidenceSchema,
  BenchmarkContextProfileSchema,
  type BenchmarkContextProfile,
} from "./benchmark-context.ts";
import {
  consumerPermissionProfileAvailable,
  createConsumerCodexHome,
} from "./sdk-player/consumer-codex-profile.ts";
import {
  buildConsumerDistribution,
  type ContextDelivery,
} from "./sdk-player/consumer-distribution.ts";
import { PLAYER_CONTINUATION_PROTOCOL_REMINDER } from "./sdk-player/continuation-contract.ts";
import {
  parseSdkTranscript,
  sdkInitialTurnProjectionEvidence,
} from "./sdk-player/sdk-transcript.ts";
import { admittedScenarioIdentity } from "./scenario-admission.ts";
import {
  artifactAuthorityForBytes,
  readRunnerOwnedJsonLines,
} from "./artifact-authority.ts";
import {
  retainAdmittedScenarioStagePlan,
  retainedScenarioStageFactsPath,
  retainedScenarioStagePlanFindingsPath,
  retainedScenarioStagePlanPath,
  validateAdmittedScenarioStagePlanEvidence,
} from "./stage-plan-authority.ts";
import { evaluateScenarioCharacters } from "./sdk-player/scenario-character-runtime.ts";
import {
  RAW_SWARM_STAGE_PLAN_REASONS,
  stagePlanEntry,
  validateScenarioStagePlan,
} from "./scenario-stage-plan.ts";
import {
  currentGitRevision,
  decodeScenarioId,
  GitShaSchema,
  isJsonRecord,
  repoRoot,
  sha256Canonical,
  StartedAtSchema,
  type GitSha,
  type ScenarioId,
} from "./transcript.ts";
import { Either, Match, Schema } from "effect";
import {
  runCodexInvocation,
  terminateOwnedProcess,
  type ModelInvocationRun,
  type SpawnedCodexProcess,
} from "./model-telemetry.ts";
import {
  PlayerExecutionStateSchema,
  playerContinuationEvidence,
  type PlayerEvidenceState,
} from "./player-continuation-evidence.ts";
import {
  findingsArtifactPath,
  projectExecutionFindings,
  findingsCheckpointArtifactPath,
  writeFindingsProjection,
} from "./findings.ts";
import { projectTranscriptlessFindings } from "./generation-findings.ts";
import {
  decodeEvidenceSetId,
  decodeExecutionId,
} from "./raw-swarm-identities.ts";
import {
  findAuthorableScenarioInCatalogue,
  readRawSwarmCatalogue,
  ScenarioExecutionRecordSchema,
} from "./scenario-catalogue.ts";
import {
  canonicalRepositoryOutputPath,
  canonicalRepositoryReadPath,
} from "./repository-path.ts";
import { assertModelEntryPointGuard } from "./model-entrypoint-guard.ts";

const PLAYER_MODEL = "gpt-5.6-sol";
const PLAYER_REASONING_EFFORT = "medium";

function repositoryReadPath(value: string): string {
  const result = canonicalRepositoryReadPath(repoRoot, value);
  if (Either.isRight(result)) return result.right;
  const prospective = canonicalRepositoryOutputPath(repoRoot, value);
  return Either.isRight(prospective)
    ? prospective.right
    : fail(`Read path is not a repository authority: ${value}: ${result.left}`);
}

function repositoryOutputPath(value: string): string {
  const result = canonicalRepositoryOutputPath(repoRoot, value);
  return Either.isRight(result)
    ? result.right
    : fail(
        `Output path is not a repository destination: ${value}: ${result.left}`,
      );
}

function fail(message: string): never {
  throw new Error(message);
}

function parseOptionalImplementationGitSha(
  input: string | undefined,
): Either.Either<GitSha | undefined, string> {
  if (input === undefined) return Either.right(undefined);
  if (input.trim().length === 0 || input.startsWith("-")) {
    return Either.left(
      "--implementation-git-sha requires a lowercase Git SHA value.",
    );
  }
  return Schema.decodeUnknownEither(GitShaSchema)(input).pipe(
    Either.mapLeft((error) => error.message),
  );
}

function parseOptionalBenchmarkProfile(
  input: string | undefined,
): Either.Either<BenchmarkContextProfile | undefined, string> {
  if (input === undefined) return Either.right(undefined);
  return Schema.decodeUnknownEither(BenchmarkContextProfileSchema)(input).pipe(
    Either.mapLeft((error) => error.message),
  );
}

function runCommand(
  command: string,
  args: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  const result = spawnSync(command, args, { cwd, env, stdio: "inherit" });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) fail(`${command} stopped by ${result.signal}.`);
  if (result.status !== 0) {
    fail(`${command} exited with status ${String(result.status)}.`);
  }
}

function retainRun(player: string, trusted: string, output: string): void {
  mkdirSync(output, { recursive: true });
  const retained = [
    "SCENARIO.md",
    "SCENARIO_REVIEW.json",
    "OBSERVATION.json",
    "agent.log",
    "attempt.ts",
  ];
  for (const name of retained) {
    const source = resolve(player, name);
    if (existsSync(source)) copyFileSync(source, resolve(output, name));
  }
  const evidence = resolve(trusted, "evidence");
  if (existsSync(evidence)) {
    cpSync(evidence, resolve(output, "evidence"), { recursive: true });
  }
}

function emitExecutionFindings(output: string): void {
  const transcriptPath = resolve(output, "evidence/sdk-calls.jsonl");
  if (!existsSync(transcriptPath)) return;
  const projection = projectExecutionFindings({
    transcriptPath,
    evidenceSetDirectory: output,
    reviewPaths: [],
    scenarioReviewPaths: [],
    generationLedgerPaths: [],
    issueLinks: [],
  });
  writeFindingsProjection({
    projection,
    path: findingsCheckpointArtifactPath(output),
  });
}

export type SdkPlayerExecutionFailure = Readonly<{
  readonly kind: "unreapedSupervisorCleanup" | "evidenceRetentionFailure";
  readonly reason: string;
}>;

export type SdkPlayerExecutionFinalization =
  | Readonly<{
      readonly tag: "reaped";
    }>
  | Readonly<{
      readonly tag: "failed";
      readonly failure: SdkPlayerExecutionFailure;
    }>;

export type SdkPlayerExecutionDirectories = Readonly<{
  readonly scratch: string;
  readonly trusted: string;
  readonly codexHome: string;
  readonly output: string;
}>;

function removeSdkPlayerTemporaryDirectories(
  directories: SdkPlayerExecutionDirectories,
): void {
  rmSync(directories.scratch, { recursive: true });
  rmSync(directories.trusted, { recursive: true });
  rmSync(directories.codexHome, { recursive: true });
}

/**
 * Settle the runner-owned SDK supervisor before finalizing evidence and
 * deciding whether diagnostics may be removed.  The reaped callback owns the
 * success artifact path and runs before temporary roots are removed.  An
 * unreaped supervisor or failed evidence retention is a fatal execution
 * failure; temporary roots and partial output remain available for post-mortem
 * evidence.
 */
export async function finalizeSdkPlayerExecution(input: {
  readonly supervisorProcess: SpawnedCodexProcess | undefined;
  readonly detached: boolean;
  readonly directories: SdkPlayerExecutionDirectories;
  readonly onReaped: () => void | Promise<void>;
}): Promise<SdkPlayerExecutionFinalization> {
  const termination =
    input.supervisorProcess === undefined
      ? ({ tag: "reaped" } as const)
      : await terminateOwnedProcess(input.supervisorProcess, {
          detached: input.detached,
        });
  if (termination.tag === "reaped") {
    try {
      await input.onReaped();
    } catch (error: unknown) {
      const failure: SdkPlayerExecutionFailure = {
        kind: "evidenceRetentionFailure",
        reason: error instanceof Error ? error.message : String(error),
      };
      return {
        tag: "failed",
        failure,
      };
    }
    removeSdkPlayerTemporaryDirectories(input.directories);
    return { tag: "reaped" };
  }
  const failure: SdkPlayerExecutionFailure = {
    kind: "unreapedSupervisorCleanup",
    reason: termination.reason,
  };
  return {
    tag: "failed",
    failure,
  };
}

function sdkPlayerExecutionFailureMessage(
  failure: SdkPlayerExecutionFailure,
): string {
  return `${failure.kind}: ${failure.reason}`;
}

function emitTranscriptlessFindings(input: {
  readonly output: string;
  readonly executionStartPath: string;
  readonly scenarioId: ScenarioId;
  readonly gitSha: string;
  readonly startedAt: string;
  readonly stage: "generation" | "character-authoring" | "setup-authoring";
  readonly category:
    | "scenario-author-defect"
    | "experiment-boundary-obstruction"
    | "model-controller-mistake";
  readonly kind:
    | "generation-rejection"
    | "character-obstruction"
    | "setup-obstruction"
    | "informational-observation";
  readonly summary: string;
  readonly detail: string;
  readonly authorityPaths?: readonly {
    readonly role: string;
    readonly path: string;
  }[];
  readonly pointerAuthorityRole?: string;
}): void {
  const projection = projectTranscriptlessFindings({
    authorityPaths: [
      { role: "execution", path: input.executionStartPath },
      ...(input.authorityPaths ?? []),
    ],
    stage: input.stage,
    category: input.category,
    kind: input.kind,
    summary: input.summary,
    detail: input.detail,
    ...(input.pointerAuthorityRole === undefined
      ? {}
      : { pointerAuthorityRole: input.pointerAuthorityRole }),
  });
  writeFindingsProjection({
    projection,
    path: findingsArtifactPath(input.output),
  });
}

function playerEvidenceState(
  trusted: string,
  player: string,
): PlayerEvidenceState {
  const transcriptPath = resolve(trusted, "evidence/sdk-calls.jsonl");
  const transcript = parseSdkTranscript(
    readRunnerOwnedJsonLines(trusted, transcriptPath),
  );
  if (transcript.tag === "invalid") fail(transcript.message);
  const continuationEvidence = playerContinuationEvidence({
    transcriptHeaderSha256: sha256Canonical(transcript.value.header),
    observations: existsSync(resolve(trusted, "evidence/observations.jsonl"))
      ? readRunnerOwnedJsonLines(
          trusted,
          resolve(trusted, "evidence/observations.jsonl"),
        )
      : [],
    callContinuations: transcript.value.calls.map(
      ({ continuation }) => continuation,
    ),
  });
  if (continuationEvidence.tag === "invalid") {
    fail(continuationEvidence.message);
  }
  const recordedContinuation = continuationEvidence.lastContinuation;
  if (recordedContinuation !== undefined) {
    const responsePath = resolve(trusted, "player-response.json");
    if (!existsSync(responsePath)) {
      fail("Recorded SDK continuation has no retained player response.");
    }
    const response: unknown = JSON.parse(readFileSync(responsePath, "utf8"));
    if (
      !isJsonRecord(response) ||
      !isJsonRecord(response.observation) ||
      response.observation.continuation !== recordedContinuation
    ) {
      fail(
        "Retained player response does not match the canonical continuation.",
      );
    }
    copyFileSync(responsePath, resolve(player, "OBSERVATION.json"));
  } else if (
    transcript.value.header.characterOutcome === "ready" &&
    transcript.value.header.setupOutcome === "ready"
  ) {
    const projectionEvidence = sdkInitialTurnProjectionEvidence(
      transcript.value.header,
    );
    if (projectionEvidence.kind === "notRecorded") {
      fail(
        "An active SDK Execution requires recorded initial turn projection evidence.",
      );
    }
    const initialObservation: unknown = JSON.parse(
      readFileSync(
        resolve(trusted, "evidence/initial-observation.json"),
        "utf8",
      ),
    );
    if (
      !isJsonRecord(initialObservation) ||
      !isJsonRecord(initialObservation.projection) ||
      initialObservation.transcriptHeaderSha256 !==
        sha256Canonical(transcript.value.header) ||
      initialObservation.continuation !== 0 ||
      initialObservation.kind !== "awaitingFirstContinuation" ||
      sha256Canonical(initialObservation.projection) !==
        projectionEvidence.sha256 ||
      sha256Canonical(initialObservation.projection) !==
        sha256Canonical(projectionEvidence.projection)
    ) {
      fail("Initial player observation does not match the exact transcript.");
    }
    copyFileSync(
      resolve(trusted, "evidence/initial-observation.json"),
      resolve(player, "OBSERVATION.json"),
    );
  }
  const prefix = Schema.decodeUnknownEither(
    Schema.Struct({ run: PlayerExecutionStateSchema }),
  )(
    JSON.parse(
      readFileSync(resolve(trusted, "evidence/frozen-prefix.json"), "utf8"),
    ),
  );
  if (Either.isLeft(prefix)) fail("Player frozen-prefix evidence is invalid.");
  const finalArtifactExists = existsSync(
    resolve(trusted, "evidence/final.json"),
  );
  if ((prefix.right.run.kind === "playerConcluded") !== finalArtifactExists) {
    fail("Player terminal state and final artifact disagree.");
  }
  return Match.value(prefix.right.run).pipe(
    Match.when(
      { kind: "active" },
      (): PlayerEvidenceState => ({
        tag: "active",
        recordedContinuations: continuationEvidence.recordedContinuations,
      }),
    ),
    Match.when(
      { kind: "playerConcluded" },
      (): PlayerEvidenceState => ({
        tag: "concluded",
        recordedContinuations: continuationEvidence.recordedContinuations,
      }),
    ),
    Match.when(
      { kind: "playerObstructed" },
      ({ obstruction }): PlayerEvidenceState => ({
        tag: "obstructed",
        obstruction,
        recordedContinuations: continuationEvidence.recordedContinuations,
      }),
    ),
    Match.exhaustive,
  );
}

export type PlayerInvocationDisposition =
  | Readonly<{
      readonly tag: "completed";
      readonly output: string;
    }>
  | Readonly<{
      readonly tag: "obstructed";
      readonly obstruction: Extract<
        PlayerEvidenceState,
        { readonly tag: "obstructed" }
      >["obstruction"];
      readonly recordedContinuations: number;
    }>;

/**
 * Reconcile process lifecycle and frozen player evidence before choosing a
 * disposition.  A terminal SDK obstruction is diagnostic success even when
 * Codex exits nonzero or cannot retain its final message.
 */
export function reconcilePlayerInvocation(
  lifecycle: ModelInvocationRun<string, "expectedLastMessage">,
  evidence: PlayerEvidenceState,
): Either.Either<PlayerInvocationDisposition, string> {
  if (lifecycle.tag === "failed") {
    return evidence.tag === "obstructed"
      ? Either.right({
          tag: "obstructed",
          obstruction: evidence.obstruction,
          recordedContinuations: evidence.recordedContinuations,
        })
      : Either.left(
          `Player agent invocation failed: ${lifecycle.cause.reason}`,
        );
  }
  if (evidence.tag === "active") {
    return Either.left(
      `Player agent exited after ${String(evidence.recordedContinuations)} continuations without a recorded conclusion.`,
    );
  }
  if (evidence.tag === "obstructed") {
    return Either.right({
      tag: "obstructed",
      obstruction: evidence.obstruction,
      recordedContinuations: evidence.recordedContinuations,
    });
  }
  return Either.right({ tag: "completed", output: lifecycle.output.value });
}

async function main(args: readonly string[]): Promise<void> {
  assertModelEntryPointGuard();
  const [scenarioId, ...options] = args;
  const decodedScenarioId = decodeScenarioId(scenarioId);
  const instructionalFallback = options.includes("--instructional-isolation");
  const pathFlags = [
    "--scenario-path",
    "--scenario-review-path",
    "--characters-path",
    "--setup-path",
    "--stage-plan-path",
    "--stage-plan-findings-path",
    "--output-path",
    "--benchmark-context-path",
  ] as const;
  type PathFlag = (typeof pathFlags)[number];
  const isPathFlag = (value: string): value is PathFlag =>
    pathFlags.some((flag) => flag === value);
  const pathValues = new Map<PathFlag, string>();
  const pathOptionIndexes = new Set<number>();
  let invalidPathValue = false;
  for (const [index, option] of options.entries()) {
    if (!isPathFlag(option)) continue;
    const value = options[index + 1];
    if (
      value === undefined ||
      value.trim().length === 0 ||
      value.startsWith("-") ||
      pathValues.has(option)
    ) {
      invalidPathValue = true;
      continue;
    }
    pathValues.set(option, value);
    pathOptionIndexes.add(index);
    pathOptionIndexes.add(index + 1);
  }
  const executionIdFlagIndex = options.indexOf("--execution-id");
  const executionIdInput =
    executionIdFlagIndex === -1 ? undefined : options[executionIdFlagIndex + 1];
  const decodedExecutionId = decodeExecutionId(executionIdInput);
  const executionIdOptionIndexes =
    executionIdFlagIndex === -1
      ? new Set<number>()
      : new Set([executionIdFlagIndex, executionIdFlagIndex + 1]);
  const evidenceSetIdFlagIndex = options.indexOf("--evidence-set-id");
  const evidenceSetIdInput =
    evidenceSetIdFlagIndex === -1
      ? undefined
      : options[evidenceSetIdFlagIndex + 1];
  const decodedEvidenceSetId = decodeEvidenceSetId(evidenceSetIdInput);
  const evidenceSetIdOptionIndexes =
    evidenceSetIdFlagIndex === -1
      ? new Set<number>()
      : new Set([evidenceSetIdFlagIndex, evidenceSetIdFlagIndex + 1]);
  const implementationGitShaFlagIndex = options.indexOf(
    "--implementation-git-sha",
  );
  const implementationGitShaInput =
    implementationGitShaFlagIndex === -1
      ? undefined
      : options[implementationGitShaFlagIndex + 1];
  const implementationGitShaOptionIndexes =
    implementationGitShaFlagIndex === -1
      ? new Set<number>()
      : new Set([
          implementationGitShaFlagIndex,
          implementationGitShaFlagIndex + 1,
        ]);
  const decodedImplementationGitSha = parseOptionalImplementationGitSha(
    implementationGitShaInput,
  );
  const benchmarkProfileFlagIndex = options.indexOf("--benchmark-profile");
  const benchmarkProfileInput =
    benchmarkProfileFlagIndex === -1
      ? undefined
      : options[benchmarkProfileFlagIndex + 1];
  const benchmarkProfileOptionIndexes =
    benchmarkProfileFlagIndex === -1
      ? new Set<number>()
      : new Set([benchmarkProfileFlagIndex, benchmarkProfileFlagIndex + 1]);
  const decodedBenchmarkProfile = parseOptionalBenchmarkProfile(
    benchmarkProfileInput,
  );
  const acceptedOptions = options.filter(
    (_option, index) =>
      !executionIdOptionIndexes.has(index) &&
      !evidenceSetIdOptionIndexes.has(index) &&
      !implementationGitShaOptionIndexes.has(index) &&
      !benchmarkProfileOptionIndexes.has(index) &&
      !pathOptionIndexes.has(index),
  );
  if (
    Either.isLeft(decodedScenarioId) ||
    Either.isLeft(decodedExecutionId) ||
    Either.isLeft(decodedEvidenceSetId) ||
    Either.isLeft(decodedImplementationGitSha) ||
    Either.isLeft(decodedBenchmarkProfile) ||
    invalidPathValue ||
    acceptedOptions.some((option) => option !== "--instructional-isolation") ||
    options.some(
      (option, index) =>
        isPathFlag(option) &&
        (!pathOptionIndexes.has(index) ||
          options.filter((candidate) => candidate === option).length !== 1),
    ) ||
    options.filter((option) => option === "--instructional-isolation").length >
      1 ||
    options.filter((option) => option === "--execution-id").length !== 1 ||
    executionIdFlagIndex + 1 >= options.length ||
    options.filter((option) => option === "--evidence-set-id").length !== 1 ||
    evidenceSetIdFlagIndex + 1 >= options.length ||
    options.filter((option) => option === "--implementation-git-sha").length >
      1 ||
    (implementationGitShaFlagIndex !== -1 &&
      (implementationGitShaFlagIndex + 1 >= options.length ||
        implementationGitShaInput === undefined ||
        implementationGitShaInput.startsWith("-"))) ||
    options.filter((option) => option === "--benchmark-profile").length > 1 ||
    (benchmarkProfileFlagIndex !== -1 &&
      (benchmarkProfileFlagIndex + 1 >= options.length ||
        benchmarkProfileInput === undefined ||
        benchmarkProfileInput.startsWith("-")))
  ) {
    fail(
      "Usage: run-sdk-player.ts <scenario-id> --execution-id <execution-id> --evidence-set-id <evidence-set-id> [--implementation-git-sha <git-sha>] [--benchmark-profile <profile>] [--instructional-isolation] [--scenario-path <path>] [--scenario-review-path <path>] [--characters-path <path>] [--setup-path <path>] [--stage-plan-path <path>] [--stage-plan-findings-path <path>] [--output-path <path>] [--benchmark-context-path <path>]",
    );
  }
  const acceptedScenarioId = decodedScenarioId.right;
  const acceptedExecutionId = decodedExecutionId.right;
  const acceptedEvidenceSetId = decodedEvidenceSetId.right;
  const requestedImplementationGitSha = decodedImplementationGitSha.right;
  const requestedBenchmarkProfile = decodedBenchmarkProfile.right;
  const pathValue = (flag: PathFlag): string | undefined =>
    pathValues.get(flag);
  const benchmarkContextPathInput = pathValue("--benchmark-context-path");
  if (
    (benchmarkContextPathInput === undefined) !==
    (requestedBenchmarkProfile === undefined)
  ) {
    fail(
      "--benchmark-profile and --benchmark-context-path must be supplied together.",
    );
  }
  const output = repositoryOutputPath(
    pathValue("--output-path") ??
      `scripts/raw-swarm/out/${acceptedEvidenceSetId}`,
  );
  const scenarioPath = repositoryReadPath(
    pathValue("--scenario-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.md`,
  );
  const setupPath = repositoryReadPath(
    pathValue("--setup-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.setup.ts`,
  );
  const charactersPath = repositoryReadPath(
    pathValue("--characters-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.characters.ts`,
  );
  const scenarioReviewPath = repositoryReadPath(
    pathValue("--scenario-review-path") ??
      `${scenarioPath}.scenario-review.json`,
  );
  const benchmarkContextPath =
    benchmarkContextPathInput === undefined
      ? undefined
      : repositoryReadPath(benchmarkContextPathInput);
  const customStagePlanPathInput = pathValue("--stage-plan-path");
  const customStagePlanFindingsPathInput = pathValue(
    "--stage-plan-findings-path",
  );
  const customStagePlanPath =
    customStagePlanPathInput === undefined
      ? undefined
      : repositoryReadPath(customStagePlanPathInput);
  const customStagePlanFindingsPath =
    customStagePlanFindingsPathInput === undefined
      ? undefined
      : repositoryReadPath(customStagePlanFindingsPathInput);
  if (
    (customStagePlanPath === undefined) !==
    (customStagePlanFindingsPath === undefined)
  ) {
    fail(
      "--stage-plan-path and --stage-plan-findings-path must be supplied together.",
    );
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
      `Scenario admission catalogue is invalid: ${JSON.stringify(catalogue.left)}`,
    );
  }
  const admittedCatalogueScenario = findAuthorableScenarioInCatalogue({
    catalogue: catalogue.right,
    scenarioId: acceptedScenarioId,
  });
  if (Either.isLeft(admittedCatalogueScenario))
    fail(admittedCatalogueScenario.left);
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("SDK player recording requires a clean Git worktree.");
  }
  const currentGitSha = Schema.decodeUnknownEither(GitShaSchema)(revision.sha);
  if (Either.isLeft(currentGitSha)) fail(currentGitSha.left.message);
  if (
    requestedImplementationGitSha !== undefined &&
    requestedImplementationGitSha !== currentGitSha.right
  ) {
    fail(
      `--implementation-git-sha does not match the current clean Git revision: expected ${requestedImplementationGitSha}, current ${currentGitSha.right}.`,
    );
  }
  const gitSha = requestedImplementationGitSha ?? currentGitSha.right;
  const startedAtResult = Schema.decodeUnknownEither(StartedAtSchema)(
    new Date().toISOString(),
  );
  if (Either.isLeft(startedAtResult)) fail(startedAtResult.left.message);
  const startedAt = startedAtResult.right;
  if (existsSync(output)) {
    fail(`Refusing to overwrite SDK player evidence: ${output}`);
  }
  const benchmarkContextEvidence =
    benchmarkContextPath === undefined ||
    requestedBenchmarkProfile === undefined
      ? undefined
      : (() => {
          const deliveredBytes = readFileSync(benchmarkContextPath);
          const expectedBytes = Buffer.from(
            benchmarkContextForRole(requestedBenchmarkProfile, "player"),
            "utf8",
          );
          if (!deliveredBytes.equals(expectedBytes)) {
            fail(
              "--benchmark-context-path does not contain the canonical context for its profile and player role.",
            );
          }
          const path = relative(repoRoot, benchmarkContextPath);
          const authority = artifactAuthorityForBytes(path, deliveredBytes);
          const evidence = {
            schemaVersion: 1 as const,
            profile: requestedBenchmarkProfile,
            role: "player" as const,
            ...authority,
          };
          const parsed = Schema.decodeUnknownEither(
            BenchmarkContextDeliveryEvidenceSchema,
            { onExcessProperty: "error" },
          )(evidence);
          if (Either.isLeft(parsed)) fail(parsed.left.message);
          return parsed.right;
        })();
  const contextDelivery: ContextDelivery<"player"> =
    benchmarkContextEvidence === undefined
      ? { tag: "canonicalRoleProjection", role: "player" }
      : benchmarkContextDeliveryForRole(
          benchmarkContextEvidence.profile,
          "player",
        );
  const deliveredContextFileName =
    contextDelivery.tag === "canonicalRoleProjection"
      ? "CAPABILITY_CONTEXT.md"
      : "BENCHMARK_CONTEXT.md";
  if (!existsSync(scenarioPath) || !existsSync(scenarioReviewPath)) {
    fail(
      `Scenario requires adjacent .md and .scenario-review.json files: ${acceptedScenarioId}`,
    );
  }
  const admission = admittedScenarioIdentity({
    scenarioId: acceptedScenarioId,
    scenarioPath,
    reviewPath: scenarioReviewPath,
    recordPath: scenarioPath.replace(/\.md$/, ".scenario.json"),
  });
  if (Either.isLeft(admission)) fail(admission.left);
  mkdirSync(resolve(output, "evidence"), { recursive: true });
  const executionRecord = Schema.decodeUnknownEither(
    ScenarioExecutionRecordSchema,
    { onExcessProperty: "error" },
  )({
    schemaVersion: 1,
    executionId: acceptedExecutionId,
    scenarioId: acceptedScenarioId,
    evidenceSetId: acceptedEvidenceSetId,
  });
  if (Either.isLeft(executionRecord)) fail(executionRecord.left.message);
  writeFileSync(
    resolve(output, "execution.json"),
    `${JSON.stringify(executionRecord.right, null, 2)}\n`,
    { flag: "wx" },
  );
  if (benchmarkContextEvidence !== undefined) {
    writeFileSync(
      resolve(output, "evidence/context-delivery.json"),
      `${JSON.stringify(benchmarkContextEvidence, null, 2)}\n`,
      { flag: "wx" },
    );
  }
  const executionStartPath = resolve(output, "evidence/execution-start.json");
  writeFileSync(
    executionStartPath,
    `${JSON.stringify(
      {
        type: "raw-swarm-execution-start",
        schemaVersion: 1,
        executionId: acceptedExecutionId,
        evidenceSetId: acceptedEvidenceSetId,
        scenarioId: acceptedScenarioId,
        gitSha,
        startedAt,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  const retainedPlan =
    customStagePlanPath === undefined ||
    customStagePlanFindingsPath === undefined
      ? retainAdmittedScenarioStagePlan({
          scenarioId: acceptedScenarioId,
          scenarioPath,
          scenarioSha256: admission.right.scenarioSha256,
          scenarioReviewSha256: admission.right.scenarioReviewSha256,
        })
      : (() => {
          const planPath = customStagePlanPath;
          const findingsPath = customStagePlanFindingsPath;
          if (!existsSync(planPath) || !existsSync(findingsPath)) {
            return Either.left(
              "Profile stage-plan authorities must both be readable.",
            );
          }
          const plan = validateScenarioStagePlan(
            JSON.parse(readFileSync(planPath, "utf8")),
          );
          if (Either.isLeft(plan)) return Either.left(plan.left);
          const validation = validateAdmittedScenarioStagePlanEvidence({
            plan: plan.right,
            findings: JSON.parse(readFileSync(findingsPath, "utf8")),
            scenarioId: acceptedScenarioId,
            scenarioSha256: admission.right.scenarioSha256,
            scenarioReviewSha256: admission.right.scenarioReviewSha256,
          });
          return Either.isLeft(validation)
            ? Either.left(validation.left)
            : Either.right(plan.right);
        })();
  if (Either.isLeft(retainedPlan)) {
    emitTranscriptlessFindings({
      output,
      executionStartPath,
      scenarioId: acceptedScenarioId,
      gitSha,
      startedAt,
      stage: "generation",
      category: "scenario-author-defect",
      kind: "generation-rejection",
      summary: "Scenario stage planning could not produce a retained plan.",
      detail: retainedPlan.left,
      authorityPaths: [
        { role: "scenario", path: scenarioPath },
        { role: "scenarioReview", path: scenarioReviewPath },
        ...(existsSync(retainedScenarioStageFactsPath(scenarioPath))
          ? [
              {
                role: "stageFacts",
                path: retainedScenarioStageFactsPath(scenarioPath),
              },
            ]
          : []),
      ],
      pointerAuthorityRole: existsSync(
        retainedScenarioStageFactsPath(scenarioPath),
      )
        ? "stageFacts"
        : "scenario",
    });
    fail(retainedPlan.left);
  }
  const stagePlanPath = resolve(
    customStagePlanPath ?? retainedScenarioStagePlanPath(acceptedScenarioId),
  );
  const stagePlanFindingsPath = resolve(
    customStagePlanFindingsPath ??
      retainedScenarioStagePlanFindingsPath(acceptedScenarioId),
  );
  if (retainedPlan.right.outcome.tag === "rejected") {
    mkdirSync(output, { recursive: true });
    copyFileSync(scenarioPath, resolve(output, "SCENARIO.md"));
    copyFileSync(scenarioReviewPath, resolve(output, "SCENARIO_REVIEW.json"));
    copyFileSync(stagePlanPath, resolve(output, "STAGE_PLAN.json"));
    if (existsSync(stagePlanFindingsPath)) {
      copyFileSync(
        stagePlanFindingsPath,
        resolve(output, "STAGE_PLAN_FINDINGS.json"),
      );
    }
    writeFileSync(
      resolve(output, "STAGE_PLAN_REJECTION.json"),
      `${JSON.stringify(retainedPlan.right.outcome, null, 2)}\n`,
    );
    emitTranscriptlessFindings({
      output,
      executionStartPath,
      scenarioId: acceptedScenarioId,
      gitSha,
      startedAt,
      stage: "generation",
      category: "scenario-author-defect",
      kind: "generation-rejection",
      summary:
        "Scenario stage planning rejected the candidate before SDK preparation.",
      detail: retainedPlan.right.outcome.reason,
      authorityPaths: [
        { role: "scenario", path: resolve(output, "SCENARIO.md") },
        {
          role: "scenarioReview",
          path: resolve(output, "SCENARIO_REVIEW.json"),
        },
        { role: "stagePlan", path: resolve(output, "STAGE_PLAN.json") },
        ...(existsSync(resolve(output, "STAGE_PLAN_FINDINGS.json"))
          ? [
              {
                role: "stagePlanFindings",
                path: resolve(output, "STAGE_PLAN_FINDINGS.json"),
              },
            ]
          : []),
        {
          role: "stagePlanRejection",
          path: resolve(output, "STAGE_PLAN_REJECTION.json"),
        },
      ],
      pointerAuthorityRole: existsSync(
        resolve(output, "STAGE_PLAN_FINDINGS.json"),
      )
        ? "stagePlanFindings"
        : "stagePlan",
    });
    console.log(
      `Scenario stage plan rejected before SDK player preparation: ${retainedPlan.right.outcome.reason}`,
    );
    return;
  }
  if (!existsSync(charactersPath)) {
    emitTranscriptlessFindings({
      output,
      executionStartPath,
      scenarioId: acceptedScenarioId,
      gitSha,
      startedAt,
      stage: "character-authoring",
      category: "model-controller-mistake",
      kind: "character-obstruction",
      summary:
        "Controller-authored character source was missing after stage planning.",
      detail: `Scenario requires controller-authored .characters.ts after stage planning: ${acceptedScenarioId}`,
      authorityPaths: [
        { role: "scenario", path: scenarioPath },
        { role: "scenarioReview", path: scenarioReviewPath },
        { role: "stagePlan", path: stagePlanPath },
        ...(existsSync(stagePlanFindingsPath)
          ? [
              {
                role: "stagePlanFindings",
                path: stagePlanFindingsPath,
              },
            ]
          : []),
        ...(existsSync(retainedScenarioStageFactsPath(scenarioPath))
          ? [
              {
                role: "stageFacts",
                path: retainedScenarioStageFactsPath(scenarioPath),
              },
            ]
          : []),
      ],
      pointerAuthorityRole: "stagePlan",
    });
    fail(
      `Scenario requires controller-authored .characters.ts after stage planning: ${acceptedScenarioId}`,
    );
  }
  const characterStage = stagePlanEntry(
    retainedPlan.right,
    "scenarioCharacterAuthoring",
  );
  if (characterStage?.decision === "skipped") {
    const evaluatedCharacters =
      await evaluateScenarioCharacters(charactersPath);
    if (
      evaluatedCharacters.tag !== "ready" ||
      evaluatedCharacters.characterSheets.length !== 0
    ) {
      const detail = Match.value(evaluatedCharacters).pipe(
        Match.when(
          { tag: "ready" },
          ({ characterSheets }) =>
            `Skipped Character Sheet stage returned ${String(characterSheets.length)} sheets.`,
        ),
        Match.when({ tag: "obstructed" }, ({ obstruction }) => obstruction),
        Match.when({ tag: "invalid" }, ({ message }) => message),
        Match.exhaustive,
      );
      emitTranscriptlessFindings({
        output,
        executionStartPath,
        scenarioId: acceptedScenarioId,
        gitSha,
        startedAt,
        stage: "character-authoring",
        category: "model-controller-mistake",
        kind: "character-obstruction",
        summary:
          "Stat-block-only stage plan was not backed by a valid zero-sheet character source.",
        detail,
        authorityPaths: [
          { role: "scenario", path: scenarioPath },
          { role: "scenarioReview", path: scenarioReviewPath },
          { role: "stagePlan", path: stagePlanPath },
          { role: "characters", path: charactersPath },
        ],
        pointerAuthorityRole: "characters",
      });
      fail(detail);
    }
  }
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-sdk-player-"));
  const trusted = mkdtempSync(resolve(tmpdir(), "dnd-sdk-supervisor-"));
  const codexHome = createConsumerCodexHome();
  let supervisorProcess: ReturnType<typeof spawn> | undefined;
  let supervisorLog: number | undefined;
  let preparationFailure: string | undefined;
  const directories: SdkPlayerExecutionDirectories = {
    scratch,
    trusted,
    codexHome,
    output,
  };
  const closeSupervisorLog = (): void => {
    if (supervisorLog === undefined) return;
    closeSync(supervisorLog);
    supervisorLog = undefined;
  };
  try {
    buildConsumerDistribution({
      destination: scratch,
      trustedDestination: trusted,
      scenarioPath,
      contextDelivery,
    });
    copyFileSync(scenarioReviewPath, resolve(scratch, "SCENARIO_REVIEW.json"));
    mkdirSync(resolve(trusted, "evidence"));
    copyFileSync(stagePlanPath, resolve(trusted, "evidence/stage-plan.json"));
    if (existsSync(stagePlanFindingsPath)) {
      copyFileSync(
        stagePlanFindingsPath,
        resolve(trusted, "evidence/stage-plan-findings.json"),
      );
    }
    copyFileSync(charactersPath, resolve(trusted, "evidence/characters.ts"));
    if (existsSync(setupPath)) {
      copyFileSync(setupPath, resolve(trusted, "evidence/setup.ts"));
    }
    mkdirSync(resolve(scratch, ".requests"));
    mkdirSync(resolve(scratch, ".responses"));
    const profileAvailable = consumerPermissionProfileAvailable(
      codexHome,
      scratch,
    );
    if (!profileAvailable && !instructionalFallback) {
      fail(
        "Codex filesystem isolation is unavailable. Install/configure bubblewrap, or explicitly record the weaker --instructional-isolation fallback.",
      );
    }
    const consumerIsolation = profileAvailable
      ? "permissionProfile"
      : "instructionalFallback";
    runCommand(
      process.execPath,
      [
        "supervisor.mjs",
        "init",
        acceptedScenarioId,
        revision.sha,
        consumerIsolation,
        startedAt,
        createHash("sha256")
          .update(readFileSync(resolve(trusted, "supervisor.mjs")))
          .digest("hex"),
        admission.right.scenarioSha256,
        admission.right.scenarioReviewSha256,
      ],
      trusted,
      { ...process.env, RAW_SWARM_PLAYER_ROOT: scratch },
    );
    if (!existsSync(resolve(trusted, "evidence/frozen-prefix.json"))) {
      preparationFailure =
        "Scenario preparation recorded an obstruction; player execution was not started.";
      console.log(
        `Scenario preparation recorded an obstruction; player execution was not started: ${acceptedScenarioId}`,
      );
      return;
    }

    supervisorLog = openSync(resolve(trusted, "supervisor.log"), "w");
    supervisorProcess = spawn(
      process.execPath,
      [
        resolve(trusted, "supervisor.mjs"),
        "serve",
        resolve(scratch, ".requests"),
        resolve(scratch, ".responses"),
      ],
      {
        cwd: trusted,
        env: { ...process.env, RAW_SWARM_PLAYER_ROOT: scratch },
        stdio: ["ignore", supervisorLog, supervisorLog],
        detached: process.platform !== "win32",
      },
    );

    const permissionArgs = profileAvailable
      ? ([] as const)
      : (["--dangerously-bypass-approvals-and-sandbox"] as const);
    const agentLogPath = resolve(trusted, "agent.log");
    const agentFinalPath = resolve(trusted, "evidence/agent-final.txt");
    const result = await runCodexInvocation({
      args: [
        "exec",
        "-C",
        scratch,
        ...permissionArgs,
        "--skip-git-repo-check",
        "--ephemeral",
        "--json",
        "--disable",
        "tool_call_mcp_elicitation",
        "-m",
        PLAYER_MODEL,
        "-c",
        `model_reasoning_effort="${PLAYER_REASONING_EFFORT}"`,
        [
          `Read ${deliveredContextFileName}, PLAYER.md, SCENARIO.md, OBSERVATION.json, and attempt.ts.`,
          "Act as the player described there and continue until the SDK supervisor accepts a playerConcluded outcome or returns a terminalObstruction. Stop immediately after a terminalObstruction; it is retained evidence.",
          "For each tactical continuation, edit only attempt.ts and run `node player-client.mjs attempt.ts`. After the call, reread OBSERVATION.json before replacing the attempt body for the next continuation.",
          "At subjectSelection, discover acts and attempt a surfaced act in the same continuation. At subjectContinuation, resume the retained subject and do not discover fresh acts.",
          PLAYER_CONTINUATION_PROTOCOL_REMINDER.join(" "),
          "Correct compilation or runtime failures that occur before the first SDK call. A returned SDK rejection is frozen evidence; use the next continuation to correct it.",
          "Inspect only the five named scratch-consumer files. Do not enumerate other files, inspect declarations, repository source, internal tests, or prior implementation knowledge.",
          "Do not edit evidence files. Preserve and report an SDK obstruction instead of fabricating support.",
        ].join(" "),
      ],
      cwd: scratch,
      env: { ...process.env, CODEX_HOME: codexHome },
      eventPath: resolve(trusted, "evidence/player-events.jsonl"),
      logPath: agentLogPath,
      ledgerPath: resolve(trusted, "evidence/invocations.jsonl"),
      phase: "player",
      stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.player,
      subject: {
        tag: "execution",
        executionId: acceptedExecutionId,
        evidenceSetId: acceptedEvidenceSetId,
        scenarioId: acceptedScenarioId,
      },
      gitSha,
      fallbackInvocationId: randomUUID(),
      model: PLAYER_MODEL,
      reasoningEffort: PLAYER_REASONING_EFFORT,
      operation: {
        tag: "expectedLastMessage",
        expected: {
          path: agentFinalPath,
          decode: (contents) => Either.right(contents),
        },
      },
    });
    const evidenceState = playerEvidenceState(trusted, scratch);
    const disposition = reconcilePlayerInvocation(result, evidenceState);
    if (Either.isLeft(disposition)) fail(disposition.left);
    if (disposition.right.tag === "obstructed") {
      console.log(
        `Player Execution retained a player-protocol obstruction after ${String(disposition.right.recordedContinuations)} continuations: ${disposition.right.obstruction.message}`,
      );
    }
  } catch (error: unknown) {
    preparationFailure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    const finalization = await finalizeSdkPlayerExecution({
      supervisorProcess,
      detached: process.platform !== "win32",
      directories,
      onReaped: () => {
        closeSupervisorLog();
        if (existsSync(resolve(trusted, "evidence/sdk-calls.jsonl"))) {
          const agentLogPath = resolve(trusted, "agent.log");
          if (existsSync(agentLogPath)) {
            copyFileSync(agentLogPath, resolve(scratch, "agent.log"));
          }
          retainRun(scratch, trusted, output);
          emitExecutionFindings(output);
          copyFileSync(
            resolve(trusted, "supervisor.mjs"),
            resolve(output, "replay-supervisor.mjs"),
          );
        } else {
          emitTranscriptlessFindings({
            output,
            executionStartPath,
            scenarioId: acceptedScenarioId,
            gitSha,
            startedAt,
            stage: "setup-authoring",
            category: "experiment-boundary-obstruction",
            kind: "setup-obstruction",
            summary: "SDK player preparation did not produce a transcript.",
            detail:
              preparationFailure ??
              "SDK player preparation ended before a canonical transcript was written.",
            authorityPaths: [
              { role: "scenario", path: scenarioPath },
              { role: "scenarioReview", path: scenarioReviewPath },
              ...(existsSync(stagePlanPath)
                ? [{ role: "stagePlan", path: stagePlanPath }]
                : []),
              ...(existsSync(stagePlanFindingsPath)
                ? [
                    {
                      role: "stagePlanFindings",
                      path: stagePlanFindingsPath,
                    },
                  ]
                : []),
              ...(existsSync(retainedScenarioStageFactsPath(scenarioPath))
                ? [
                    {
                      role: "stageFacts",
                      path: retainedScenarioStageFactsPath(scenarioPath),
                    },
                  ]
                : []),
              ...(existsSync(charactersPath)
                ? [{ role: "characters", path: charactersPath }]
                : []),
              ...(existsSync(setupPath)
                ? [{ role: "setup", path: setupPath }]
                : []),
            ],
            pointerAuthorityRole: existsSync(stagePlanPath)
              ? "stagePlan"
              : "scenario",
          });
        }
      },
    });
    if (finalization.tag === "failed") {
      closeSupervisorLog();
      const failureMessage = sdkPlayerExecutionFailureMessage(
        finalization.failure,
      );
      console.error(failureMessage);
      throw new Error(failureMessage);
    }
  }
  console.log(`SDK player evidence: ${output}`);
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
