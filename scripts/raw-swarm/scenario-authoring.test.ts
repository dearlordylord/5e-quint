import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  aggregateScenarioCatalogueComparisons,
  batchScenarioCatalogueProjections,
  SCENARIO_CATALOGUE_COMPARISON_BATCH_BYTE_LIMIT,
  ScenarioCatalogueComparisonSchema,
  SCENARIO_CATALOGUE_COMPARISON_MODEL_INPUT_BYTE_LIMIT,
  scenarioCatalogueComparisonPrompt,
  validateScenarioCatalogueComparison,
  type ScenarioCatalogueComparison,
  type ScenarioCatalogueProjection,
} from "./scenario-authoring.ts";
import {
  retainedScenarioReviewPlannedScenarioId,
  retainedScenarioReviewScenarioId,
  type RetainedScenarioReviewInput,
} from "./scenario-review-input.ts";

const projection = (
  scenarioId: string,
  purpose = "Explore a synthetic tactical question.",
): ScenarioCatalogueProjection => ({
  scenarioId: scenarioId as ScenarioCatalogueProjection["scenarioId"],
  title: `Synthetic ${scenarioId}`,
  purpose,
  authoredSource: {
    path: `scripts/raw-swarm/sdk-player/scenarios/${scenarioId}.md`,
    byteLength: 128,
    sha256: "a".repeat(64),
  },
  characterRequirement: "characterSheetsRequired",
  spatialContext: "notRequired",
  contentAvailabilityIntent: "availableOnly",
  sdkSupportBoundary: "supportedOnly/supported",
});

const dimensions = {
  exploratoryPurpose: "The candidate asks a different question.",
  materiallyRelevantMechanics: "The candidate uses a different mechanic.",
  encounterComposition: "The candidate composes a different encounter.",
  interactionSequence: "The candidate changes the interaction sequence.",
  tacticalQuestion: "The candidate asks a different tactical question.",
  sdkSupportBoundary: "Both paths use the supported SDK boundary.",
  spatialContext: { tag: "notMaterial" as const },
};

const comparison = (
  conclusion: ScenarioCatalogueComparison["conclusion"],
  ids: readonly string[],
  overrides: Partial<ScenarioCatalogueComparison> = {},
): ScenarioCatalogueComparison => ({
  schemaVersion: 1,
  conclusion,
  comparedScenarioIds:
    ids as ScenarioCatalogueComparison["comparedScenarioIds"],
  closestMatches:
    conclusion === "redundant"
      ? [
          {
            scenarioId:
              ids[0]! as ScenarioCatalogueComparison["comparedScenarioIds"][number],
            reason: "The interaction sequence is the same.",
          },
        ]
      : [],
  materialDifferentiators:
    conclusion === "purposefulOverlap"
      ? ["The candidate changes the tactical question."]
      : [],
  basis: {
    tag: "compared",
    batches: [
      {
        batchIndex: 0,
        comparedScenarioIds:
          ids as ScenarioCatalogueComparison["comparedScenarioIds"],
        dimensions,
      },
    ],
  },
  ...overrides,
});

