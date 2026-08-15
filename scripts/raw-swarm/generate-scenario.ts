import { spawnSync } from "node:child_process";
import { createHash, randomInt, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Either, Schema } from "effect";

import {
  codexOutputJsonSchema,
  finalScenarioDisposition,
  FinalScenarioReviewSchema,
  retentionRevisionMatches,
  runScenarioCampaign,
  ScenarioCandidateBatchSchema,
  ScenarioCampaignConfigSchema,
  ScenarioCompositeReviewSchema,
  ScenarioReadinessSchema,
  verifyFinalScenarioReview,
  type ContentAvailabilityIntent,
  type ScenarioCampaignAgents,
  type SdkCapabilityIntent,
} from "./scenario-campaign.ts";
import { scenarioSetupStatBlocks } from "./sdk-player/scenario-setup-runtime.ts";
import { currentGitRevision, GitShaSchema, repoRoot } from "./transcript.ts";
import {
  appendInvocationLedger,
  invocationIdFromCodexEvents,
  modelUsageFromCodexEvents,
  readCodexEvents,
  type ModelInvocationLedgerEntry,
} from "./model-telemetry.ts";

const FAILURE_LOG_TAIL_CHARACTERS = 64 * 1024;

function fail(message: string): never {
  throw new Error(message);
}

function runCodexJson<A, I>(
  prompt: string,
  schema: Schema.Schema<A, I>,
  execution: {
    readonly model: "gpt-5.6-sol" | "gpt-5.6-luna";
    readonly reasoningEffort: "medium" | "max";
    readonly phase: ModelInvocationLedgerEntry["phase"];
    readonly ledgerPath: string;
    readonly retainedInvocationDirectory?: string;
  },
): A {
  const outputSchema = Schema.Struct({ result: schema });
  const temporary = mkdtempSync(resolve(tmpdir(), "dnd-scenario-campaign-"));
  const schemaPath = resolve(temporary, "schema.json");
  const outputPath = resolve(temporary, "output.json");
  const agentLogPath = resolve(temporary, "agent.log");
  const eventPath = resolve(temporary, "events.jsonl");
  try {
    const outputJsonSchema = codexOutputJsonSchema(schema);
    writeFileSync(schemaPath, `${JSON.stringify(outputJsonSchema, null, 2)}\n`);
    const agentLog = openSync(agentLogPath, "w");
    const events = openSync(eventPath, "w");
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const fallbackInvocationId = randomUUID();
    const result = (() => {
      try {
        return spawnSync(
          "codex",
          [
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
            "--output-last-message",
            outputPath,
            prompt,
          ],
          { cwd: repoRoot, stdio: ["ignore", events, agentLog] },
        );
      } finally {
        closeSync(agentLog);
        closeSync(events);
      }
    })();
    const parsedEvents = readCodexEvents(eventPath);
    const codexEvents = parsedEvents.tag === "valid" ? parsedEvents.events : [];
    const invocationId = invocationIdFromCodexEvents(
      codexEvents,
      fallbackInvocationId,
    );
    appendInvocationLedger(execution.ledgerPath, {
      schemaVersion: 1,
      phase: execution.phase,
      invocationId,
      model: execution.model,
      reasoningEffort: execution.reasoningEffort,
      startedAt,
      elapsedMilliseconds: Math.round(performance.now() - started),
      exit:
        result.signal === null
          ? { tag: "exited", status: result.status ?? -1 }
          : { tag: "signaled", signal: result.signal },
      usage:
        parsedEvents.tag === "valid"
          ? modelUsageFromCodexEvents(codexEvents)
          : { tag: "unavailable", reason: parsedEvents.message },
    });
    if (result.error !== undefined) throw result.error;
    if (result.signal !== null)
      fail(`Scenario agent stopped by ${result.signal}.`);
    if (result.status !== 0) {
      const failureLog = readFileSync(agentLogPath, "utf8");
      fail(
        failureLog.slice(-FAILURE_LOG_TAIL_CHARACTERS) ||
          "Scenario agent failed.",
      );
    }
    const decoded = Schema.decodeUnknownEither(outputSchema, {
      onExcessProperty: "error",
    })(JSON.parse(readFileSync(outputPath, "utf8")));
    if (Either.isLeft(decoded)) {
      return fail(
        `Scenario agent returned invalid output: ${decoded.left.message}`,
      );
    }
    if (execution.retainedInvocationDirectory !== undefined) {
      mkdirSync(execution.retainedInvocationDirectory, { recursive: true });
      writeFileSync(
        resolve(
          execution.retainedInvocationDirectory,
          `${execution.phase}-${fallbackInvocationId}.json`,
        ),
        `${JSON.stringify(
          {
            schemaVersion: 1,
            phase: execution.phase,
            invocationId,
            model: execution.model,
            reasoningEffort: execution.reasoningEffort,
            prompt,
            outputJsonSchema,
            result: decoded.right.result,
          },
          null,
          2,
        )}\n`,
        { flag: "wx" },
      );
    }
    return decoded.right.result;
  } finally {
    rmSync(temporary, { recursive: true });
  }
}

