import { spawnSync } from "node:child_process";
import { constants } from "node:fs";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Either } from "effect";

import { admittedScenarioIdentity } from "./scenario-admission.ts";
import {
  consumerPermissionProfileAvailable,
  createConsumerCodexHome,
} from "./sdk-player/consumer-codex-profile.ts";
import { buildScenarioSetupDistribution } from "./sdk-player/consumer-distribution.ts";
import {
  evaluateScenarioSetup,
  scenarioSetupStatBlocks,
} from "./sdk-player/scenario-setup-runtime.ts";
import {
  currentGitRevision,
  decodeScenarioId,
  repoRoot,
} from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

async function main(args: readonly string[]): Promise<void> {
  const [scenarioInput, ...unexpected] = args;
  const scenarioId = decodeScenarioId(scenarioInput);
  if (Either.isLeft(scenarioId) || unexpected.length > 0) {
    fail("Usage: author-scenario-setup.ts <scenario-id>");
  }
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("Scenario setup authoring requires a clean Git worktree.");
  }
  const scenarioPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId.right}.md`,
  );
  const reviewPath = `${scenarioPath}.scenario-review.json`;
  const outputPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId.right}.setup.ts`,
  );
  if (!existsSync(scenarioPath) || !existsSync(reviewPath)) {
    fail("Scenario setup requires an admitted prose scenario and review.");
  }
  if (existsSync(outputPath)) {
    fail(`Refusing to overwrite scenario setup: ${outputPath}`);
  }
  const admission = admittedScenarioIdentity({
    scenarioId: scenarioId.right,
    scenarioPath,
    reviewPath,
  });
  if (Either.isLeft(admission)) fail(admission.left);

  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-scenario-setup-"));
  const codexHome = createConsumerCodexHome();
  try {
    const statBlocks = scenarioSetupStatBlocks();
    if (statBlocks.tag === "invalid") fail(statBlocks.message);
    buildScenarioSetupDistribution({
      destination: scratch,
      scenarioPath,
      scenarioReviewPath: reviewPath,
      statBlocks: statBlocks.statBlocks,
    });
    if (!consumerPermissionProfileAvailable(codexHome, scratch)) {
      fail("Codex consumer permission profile is unavailable.");
    }
    const result = spawnSync(
      "codex",
      [
        "exec",
        "-C",
        scratch,
        "--skip-git-repo-check",
        "--ephemeral",
        "--disable",
        "tool_call_mcp_elicitation",
        "-m",
        "gpt-5.6-sol",
        "-c",
        'model_reasoning_effort="medium"',
        [
          "Read SCENARIO_SETUP.md, SCENARIO.md, SCENARIO_REVIEW.json, PUBLIC_SDK.md, STAT_BLOCKS.json, and the public declarations.",
          "Edit setup.ts into the closest faithful ordinary TypeScript setup and run its documented typecheck.",
          "Return an explicit obstruction when the public setup surface cannot represent the scenario; do not invent support.",
          "Do not inspect paths outside this scratch consumer.",
        ].join(" "),
      ],
      {
        cwd: scratch,
        env: { ...process.env, CODEX_HOME: codexHome },
        stdio: "inherit",
      },
    );
    if (result.error !== undefined) throw result.error;
    if (result.signal !== null) {
      fail(`Scenario setup agent stopped by ${result.signal}.`);
    }
    if (result.status !== 0) {
      fail(`Scenario setup agent exited with status ${String(result.status)}.`);
    }
    const typecheck = spawnSync(
      process.execPath,
      [resolve(scratch, "tooling/typescript/bin/tsc"), "--noEmit"],
      { cwd: scratch, encoding: "utf8" },
    );
    if (typecheck.error !== undefined) throw typecheck.error;
    if (typecheck.signal !== null || typecheck.status !== 0) {
      fail(
        `Scenario setup did not typecheck:\n${typecheck.stdout}${typecheck.stderr}`,
      );
    }
    const setupPath = resolve(scratch, "setup.ts");
    const evaluated = await evaluateScenarioSetup(setupPath);
    if (evaluated.tag === "invalid") fail(evaluated.message);
    const after = currentGitRevision();
    if (after.tag === "dirty" || after.sha !== revision.sha) {
      fail("Git revision changed during scenario setup authoring.");
    }
    copyFileSync(setupPath, outputPath, constants.COPYFILE_EXCL);
    console.log(
      evaluated.tag === "ready"
        ? `Authored ready scenario setup: ${outputPath}`
        : `Authored obstructed scenario setup: ${outputPath}\n${evaluated.obstruction}`,
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
