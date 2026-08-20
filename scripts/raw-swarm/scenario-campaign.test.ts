import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Either, Schema } from "effect";
import { describe, expect, test, vi } from "vitest";

import {
  runScenarioCampaign,
  codexOutputJsonSchema,
  finalScenarioDisposition,
  retentionRevisionMatches,
  ScenarioCampaignConfigSchema,
  ScenarioRawReviewSchema,
  verifyFinalScenarioReview,
  type ScenarioCampaignAgents,
} from "./scenario-campaign.ts";
import { GitShaSchema, repoRoot, ScenarioIdSchema } from "./transcript.ts";
import { publishScenarioAdmissionBundle } from "./generate-scenario.ts";

test("rolls back every admitted path when bundle publication fails", () => {
  const root = mkdtempSync(resolve(tmpdir(), "scenario-admission-"));
  const staged = resolve(root, "staged");
  const admitted = resolve(root, "admitted");
  mkdirSync(staged);
  mkdirSync(admitted);
  const names = [
    "scenario.md",
    "review.json",
    "facts.json",
    "plan.json",
    "findings.json",
    "scenario.json",
  ] as const;
  for (const name of names.filter((name) => name !== "facts.json")) {
    writeFileSync(resolve(staged, name), name);
  }
  const pair = (name: (typeof names)[number]) =>
    [resolve(staged, name), resolve(admitted, name)] as const;
  try {
    expect(() =>
      publishScenarioAdmissionBundle({
        prose: pair("scenario.md"),
        review: pair("review.json"),
        stageFacts: pair("facts.json"),
        stagePlan: pair("plan.json"),
        stagePlanFindings: pair("findings.json"),
        scenarioRecord: pair("scenario.json"),
      }),
    ).toThrow();
    expect(names.some((name) => existsSync(resolve(admitted, name)))).toBe(
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

const config = {
  campaignId: "synthetic-battle-campaign",
  plannedScenarioId: "synthetic-battle",
  scenarioTitle: "Synthetic battle",
  scenarioPurpose: "Exercise the scenario campaign in synthetic tests.",
  evidenceSetId: "synthetic-battle-authoring-evidence",
  distributionPreference:
    "Vary battle tactics and delegated character choices.",
  contentAvailabilityIntent: "availableOnly",
  sdkCapabilityIntent: "supportedOnly",
  minimumIterations: 2,
  maximumIterations: 4,
  candidatesPerIteration: 3,
  reviewMilestone: 2,
  admitReviewedUnsupported: false,
};

const stageFacts = {
  schemaVersion: 1 as const,
  characterRequirement: {
    tag: "characterSheetsRequired" as const,
    evidence: "Synthetic delegated character fact.",
  },
  spatialRequirement: {
    tag: "notRequired" as const,
    evidence: "Synthetic test does not need a spatial witness.",
  },
};

const candidate = (prose: string, facts = stageFacts) => ({
  prose,
  stageFacts: facts,
});

const readyQuality = {
  scenarioQuality: {
    classification: "ready" as const,
    evidence: "The synthetic setup and objectives are mechanically meaningful.",
  },
};

describe("scenario generation campaign", () => {
  test("decodes every checked-in campaign configuration strictly", () => {
    for (const path of [
      "scripts/raw-swarm/scenario-campaign.example.json",
      "scripts/raw-swarm/scenario-campaign-open-grid-wolf-skeleton-pursuit.json",
    ]) {
      const decoded = Schema.decodeUnknownEither(ScenarioCampaignConfigSchema, {
        onExcessProperty: "error",
      })(JSON.parse(readFileSync(resolve(repoRoot, path), "utf8")));
      expect(Either.isRight(decoded), path).toBe(true);
    }
  });
  test("rejects an incoherent candidate before invoking whole-scenario review", async () => {
    const incoherentFacts = {
      ...stageFacts,
      spatialRequirement: {
        tag: "outsideExperimentEnvelope" as const,
        resolution: "incoherent" as const,
        evidence: "The candidate contradicts its own spatial objective.",
      },
    };
    const reviewScenario = vi.fn();
    const result = await runScenarioCampaign(
      {
        ...config,
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestone: 1,
      },
      {
        generate: async () => ({
          candidates: [
            candidate("incoherent candidate", incoherentFacts),
            candidate("other candidate", incoherentFacts),
            candidate("third candidate", incoherentFacts),
          ],
        }),
        reviewScenario,
      },
      { select: () => 0 },
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.tag).toBe("candidateRejected");
      if (result.right.tag === "candidateRejected") {
        expect(result.right.candidateStagePlan.outcome.tag).toBe("rejected");
        expect(result.right.candidateStagePlan.identity).toMatchObject({
          tag: "candidate",
          campaignId: "synthetic-battle-campaign",
          candidateId: expect.stringMatching(
            /^candidate-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
          ),
          candidateScenarioSha256: createHash("sha256")
            .update("incoherent candidate\n")
            .digest("hex"),
        });
        expect(
          result.right.candidateStagePlan.stages.find(
            ({ stage }) => stage === "scenarioCompositeReview",
          )?.modelInvocation,
        ).toBe("none");
      }
    }
    expect(reviewScenario).not.toHaveBeenCalled();
  });

  test("selects one whole revision and stops only after minimum composite review", async () => {
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
            candidate(`iteration ${input.iteration} candidate A`),
            candidate(`iteration ${input.iteration} candidate B`),
            candidate(`iteration ${input.iteration} candidate C`),
          ],
        };
      }),
      reviewScenario: vi.fn(async () => ({
        raw: {
          classification: "supported",
          evidence: "Synthetic RAW evidence.",
        },
        contentAvailability: {
          classification: "supplied",
          evidence: "Synthetic content evidence.",
        },
        sdkCapability: {
          classification: "supported",
          evidence: "Synthetic SDK evidence.",
        },
        artifactPolicy: {
          classification: "safe",
          evidence: "Synthetic policy evidence.",
        },
        ...readyQuality,
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
    expect(agents.reviewScenario).toHaveBeenCalledTimes(2);
  });

  test("carries composite critiques forward without a duplicate readiness invocation", async () => {
    const generationInputs: unknown[] = [];
    const result = await runScenarioCampaign(
      { ...config, minimumIterations: 1, admitReviewedUnsupported: true },
      {
        generate: async (input) => {
          generationInputs.push(input);
          return {
            candidates: Array.from(
              { length: input.candidateCount },
              (_, index) =>
                candidate(`iteration ${input.iteration} candidate ${index}`),
            ),
          };
        },
        reviewScenario: async ({ finalReview }) => ({
          raw: finalReview
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
          contentAvailability: {
            classification: "supplied",
            evidence: "Synthetic content evidence.",
          },
          sdkCapability: {
            classification: "supported",
            evidence: "Synthetic SDK evidence.",
          },
          artifactPolicy: {
            classification: "safe",
            evidence: "Synthetic policy evidence.",
          },
          ...readyQuality,
        }),
      },
      { select: (count) => count - 1 },
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toMatchObject({
        iterations: 3,
        stopReason: "ready",
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

  test("retains scenario-quality critique in the consolidated review path", async () => {
    const generationInputs: unknown[] = [];
    let reviewCount = 0;
    const result = await runScenarioCampaign(
      {
        ...config,
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestone: 1,
      },
      {
        generate: async (input) => {
          generationInputs.push(input);
          return {
            candidates: Array.from(
              { length: input.candidateCount },
              (_, index) =>
                candidate(`quality candidate ${input.iteration}-${index}`),
            ),
          };
        },
        reviewScenario: async () => {
          reviewCount += 1;
          return {
            raw: {
              classification: "supported" as const,
              evidence: "Synthetic RAW evidence.",
            },
            contentAvailability: {
              classification: "supplied" as const,
              evidence: "Synthetic content evidence.",
            },
            sdkCapability: {
              classification: "supported" as const,
              evidence: "Synthetic SDK evidence.",
            },
            artifactPolicy: {
              classification: "safe" as const,
              evidence: "Synthetic policy evidence.",
            },
            scenarioQuality:
              reviewCount === 1
                ? {
                    classification: "needsRevision" as const,
                    evidence:
                      "The first revision lacks an objective-bearing setup.",
                    critique:
                      "Give every combatant a strategy-bearing objective.",
                  }
                : readyQuality.scenarioQuality,
          };
        },
      },
      { select: () => 0 },
    );
    expect(Either.isRight(result)).toBe(true);
    expect(reviewCount).toBe(2);
    expect(generationInputs[1]).toMatchObject({
      priorRevision: {
        critiques: ["Give every combatant a strategy-bearing objective."],
      },
    });
  });

  test("rejects invalid bounds and batches while preserving rejected final reviews", async () => {
    const reviewScenario = vi.fn(async () => ({
      raw: {
        classification: "contradictory" as const,
        evidence: "Synthetic contradiction.",
        critique: "Preserve the contradiction for operator disposition.",
      },
      contentAvailability: {
        classification: "supplied" as const,
        evidence: "Synthetic content evidence.",
      },
      sdkCapability: {
        classification: "supported" as const,
        evidence: "Synthetic SDK evidence.",
      },
      artifactPolicy: {
        classification: "safe" as const,
        evidence: "Synthetic policy evidence.",
      },
      ...readyQuality,
    }));
    const agents: ScenarioCampaignAgents = {
      generate: async (input) => ({
        candidates: Array.from({ length: input.candidateCount }, (_, index) =>
          candidate(`candidate ${index}`),
        ),
      }),
      reviewScenario,
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
        await runScenarioCampaign({ ...config, reviewMilestone: 0 }, agents, {
          select: () => 0,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        await runScenarioCampaign(
          {
            ...config,
            reviewMilestones: [1],
          },
          agents,
          { select: () => 0 },
        ),
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
    expect(reviewScenario).toHaveBeenCalled();

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
        reviewScenario: async () => ({
          raw: {
            classification: "supported",
            evidence: "The selected identity is RAW.",
          },
          contentAvailability: {
            classification: "invalidUnavailableSelection",
            evidence:
              "The author selected content outside the supplied profile.",
            critique: "Select an available record.",
          },
          sdkCapability: {
            classification: "supported",
            evidence: "Synthetic SDK evidence.",
          },
          artifactPolicy: {
            classification: "safe",
            evidence: "Synthetic policy evidence.",
          },
          ...readyQuality,
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
            reviewScenario: async () => ({
              raw: {
                classification: "supported",
                evidence: "Synthetic RAW evidence.",
              },
              contentAvailability: {
                classification: "explicitUnavailableProbe",
                evidence:
                  "This result cannot belong to an available-only campaign.",
              },
              sdkCapability: {
                classification: "supported",
                evidence: "Synthetic SDK evidence.",
              },
              artifactPolicy: {
                classification: "safe",
                evidence: "Synthetic policy evidence.",
              },
              ...readyQuality,
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
        reviewScenario: async () => ({
          raw: {
            classification: "supported",
            evidence: "The selected identity is RAW.",
          },
          contentAvailability: {
            classification: "explicitUnavailableProbe",
            evidence:
              "The unavailable identity is explicitly the campaign's probe.",
          },
          sdkCapability: {
            classification: "supported",
            evidence: "Synthetic SDK evidence.",
          },
          artifactPolicy: {
            classification: "safe",
            evidence: "Synthetic policy evidence.",
          },
          ...readyQuality,
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
        generate: async () => ({
          candidates: [candidate("same"), candidate("same"), candidate("same")],
        }),
      },
      { select: () => 0 },
    );
    expect(Either.isLeft(duplicateBatch)).toBe(true);
  });

  test("carries an invalid unavailable-selection critique in probe campaigns", async () => {
    const generationInputs: unknown[] = [];
    const reviewContent = vi
      .fn()
      .mockResolvedValueOnce({
        classification: "invalidUnavailableSelection",
        evidence: "Unavailable selection was accidental.",
        critique: "State the availability probe explicitly.",
      })
      .mockResolvedValue({
        classification: "explicitUnavailableProbe",
        evidence: "The revised prose states the probe.",
      });
    const agents: ScenarioCampaignAgents = {
      generate: async (input) => {
        generationInputs.push(input);
        return {
          candidates: Array.from({ length: input.candidateCount }, (_, index) =>
            candidate(`probe candidate ${input.iteration}-${index}`),
          ),
        };
      },
      reviewScenario: async () => ({
        raw: {
          classification: "supported",
          evidence: "Synthetic RAW evidence.",
        },
        contentAvailability: await reviewContent(),
        sdkCapability: {
          classification: "supported",
          evidence: "Synthetic SDK evidence.",
        },
        artifactPolicy: {
          classification: "safe",
          evidence: "Synthetic policy evidence.",
        },
        ...readyQuality,
      }),
    };

    await runScenarioCampaign(
      {
        ...config,
        contentAvailabilityIntent: "probeUnavailableContent",
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestone: 1,
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
    const reviewContent = vi
      .fn()
      .mockResolvedValueOnce({
        classification: "missingUnavailableProbe",
        evidence: "Every selected record is supplied.",
        critique: "Add and explicitly name the intended availability probe.",
      })
      .mockResolvedValue({
        classification: "explicitUnavailableProbe",
        evidence: "The revised prose states the probe.",
      });
    const agents: ScenarioCampaignAgents = {
      generate: async (input) => {
        generationInputs.push(input);
        return {
          candidates: Array.from({ length: input.candidateCount }, (_, index) =>
            candidate(`missing probe candidate ${input.iteration}-${index}`),
          ),
        };
      },
      reviewScenario: async () => ({
        raw: {
          classification: "supported",
          evidence: "Synthetic RAW evidence.",
        },
        contentAvailability: await reviewContent(),
        sdkCapability: {
          classification: "supported",
          evidence: "Synthetic SDK evidence.",
        },
        artifactPolicy: {
          classification: "safe",
          evidence: "Synthetic policy evidence.",
        },
        ...readyQuality,
      }),
    };

    await runScenarioCampaign(
      {
        ...config,
        contentAvailabilityIntent: "probeUnavailableContent",
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestone: 1,
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
    const currentReview = {
      ...review,
      reviewScope: "rawContentSdkCapabilityPolicyQuality" as const,
      scenarioQuality: readyQuality.scenarioQuality,
    };
    expect(
      Either.isRight(
        verifyFinalScenarioReview(currentReview, {
          scenarioId,
          gitSha,
          scenarioBytes,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          { ...currentReview, scenarioQuality: undefined },
          { scenarioId, gitSha, scenarioBytes },
        ),
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
        reviewMilestone: 1,
      },
      {
        generate: async (input) => {
          generationInputs.push(input);
          return {
            candidates: Array.from(
              { length: input.candidateCount },
              (_, index) =>
                candidate(`SDK candidate ${input.iteration}-${index}`),
            ),
          };
        },
        reviewScenario: async () => ({
          raw: {
            classification: "supported",
            evidence: "Synthetic RAW evidence.",
          },
          contentAvailability: {
            classification: "supplied",
            evidence: "Synthetic content evidence.",
          },
          sdkCapability: await reviewSdkCapability(),
          artifactPolicy: {
            classification: "safe",
            evidence: "Synthetic policy evidence.",
          },
          ...readyQuality,
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
        candidates: Array.from({ length: input.candidateCount }, (_, index) =>
          candidate(`probe ${index}`),
        ),
      }),
      reviewScenario: async () => ({
        raw: {
          classification: "supported",
          evidence: "Synthetic RAW evidence.",
        },
        contentAvailability: {
          classification: "supplied",
          evidence: "Synthetic content evidence.",
        },
        sdkCapability: {
          classification: "explicitUnsupportedProbe",
          evidence: "The scenario explicitly probes unsupported elevation.",
        },
        artifactPolicy: {
          classification: "safe",
          evidence: "Synthetic policy evidence.",
        },
        ...readyQuality,
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
        reviewScenario: async () => ({
          raw: {
            classification: "supported",
            evidence: "Synthetic RAW evidence.",
          },
          contentAvailability: {
            classification: "supplied",
            evidence: "Synthetic content evidence.",
          },
          sdkCapability: {
            classification: "missingUnsupportedProbe",
            evidence: "The current SDK now supports every requested mechanic.",
            critique: "Choose a capability that remains unsupported.",
          },
          artifactPolicy: {
            classification: "safe",
            evidence: "Synthetic policy evidence.",
          },
          ...readyQuality,
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
