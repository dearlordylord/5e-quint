import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Either, Match, Schema } from "effect";

import { admittedScenarioIdentity } from "./scenario-admission.ts";
import { runCodexInvocation } from "./model-telemetry.ts";
import {
  consumerPermissionProfileAvailable,
  createConsumerCodexHome,
} from "./sdk-player/consumer-codex-profile.ts";
import { buildScenarioCharacterDistribution } from "./sdk-player/consumer-distribution.ts";
import { evaluateScenarioCharacters } from "./sdk-player/scenario-character-runtime.ts";
import {
  currentGitRevision,
  decodeScenarioId,
  GitShaSchema,
  repoRoot,
} from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

async function main(args: readonly string[]): Promise<void> {
  const [scenarioInput, ...unexpected] = args;
  const scenarioId = decodeScenarioId(scenarioInput);
  if (Either.isLeft(scenarioId) || unexpected.length > 0) {
    fail("Usage: author-scenario-characters.ts <scenario-id>");
  }
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("Scenario character authoring requires a clean Git worktree.");
  }
  const gitSha = Schema.decodeUnknownEither(GitShaSchema)(revision.sha);
  if (Either.isLeft(gitSha)) fail(gitSha.left.message);
  const scenarioPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId.right}.md`,
  );
  const reviewPath = `${scenarioPath}.scenario-review.json`;
  const outputPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId.right}.characters.ts`,
  );
  if (!existsSync(scenarioPath) || !existsSync(reviewPath)) {
    fail("Scenario characters require an admitted prose scenario and review.");
  }
  if (existsSync(outputPath)) {
    fail(`Refusing to overwrite scenario characters: ${outputPath}`);
  }
  const admission = admittedScenarioIdentity({
    scenarioId: scenarioId.right,
    scenarioPath,
    reviewPath,
  });
  if (Either.isLeft(admission)) fail(admission.left);

  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-scenario-characters-"));
  const codexHome = createConsumerCodexHome();
  try {
    buildScenarioCharacterDistribution({
      destination: scratch,
      scenarioPath,
      scenarioReviewPath: reviewPath,
    });
    const profileAvailable = consumerPermissionProfileAvailable(
      codexHome,
      scratch,
    );
    const permissionArgs = profileAvailable
      ? ([] as const)
      : (["--dangerously-bypass-approvals-and-sandbox"] as const);
    const evidenceDirectory = resolve(repoRoot, "scripts/raw-swarm/out");
    mkdirSync(evidenceDirectory, { recursive: true });
    const invocationStem = `${scenarioId.right}-character-authoring-${randomUUID()}`;
    const eventPath = resolve(
      evidenceDirectory,
      `${invocationStem}-events.jsonl`,
    );
    const logPath = resolve(evidenceDirectory, `${invocationStem}-agent.log`);
    const ledgerPath = resolve(
      evidenceDirectory,
      `${scenarioId.right}-authoring-invocations.jsonl`,
    );
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
        "gpt-5.6-sol",
        "-c",
        'model_reasoning_effort="medium"',
        [
          "Read SCENARIO_CHARACTERS.md, SCENARIO.md, SCENARIO_REVIEW.json, the public SDK READMEs, and declarations.",
          "Edit characters.ts into one faithful controller-owned ordinary TypeScript character composition.",
          "Run both documented commands and iterate until the module is ready or returns a precise public-SDK obstruction.",
          "Do not inspect paths outside this scratch consumer.",
        ].join(" "),
      ],
      cwd: scratch,
      env: { ...process.env, CODEX_HOME: codexHome },
      eventPath,
      logPath,
      ledgerPath,
      phase: "scenarioCharacterAuthoring",
      scenarioId: scenarioId.right,
      gitSha: gitSha.right,
      fallbackInvocationId: `${scenarioId.right}-character-authoring`,
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
    });
    if (result.error !== undefined) throw result.error;
    if (result.signal !== null) {
      fail(`Scenario character agent stopped by ${result.signal}.`);
    }
    if (result.status !== 0) {
      fail(
        `Scenario character agent exited with status ${String(result.status)}.`,
      );
    }
    const typecheck = spawnSync(
      process.execPath,
      [resolve(scratch, "tooling/typescript/bin/tsc"), "--noEmit"],
      { cwd: scratch, encoding: "utf8" },
    );
    if (typecheck.error !== undefined) throw typecheck.error;
    if (typecheck.signal !== null || typecheck.status !== 0) {
      fail(
        `Scenario characters did not typecheck:\n${typecheck.stdout}${typecheck.stderr}`,
      );
    }
    const charactersPath = resolve(scratch, "characters.ts");
    const evaluated = await evaluateScenarioCharacters(charactersPath);
    if (evaluated.tag === "invalid") fail(evaluated.message);
    const after = currentGitRevision();
    if (after.tag === "dirty" || after.sha !== revision.sha) {
      fail("Git revision changed during scenario character authoring.");
    }
    copyFileSync(charactersPath, outputPath, constants.COPYFILE_EXCL);
    console.log(
      Match.value(evaluated).pipe(
        Match.when(
          { tag: "ready" },
          ({ characterSheets }) =>
            `Authored ${String(characterSheets.length)} Character Sheets: ${outputPath}`,
        ),
        Match.when(
          { tag: "obstructed" },
          ({ obstruction }) =>
            `Authored obstructed scenario characters: ${outputPath}\n${obstruction}`,
        ),
        Match.exhaustive,
      ),
    );
  } finally {
    rmSync(scratch, { recursive: true });
    rmSync(codexHome, { recursive: true });
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
