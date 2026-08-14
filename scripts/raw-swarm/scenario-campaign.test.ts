import { createHash } from "node:crypto";
import { Either, Schema } from "effect";
import { describe, expect, test, vi } from "vitest";

import {
  runScenarioCampaign,
  codexOutputJsonSchema,
  finalScenarioDisposition,
  retentionRevisionMatches,
  ScenarioRawReviewSchema,
  verifyFinalScenarioReview,
  type ScenarioCampaignAgents,
} from "./scenario-campaign.ts";
import { GitShaSchema, ScenarioIdSchema } from "./transcript.ts";

const config = {
  scenarioId: "synthetic-battle",
  distributionPreference:
    "Vary battle tactics and delegated character choices.",
  contentAvailabilityIntent: "availableOnly",
  sdkCapabilityIntent: "supportedOnly",
  minimumIterations: 2,
  maximumIterations: 4,
  candidatesPerIteration: 3,
  reviewMilestones: [2],
  admitReviewedUnsupported: false,
};

describe("scenario generation campaign", () => {
  test("selects one whole revision and stops only after minimum readiness", async () => {
    const inputs: string[] = [];
    const agents: ScenarioCampaignAgents = {
      generate: vi.fn(async (input) => {
        inputs.push(
          input.priorRevision.tag === "initial"
            ? "start"
            : input.priorRevision.prose,
        );
        return {
          candidates: [
            `iteration ${input.iteration} candidate A`,
            `iteration ${input.iteration} candidate B`,
            `iteration ${input.iteration} candidate C`,
          ],
        };
      }),
      reviewReadiness: vi
        .fn()
        .mockResolvedValueOnce({ decision: "ready" })
        .mockResolvedValueOnce({ decision: "ready" }),
      reviewRaw: vi.fn(async () => ({
        classification: "supported",
        evidence: "Synthetic RAW evidence.",
      })),
      reviewContent: vi.fn(async () => ({
        classification: "supplied",
        evidence: "Synthetic content evidence.",
      })),
      reviewSdkCapability: vi.fn(async () => ({
        classification: "supported",
        evidence: "Synthetic SDK evidence.",
      })),
      reviewPolicy: vi.fn(async () => ({
        classification: "safe",
        evidence: "Synthetic policy evidence.",
      })),
    };

    const result = await runScenarioCampaign(config, agents, {
      select: () => 1,
    });

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toMatchObject({
        scenario: "iteration 2 candidate B",
        iterations: 2,
        stopReason: "ready",
      });
    }
    expect(inputs).toEqual(["start", "iteration 1 candidate B"]);
    expect(agents.reviewReadiness).toHaveBeenCalledTimes(1);
    expect(agents.reviewReadiness).toHaveBeenCalledWith({
      scenario: "iteration 2 candidate B",
      distributionPreference: config.distributionPreference,
      contentAvailabilityIntent: "availableOnly",
      sdkCapabilityIntent: "supportedOnly",
    });
    expect(agents.reviewRaw).toHaveBeenCalledTimes(2);
  });

  test("carries critiques forward, stops at maximum, and can admit unsupported prose", async () => {
    const generationInputs: unknown[] = [];
    const result = await runScenarioCampaign(
      { ...config, minimumIterations: 1, admitReviewedUnsupported: true },
      {
        generate: async (input) => {
          generationInputs.push(input);
          return {
            candidates: Array.from(
              { length: input.candidateCount },
              (_, index) => `iteration ${input.iteration} candidate ${index}`,
            ),
          };
        },
        reviewReadiness: async () => ({
          decision: "continue",
          critique: "Add another meaningful tactical constraint.",
        }),
        reviewRaw: async (_scenario, final) =>
          final
            ? {
                classification: "unsupported",
                evidence: "Synthetic review evidence.",
                critique: "Clarify the unsupported request without erasing it.",
              }
            : {
                classification: "unsupported",
                evidence: "Synthetic milestone evidence.",
                critique: "Clarify the unsupported request without erasing it.",
              },
        reviewContent: async () => ({
          classification: "supplied",
          evidence: "Synthetic content evidence.",
        }),
        reviewSdkCapability: async () => ({
          classification: "supported",
          evidence: "Synthetic SDK evidence.",
        }),
        reviewPolicy: async () => ({
          classification: "safe",
          evidence: "Synthetic policy evidence.",
        }),
      },
      { select: (count) => count - 1 },
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toMatchObject({
        iterations: 4,
        stopReason: "maximum",
        rawReview: { classification: "unsupported" },
      });
      expect(finalScenarioDisposition(result.right)).toBe("admitted");
    }
    expect(generationInputs[2]).toMatchObject({
      priorRevision: {
        tag: "selected",
        prose: "iteration 2 candidate 2",
        critiques: ["Clarify the unsupported request without erasing it."],
      },
    });
  });

  test("rejects invalid bounds and batches while preserving rejected final reviews", async () => {
    const reviewRaw = vi.fn(async () => ({
      classification: "contradictory" as const,
      evidence: "Synthetic contradiction.",
      critique: "Preserve the contradiction for operator disposition.",
    }));
    const agents: ScenarioCampaignAgents = {
      generate: async (input) => ({
        candidates: Array.from(
          { length: input.candidateCount },
          (_, index) => `candidate ${index}`,
        ),
      }),
      reviewReadiness: async () => ({ decision: "ready" }),
      reviewRaw,
      reviewContent: async () => ({
        classification: "supplied",
        evidence: "Synthetic content evidence.",
      }),
      reviewSdkCapability: async () => ({
        classification: "supported",
        evidence: "Synthetic SDK evidence.",
      }),
      reviewPolicy: async () => ({
        classification: "safe",
        evidence: "Synthetic policy evidence.",
      }),
    };

    expect(
      Either.isLeft(
        await runScenarioCampaign({ ...config, minimumIterations: 5 }, agents, {
          select: () => 0,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        await runScenarioCampaign({ ...config, reviewMilestones: [] }, agents, {
          select: () => 0,
        }),
      ),
    ).toBe(true);
    const result = await runScenarioCampaign(config, agents, {
      select: () => 0,
    });
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(finalScenarioDisposition(result.right)).toBe("rejected");
      expect(result.right.rawReview.classification).toBe("contradictory");
    }
    expect(reviewRaw).toHaveBeenCalled();

    const contradictoryWithUnsupportedAdmission = await runScenarioCampaign(
      { ...config, admitReviewedUnsupported: true },
      agents,
      { select: () => 0 },
    );
    expect(Either.isRight(contradictoryWithUnsupportedAdmission)).toBe(true);
    if (Either.isRight(contradictoryWithUnsupportedAdmission)) {
      expect(
        finalScenarioDisposition(contradictoryWithUnsupportedAdmission.right),
      ).toBe("rejected");
    }

    const unavailableScenario = await runScenarioCampaign(
      { ...config, admitReviewedUnsupported: true },
      {
        ...agents,
        reviewRaw: async () => ({
          classification: "supported",
          evidence: "The selected identity is RAW.",
        }),
        reviewContent: async () => ({
          classification: "invalidUnavailableSelection",
          evidence: "The author selected content outside the supplied profile.",
          critique: "Select an available record.",
        }),
      },
      { select: () => 0 },
    );
    expect(Either.isRight(unavailableScenario)).toBe(true);
    if (Either.isRight(unavailableScenario)) {
      expect(finalScenarioDisposition(unavailableScenario.right)).toBe(
        "rejected",
      );
      expect(unavailableScenario.right.contentReview.classification).toBe(
        "invalidUnavailableSelection",
      );
    }

    expect(
      Either.isLeft(
        await runScenarioCampaign(
          config,
          {
            ...agents,
            reviewContent: async () => ({
              classification: "explicitUnavailableProbe",
              evidence:
                "This result cannot belong to an available-only campaign.",
            }),
          },
          { select: () => 0 },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        await runScenarioCampaign(
          { ...config, contentAvailabilityIntent: "probeUnavailableContent" },
          agents,
          { select: () => 0 },
        ),
      ),
    ).toBe(true);

    const deliberateProbe = await runScenarioCampaign(
      {
        ...config,
        contentAvailabilityIntent: "probeUnavailableContent",
      },
      {
        ...agents,
        reviewRaw: async () => ({
          classification: "supported",
          evidence: "The selected identity is RAW.",
        }),
        reviewContent: async () => ({
          classification: "explicitUnavailableProbe",
          evidence:
            "The unavailable identity is explicitly the campaign's probe.",
        }),
      },
      { select: () => 0 },
    );
    expect(Either.isRight(deliberateProbe)).toBe(true);
    if (Either.isRight(deliberateProbe)) {
      expect(finalScenarioDisposition(deliberateProbe.right)).toBe("admitted");
    }

    const duplicateBatch = await runScenarioCampaign(
      config,
      {
        ...agents,
        generate: async () => ({ candidates: ["same", "same", "same"] }),
      },
      { select: () => 0 },
    );
    expect(Either.isLeft(duplicateBatch)).toBe(true);
  });

  test("carries an invalid unavailable-selection critique in probe campaigns", async () => {
    const generationInputs: unknown[] = [];
    const agents: ScenarioCampaignAgents = {
      generate: async (input) => {
        generationInputs.push(input);
        return {
          candidates: Array.from(
            { length: input.candidateCount },
            (_, index) => `probe candidate ${input.iteration}-${index}`,
          ),
        };
      },
      reviewReadiness: async () => ({ decision: "ready" }),
      reviewRaw: async () => ({
        classification: "supported",
        evidence: "Synthetic RAW evidence.",
      }),
      reviewContent: vi
        .fn()
        .mockResolvedValueOnce({
          classification: "invalidUnavailableSelection",
          evidence: "Unavailable selection was accidental.",
          critique: "State the availability probe explicitly.",
        })
        .mockResolvedValue({
          classification: "explicitUnavailableProbe",
          evidence: "The revised prose states the probe.",
        }),
      reviewSdkCapability: async () => ({
        classification: "supported",
        evidence: "Synthetic SDK evidence.",
      }),
      reviewPolicy: async () => ({
        classification: "safe",
        evidence: "Synthetic policy evidence.",
      }),
    };

    await runScenarioCampaign(
      {
        ...config,
        contentAvailabilityIntent: "probeUnavailableContent",
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestones: [1],
      },
      agents,
      { select: () => 0 },
    );

    expect(generationInputs[1]).toMatchObject({
      priorRevision: {
        critiques: ["State the availability probe explicitly."],
      },
    });
  });

  test("carries a missing availability-probe critique into the next revision", async () => {
    const generationInputs: unknown[] = [];
    const agents: ScenarioCampaignAgents = {
      generate: async (input) => {
        generationInputs.push(input);
        return {
          candidates: Array.from(
            { length: input.candidateCount },
            (_, index) => `missing probe candidate ${input.iteration}-${index}`,
          ),
        };
      },
      reviewReadiness: async () => ({ decision: "ready" }),
      reviewRaw: async () => ({
        classification: "supported",
        evidence: "Synthetic RAW evidence.",
      }),
      reviewContent: vi
        .fn()
        .mockResolvedValueOnce({
          classification: "missingUnavailableProbe",
          evidence: "Every selected record is supplied.",
          critique: "Add and explicitly name the intended availability probe.",
        })
        .mockResolvedValue({
          classification: "explicitUnavailableProbe",
          evidence: "The revised prose states the probe.",
        }),
      reviewSdkCapability: async () => ({
        classification: "supported",
        evidence: "Synthetic SDK evidence.",
      }),
      reviewPolicy: async () => ({
        classification: "safe",
        evidence: "Synthetic policy evidence.",
      }),
    };

    await runScenarioCampaign(
      {
        ...config,
        contentAvailabilityIntent: "probeUnavailableContent",
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestones: [1],
      },
      agents,
      { select: () => 0 },
    );

    expect(generationInputs[1]).toMatchObject({
      priorRevision: {
        critiques: ["Add and explicitly name the intended availability probe."],
      },
    });
  });

  test("rejects malformed reviews and mismatched retained artifact identity", () => {
    expect(codexOutputJsonSchema(ScenarioRawReviewSchema)).toMatchObject({
      type: "object",
      required: ["result"],
    });
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(ScenarioRawReviewSchema, {
          onExcessProperty: "error",
        })({
          classification: "supported",
          evidence: "Evidence",
          critique: "No",
        }),
      ),
    ).toBe(true);
    const scenarioBytes = "# Synthetic battle\n";
    const scenarioId =
      Schema.decodeUnknownSync(ScenarioIdSchema)("synthetic-battle");
    const gitSha = Schema.decodeUnknownSync(GitShaSchema)("a".repeat(40));
    const review = {
      scenarioId,
      scenarioSha256: createHash("sha256").update(scenarioBytes).digest("hex"),
      gitSha,
      reviewScope: "rawContentSdkCapabilityPolicy",
      contentAvailabilityIntent: "availableOnly",
      sdkCapabilityIntent: "supportedOnly",
      admitReviewedUnsupported: false,
      rawReview: { classification: "supported", evidence: "Local RAW." },
      contentReview: {
        classification: "supplied",
        evidence: "Local catalog.",
      },
      sdkCapabilityReview: {
        classification: "supported",
        evidence: "Current public SDK.",
      },
      policyReview: { classification: "safe", evidence: "Local policy." },
    };

    expect(
      Either.isRight(
        verifyFinalScenarioReview(review, {
          scenarioId,
          gitSha,
          scenarioBytes,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          {
            ...review,
            contentReview: {
              classification: "explicitUnavailableProbe",
              evidence: "Mismatched intent.",
            },
          },
          { scenarioId, gitSha, scenarioBytes },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          {
            ...review,
            contentAvailabilityIntent: "probeUnavailableContent",
          },
          { scenarioId, gitSha, scenarioBytes },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          {
            ...review,
            contentReview: { classification: "invalid-spelling" },
          },
          { scenarioId, gitSha, scenarioBytes },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(review, {
          scenarioId,
          gitSha: Schema.decodeUnknownSync(GitShaSchema)("b".repeat(40)),
          scenarioBytes,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        verifyFinalScenarioReview(
          {
            ...review,
            rawReview: {
              classification: "contradictory",
              evidence: "Conflict",
              critique: "Reject",
            },
          },
          { scenarioId, gitSha, scenarioBytes },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          { ...review, disposition: "admitted" },
          { scenarioId, gitSha, scenarioBytes },
        ),
      ),
    ).toBe(true);
    expect(retentionRevisionMatches(gitSha, { tag: "dirty" })).toBe(false);
    expect(
      retentionRevisionMatches(gitSha, {
        tag: "clean",
        sha: "b".repeat(40),
      }),
    ).toBe(false);
  });

  test("feeds accidental unsupported SDK capability back and rejects it", async () => {
    const generationInputs: unknown[] = [];
    const reviewSdkCapability = vi
      .fn()
      .mockResolvedValueOnce({
        classification: "unsupported",
        evidence: "The current public SDK cannot represent elevation.",
        critique: "Remove elevation-dependent mechanics.",
      })
      .mockResolvedValue({
        classification: "unsupported",
        evidence: "The current public SDK cannot represent elevation.",
        critique: "Remove elevation-dependent mechanics.",
      });
    const result = await runScenarioCampaign(
      {
        ...config,
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestones: [1],
      },
      {
        generate: async (input) => {
          generationInputs.push(input);
          return {
            candidates: Array.from(
              { length: input.candidateCount },
              (_, index) => `SDK candidate ${input.iteration}-${index}`,
            ),
          };
        },
        reviewReadiness: async () => ({ decision: "ready" }),
        reviewRaw: async () => ({
          classification: "supported",
          evidence: "Synthetic RAW evidence.",
        }),
        reviewContent: async () => ({
          classification: "supplied",
          evidence: "Synthetic content evidence.",
        }),
        reviewSdkCapability,
        reviewPolicy: async () => ({
          classification: "safe",
          evidence: "Synthetic policy evidence.",
        }),
      },
      { select: () => 0 },
    );

    expect(generationInputs[1]).toMatchObject({
      priorRevision: { critiques: ["Remove elevation-dependent mechanics."] },
    });
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(finalScenarioDisposition(result.right)).toBe("rejected");
    }
  });

  test("admits only an explicit unsupported SDK probe for probe intent", async () => {
    const baseAgents: ScenarioCampaignAgents = {
      generate: async (input) => ({
        candidates: Array.from(
          { length: input.candidateCount },
          (_, index) => `probe ${index}`,
        ),
      }),
      reviewReadiness: async () => ({ decision: "ready" }),
      reviewRaw: async () => ({
        classification: "supported",
        evidence: "Synthetic RAW evidence.",
      }),
      reviewContent: async () => ({
        classification: "supplied",
        evidence: "Synthetic content evidence.",
      }),
      reviewSdkCapability: async () => ({
        classification: "explicitUnsupportedProbe",
        evidence: "The scenario explicitly probes unsupported elevation.",
      }),
      reviewPolicy: async () => ({
        classification: "safe",
        evidence: "Synthetic policy evidence.",
      }),
    };
    const probeConfig = {
      ...config,
      sdkCapabilityIntent: "probeUnsupportedCapability",
    } as const;
    const probe = await runScenarioCampaign(probeConfig, baseAgents, {
      select: () => 0,
    });
    expect(Either.isRight(probe)).toBe(true);
    if (Either.isRight(probe)) {
      expect(finalScenarioDisposition(probe.right)).toBe("admitted");
    }

    const nowSupported = await runScenarioCampaign(
      probeConfig,
      {
        ...baseAgents,
        reviewSdkCapability: async () => ({
          classification: "missingUnsupportedProbe",
          evidence: "The current SDK now supports every requested mechanic.",
          critique: "Choose a capability that remains unsupported.",
        }),
      },
      { select: () => 0 },
    );
    expect(Either.isRight(nowSupported)).toBe(true);
    if (Either.isRight(nowSupported)) {
      expect(finalScenarioDisposition(nowSupported.right)).toBe("rejected");
    }
  });
});
