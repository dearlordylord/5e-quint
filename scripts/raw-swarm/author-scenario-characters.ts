import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Result, Match, Schema } from "effect";

import { admittedScenarioIdentity } from "./scenario-admission.ts";
import { assertModelEntryPointGuard } from "./model-entrypoint-guard.ts";
import { runCodexInvocation } from "./model-telemetry.ts";
import {
  RAW_SWARM_STAGE_PLAN_REASONS,
  stageRequiresModelInvocation,
} from "./scenario-stage-plan.ts";
import { retainAdmittedScenarioStagePlan } from "./stage-plan-authority.ts";
import {
  consumerPermissionProfileAvailable,
  createConsumerCodexHome,
} from "./sdk-player/consumer-codex-profile.ts";
import { buildScenarioCharacterDistribution } from "./sdk-player/consumer-distribution.ts";
import {
  authoredSourceIssuesMessage,
  readAuthoredSource,
  withAuthoredSourceSnapshot,
} from "./sdk-player/authored-source-admission.ts";
import {
  evaluateAdmittedScenarioCharacters,
  evaluateScenarioCharacters,
  scenarioCharactersWithoutSheetsSource,
} from "./sdk-player/scenario-character-runtime.ts";
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
  assertModelEntryPointGuard();
  const [scenarioInput, ...unexpected] = args;
  const scenarioId = decodeScenarioId(scenarioInput);
  if (Result.isFailure(scenarioId) || unexpected.length > 0) {
    fail("Usage: author-scenario-characters.ts <scenario-id>");
  }
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("Scenario character authoring requires a clean Git worktree.");
  }
  const gitSha = Schema.decodeUnknownResult(GitShaSchema)(revision.sha);
  if (Result.isFailure(gitSha)) fail(gitSha.failure.message);
  const scenarioPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId.success}.md`,
  );
  const reviewPath = `${scenarioPath}.scenario-review.json`;
  const outputPath = resolve(
    repoRoot,
    `scripts/raw-swarm/sdk-player/scenarios/${scenarioId.success}.characters.ts`,
  );
  if (!existsSync(scenarioPath) || !existsSync(reviewPath)) {
    fail("Scenario characters require an admitted prose scenario and review.");
  }
  if (existsSync(outputPath)) {
    fail(`Refusing to overwrite scenario characters: ${outputPath}`);
  }
  const admission = admittedScenarioIdentity({
    scenarioId: scenarioId.success,
    scenarioPath,
    reviewPath,
    recordPath: scenarioPath.replace(/\.md$/, ".scenario.json"),
  });
  if (Result.isFailure(admission)) fail(admission.failure);

  const retainedPlan = retainAdmittedScenarioStagePlan({
    scenarioId: scenarioId.success,
    scenarioPath,
    scenarioSha256: admission.success.scenarioSha256,
    scenarioReviewSha256: admission.success.scenarioReviewSha256,
  });
  if (Result.isFailure(retainedPlan)) fail(retainedPlan.failure);
  const stagePlan = retainedPlan.success;
  if (stagePlan.outcome.tag === "rejected") {
    fail(`Scenario stage plan rejected authoring: ${stagePlan.outcome.reason}`);
  }
  if (!stageRequiresModelInvocation(stagePlan, "scenarioCharacterAuthoring")) {
    writeFileSync(outputPath, scenarioCharactersWithoutSheetsSource(), {
      flag: "wx",
    });
    const evaluated = await evaluateScenarioCharacters(outputPath);
    if (evaluated.tag !== "ready" || evaluated.characterSheets.length !== 0) {
      fail(
        "The canonical stat-block-only character source did not evaluate to zero sheets.",
      );
    }
    console.log(
      `Skipped Character Sheet authoring; retained zero-sheet source: ${outputPath}`,
    );
    return;
  }

  const scratch = mkdtempSync(resolve(tmpdir(), "dnd-scenario-characters-"));
  const codexHome = createConsumerCodexHome();
  try {
    buildScenarioCharacterDistribution({
      destination: scratch,
      scenarioPath,
      scenarioReviewPath: reviewPath,
      contextDelivery: {
        tag: "canonicalRoleProjection",
        role: "characterAuthoring",
      },
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
    const invocationStem = `${scenarioId.success}-character-authoring-${randomUUID()}`;
    const eventPath = resolve(
      evidenceDirectory,
      `${invocationStem}-events.jsonl`,
    );
    const logPath = resolve(evidenceDirectory, `${invocationStem}-agent.log`);
    const ledgerPath = resolve(
      evidenceDirectory,
      `${scenarioId.success}-authoring-invocations.jsonl`,
    );
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
        "gpt-5.6-sol",
        "-c",
        'model_reasoning_effort="medium"',
        [
          "Read CAPABILITY_CONTEXT.md, SCENARIO_CHARACTERS.md, SCENARIO.md, SCENARIO_REVIEW.json, and only the declarations needed for the listed public operations.",
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
      stagePlanReason: RAW_SWARM_STAGE_PLAN_REASONS.scenarioCharacterAuthoring,
      subject: { tag: "scenario", scenarioId: scenarioId.success },
      gitSha: gitSha.success,
      fallbackInvocationId: `${scenarioId.success}-character-authoring`,
      model: "gpt-5.6-sol",
      reasoningEffort: "medium",
      operation: { tag: "noOutput" },
    });
    if (result.tag === "failed") {
      fail(`Scenario character invocation failed: ${result.cause.reason}`);
    }
    const charactersPath = resolve(scratch, "characters.ts");
    const characterSource = readAuthoredSource({
      role: "scenarioCharacter",
      sourcePath: charactersPath,
    });
    if (characterSource.tag === "rejected") {
      fail(authoredSourceIssuesMessage(characterSource));
    }
    withAuthoredSourceSnapshot(characterSource, (snapshot) => {
      const typecheckConfigPath = resolve(
        scratch,
        `.authored-source-tsconfig-${randomUUID()}.json`,
      );
      writeFileSync(
        typecheckConfigPath,
        `${JSON.stringify({ extends: "./tsconfig.json", files: [snapshot.sourcePath], include: [] }, null, 2)}\n`,
        { flag: "wx" },
      );
      try {
        const typecheck = spawnSync(
          process.execPath,
          [
            resolve(scratch, "tooling/typescript/bin/tsc"),
            "--noEmit",
            "-p",
            typecheckConfigPath,
          ],
          { cwd: scratch, encoding: "utf8" },
        );
        if (typecheck.error !== undefined) throw typecheck.error;
        if (typecheck.signal !== null || typecheck.status !== 0) {
          fail(
            `Scenario characters did not typecheck:\n${typecheck.stdout}${typecheck.stderr}`,
          );
        }
      } finally {
        rmSync(typecheckConfigPath, { force: true });
      }
    });
    const evaluated = await evaluateAdmittedScenarioCharacters(characterSource);
    if (evaluated.tag === "invalid") fail(evaluated.message);
    const after = currentGitRevision();
    if (after.tag === "dirty" || after.sha !== revision.sha) {
      fail("Git revision changed during scenario character authoring.");
    }
    writeFileSync(outputPath, characterSource.source, { flag: "wx" });
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