function generationPreamble(
  statBlockNames: readonly string[],
  contentAvailabilityIntent: ContentAvailabilityIntent,
  sdkCapabilityIntent: SdkCapabilityIntent,
  sdkCapabilityDocs: string,
): string {
  return `You generate battle-testing scenarios for an SRD 5.2.1 adjudicator SDK.
Return complete prose scenario revisions, not outlines or patches. Bias toward combat, serious pursuit of authored objectives, and materially different or changing tactics. Keep story to mechanically consequential terrain, visibility, distance, objectives, builds, and encounter facts. Mix exact constraints with delegated player choices naturally in prose. Do not invent a stage system, command language, or expected result. Do not describe a winner, victory, winning side, or encounter-wide partition; retain concrete combatants, pairwise relationships, and objective facts. Use only SRD identity or visibly synthetic unsupported material; never copy non-SRD official D&D identity or expression.

Available canonical stat-block identities:
${statBlockNames.join(", ")}

Content-availability intent: ${contentAvailabilityIntent}

${contentAvailabilityIntent === "availableOnly" ? "Use canonical stat blocks only from that availability list. An absent SRD record is a scenario-authoring error, not an implied product request." : "This campaign deliberately probes unavailable content. The prose must explicitly name content availability as the intended unsupported boundary so setup obstruction is interpretable."}

SDK-capability intent: ${sdkCapabilityIntent}

${sdkCapabilityIntent === "supportedOnly" ? "Use only scenario facts and interactions representable through the current public SDK described below. Do not repeat known unsupported mechanics merely because a prior scenario used them." : "Deliberately exercise one capability absent from the current public SDK described below, and explicitly name that capability as the intended probe. Keep the remaining scenario representable."}

Current public SDK capability documentation:
${sdkCapabilityDocs}`;
}

