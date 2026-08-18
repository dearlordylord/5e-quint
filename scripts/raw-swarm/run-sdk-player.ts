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
import { buildConsumerDistribution } from "./sdk-player/consumer-distribution.ts";
import { frontierFillTypeHelp } from "./sdk-player/frontier-fill-type-help.ts";
import { publicSdkDeclarationGraphSha256 } from "./sdk-player/public-sdk-type-help.ts";
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
  playerContinuationEvidence,
  playerInvocationArtifactNames,
  runPlayerInvocationLoop,
  type PlayerEvidenceState,
  type PlayerInvocationExit,
} from "./player-invocation-loop.ts";

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
    "agent-final.txt",
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
  return {
    tag: existsSync(resolve(trusted, "evidence/final.json"))
      ? "concluded"
      : "active",
    recordedContinuations: continuationEvidence.recordedContinuations,
  };
}

function playerInvocationExit(
  result: ReturnType<typeof runCodexInvocation>,
): PlayerInvocationExit {
  if (result.error !== undefined) {
    return { tag: "failedToStart", message: result.error.message };
  }
  if (result.signal !== null) {
    return { tag: "signaled", signal: result.signal };
  }
  return result.status === 0
    ? { tag: "completed" }
    : { tag: "exitedWithFailure", status: result.status ?? 1 };
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
    const typeHelpArtifact: unknown = JSON.parse(
      readFileSync(resolve(scratch, "FILL_TYPES.json"), "utf8"),
    );
    const declarationGraphSha256 = publicSdkDeclarationGraphSha256(
      resolve(scratch, "declarations"),
    );
    if (declarationGraphSha256 === undefined) {
      fail("Public SDK declaration graph is empty.");
    }
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
    const loop = runPlayerInvocationLoop({
      evidenceState: () => playerEvidenceState(trusted, scratch),
      invoke: (invocation) => {
        const observation: unknown = JSON.parse(
          readFileSync(resolve(scratch, "OBSERVATION.json"), "utf8"),
        );
        const fillTypeHelp = frontierFillTypeHelp({
          observation,
          artifact: typeHelpArtifact,
          declarationGraphSha256,
        });
        if (fillTypeHelp.tag === "invalid") fail(fillTypeHelp.message);
        writeFileSync(
          resolve(scratch, "FRONTIER_FILL_TYPES.md"),
          fillTypeHelp.markdown,
        );
        const names = playerInvocationArtifactNames(invocation);
        const agentLogPath = resolve(trusted, "evidence", names.log);
        const agentEventsPath = resolve(trusted, "evidence", names.events);
        const agentFinalPath = resolve(trusted, "evidence", names.finalMessage);
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
            agentFinalPath,
            [
              "Read PLAYER.md, SCENARIO.md, OBSERVATION.json, FRONTIER_FILL_TYPES.md, and attempt.ts.",
              "Act as the player described there and author exactly one tactical continuation.",
              "Edit only attempt.ts and run `node player-client.mjs attempt.ts`.",
              "Use `node public-sdk-type-help.mjs <fill-kind>` once for a fill kind requested by the active hole; do not search declarations or repeat successful type-help queries.",
              "At subjectSelection, discover acts and attempt a surfaced act in the same continuation; at subjectContinuation, resume the retained subject and do not discover fresh acts. Do not stop at needsHoles when the returned facts let this continuation finish the selected subject.",
              "Correct compilation or runtime failures that occur before the first SDK call.",
              "After one continuation produces an observable SDK call and OBSERVATION.json changes, stop; a later invocation will make the next decision.",
              "If the continuation concludes play, report that conclusion and stop.",
              "Inspect only files in this scratch consumer. Do not inspect repository source or internal tests, and do not use prior implementation knowledge.",
              "Do not edit evidence files. If the SDK blocks the scenario, preserve and report that obstruction instead of fabricating support.",
            ].join(" "),
          ],
          cwd: scratch,
          env: { ...process.env, CODEX_HOME: codexHome },
          eventPath: agentEventsPath,
          logPath: agentLogPath,
          ledgerPath: resolve(trusted, "evidence/invocations.jsonl"),
          phase: "player",
          scenarioId: acceptedScenarioId,
          gitSha: gitSha.right,
          fallbackInvocationId: randomUUID(),
          model: PLAYER_MODEL,
          reasoningEffort: PLAYER_REASONING_EFFORT,
        });
        if (existsSync(agentFinalPath)) {
          copyFileSync(agentFinalPath, resolve(scratch, "agent-final.txt"));
        }
        copyFileSync(agentLogPath, resolve(trusted, "agent.log"));
        return playerInvocationExit(result);
      },
    });
    Match.value(loop).pipe(
      Match.when({ tag: "concluded" }, () => undefined),
      Match.when({ tag: "invocationFailed" }, ({ invocation, exit }) =>
        fail(
          `Player invocation ${String(invocation)} failed: ${JSON.stringify(exit)}.`,
        ),
      ),
      Match.when({ tag: "noProgress" }, ({ invocation }) =>
        fail(
          `Player invocation ${String(invocation)} exited without recording a tactical continuation.`,
        ),
      ),
      Match.when(
        { tag: "multipleContinuationsRecorded" },
        ({ invocation, recordedContinuations }) =>
          fail(
            `Player invocation ${String(invocation)} recorded ${String(recordedContinuations)} tactical continuations; exactly one is required.`,
          ),
      ),
      Match.when({ tag: "invocationLimitReached" }, ({ limit }) =>
        fail(
          `Player did not conclude within ${String(limit)} tactical continuations.`,
        ),
      ),
      Match.exhaustive,
    );
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
