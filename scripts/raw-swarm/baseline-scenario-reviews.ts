import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { Either, JSONSchema, Schema } from "effect";

import {
  invocationIdFromCodexEvents,
  readCodexEvents,
  runCodexInvocation,
} from "./model-telemetry.ts";
import {
  ScenarioContentReviewSchema,
  ScenarioPolicyReviewSchema,
  ScenarioRawReviewSchema,
  ScenarioSdkCapabilityReviewSchema,
} from "./scenario-campaign.ts";
import { scenarioSetupStatBlocks } from "./sdk-player/scenario-setup-runtime.ts";
import { repoRoot } from "./transcript.ts";

const BaselineReviewPhaseSchema = Schema.Literal("milestone", "final");
const OutputSchema = <A, I>(schema: Schema.Schema<A, I>) =>
  Schema.Struct({ result: schema });

function fail(message: string): never {
  throw new Error(message);
}

function decode<A, I>(schema: Schema.Schema<A, I>, value: unknown): A {
  const decoded = Schema.decodeUnknownEither(schema, {
    onExcessProperty: "error",
  })(value);
  return Either.isLeft(decoded) ? fail(decoded.left.message) : decoded.right;
}

function runReview<A, I>(input: {
  readonly label: "raw" | "content" | "sdk-capability" | "artifact-policy";
  readonly prompt: string;
  readonly schema: Schema.Schema<A, I>;
  readonly outputDirectory: string;
  readonly ledgerPath: string;
}): A {
  const outputSchema = OutputSchema(input.schema);
  const schemaPath = resolve(
    input.outputDirectory,
    `${input.label}.schema.json`,
  );
  const outputPath = resolve(input.outputDirectory, `${input.label}.json`);
  const eventPath = resolve(
    input.outputDirectory,
    `${input.label}.events.jsonl`,
  );
  const logPath = resolve(input.outputDirectory, `${input.label}.log`);
  const envelopePath = resolve(
    input.outputDirectory,
    `${input.label}.envelope.json`,
  );
  const outputJsonSchema = JSONSchema.make(outputSchema);
  writeFileSync(schemaPath, `${JSON.stringify(outputJsonSchema, null, 2)}\n`, {
    flag: "wx",
  });
  const fallbackInvocationId = randomUUID();
  const result = runCodexInvocation({
    args: [
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
      "gpt-5.6-luna",
      "-c",
      'model_reasoning_effort="max"',
      "--output-schema",
      schemaPath,
      "--output-last-message",
      outputPath,
      input.prompt,
    ],
    cwd: repoRoot,
    env: process.env,
    eventPath,
    logPath,
    ledgerPath: input.ledgerPath,
    phase: "scenarioCompositeReview",
    fallbackInvocationId,
    model: "gpt-5.6-luna",
    reasoningEffort: "max",
  });
  if (result.error !== undefined) throw result.error;
  if (result.signal !== null) fail(`${input.label} review stopped by signal.`);
  if (result.status !== 0) {
    fail(
      readFileSync(logPath, "utf8").slice(-(64 * 1024)) ||
        `${input.label} review failed.`,
    );
  }
  const decoded = decode(
    outputSchema,
    JSON.parse(readFileSync(outputPath, "utf8")) as unknown,
  );
  const events = readCodexEvents(eventPath);
  writeFileSync(
    envelopePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        phase: "scenarioCompositeReview",
        invocationId:
          events.tag === "valid"
            ? invocationIdFromCodexEvents(events.events, fallbackInvocationId)
            : fallbackInvocationId,
        model: "gpt-5.6-luna",
        reasoningEffort: "max",
        prompt: input.prompt,
        outputJsonSchema,
        result: decoded.result,
      },
      null,
      2,
    )}\n`,
    { flag: "wx" },
  );
  return decoded.result;
}

function sdkCapabilityDocs(): string {
  return [
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
}

function main(args: readonly string[]): void {
  const [
    scenarioInput,
    phaseInput,
    outputDirectoryInput,
    ledgerInput,
    ...rest
  ] = args;
  if (
    scenarioInput === undefined ||
    phaseInput === undefined ||
    outputDirectoryInput === undefined ||
    ledgerInput === undefined ||
    rest.length > 0
  ) {
    fail(
      "Usage: baseline-scenario-reviews.ts <scenario.md> <milestone|final> <output-directory> <invocations.jsonl>",
    );
  }
  const phase = decode(BaselineReviewPhaseSchema, phaseInput);
  const scenario = readFileSync(resolve(repoRoot, scenarioInput), "utf8");
  const outputDirectory = resolve(repoRoot, outputDirectoryInput);
  const ledgerPath = resolve(repoRoot, ledgerInput);
  if (existsSync(outputDirectory)) {
    fail(`Refusing to overwrite baseline review evidence: ${outputDirectory}`);
  }
  mkdirSync(outputDirectory, { recursive: true });
  const statBlocks = scenarioSetupStatBlocks();
  if (statBlocks.tag === "invalid") fail(statBlocks.message);
  const statBlockNames = statBlocks.statBlocks
    .map(({ name }) => name)
    .join(", ");
  const docs = sdkCapabilityDocs();
  const finalReview = phase === "final";

  runReview({
    label: "raw",
    prompt: `Review this ${finalReview ? "final" : "milestone"} battle scenario using only .references/srd-5.2.1/ and ASSUMPTIONS.md. Check RAW legality, internal coherence, executability, and whether omitted facts must become explicit Table Decisions. Do not choose tactics, predict a winner, rewrite the scenario, or make a publication-policy decision. A deliberately unsupported but visibly synthetic probe may be classified unsupported rather than erased. A supported result has evidence and no critique; unsupported or contradictory results require a critique. Cite local files/headings in evidence. Return only the required JSON.\n\nScenario:\n${scenario}`,
    schema: ScenarioRawReviewSchema,
    outputDirectory,
    ledgerPath,
  });
  runReview({
    label: "content",
    prompt: `Independently review scenario content identity against the supplied canonical stat-block availability profile. Do not judge RAW legality, tactics, balance, or public-artifact policy.\n\nContent-availability intent: availableOnly\n\nAvailable canonical stat-block identities:\n${statBlockNames}\n\nFor availableOnly intent, return supplied when every selected canonical stat block is supplied; otherwise return invalidUnavailableSelection with evidence and a correction critique. For probeUnavailableContent intent, return explicitUnavailableProbe only when the prose explicitly names unavailable content as its intended probe; return missingUnavailableProbe with a correction critique when it uses only supplied content, and invalidUnavailableSelection when it selects unavailable content without explicitly identifying the probe. Do not infer a product obligation from an accidental unavailable selection.\n\nScenario:\n${scenario}`,
    schema: ScenarioContentReviewSchema,
    outputDirectory,
    ledgerPath,
  });
  runReview({
    label: "sdk-capability",
    prompt: `Independently review whether every scenario fact and interaction required to set up and play this scenario is representable through the current public SDK documented below. Treat these current documents—not historical run verdicts or a permanent blacklist—as the capability authority. Do not inspect implementation files, judge RAW legality, choose tactics, predict results, or rewrite the scenario.\n\nSDK-capability intent: supportedOnly\n\nFor supportedOnly intent, return supported only when the full scenario is representable; otherwise return unsupported with precise evidence and one correction critique. For probeUnsupportedCapability intent, return explicitUnsupportedProbe only when the prose explicitly names a capability that these documents do not support; if the requested capability is now supported or no unsupported capability is explicit, return missingUnsupportedProbe with a correction critique. This allows a capability to stop being excluded automatically when the public SDK documentation gains support.\n\nCurrent public SDK capability documentation:\n${docs}\n\nScenario:\n${scenario}`,
    schema: ScenarioSdkCapabilityReviewSchema,
    outputDirectory,
    ledgerPath,
  });
  runReview({
    label: "artifact-policy",
    prompt: `Independently review this public scenario artifact against docs/mushroom-playbook/AUTHORING.md. Decide only whether its identities and expression are safe to retain publicly. Do not judge RAW mechanics, tactics, balance, or likely winner. A safe result has evidence and no critique; a violation requires a precise critique. Return only the required JSON.\n\nScenario:\n${scenario}`,
    schema: ScenarioPolicyReviewSchema,
    outputDirectory,
    ledgerPath,
  });
}

main(process.argv.slice(2));
