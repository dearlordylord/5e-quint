import { spawnSync } from "node:child_process";
import { createHash, randomInt } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
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
  ScenarioContentReviewSchema,
  ScenarioPolicyReviewSchema,
  ScenarioRawReviewSchema,
  ScenarioReadinessSchema,
  verifyFinalScenarioReview,
  type ContentAvailabilityIntent,
  type ScenarioCampaignAgents,
} from "./scenario-campaign.ts";
import { scenarioSetupStatBlocks } from "./sdk-player/scenario-setup-runtime.ts";
import { currentGitRevision, GitShaSchema, repoRoot } from "./transcript.ts";

function fail(message: string): never {
  throw new Error(message);
}

function runCodexJson<A, I>(
  prompt: string,
  schema: Schema.Schema<A, I>,
  reasoningEffort: "medium" | "high",
): A {
  const outputSchema = Schema.Struct({ result: schema });
  const temporary = mkdtempSync(resolve(tmpdir(), "dnd-scenario-campaign-"));
  const schemaPath = resolve(temporary, "schema.json");
  const outputPath = resolve(temporary, "output.json");
  try {
    writeFileSync(
      schemaPath,
      `${JSON.stringify(codexOutputJsonSchema(schema), null, 2)}\n`,
    );
    const result = spawnSync(
      "codex",
      [
        "exec",
        "-C",
        repoRoot,
        "--sandbox",
        "danger-full-access",
        "--ephemeral",
        "--disable",
        "tool_call_mcp_elicitation",
        "-m",
        "gpt-5.6-sol",
        "-c",
        `model_reasoning_effort=${JSON.stringify(reasoningEffort)}`,
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        prompt,
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );
    if (result.error !== undefined) throw result.error;
    if (result.signal !== null)
      fail(`Scenario agent stopped by ${result.signal}.`);
    if (result.status !== 0) fail(result.stderr || "Scenario agent failed.");
    const decoded = Schema.decodeUnknownEither(outputSchema, {
      onExcessProperty: "error",
    })(JSON.parse(readFileSync(outputPath, "utf8")));
    return Either.isRight(decoded)
      ? decoded.right.result
      : fail(`Scenario agent returned invalid output: ${decoded.left.message}`);
  } finally {
    rmSync(temporary, { recursive: true });
  }
}

function generationPreamble(
  statBlockNames: readonly string[],
  contentAvailabilityIntent: ContentAvailabilityIntent,
): string {
  return `You generate battle-testing scenarios for an SRD 5.2.1 adjudicator SDK.
Return complete prose scenario revisions, not outlines or patches. Bias toward combat, serious pursuit of authored objectives, and materially different or changing tactics. Keep story to mechanically consequential terrain, visibility, distance, objectives, builds, and encounter facts. Mix exact constraints with delegated player choices naturally in prose. Do not invent a stage system, command language, or expected result. Do not describe a winner, victory, winning side, or encounter-wide partition; retain concrete combatants, pairwise relationships, and objective facts. Use only SRD identity or visibly synthetic unsupported material; never copy non-SRD official D&D identity or expression.

Available canonical stat-block identities:
${statBlockNames.join(", ")}

Content-availability intent: ${contentAvailabilityIntent}

${contentAvailabilityIntent === "availableOnly" ? "Use canonical stat blocks only from that availability list. An absent SRD record is a scenario-authoring error, not an implied product request." : "This campaign deliberately probes unavailable content. The prose must explicitly name content availability as the intended unsupported boundary so setup obstruction is interpretable."}`;
}

function liveAgents(): ScenarioCampaignAgents {
  const statBlocks = scenarioSetupStatBlocks();
  if (statBlocks.tag === "invalid") fail(statBlocks.message);
  return {
    generate: async (input) =>
      runCodexJson(
        `${generationPreamble(
          statBlocks.statBlocks.map(({ name }) => name),
          input.contentAvailabilityIntent,
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
        "medium",
      ),
    reviewReadiness: async ({
      scenario,
      distributionPreference,
      contentAvailabilityIntent,
    }) =>
      runCodexJson(
        `Independently judge whether this battle-testing scenario is ready. It is ready only if the setup is mechanically meaningful, every represented combatant or group seriously pursues an authored strategy-bearing objective, and its fixed versus delegated choices fit the campaign's distribution preference. Do not impose a generic balance: a deliberately loose or highly prescribed scenario can be ready. Do not judge RAW legality, choose tactics, predict the outcome, rewrite prose, or stop merely because the document is coherent. Reject prose that introduces a winner, victory, winning side, or encounter-wide partition instead of concrete combatant, pairwise-relationship, and objective facts. Return ready or one concise critique that would materially improve the next whole revision.

Available canonical stat-block identities:
${statBlocks.statBlocks.map(({ name }) => name).join(", ")}

Content-availability intent: ${contentAvailabilityIntent}

An availableOnly scenario is not ready when it selects a canonical stat block absent from that list. A probeUnavailableContent scenario is ready on this axis only when its prose states that unsupported intent.

Campaign distribution preference:
${distributionPreference}

Scenario:
${scenario}`,
        ScenarioReadinessSchema,
        "high",
      ),
    reviewRaw: async (scenario, finalReview) =>
      runCodexJson(
        `Review this ${finalReview ? "final" : "milestone"} battle scenario using only .references/srd-5.2.1/ and ASSUMPTIONS.md. Check RAW legality, internal coherence, executability, and whether omitted facts must become explicit Table Decisions. Do not choose tactics, predict a winner, rewrite the scenario, or make a publication-policy decision. A deliberately unsupported but visibly synthetic probe may be classified unsupported rather than erased. A supported result has evidence and no critique; unsupported or contradictory results require a critique. Cite local files/headings in evidence. Return only the required JSON.

Scenario:
${scenario}`,
        ScenarioRawReviewSchema,
        "high",
      ),
    reviewContent: async ({ scenario, contentAvailabilityIntent }) =>
      runCodexJson(
        `Independently review scenario content identity against the supplied canonical stat-block availability profile. Do not judge RAW legality, tactics, balance, or public-artifact policy.

Content-availability intent: ${contentAvailabilityIntent}

Available canonical stat-block identities:
${statBlocks.statBlocks.map(({ name }) => name).join(", ")}

For availableOnly intent, return supplied when every selected canonical stat block is supplied; otherwise return invalidUnavailableSelection with evidence and a correction critique. For probeUnavailableContent intent, return explicitUnavailableProbe only when the prose explicitly names unavailable content as its intended probe; return missingUnavailableProbe with a correction critique when it uses only supplied content, and invalidUnavailableSelection when it selects unavailable content without explicitly identifying the probe. Do not infer a product obligation from an accidental unavailable selection.

Scenario:
${scenario}`,
        ScenarioContentReviewSchema,
        "high",
      ),
    reviewPolicy: async (scenario) =>
      runCodexJson(
        `Independently review this public scenario artifact against docs/mushroom-playbook/AUTHORING.md. Decide only whether its identities and expression are safe to retain publicly. Do not judge RAW mechanics, tactics, balance, or likely winner. A safe result has evidence and no critique; a violation requires a precise critique. Return only the required JSON.

Scenario:
${scenario}`,
        ScenarioPolicyReviewSchema,
        "high",
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
  const result = await runScenarioCampaign(decodedConfig.right, liveAgents(), {
    select: randomInt,
  });
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
    contentAvailabilityIntent: result.right.contentAvailabilityIntent,
    admitReviewedUnsupported: result.right.admitReviewedUnsupported,
    rawReview: result.right.rawReview,
    contentReview: result.right.contentReview,
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
