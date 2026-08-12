import { createHash } from "node:crypto";
import { Either, Schema } from "effect";
import { describe, expect, test, vi } from "vitest";

import {
  runScenarioCampaign,
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
  minimumIterations: 2,
  maximumIterations: 4,
  candidatesPerIteration: 3,
  rawReviewMilestones: [2],
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
        disposition: "admitted",
        finalRawReview: { classification: "unsupported" },
      });
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
    const result = await runScenarioCampaign(config, agents, {
      select: () => 0,
    });
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.disposition).toBe("rejected");
      expect(result.right.finalRawReview.classification).toBe("contradictory");
    }
    expect(reviewRaw).toHaveBeenCalled();

    const contradictoryWithUnsupportedAdmission = await runScenarioCampaign(
      { ...config, admitReviewedUnsupported: true },
      agents,
      { select: () => 0 },
    );
    expect(Either.isRight(contradictoryWithUnsupportedAdmission)).toBe(true);
    if (Either.isRight(contradictoryWithUnsupportedAdmission)) {
      expect(contradictoryWithUnsupportedAdmission.right.disposition).toBe(
        "rejected",
      );
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

  test("rejects malformed reviews and mismatched retained artifact identity", () => {
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
      disposition: "admitted",
      rawReview: { classification: "supported", evidence: "Local RAW." },
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
        verifyFinalScenarioReview(review, {
          scenarioId,
          gitSha: Schema.decodeUnknownSync(GitShaSchema)("b".repeat(40)),
          scenarioBytes,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          {
            ...review,
            disposition: "admitted",
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
          { ...review, disposition: "rejected" },
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
});
