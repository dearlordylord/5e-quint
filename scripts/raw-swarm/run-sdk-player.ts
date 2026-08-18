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
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import {
  consumerPermissionProfileAvailable,
  createConsumerCodexHome,
} from "./sdk-player/consumer-codex-profile.ts";
import { buildConsumerDistribution } from "./sdk-player/consumer-distribution.ts";
import {
  parseSdkTranscript,
  sdkInitialTurnProjectionEvidence,
} from "./sdk-player/sdk-transcript.ts";
import { admittedScenarioIdentity } from "./scenario-admission.ts";
import { readJsonLines } from "./artifact-authority.ts";
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
  const evidenceIdFlagIndex = options.indexOf("--evidence-id");
  const evidenceIdInput =
    evidenceIdFlagIndex === -1 ? scenarioId : options[evidenceIdFlagIndex + 1];
  const decodedEvidenceId = decodeScenarioId(evidenceIdInput);
  const evidenceIdOptionIndexes =
    evidenceIdFlagIndex === -1
      ? new Set<number>()
      : new Set([evidenceIdFlagIndex, evidenceIdFlagIndex + 1]);
  const acceptedOptions = options.filter(
    (_option, index) => !evidenceIdOptionIndexes.has(index),
  );
  if (
    Either.isLeft(decodedScenarioId) ||
    Either.isLeft(decodedEvidenceId) ||
    acceptedOptions.some((option) => option !== "--instructional-isolation") ||
    options.filter((option) => option === "--instructional-isolation").length >
      1 ||
    options.filter((option) => option === "--evidence-id").length > 1 ||
    (evidenceIdFlagIndex !== -1 && evidenceIdFlagIndex + 1 >= options.length)
  ) {
    fail(
      "Usage: run-sdk-player.ts <scenario-id> [--evidence-id <evidence-id>] [--instructional-isolation]",
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
  const output = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${acceptedEvidenceId}-sdk-player`,
  );
  if (existsSync(output)) {
    fail(`Refusing to overwrite SDK player evidence: ${output}`);
  }
  const scenarioPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.md`,
  );
  const setupPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.setup.ts`,
  );
  const charactersPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${acceptedScenarioId}.characters.ts`,
  );
  const scenarioReviewPath = `${scenarioPath}.scenario-review.json`;
  if (
    !existsSync(scenarioPath) ||
    !existsSync(scenarioReviewPath) ||
    !existsSync(charactersPath)
  ) {
    fail(
      `Scenario requires adjacent .md, .scenario-review.json, and .characters.ts files; ready characters additionally require .setup.ts: ${acceptedScenarioId}`,
    );
  }
  const admission = admittedScenarioIdentity({
    scenarioId: acceptedScenarioId,
    scenarioPath,
    reviewPath: scenarioReviewPath,
  });
  if (Either.isLeft(admission)) fail(admission.left);
  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-sdk-player-"));
  const trusted = mkdtempSync(resolve(tmpdir(), "dnd-sdk-supervisor-"));
  const codexHome = createConsumerCodexHome();
  let supervisorProcess: ReturnType<typeof spawn> | undefined;
  let supervisorLog: number | undefined;
  try {
    buildConsumerDistribution({
      destination: scratch,
      trustedDestination: trusted,
      scenarioPath,
    });
    copyFileSync(scenarioReviewPath, resolve(scratch, "SCENARIO_REVIEW.json"));
    mkdirSync(resolve(trusted, "evidence"));
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
          "Read PLAYER.md, SCENARIO.md, OBSERVATION.json, and attempt.ts.",
          "Act as the player described there and continue until the SDK supervisor accepts a playerConcluded outcome or returns a terminalObstruction. Stop immediately after a terminalObstruction; it is retained evidence.",
          "For each tactical continuation, edit only attempt.ts and run `node player-client.mjs attempt.ts`. After the call, reread OBSERVATION.json before replacing the attempt body for the next continuation.",
          "At subjectSelection, discover acts and attempt a surfaced act in the same continuation. At subjectContinuation, resume the retained subject and do not discover fresh acts.",
          "Correct compilation or runtime failures that occur before the first SDK call. A returned SDK rejection is frozen evidence; use the next continuation to correct it.",
          "Inspect only the four named scratch-consumer files. Do not enumerate other files, inspect declarations, repository source, internal tests, or prior implementation knowledge.",
          "Do not edit evidence files. Preserve and report an SDK obstruction instead of fabricating support.",
        ].join(" "),
      ],
      cwd: scratch,
      env: { ...process.env, CODEX_HOME: codexHome },
      eventPath: resolve(trusted, "evidence/player-events.jsonl"),
      logPath: agentLogPath,
      ledgerPath: resolve(trusted, "evidence/invocations.jsonl"),
      phase: "player",
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
  } finally {
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
      copyFileSync(
        resolve(trusted, "supervisor.mjs"),
        resolve(output, "replay-supervisor.mjs"),
      );
    }
    rmSync(scratch, { recursive: true });
    rmSync(trusted, { recursive: true });
    rmSync(codexHome, { recursive: true });
  }
  console.log(`SDK player evidence: ${output}`);
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
