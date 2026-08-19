import { readFileSync } from "node:fs";

import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { capabilityContextForRole } from "./capability-projection.ts";
import {
  codexOutputJsonSchema,
  CurrentScenarioCompositeReviewSchema,
  HistoricalScenarioCompositeReviewSchema,
} from "./scenario-campaign.ts";
import {
  FIXED_SCENARIO_ID,
  fixedBenchmarkContextForRole,
  fixedBenchmarkDocumentDeclarationContextForRole,
  fixedScenarioCanonicalBundle,
  validateBenchmarkReviewAuthority,
} from "./fixed-scenario-benchmark.ts";
import { evaluateScenarioCharacters } from "./sdk-player/scenario-character-runtime.ts";

const historicalReview = {
  raw: {
    classification: "supported" as const,
    evidence: "The synthetic review finds no RAW contradiction.",
  },
  contentAvailability: {
    classification: "supplied" as const,
    evidence: "The tracked stat blocks are available.",
  },
  sdkCapability: {
    classification: "supported" as const,
    evidence: "The public SDK surface represents the scenario.",
  },
  artifactPolicy: {
    classification: "safe" as const,
    evidence: "The retained source uses publishable identity safely.",
  },
};

const currentReview = {
  ...historicalReview,
  scenarioQuality: {
    classification: "ready" as const,
    evidence: "The tracked setup is mechanically meaningful.",
  },
};

describe("fixed scenario benchmark boundary", () => {
  test("retains the exact tracked generated-battle-009 source bundle", () => {
    const bundle = fixedScenarioCanonicalBundle();

    expect(bundle.paths.scenario).toContain(`${FIXED_SCENARIO_ID}.md`);
    expect(bundle.paths.scenarioReview).toContain(
      `${FIXED_SCENARIO_ID}.md.scenario-review.json`,
    );
    expect(bundle.authorities.scenario.sha256).toBe(bundle.scenarioSha256);
    expect(bundle.authorities.scenarioReview.sha256).toBe(
      bundle.scenarioReviewSha256,
    );
    expect(readFileSync(bundle.paths.characters, "utf8")).toContain(
      "composeScenarioCharacters",
    );
    expect(readFileSync(bundle.paths.setup, "utf8")).toContain("setupScenario");
  });

  test("delivers bounded player context byte-identically from the canonical projection", () => {
    expect(
      fixedBenchmarkContextForRole("boundedCapabilityProjection", "player"),
    ).toBe(capabilityContextForRole("player"));
  });

  test("builds historical context from public documents and declarations", () => {
    const context =
      fixedBenchmarkDocumentDeclarationContextForRole("characterAuthoring");

    expect(context).toContain("SCENARIO_CHARACTERS.md");
    expect(context).toContain("CHARACTER_CREATION_SDK.md");
    expect(context).toContain("Full emitted public declaration bundle");
    expect(context).toContain("declare ");
    expect(context).not.toContain("generate-scenario.ts");
    expect(context).not.toContain("scenario-campaign.ts");
  }, 60_000);

  test("keeps baseline composites four-field and bounded composites five-field", () => {
    const historicalSchema = codexOutputJsonSchema(
      HistoricalScenarioCompositeReviewSchema,
    );
    const currentSchema = codexOutputJsonSchema(
      CurrentScenarioCompositeReviewSchema,
    );

    expect(
      Either.isRight(
        validateBenchmarkReviewAuthority({
          profile: "documentDeclarationSet",
          reviewStage: "final",
          result: historicalReview,
          outputJsonSchema: historicalSchema,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        validateBenchmarkReviewAuthority({
          profile: "documentDeclarationSet",
          reviewStage: "final",
          result: currentReview,
          outputJsonSchema: historicalSchema,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        validateBenchmarkReviewAuthority({
          profile: "boundedCapabilityProjection",
          reviewStage: "final",
          result: currentReview,
          outputJsonSchema: currentSchema,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        validateBenchmarkReviewAuthority({
          profile: "boundedCapabilityProjection",
          reviewStage: "final",
          result: historicalReview,
          outputJsonSchema: currentSchema,
        }),
      ),
    ).toBe(true);
  });

  test("awaits the canonical zero-sheet character evaluation", async () => {
    const bundle = fixedScenarioCanonicalBundle();
    const result = await evaluateScenarioCharacters(bundle.paths.characters);

    expect(result.tag).toBe("ready");
    if (result.tag === "ready") expect(result.characterSheets).toHaveLength(0);
  });
});