function liveAgents(ledgerPath: string): ScenarioCampaignAgents {
  const statBlocks = scenarioSetupStatBlocks();
  if (statBlocks.tag === "invalid") fail(statBlocks.message);
  const sdkCapabilityDocs = [
    {
      label: "SCENARIO_CHARACTERS.md",
      path: "scripts/raw-swarm/sdk-player/SCENARIO_CHARACTERS.md",
    },
    {
      label: "CHARACTER_CREATION_SDK.md",
      path: "packages/character-creation-runtime/README.md",
    },
    {
      label: "CHARACTER_SHEET_SDK.md",
      path: "packages/character-sheet-runtime/README.md",
    },
    {
      label: "@dnd/scenario-character-sdk public contract",
      path: "scripts/raw-swarm/sdk-player/scenario-character-contract.ts",
    },
    {
      label: "SCENARIO_SETUP.md",
      path: "scripts/raw-swarm/sdk-player/SCENARIO_SETUP.md",
    },
    {
      label: "@dnd/scenario-setup-sdk public contract",
      path: "scripts/raw-swarm/sdk-player/scenario-setup-contract.ts",
    },
    {
      label: "PLAYER.md",
      path: "scripts/raw-swarm/sdk-player/PLAYER.md",
    },
    {
      label: "@dnd/player-sdk public contract",
      path: "scripts/raw-swarm/sdk-player/continuation-contract.ts",
    },
    {
      label: "PUBLIC_SDK.md",
      path: "packages/battle-runtime/README.md",
    },
  ]
    .map(
      ({ label, path }) =>
        `## ${label}\n\n${readFileSync(resolve(repoRoot, path), "utf8")}`,
    )
    .join("\n\n");
  const generatorExecution = {
    model: "gpt-5.6-sol",
    reasoningEffort: "medium",
    phase: "scenarioGeneration",
    ledgerPath,
  } as const;
  const reviewerExecution = {
    model: "gpt-5.6-luna",
    reasoningEffort: "max",
    phase: "scenarioCompositeReview",
    ledgerPath,
    retainedInvocationDirectory: `${ledgerPath.slice(0, -".jsonl".length)}-review-inputs`,
  } as const;
  const readinessExecution = {
    model: "gpt-5.6-luna",
    reasoningEffort: "max",
    phase: "scenarioReadiness",
    ledgerPath,
  } as const;
  return {
    generate: async (input) =>
      runCodexJson(
        `${generationPreamble(
          statBlocks.statBlocks.map(({ name }) => name),
          input.contentAvailabilityIntent,
          input.sdkCapabilityIntent,
          sdkCapabilityDocs,
        )}

Distribution preference:
${input.distributionPreference}

Iteration: ${input.iteration}
Requested complete revisions: ${input.candidateCount}

Selected scenario so far:
${input.priorRevision.tag === "initial" ? "No prior scenario; create the first complete revisions." : input.priorRevision.prose}

Independent critiques to address in the next complete revision:
${input.priorRevision.tag === "initial" || input.priorRevision.critiques.length === 0 ? "None." : input.priorRevision.critiques.join("\n\n")}

Produce exactly ${input.candidateCount} materially different complete prose revisions. Differences must affect mechanics, character choices, encounter composition, or tactical intent—not wording alone. Return only the required JSON.`,
        ScenarioCandidateBatchSchema,
        generatorExecution,
      ),
    reviewReadiness: async ({
      scenario,
      distributionPreference,
      contentAvailabilityIntent,
      sdkCapabilityIntent,
    }) =>
      runCodexJson(
        `Independently judge whether this battle-testing scenario is ready. It is ready only if the setup is mechanically meaningful, every represented combatant or group seriously pursues an authored strategy-bearing objective, and its fixed versus delegated choices fit the campaign's distribution preference. Do not impose a generic balance: a deliberately loose or highly prescribed scenario can be ready. Do not judge RAW legality, choose tactics, predict the outcome, rewrite prose, or stop merely because the document is coherent. Reject prose that introduces a winner, victory, winning side, or encounter-wide partition instead of concrete combatant, pairwise-relationship, and objective facts. Return ready or one concise critique that would materially improve the next whole revision.

Available canonical stat-block identities:
${statBlocks.statBlocks.map(({ name }) => name).join(", ")}

Content-availability intent: ${contentAvailabilityIntent}

SDK-capability intent: ${sdkCapabilityIntent}

An availableOnly scenario is not ready when it selects a canonical stat block absent from that list. A probeUnavailableContent scenario is ready on this axis only when its prose states that unsupported intent.

Campaign distribution preference:
${distributionPreference}

Scenario:
${scenario}`,
        ScenarioReadinessSchema,
        readinessExecution,
      ),
    reviewScenario: async ({
      scenario,
      finalReview,
      contentAvailabilityIntent,
      sdkCapabilityIntent,
    }) =>
      runCodexJson(
        `Perform one ${finalReview ? "final pre-play" : "milestone"} review invocation with four mandatory, independently scoped assessments. Do not produce an aggregate verdict and do not merge their evidence or responsibilities.

RAW: use only .references/srd-5.2.1/ and ASSUMPTIONS.md. Check legality, coherence, executability, and missing Table Decisions. Do not choose tactics, predict an outcome, rewrite prose, or decide artifact policy.

Content availability: compare selected canonical identities with the supplied availability list and the exact campaign intent. Do not infer a product obligation from an accidental unavailable selection.

SDK capability: compare required setup/play facts with the current public SDK documentation below, not historical run verdicts. Do not inspect implementation files.

Artifact policy: apply docs/mushroom-playbook/AUTHORING.md only to public identity/expression safety. Do not judge mechanics or tactics.

Content-availability intent: ${contentAvailabilityIntent}
SDK-capability intent: ${sdkCapabilityIntent}

Available canonical stat-block identities:
${statBlocks.statBlocks.map(({ name }) => name).join(", ")}

Current public SDK capability documentation:
${sdkCapabilityDocs}

Scenario:
${scenario}`,
        ScenarioCompositeReviewSchema,
        reviewerExecution,
      ),
  };
}

