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
import { resolve } from "node:path";

import {
  consumerPermissionProfileAvailable,
  createConsumerCodexHome,
} from "./sdk-player/consumer-codex-profile.ts";
import {
  buildConsumerDistribution,
  type ContextDelivery,
} from "./sdk-player/consumer-distribution.ts";
import {
  parseSdkTranscript,
  sdkInitialTurnProjectionEvidence,
} from "./sdk-player/sdk-transcript.ts";
import { admittedScenarioIdentity } from "./scenario-admission.ts";
import { readJsonLines } from "./artifact-authority.ts";
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
} from "./transcript.ts";
import { Either, Match, Schema } from "effect";
import { runCodexInvocation } from "./model-telemetry.ts";
import {
  PlayerRunStateSchema,
  playerContinuationEvidence,
  type PlayerEvidenceState,
} from "./player-continuation-evidence.ts";
import {
  findingsArtifactPath,
  projectRunFindings,
  findingsCheckpointArtifactPath,
  writeFindingsProjection,
} from "./findings.ts";
import { projectTranscriptlessFindings } from "./generation-findings.ts";

const PLAYER_MODEL = "gpt-5.6-sol";
const PLAYER_REASONING_EFFORT = "medium";

function fail(message: string): never {
  throw new Error(message);
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

function emitRunFindings(output: string): void {
  const transcriptPath = resolve(output, "evidence/sdk-calls.jsonl");
  if (!existsSync(transcriptPath)) return;
  const projection = projectRunFindings({
    transcriptPath,
    runDirectory: output,
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

function emitTranscriptlessFindings(input: {
  readonly output: string;
  readonly runStartPath: string;
  readonly scenarioId: string;
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
    scenarioId: input.scenarioId,
    gitSha: input.gitSha,
    startedAt: input.startedAt,
    authorityPaths: [
      { role: "run", path: input.runStartPath },
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
  const transcript = parseSdkTranscript(readJsonLines(transcriptPath));
  if (transcript.tag === "invalid") fail(transcript.message);
  const continuationEvidence = playerContinuationEvidence({
    transcriptHeaderSha256: sha256Canonical(transcript.value.header),
    observations: existsSync(resolve(trusted, "evidence/observations.jsonl"))
      ? readJsonLines(resolve(trusted, "evidence/observations.jsonl"))
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
        "An active SDK player run requires recorded initial turn projection evidence.",
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
    Schema.Struct({ run: PlayerRunStateSchema }),
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

async function main(args: readonly string[]): Promise<void> {
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
  const pathValues = new Map<string, string>();
  const pathOptionIndexes = new Set<number>();
  let invalidPathValue = false;
  for (const [index, option] of options.entries()) {
    if (!pathFlags.includes(option as (typeof pathFlags)[number])) continue;
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
  const evidenceIdFlagIndex = options.indexOf("--evidence-id");
  const evidenceIdInput =
    evidenceIdFlagIndex === -1 ? scenarioId : options[evidenceIdFlagIndex + 1];
  const decodedEvidenceId = decodeScenarioId(evidenceIdInput);
  const evidenceIdOptionIndexes =
    evidenceIdFlagIndex === -1
      ? new Set<number>()
      : new Set([evidenceIdFlagIndex, evidenceIdFlagIndex + 1]);
  const acceptedOptions = options.filter(
    (_option, index) =>
      !evidenceIdOptionIndexes.has(index) && !pathOptionIndexes.has(index),
  );
  if (
    Either.isLeft(decodedScenarioId) ||
    Either.isLeft(decodedEvidenceId) ||
    invalidPathValue ||
    acceptedOptions.some((option) => option !== "--instructional-isolation") ||
    options.some(
      (option, index) =>
        pathFlags.includes(option as (typeof pathFlags)[number]) &&
        (!pathOptionIndexes.has(index) ||
          options.filter((candidate) => candidate === option).length !== 1),
    ) ||
    options.filter((option) => option === "--instructional-isolation").length >
      1 ||
    options.filter((option) => option === "--evidence-id").length > 1 ||
    (evidenceIdFlagIndex !== -1 && evidenceIdFlagIndex + 1 >= options.length)
  ) {
    fail(
      "Usage: run-sdk-player.ts <scenario-id> [--evidence-id <evidence-id>] [--instructional-isolation] [--scenario-path <path>] [--scenario-review-path <path>] [--characters-path <path>] [--setup-path <path>] [--stage-plan-path <path>] [--stage-plan-findings-path <path>] [--output-path <path>] [--benchmark-context-path <path>]",
    );
  }
  const acceptedScenarioId = decodedScenarioId.right;
  const acceptedEvidenceId = decodedEvidenceId.right;
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("SDK player recording requires a clean Git worktree.");
  }
  const gitSha = Schema.decodeUnknownEither(GitShaSchema)(revision.sha);
  if (Either.isLeft(gitSha)) fail(gitSha.left.message);
  const startedAt = new Date().toISOString();
  const pathValue = (flag: string): string | undefined => pathValues.get(flag);
  const output = resolve(
    repoRoot,
    pathValue("--output-path") ??
      `scripts/raw-swarm/out/${acceptedEvidenceId}-sdk-player`,
  );
  if (existsSync(output)) {
    fail(`Refusing to overwrite SDK player evidence: ${output}`);
  }
  const scenarioPath = resolve(
    repoRoot,
    pathValue("--scenario-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.md`,
  );
  const setupPath = resolve(
    repoRoot,
    pathValue("--setup-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.setup.ts`,
  );
  const charactersPath = resolve(
    repoRoot,
    pathValue("--characters-path") ??
      `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.characters.ts`,
  );
  const scenarioReviewPath = resolve(
    repoRoot,
    pathValue("--scenario-review-path") ??
      `${scenarioPath}.scenario-review.json`,
  );
  const benchmarkContextPath = pathValue("--benchmark-context-path");
  const contextDelivery: ContextDelivery<"player"> =
    benchmarkContextPath === undefined
      ? { tag: "canonicalRoleProjection", role: "player" }
      : {
          tag: "benchmarkContext",
          content: readFileSync(
            resolve(repoRoot, benchmarkContextPath),
            "utf8",
          ),
        };
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
  });
  if (Either.isLeft(admission)) fail(admission.left);
  mkdirSync(resolve(output, "evidence"), { recursive: true });
  const runStartPath = resolve(output, "evidence/run-start.json");
  writeFileSync(
    runStartPath,
    `${JSON.stringify(
      {
        type: "raw-swarm-player-run-start",
        schemaVersion: 1,
        scenarioId: acceptedScenarioId,
        gitSha: gitSha.right,
        startedAt,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  const customStagePlanPath = pathValue("--stage-plan-path");
  const customStagePlanFindingsPath = pathValue("--stage-plan-findings-path");
  if (
    (customStagePlanPath === undefined) !==
    (customStagePlanFindingsPath === undefined)
  ) {
    fail(
      "--stage-plan-path and --stage-plan-findings-path must be supplied together.",
    );
  }
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
          const planPath = resolve(repoRoot, customStagePlanPath);
          const findingsPath = resolve(repoRoot, customStagePlanFindingsPath);
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
      runStartPath,
      scenarioId: acceptedScenarioId,
      gitSha: gitSha.right,
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
    repoRoot,
    customStagePlanPath ?? retainedScenarioStagePlanPath(acceptedScenarioId),
  );
  const stagePlanFindingsPath = resolve(
    repoRoot,
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
      runStartPath,
      scenarioId: acceptedScenarioId,
      gitSha: gitSha.right,
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
      runStartPath,
      scenarioId: acceptedScenarioId,
      gitSha: gitSha.right,
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
        runStartPath,
        scenarioId: acceptedScenarioId,
        gitSha: gitSha.right,
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
      },
    );

    const permissionArgs = profileAvailable
      ? ([] as const)
      : (["--dangerously-bypass-approvals-and-sandbox"] as const);
    const agentLogPath = resolve(trusted, "agent.log");
    const result = runCodexInvocation({
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
        "--output-last-message",
        resolve(trusted, "evidence/agent-final.txt"),
        [
          `Read ${deliveredContextFileName}, PLAYER.md, SCENARIO.md, OBSERVATION.json, and attempt.ts.`,
          "Act as the player described there and continue until the SDK supervisor accepts a playerConcluded outcome or returns a terminalObstruction. Stop immediately after a terminalObstruction; it is retained evidence.",
          "For each tactical continuation, edit only attempt.ts and run `node player-client.mjs attempt.ts`. After the call, reread OBSERVATION.json before replacing the attempt body for the next continuation.",
          "At subjectSelection, discover acts and attempt a surfaced act in the same continuation. At subjectContinuation, resume the retained subject and do not discover fresh acts.",
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
      scenarioId: acceptedScenarioId,
      gitSha: gitSha.right,
      fallbackInvocationId: randomUUID(),
      model: PLAYER_MODEL,
      reasoningEffort: PLAYER_REASONING_EFFORT,
    });
    if (result.error !== undefined) throw result.error;
    if (result.signal !== null)
      fail(`Player agent stopped by ${result.signal}.`);
    const evidenceState = playerEvidenceState(trusted, scratch);
    if (result.status !== 0 && evidenceState.tag !== "obstructed") {
      fail(`Player agent exited with status ${String(result.status)}.`);
    }
    if (evidenceState.tag === "active") {
      fail(
        `Player agent exited after ${String(evidenceState.recordedContinuations)} continuations without a recorded conclusion.`,
      );
    }
    if (evidenceState.tag === "obstructed") {
      console.log(
        `Player run retained a player-protocol obstruction after ${String(evidenceState.recordedContinuations)} continuations: ${evidenceState.obstruction.message}`,
      );
    }
  } catch (error: unknown) {
    preparationFailure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    try {
      if (supervisorProcess !== undefined) {
        const runningSupervisor = supervisorProcess;
        const stopped = new Promise<void>((resolveStopped) => {
          if (runningSupervisor.exitCode !== null) {
            resolveStopped();
            return;
          }
          runningSupervisor.once("exit", () => resolveStopped());
        });
        runningSupervisor.kill("SIGTERM");
        await stopped;
      }
      if (supervisorLog !== undefined) closeSync(supervisorLog);
      if (existsSync(resolve(trusted, "evidence/sdk-calls.jsonl"))) {
        const agentLogPath = resolve(trusted, "agent.log");
        if (existsSync(agentLogPath)) {
          copyFileSync(agentLogPath, resolve(scratch, "agent.log"));
        }
        retainRun(scratch, trusted, output);
        emitRunFindings(output);
        copyFileSync(
          resolve(trusted, "supervisor.mjs"),
          resolve(output, "replay-supervisor.mjs"),
        );
      } else {
        emitTranscriptlessFindings({
          output,
          runStartPath,
          scenarioId: acceptedScenarioId,
          gitSha: gitSha.right,
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
    } finally {
      rmSync(scratch, { recursive: true });
      rmSync(trusted, { recursive: true });
      rmSync(codexHome, { recursive: true });
    }
  }
  console.log(`SDK player evidence: ${output}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