describe("Scenario authoring catalogue comparison", () => {
  test("keeps Candidate reservations out of admitted Scenario identity checks", () => {
    const candidateReview = {
      schemaVersion: 3,
      subject: {
        tag: "scenarioCandidate",
        campaignId: "synthetic-campaign",
        evidenceSetId: "synthetic-evidence",
        candidateId: "synthetic-candidate",
        candidateScenarioSha256: "a".repeat(64),
        plannedScenarioId: "synthetic-planned-scenario",
      },
    } as RetainedScenarioReviewInput;
    expect(
      Result.isFailure(retainedScenarioReviewScenarioId(candidateReview)),
    ).toBe(true);
    expect(
      retainedScenarioReviewPlannedScenarioId(candidateReview),
    ).toMatchObject({ _tag: "Success", success: "synthetic-planned-scenario" });
  });

  test("splits the complete projection without truncating entries", () => {
    const projections = [projection("one"), projection("two")];
    const batches = batchScenarioCatalogueProjections(projections);
    expect(Result.isSuccess(batches)).toBe(true);
    if (Result.isSuccess(batches)) {
      expect(batches.success.flat()).toEqual(projections);
      expect(
        batches.success.every(
          (batch) =>
            Buffer.byteLength(JSON.stringify(batch)) <=
            SCENARIO_CATALOGUE_COMPARISON_BATCH_BYTE_LIMIT,
        ),
      ).toBe(true);
    }
  });

  test("rejects a projection that cannot fit one bounded batch", () => {
    const oversized = projection("oversized", "x".repeat(40_000));
    const batches = batchScenarioCatalogueProjections([oversized]);
    expect(Result.isFailure(batches)).toBe(true);
  });

  test("bounds the complete comparison prompt, including Candidate prose", () => {
    const result = scenarioCatalogueComparisonPrompt({
      candidate: "x".repeat(
        SCENARIO_CATALOGUE_COMPARISON_MODEL_INPUT_BYTE_LIMIT,
      ),
      candidateIndex: 0,
      batchIndex: 0,
      batch: [projection("one")],
    });
    expect(Result.isFailure(result)).toBe(true);
    const bounded = scenarioCatalogueComparisonPrompt({
      candidate: "small candidate",
      candidateIndex: 0,
      batchIndex: 0,
      batch: [projection("one")],
    });
    expect(Result.isSuccess(bounded)).toBe(true);
    if (Result.isSuccess(bounded)) {
      expect(Buffer.byteLength(bounded.success, "utf8")).toBeLessThanOrEqual(
        SCENARIO_CATALOGUE_COMPARISON_MODEL_INPUT_BYTE_LIMIT,
      );
    }
  });

  test("requires exact admitted-catalogue coverage and typed conclusions", () => {
    const missing = validateScenarioCatalogueComparison({
      comparison: comparison("meaningfullyDistinct", ["one"]),
      expectedScenarioIds: [
        "one",
        "two",
      ] as ScenarioCatalogueComparison["comparedScenarioIds"],
    });
    expect(Result.isFailure(missing)).toBe(true);

    const overlapWithoutDifferentiator = validateScenarioCatalogueComparison({
      comparison: comparison("purposefulOverlap", ["one"], {
        materialDifferentiators: [],
      }),
      expectedScenarioIds: [
        "one",
      ] as ScenarioCatalogueComparison["comparedScenarioIds"],
    });
    expect(Result.isFailure(overlapWithoutDifferentiator)).toBe(true);

    const redundantWithoutClosest = validateScenarioCatalogueComparison({
      comparison: comparison("redundant", ["one"], {
        closestMatches: [],
      }),
      expectedScenarioIds: [
        "one",
      ] as ScenarioCatalogueComparison["comparedScenarioIds"],
    });
    expect(Result.isFailure(redundantWithoutClosest)).toBe(true);

    const overlapWithEmptyCatalogue = validateScenarioCatalogueComparison({
      comparison: comparison("purposefulOverlap", [], {
        basis: { tag: "noAdmittedScenarios" },
      }),
      expectedScenarioIds: [],
    });
    expect(Result.isFailure(overlapWithEmptyCatalogue)).toBe(true);

    const closestMatchOutsideCatalogue = validateScenarioCatalogueComparison({
      comparison: comparison("redundant", ["one"], {
        closestMatches: [
          {
            scenarioId:
              "not-admitted" as ScenarioCatalogueComparison["comparedScenarioIds"][number],
            reason: "The candidate repeats this unrelated record.",
          },
        ],
      }),
      expectedScenarioIds: [
        "one",
      ] as ScenarioCatalogueComparison["comparedScenarioIds"],
    });
    expect(Result.isFailure(closestMatchOutsideCatalogue)).toBe(true);
  });

  test("rejects ids swapped between canonical batches", () => {
    const result = aggregateScenarioCatalogueComparisons({
      comparisons: [
        comparison("meaningfullyDistinct", ["two"], {
          basis: {
            tag: "compared",
            batches: [
              {
                batchIndex: 0,
                comparedScenarioIds: [
                  "two",
                ] as ScenarioCatalogueComparison["comparedScenarioIds"],
                dimensions,
              },
            ],
          },
        }),
        comparison("meaningfullyDistinct", ["one"], {
          basis: {
            tag: "compared",
            batches: [
              {
                batchIndex: 1,
                comparedScenarioIds: [
                  "one",
                ] as ScenarioCatalogueComparison["comparedScenarioIds"],
                dimensions,
              },
            ],
          },
        }),
      ],
      expectedScenarioIds: [
        "one",
        "two",
      ] as ScenarioCatalogueComparison["comparedScenarioIds"],
      expectedBatches: [
        { batchIndex: 0, scenarioIds: ["one"] },
        { batchIndex: 1, scenarioIds: ["two"] },
      ],
    });
    expect(Result.isFailure(result)).toBe(true);
  });

  test("rejects omitted, wrong, or duplicate model-retained top-level ids", () => {
    for (const comparedScenarioIds of [[], ["two"], ["one", "one"]] as const) {
      const result = aggregateScenarioCatalogueComparisons({
        comparisons: [
          comparison("meaningfullyDistinct", ["one"], {
            comparedScenarioIds:
              comparedScenarioIds as ScenarioCatalogueComparison["comparedScenarioIds"],
          }),
        ],
        expectedScenarioIds: ["one"],
        expectedBatches: [{ batchIndex: 0, scenarioIds: ["one"] }],
      });
      expect(Result.isFailure(result)).toBe(true);
    }
  });

  test("aggregates batches and preserves the strongest repetition conclusion", () => {
    const result = aggregateScenarioCatalogueComparisons({
      comparisons: [
        comparison("meaningfullyDistinct", ["one"]),
        comparison("redundant", ["two"], {
          basis: {
            tag: "compared",
            batches: [
              {
                batchIndex: 1,
                comparedScenarioIds: [
                  "two",
                ] as ScenarioCatalogueComparison["comparedScenarioIds"],
                dimensions,
              },
            ],
          },
        }),
      ],
      expectedScenarioIds: [
        "one",
        "two",
      ] as ScenarioCatalogueComparison["comparedScenarioIds"],
      expectedBatches: [
        { batchIndex: 0, scenarioIds: ["one"] },
        { batchIndex: 1, scenarioIds: ["two"] },
      ],
    });
    expect(result).toMatchObject({
      _tag: "Success",
      success: {
        conclusion: "redundant",
        comparedScenarioIds: ["one", "two"],
        closestMatches: [{ scenarioId: "two" }],
        basis: {
          batches: [
            { batchIndex: 0, comparedScenarioIds: ["one"] },
            { batchIndex: 1, comparedScenarioIds: ["two"] },
          ],
        },
      },
    });
    if (Result.isSuccess(result)) {
      expect(result.success.basis).toMatchObject({
        tag: "compared",
        batches: [
          { batchIndex: 0, dimensions },
          { batchIndex: 1, dimensions },
        ],
      });
    }
  });

  test("decodes only the declared comparison shape", () => {
    const decoded = Schema.decodeUnknownResult(
      ScenarioCatalogueComparisonSchema,
      {
        onExcessProperty: "error",
      },
    )(comparison("meaningfullyDistinct", ["one"]));
    expect(Result.isSuccess(decoded)).toBe(true);
    expect(
      Schema.decodeUnknownResult(ScenarioCatalogueComparisonSchema, {
        onExcessProperty: "error",
      })({
        ...comparison("meaningfullyDistinct", ["one"]),
        score: 0.5,
      }),
    ).toMatchObject({ _tag: "Failure" });
  });
});