function verifyRetainedScenario(
  scenarioId: Schema.Schema.Type<
    typeof ScenarioCampaignConfigSchema
  >["scenarioId"],
  scenarioPath: string,
  reviewPath: string,
  gitSha: string,
): void {
  const scenarioBytes = readFileSync(scenarioPath, "utf8");
  const decodedGitSha = Schema.decodeUnknownEither(GitShaSchema)(gitSha);
  if (Either.isLeft(decodedGitSha)) {
    fail("Retained scenario has an invalid Git revision.");
  }
  const verification = verifyFinalScenarioReview(
    JSON.parse(readFileSync(reviewPath, "utf8")),
    { scenarioId, gitSha: decodedGitSha.right, scenarioBytes },
  );
  if (Either.isLeft(verification)) {
    fail(verification.left);
  }
}

async function main(args: readonly string[]): Promise<void> {
  const [configInput, ...unexpected] = args;
  if (configInput === undefined || unexpected.length > 0) {
    fail("Usage: generate-scenario.ts <campaign.json>");
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
    `${decodedConfig.right.scenarioId}.md`,
  );
  const rejectedPath = resolve(
    rejectedDirectory,
    `${decodedConfig.right.scenarioId}.md`,
  );
  if (
    existsSync(admittedPath) ||
    existsSync(`${admittedPath}.scenario-review.json`) ||
    existsSync(rejectedPath) ||
    existsSync(`${rejectedPath}.scenario-review.json`)
  ) {
    fail("Refusing to overwrite a retained scenario or final scenario review.");
  }
  const ledgerPath = resolve(
    repoRoot,
    `scripts/raw-swarm/out/${decodedConfig.right.scenarioId}-generation-invocations.jsonl`,
  );
  if (existsSync(ledgerPath)) {
    fail(`Refusing to overwrite scenario invocation ledger: ${ledgerPath}`);
  }
  const result = await runScenarioCampaign(
    decodedConfig.right,
    liveAgents(ledgerPath),
    {
      select: randomInt,
    },
  );
  if (Either.isLeft(result)) fail(result.left);
  if (!retentionRevisionMatches(gitSha.right, currentGitRevision())) {
    fail(
      "Git revision changed during scenario generation; nothing was retained.",
    );
  }
  const scenarioBytes = `${result.right.scenario.trim()}\n`;
  const review = Schema.decodeUnknownEither(FinalScenarioReviewSchema, {
    onExcessProperty: "error",
  })({
    scenarioId: result.right.scenarioId,
    scenarioSha256: createHash("sha256").update(scenarioBytes).digest("hex"),
    gitSha: gitSha.right,
    reviewScope: result.right.reviewScope,
    contentAvailabilityIntent: result.right.contentAvailabilityIntent,
    sdkCapabilityIntent: result.right.sdkCapabilityIntent,
    admitReviewedUnsupported: result.right.admitReviewedUnsupported,
    rawReview: result.right.rawReview,
    contentReview: result.right.contentReview,
    sdkCapabilityReview: result.right.sdkCapabilityReview,
    policyReview: result.right.policyReview,
  });
  if (Either.isLeft(review)) {
    fail(`Invalid final scenario review: ${review.left.message}`);
  }
  const disposition = finalScenarioDisposition(review.right);
  const outputDirectory =
    disposition === "admitted" ? admittedDirectory : rejectedDirectory;
  const outputPath = resolve(outputDirectory, `${result.right.scenarioId}.md`);
  const reviewPath = `${outputPath}.scenario-review.json`;
  mkdirSync(outputDirectory, { recursive: true });
  const staging = mkdtempSync(resolve(outputDirectory, ".scenario-stage-"));
  const stagedScenario = resolve(staging, "scenario.md");
  const stagedReview = resolve(staging, "scenario-review.json");
  try {
    writeFileSync(stagedScenario, scenarioBytes, { flag: "wx" });
    writeFileSync(stagedReview, `${JSON.stringify(review.right, null, 2)}\n`, {
      flag: "wx",
    });
    renameSync(stagedReview, reviewPath);
    try {
      renameSync(stagedScenario, outputPath);
    } catch (error: unknown) {
      unlinkSync(reviewPath);
      throw error;
    }
  } finally {
    rmSync(staging, { recursive: true });
  }
  verifyRetainedScenario(
    result.right.scenarioId,
    outputPath,
    reviewPath,
    gitSha.right,
  );
  console.log(
    `Generated ${outputPath} in ${result.right.iterations} iteration(s), stopped by ${result.right.stopReason}, ${disposition}.`,
  );
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
