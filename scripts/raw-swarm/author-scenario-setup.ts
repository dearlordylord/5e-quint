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
import { Either, Schema } from "effect";

import { admittedScenarioIdentity } from "./scenario-admission.ts";
import { assertModelEntryPointGuard } from "./model-entrypoint-guard.ts";
import { runCodexInvocation } from "./model-telemetry.ts";
import { RAW_SWARM_STAGE_PLAN_REASONS } from "./scenario-stage-plan.ts";
import { retainAdmittedScenarioStagePlan } from "./stage-plan-authority.ts";
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
  GitShaSchema,
  repoRoot,
  type GitSha,
  type ScenarioId,
} from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

async function runSetupAuthor(input: {
  readonly scratch: string;
  readonly codexHome: string;
  readonly permissionArgs: readonly string[];
  readonly scenarioId: ScenarioId;
  readonly gitSha: GitSha;
  readonly evidenceDirectory: string;
  readonly role: ScenarioSetupAuthorRole;
  readonly instruction: string;
}): Promise<void> {
  const invocationStem = `${input.scenarioId}-setup-${input.role}-authoring-${randomUUID()}`;
  const result = await runCodexInvocation({
    args: [
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
    cwd: input.scratch,
    env: { ...process.env, CODEX_HOME: input.codexHome },
    eventPath: resolve(
      input.evidenceDirectory,
      `${invocationStem}-events.jsonl`,
    ),
    logPath: resolve(input.evidenceDirectory, `${invocationStem}-agent.log`),
    ledgerPath: resolve(
      input.evidenceDirectory,
      `${input.scenarioId}-authoring-invocations.jsonl`,
    ),
    phase:
      input.role === "neutral"
        ? "scenarioSetupNeutralAuthoring"
        : "scenarioSetupControllerAuthoring",
    stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioSetupAuthoring,
    subject: { tag: "scenario", scenarioId: input.scenarioId },
    gitSha: input.gitSha,
    fallbackInvocationId: `${input.scenarioId}-setup-${input.role}-authoring`,
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    operation: { tag: "noOutput" },
  });
  if (result.tag === "failed") {
    fail(
      `Scenario setup ${input.role} invocation failed: ${result.cause.reason}`,
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
  assertModelEntryPointGuard();
  const [scenarioInput, ...unexpected] = args;
  const scenarioId = decodeScenarioId(scenarioInput);
  if (Either.isLeft(scenarioId) || unexpected.length > 0) {
    fail("Usage: author-scenario-setup.ts <scenario-id>");
  }
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("Scenario setup authoring requires a clean Git worktree.");
  }
  const gitSha = Schema.decodeUnknownEither(GitShaSchema)(revision.sha);
  if (Either.isLeft(gitSha)) fail(gitSha.left.message);
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
    recordPath: scenarioPath.replace(/\.md$/, ".scenario.json"),
  });
  if (Either.isLeft(admission)) fail(admission.left);

  const retainedPlan = retainAdmittedScenarioStagePlan({
    scenarioId: scenarioId.right,
    scenarioPath,
    scenarioSha256: admission.right.scenarioSha256,
    scenarioReviewSha256: admission.right.scenarioReviewSha256,
  });
  if (Either.isLeft(retainedPlan)) fail(retainedPlan.left);
  if (retainedPlan.right.outcome.tag === "rejected") {
    fail(
      `Scenario stage plan rejected setup authoring: ${retainedPlan.right.outcome.reason}`,
    );
  }

  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-scenario-setup-"));
  const codexHome = createConsumerCodexHome();
  const evidenceDirectory = resolve(repoRoot, "scripts/raw-swarm/out");
  mkdirSync(evidenceDirectory, { recursive: true });
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
      contextDelivery: {
        tag: "canonicalRoleProjection",
        role: "setupAuthoring",
      },
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
          scenarioId: scenarioId.right,
          gitSha: gitSha.right,
          evidenceDirectory,
          role,
          instruction:
            role === "neutral"
              ? [
                  "Read CAPABILITY_CONTEXT.md, SCENARIO_SETUP.md, SCENARIO.md, SCENARIO_REVIEW.json, CHARACTERS.json, STAT_BLOCKS.json, and only the declarations needed for the listed public operations.",
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
