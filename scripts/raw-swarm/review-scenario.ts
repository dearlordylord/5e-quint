import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

import { Either, Schema } from "effect";

import { scenarioCampaignAgents } from "./generate-scenario.ts";
import {
  ContentAvailabilityIntentSchema,
  SdkCapabilityIntentSchema,
} from "./scenario-campaign.ts";
import {
  currentGitRevision,
  decodeScenarioId,
  repoRoot,
} from "./transcript.ts";

const ScenarioReviewPhaseSchema = Schema.Literal("milestone", "final");

function fail(message: string): never {
  throw new Error(message);
}

function decode<A, I>(schema: Schema.Schema<A, I>, value: unknown): A {
  const decoded = Schema.decodeUnknownEither(schema, {
    onExcessProperty: "error",
  })(value);
  return Either.isLeft(decoded) ? fail(decoded.left.message) : decoded.right;
}

async function main(args: readonly string[]): Promise<void> {
  const [
    scenarioInput,
    phaseInput,
    contentAvailabilityIntentInput,
    sdkCapabilityIntentInput,
    outputInput,
    ledgerInput,
    ...unexpected
  ] = args;
  if (
    scenarioInput === undefined ||
    phaseInput === undefined ||
    contentAvailabilityIntentInput === undefined ||
    sdkCapabilityIntentInput === undefined ||
    outputInput === undefined ||
    ledgerInput === undefined ||
    unexpected.length > 0
  ) {
    fail(
      "Usage: review-scenario.ts <scenario.md> <milestone|final> <availableOnly|probeUnavailableContent> <supportedOnly|probeUnsupportedCapability> <output.json> <invocations.jsonl>",
    );
  }
  const scenarioPath = resolve(repoRoot, scenarioInput);
  const outputPath = resolve(repoRoot, outputInput);
  const ledgerPath = resolve(repoRoot, ledgerInput);
  const scenarioId = decodeScenarioId(basename(scenarioPath, ".md"));
  if (Either.isLeft(scenarioId)) fail(scenarioId.left);
  const revision = currentGitRevision();
  if (revision.tag === "dirty") {
    fail("Scenario review requires a clean Git worktree.");
  }
  if (existsSync(outputPath)) {
    fail(`Refusing to overwrite scenario review output: ${outputPath}`);
  }
  const phase = decode(ScenarioReviewPhaseSchema, phaseInput);
  const contentAvailabilityIntent = decode(
    ContentAvailabilityIntentSchema,
    contentAvailabilityIntentInput,
  );
  const sdkCapabilityIntent = decode(
    SdkCapabilityIntentSchema,
    sdkCapabilityIntentInput,
  );
  const result = await scenarioCampaignAgents({
    ledgerPath,
    scenarioId: scenarioId.right,
    gitSha: revision.sha,
  }).reviewScenario({
    scenario: readFileSync(scenarioPath, "utf8"),
    finalReview: phase === "final",
    contentAvailabilityIntent,
    sdkCapabilityIntent,
  });
  writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, {
    flag: "wx",
  });
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
