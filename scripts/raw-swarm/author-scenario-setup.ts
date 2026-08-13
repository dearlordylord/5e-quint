import { spawnSync } from "node:child_process";
import {
  constants,
  copyFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
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
  authorScenarioSetupThroughOwners,
  type ScenarioSetupAuthorRole,
} from "./sdk-player/scenario-setup-authoring.ts";
import { evaluateScenarioCharacters } from "./sdk-player/scenario-character-runtime.ts";
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

function runSetupAuthor(input: {
  readonly scratch: string;
  readonly codexHome: string;
  readonly permissionArgs: readonly string[];
  readonly role: ScenarioSetupAuthorRole;
  readonly instruction: string;
}): void {
  const result = spawnSync(
    "codex",
    [
      "exec",
      "-C",
      input.scratch,
      ...input.permissionArgs,
      "--skip-git-repo-check",
      "--ephemeral",
      "--disable",
      "tool_call_mcp_elicitation",
      "-m",
      "gpt-5.6-sol",
      "-c",
      'model_reasoning_effort="medium"',
      input.instruction,
    ],
    {
      cwd: input.scratch,
      env: { ...process.env, CODEX_HOME: input.codexHome },
      stdio: "inherit",
    },
  );
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) {
    fail(`Scenario setup ${input.role} agent stopped by ${result.signal}.`);
  }
  if (result.status !== 0) {
    fail(
      `Scenario setup ${input.role} agent exited with status ${String(result.status)}.`,
    );
  }
}

function typecheckSetup(scratch: string, phase: "neutral" | "retained"): void {
  const typecheck = spawnSync(
    process.execPath,
    [resolve(scratch, "tooling/typescript/bin/tsc"), "--noEmit"],
    { cwd: scratch, encoding: "utf8" },
  );
  if (typecheck.error !== undefined) throw typecheck.error;
  if (typecheck.signal !== null || typecheck.status !== 0) {
    fail(
      `Scenario setup ${phase} source did not typecheck:\n${typecheck.stdout}${typecheck.stderr}`,
    );
  }
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
  const charactersPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId.right}.characters.ts`,
  );
  const outputPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId.right}.setup.ts`,
  );
  if (
    !existsSync(scenarioPath) ||
    !existsSync(reviewPath) ||
    !existsSync(charactersPath)
  ) {
    fail(
      "Scenario setup requires admitted prose, its review, and controller-authored characters.",
    );
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
    const characters = await evaluateScenarioCharacters(charactersPath);
    if (characters.tag === "invalid") fail(characters.message);
    if (characters.tag === "obstructed") {
      fail(`Scenario characters are obstructed: ${characters.obstruction}`);
    }
    const statBlocks = scenarioSetupStatBlocks();
    if (statBlocks.tag === "invalid") fail(statBlocks.message);
    buildScenarioSetupDistribution({
      destination: scratch,
      scenarioPath,
      scenarioReviewPath: reviewPath,
      statBlocks: statBlocks.statBlocks,
      characterObservation: characters.observation,
    });
    const profileAvailable = consumerPermissionProfileAvailable(
      codexHome,
      scratch,
    );
    const permissionArgs = profileAvailable
      ? ([] as const)
      : (["--dangerously-bypass-approvals-and-sandbox"] as const);
    const setupPath = resolve(scratch, "setup.ts");
    const evaluated = await authorScenarioSetupThroughOwners({
      scratch,
      runAuthor: (role) =>
        runSetupAuthor({
          scratch,
          codexHome,
          permissionArgs,
          role,
          instruction:
            role === "neutral"
              ? [
                  "Read SCENARIO_SETUP.md, SCENARIO.md, SCENARIO_REVIEW.json, CHARACTERS.json, PUBLIC_SDK.md, STAT_BLOCKS.json, and the public declarations.",
                  "Edit setup.ts into the closest faithful ordinary TypeScript setup and run its documented typecheck.",
                  "Leave player- and GM-delegated choices with their owners and return an explicit obstruction when the public setup surface cannot represent the scenario; do not invent support.",
                  "Do not inspect paths outside this scratch consumer.",
                ].join(" ")
              : [
                  "Read SCENARIO_SETUP_CONTROLLER.md and every file it names, including the immutable NEUTRAL_SETUP.ts review baseline and its working copy setup.ts.",
                  "Review and edit setup.ts only to supply player- and GM-owned pre-battle choices as ordinary canonical SDK code.",
                  "Preserve scenario-fixed facts, retain any remaining public-SDK obstruction, and run the documented typecheck.",
                  "Do not inspect paths outside this scratch consumer.",
                ].join(" "),
        }),
      typecheck: (phase) => typecheckSetup(scratch, phase),
      validateRetained: async () => {
        const result = await evaluateScenarioSetup(
          setupPath,
          characters.characterSheets,
        );
        if (result.tag === "invalid") fail(result.message);
        return result;
      },
    });
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
