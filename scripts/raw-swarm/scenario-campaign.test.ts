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
import { relative, resolve } from "node:path";
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
import {
  GitShaSchema,
  repoRoot,
  ScenarioIdSchema,
  sha256Canonical,
} from "./transcript.ts";
import {
  publishScenarioAdmissionBundle,
  ingestPublishedScenarioAdmissionBundle,
  rollbackScenarioAdmissionBundle,
  rollbackScenarioRejectionBundle,
  publishScenarioRejectionBundle,
  retainCodexInvocationArtifacts,
} from "./generate-scenario.ts";
import { openArtifactIndex } from "./artifact-index.ts";
import {
  FindingsProjectionSchema,
  writeFindingsProjection,
} from "./findings.ts";
import {
  ScenarioCatalogueComparisonSchema,
  ScenarioCatalogueProjectionSchema,
} from "./scenario-authoring.ts";

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
    "stage-plan-findings.json",
    "scenario.json",
    "generation-findings.json",
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
        stagePlanFindings: pair("stage-plan-findings.json"),
        scenarioRecord: pair("scenario.json"),
        findings: pair("generation-findings.json"),
      }),
    ).toThrow();
    expect(names.some((name) => existsSync(resolve(admitted, name)))).toBe(
      false,
    );
    expect(
      names
        .filter((name) => name !== "facts.json")
        .every((name) => existsSync(resolve(staged, name))),
    ).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("creates absent admission destination parents before publication", () => {
  const root = mkdtempSync(
    resolve(repoRoot, "scripts/raw-swarm/.admission-destination-parent-"),
  );
  const staged = resolve(root, "staged");
  const admitted = resolve(root, "admitted");
  const admittedEvidence = resolve(admitted, "evidence");
  mkdirSync(staged);
  mkdirSync(admitted);
  const names = [
    "scenario.md",
    "review.json",
    "facts.json",
    "plan.json",
    "stage-plan-findings.json",
    "scenario.json",
    "findings.json",
  ] as const;
  for (const name of names) writeFileSync(resolve(staged, name), name);
  const pair = (name: (typeof names)[number]) =>
    [
      resolve(staged, name),
      name === "findings.json"
        ? resolve(admittedEvidence, name)
        : resolve(admitted, name),
    ] as const;
  try {
    const publication = publishScenarioAdmissionBundle({
      prose: pair("scenario.md"),
      review: pair("review.json"),
      stageFacts: pair("facts.json"),
      stagePlan: pair("plan.json"),
      stagePlanFindings: pair("stage-plan-findings.json"),
      scenarioRecord: pair("scenario.json"),
      findings: pair("findings.json"),
    });
    expect(names.every((name) => existsSync(pair(name)[1]))).toBe(true);
    rollbackScenarioAdmissionBundle(publication);
    expect(names.every((name) => existsSync(pair(name)[0]))).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("creates absent rejection destination parents before publication", () => {
  const root = mkdtempSync(
    resolve(repoRoot, "scripts/raw-swarm/.rejection-destination-parent-"),
  );
  const staged = resolve(root, "staged");
  const rejected = resolve(root, "rejected");
  const rejectedEvidence = resolve(rejected, "evidence");
  mkdirSync(staged);
  mkdirSync(rejected);
  const names = [
    "scenario.md",
    "candidate-review.json",
    "stage-plan.json",
    "stage-plan-findings.json",
    "candidate-rejection.json",
    "findings.json",
  ] as const;
  for (const name of names) writeFileSync(resolve(staged, name), name);
  const pair = (name: (typeof names)[number]) =>
    [
      resolve(staged, name),
      name === "findings.json"
        ? resolve(rejectedEvidence, name)
        : resolve(rejected, name),
    ] as const;
  try {
    const publication = publishScenarioRejectionBundle({
      prose: pair("scenario.md"),
      review: pair("candidate-review.json"),
      stagePlan: pair("stage-plan.json"),
      stagePlanFindings: pair("stage-plan-findings.json"),
      candidateRejection: pair("candidate-rejection.json"),
      findings: pair("findings.json"),
    });
    expect(names.every((name) => existsSync(pair(name)[1]))).toBe(true);
    rollbackScenarioRejectionBundle(publication);
    expect(names.every((name) => existsSync(pair(name)[0]))).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("retains a publication receipt for post-publication rollback", () => {
  const root = mkdtempSync(resolve(tmpdir(), "scenario-admission-receipt-"));
  const staged = resolve(root, "staged");
  const admitted = resolve(root, "admitted");
  mkdirSync(staged);
  mkdirSync(admitted);
  const names = [
    "scenario.md",
    "review.json",
    "facts.json",
    "plan.json",
    "stage-plan-findings.json",
    "scenario.json",
    "generation-findings.json",
  ] as const;
  for (const name of names) writeFileSync(resolve(staged, name), name);
  const pair = (name: (typeof names)[number]) =>
    [resolve(staged, name), resolve(admitted, name)] as const;
  try {
    const publication = publishScenarioAdmissionBundle({
      prose: pair("scenario.md"),
      review: pair("review.json"),
      stageFacts: pair("facts.json"),
      stagePlan: pair("plan.json"),
      stagePlanFindings: pair("stage-plan-findings.json"),
      scenarioRecord: pair("scenario.json"),
      findings: pair("generation-findings.json"),
    });
    expect(names.every((name) => existsSync(resolve(admitted, name)))).toBe(
      true,
    );
    rollbackScenarioAdmissionBundle(publication);
    expect(names.every((name) => existsSync(resolve(staged, name)))).toBe(true);
    expect(names.some((name) => existsSync(resolve(admitted, name)))).toBe(
      false,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rolls back admitted authorities and findings when ingestion fails", () => {
  const root = mkdtempSync(
    resolve(repoRoot, "scripts/raw-swarm/.scenario-admission-ingestion-"),
  );
  const staged = resolve(root, "staged");
  const admitted = resolve(root, "admitted");
  mkdirSync(staged);
  mkdirSync(admitted);
  try {
    const names = [
      "scenario.md",
      "review.json",
      "facts.json",
      "plan.json",
      "stage-plan-findings.json",
      "scenario.json",
      "generation-findings.json",
    ] as const;
    for (const name of names.filter(
      (name) => name !== "generation-findings.json",
    ))
      writeFileSync(resolve(staged, name), name);
    const pair = (name: (typeof names)[number]) =>
      [resolve(staged, name), resolve(admitted, name)] as const;
    const publicationInput = {
      prose: pair("scenario.md"),
      review: pair("review.json"),
      stageFacts: pair("facts.json"),
      stagePlan: pair("plan.json"),
      stagePlanFindings: pair("stage-plan-findings.json"),
      scenarioRecord: pair("scenario.json"),
      findings: pair("generation-findings.json"),
    } as const;
    const campaignPath = resolve(root, "campaign.json");
    const campaignValue = {
      type: "raw-swarm-scenario-campaign" as const,
      schemaVersion: 1 as const,
      campaignId: "generation-campaign",
      plannedScenarioId: "generation-example",
      evidenceSetId: "generation-evidence",
      gitSha: "a".repeat(40),
      startedAt: "2026-08-18T00:00:00.000Z",
      configSha256: "c".repeat(64),
    } as const;
    const campaignBytes = `${JSON.stringify(campaignValue)}\n`;
    writeFileSync(campaignPath, campaignBytes);
    const campaignAuthority = {
      role: "campaign",
      path: relative(repoRoot, campaignPath),
      byteLength: Buffer.byteLength(campaignBytes),
      sha256: createHash("sha256").update(campaignBytes).digest("hex"),
    };
    const subject = {
      tag: "scenarioCampaign" as const,
      campaignId: campaignValue.campaignId,
      evidenceSetId: campaignValue.evidenceSetId,
      plannedScenarioId: campaignValue.plannedScenarioId,
      gitSha: campaignValue.gitSha,
      startedAt: campaignValue.startedAt,
      sdkCalls: { tag: "transcriptFree" as const },
    };
    const findings = Schema.decodeUnknownSync(FindingsProjectionSchema)({
      type: "raw-swarm-findings",
      schemaVersion: 2,
      subjectIdentity: sha256Canonical(subject),
      subject,
      authorities: [campaignAuthority],
      findings: [],
    });
    writeFindingsProjection({
      projection: findings,
      path: resolve(staged, "generation-findings.json"),
    });
    const dbPath = resolve(root, "artifact-index.sqlite");
    const db = openArtifactIndex(relative(repoRoot, dbPath));
    db.prepare(
      "INSERT INTO scenarioCampaigns(subjectIdentity, campaignId, plannedScenarioId, evidenceSetId, gitSha, startedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(
      findings.subjectIdentity,
      "foreign-campaign",
      "foreign-planned",
      "foreign-evidence",
      "b".repeat(40),
      campaignValue.startedAt,
    );
    db.close();
    const publication = publishScenarioAdmissionBundle(publicationInput);
    expect(() =>
      ingestPublishedScenarioAdmissionBundle({
        publication,
        findingsPath: resolve(admitted, "generation-findings.json"),
        dbPath,
      }),
    ).toThrow();
    expect(names.some((name) => existsSync(resolve(admitted, name)))).toBe(
      false,
    );
    expect(names.every((name) => existsSync(resolve(staged, name)))).toBe(true);
    const rolledBackDb = openArtifactIndex(relative(repoRoot, dbPath));
    expect(
      rolledBackDb.prepare("SELECT COUNT(*) AS count FROM artifacts").get(),
    ).toEqual({ count: 0 });
    rolledBackDb.close();

    const retry = publishScenarioAdmissionBundle(publicationInput);
    expect(names.every((name) => existsSync(resolve(admitted, name)))).toBe(
      true,
    );
    rollbackScenarioAdmissionBundle(retry);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rolls back every rejected-candidate authority when publication fails", () => {
  const root = mkdtempSync(resolve(tmpdir(), "scenario-rejection-"));
  const staged = resolve(root, "staged");
  const rejected = resolve(root, "rejected");
  mkdirSync(staged);
  mkdirSync(rejected);
  const names = [
    "scenario.md",
    "candidate-review.json",
    "stage-plan.json",
    "stage-plan-findings.json",
    "candidate-rejection.json",
    "findings.json",
  ] as const;
  for (const name of names.filter((name) => name !== "stage-plan.json")) {
    writeFileSync(resolve(staged, name), name);
  }
  const pair = (name: (typeof names)[number]) =>
    [resolve(staged, name), resolve(rejected, name)] as const;
  try {
    expect(() =>
      publishScenarioRejectionBundle({
        prose: pair("scenario.md"),
        review: pair("candidate-review.json"),
        stagePlan: pair("stage-plan.json"),
        stagePlanFindings: pair("stage-plan-findings.json"),
        candidateRejection: pair("candidate-rejection.json"),
        findings: pair("findings.json"),
      }),
    ).toThrow();
    expect(names.some((name) => existsSync(resolve(rejected, name)))).toBe(
      false,
    );
    expect(
      names
        .filter((name) => name !== "stage-plan.json")
        .every((name) => existsSync(resolve(staged, name))),
    ).toBe(true);
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
  test("retains a settled failed-invocation sidecar beside the Campaign event stream", () => {
    const root = mkdtempSync(resolve(tmpdir(), "scenario-retained-sidecar-"));
    const sourceDirectory = resolve(root, "source");
    const retainedDirectory = resolve(root, "retained");
    mkdirSync(sourceDirectory);
    const eventPath = resolve(sourceDirectory, "events.jsonl");
    const rawPath = `${eventPath}.codex-raw`;
    const rawContents = Buffer.from("settled failed output\n", "utf8");
    writeFileSync(rawPath, rawContents);
    writeFileSync(
      eventPath,
      `${JSON.stringify({
        type: "raw-swarm.invocation.codex-raw-retained",
        source: "settledSidecar",
        reason: "failedInvocation",
        rawContentsSha256: createHash("sha256")
          .update(rawContents)
          .digest("hex"),
        rawContentsByteLength: rawContents.byteLength,
      })}\n`,
    );
    const retainedEventPath = resolve(retainedDirectory, "failed.events.jsonl");
    try {
      retainCodexInvocationArtifacts({ eventPath, retainedEventPath });
      expect(readFileSync(`${retainedEventPath}.codex-raw`)).toEqual(
        rawContents,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("retains an unreaped immutable snapshot beside the Campaign event stream", () => {
    const root = mkdtempSync(resolve(tmpdir(), "scenario-retained-snapshot-"));
    const sourceDirectory = resolve(root, "source");
    const retainedDirectory = resolve(root, "retained");
    mkdirSync(sourceDirectory);
    const eventPath = resolve(sourceDirectory, "events.jsonl");
    const snapshotPath = `${eventPath}.codex-raw.snapshot`;
    const snapshotContents = Buffer.from("observed unreaped bytes\n", "utf8");
    writeFileSync(snapshotPath, snapshotContents);
    writeFileSync(
      eventPath,
      `${JSON.stringify({
        type: "raw-swarm.invocation.codex-raw-retained",
        source: "observedImmutableSnapshot",
        reason: "unreapedProcess",
        snapshotPathSuffix: ".codex-raw.snapshot",
        snapshotSha256: createHash("sha256")
          .update(snapshotContents)
          .digest("hex"),
        snapshotByteLength: snapshotContents.byteLength,
      })}\n`,
    );
    const retainedEventPath = resolve(
      retainedDirectory,
      "unreaped.events.jsonl",
    );
    try {
      retainCodexInvocationArtifacts({ eventPath, retainedEventPath });
      expect(readFileSync(`${retainedEventPath}.codex-raw.snapshot`)).toEqual(
        snapshotContents,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

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
    const noAdmittedScenarios = { tag: "noAdmittedScenarios" } as const;

    expect(
      Either.isRight(
        verifyFinalScenarioReview(review, {
          scenarioId,
          gitSha,
          scenarioBytes,
          catalogue: noAdmittedScenarios,
        }),
      ),
    ).toBe(true);
    const currentReview = {
      ...review,
      reviewScope: "rawContentSdkCapabilityPolicyQuality" as const,
      scenarioQuality: readyQuality.scenarioQuality,
      catalogueComparison: {
        schemaVersion: 1 as const,
        conclusion: "meaningfullyDistinct" as const,
        comparedScenarioIds: [],
        closestMatches: [],
        materialDifferentiators: [],
        basis: { tag: "noAdmittedScenarios" as const },
      },
    };
    expect(
      Either.isRight(
        verifyFinalScenarioReview(currentReview, {
          scenarioId,
          gitSha,
          scenarioBytes,
          catalogue: noAdmittedScenarios,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          {
            ...currentReview,
            catalogueComparison: {
              schemaVersion: 1,
              conclusion: "meaningfullyDistinct",
              comparedScenarioIds: [scenarioId],
              closestMatches: [],
              materialDifferentiators: [],
              basis: {
                tag: "compared",
                batches: [
                  {
                    batchIndex: 0,
                    comparedScenarioIds: [scenarioId],
                    dimensions: {
                      exploratoryPurpose: "Self-authored evidence.",
                      materiallyRelevantMechanics: "Self-authored evidence.",
                      encounterComposition: "Self-authored evidence.",
                      interactionSequence: "Self-authored evidence.",
                      tacticalQuestion: "Self-authored evidence.",
                      sdkSupportBoundary: "Self-authored evidence.",
                      spatialContext: { tag: "notMaterial" },
                    },
                  },
                ],
              },
            },
          },
          { scenarioId, gitSha, scenarioBytes, catalogue: noAdmittedScenarios },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(currentReview, {
          scenarioId,
          gitSha,
          scenarioBytes,
          catalogue: {
            tag: "admittedScenarios",
            scenarioIds: [scenarioId],
            batches: [{ batchIndex: 0, scenarioIds: [scenarioId] }],
          },
        }),
      ),
    ).toBe(true);
    expect(
      finalScenarioDisposition({
        ...currentReview,
        catalogueComparison: {
          ...currentReview.catalogueComparison,
          conclusion: "purposefulOverlap",
          materialDifferentiators: [],
        },
      }),
    ).toBe("rejected");
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          { ...currentReview, scenarioQuality: undefined },
          { scenarioId, gitSha, scenarioBytes, catalogue: noAdmittedScenarios },
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
          { scenarioId, gitSha, scenarioBytes, catalogue: noAdmittedScenarios },
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
          { scenarioId, gitSha, scenarioBytes, catalogue: noAdmittedScenarios },
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
          { scenarioId, gitSha, scenarioBytes, catalogue: noAdmittedScenarios },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(review, {
          scenarioId,
          gitSha: Schema.decodeUnknownSync(GitShaSchema)("b".repeat(40)),
          scenarioBytes,
          catalogue: noAdmittedScenarios,
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
          { scenarioId, gitSha, scenarioBytes, catalogue: noAdmittedScenarios },
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        verifyFinalScenarioReview(
          { ...review, disposition: "admitted" },
          { scenarioId, gitSha, scenarioBytes, catalogue: noAdmittedScenarios },
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

  test("retains redundancy critique alongside stage-plan rejection guidance", async () => {
    const generationInputs: Array<{
      readonly priorRevision?: { readonly critiques: readonly string[] };
    }> = [];
    const incoherentFacts = {
      ...stageFacts,
      spatialRequirement: {
        tag: "outsideExperimentEnvelope" as const,
        resolution: "incoherent" as const,
        evidence: "The candidate contradicts its own spatial objective.",
      },
    };
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
                candidate(
                  `redundant incoherent ${input.iteration}-${index}`,
                  incoherentFacts,
                ),
            ),
          };
        },
        compareCandidate: async ({ batch, batchIndex }) =>
          Schema.decodeUnknownSync(ScenarioCatalogueComparisonSchema)({
            schemaVersion: 1,
            conclusion: "redundant",
            comparedScenarioIds: batch.map(({ scenarioId }) => scenarioId),
            closestMatches: [
              {
                scenarioId: batch[0]!.scenarioId,
                reason: "The admitted interaction sequence is repeated.",
              },
            ],
            materialDifferentiators: [],
            basis: {
              tag: "compared",
              batches: [
                {
                  batchIndex,
                  comparedScenarioIds: batch.map(
                    ({ scenarioId }) => scenarioId,
                  ),
                  dimensions: {
                    exploratoryPurpose: "Repeated purpose.",
                    materiallyRelevantMechanics: "Repeated mechanics.",
                    encounterComposition: "Repeated composition.",
                    interactionSequence: "Repeated sequence.",
                    tacticalQuestion: "Repeated question.",
                    sdkSupportBoundary: "Same support boundary.",
                    spatialContext: { tag: "notMaterial" },
                  },
                },
              ],
            },
          }),
        reviewScenario: async () => {
          throw new Error(
            "Stage-plan rejection must not invoke whole-scenario review.",
          );
        },
      },
      { select: () => 0 },
      {
        tag: "required",
        batches: [
          [
            Schema.decodeUnknownSync(ScenarioCatalogueProjectionSchema)({
              scenarioId: "admitted-synthetic-scenario",
              title: "Admitted synthetic scenario",
              purpose: "Explore a retained synthetic tactical question.",
              authoredSource: {
                path: "scripts/raw-swarm/sdk-player/scenarios/admitted-synthetic-scenario.md",
                byteLength: 128,
                sha256: "a".repeat(64),
              },
              characterRequirement: "characterSheetsRequired",
              spatialContext: "notRequired",
              contentAvailabilityIntent: "availableOnly",
              sdkSupportBoundary: "supportedOnly/supported",
            }),
          ],
        ],
        expectedScenarioIds: ["admitted-synthetic-scenario"],
      },
    );
    expect(Either.isRight(result)).toBe(true);
    expect(generationInputs[1]?.priorRevision?.critiques).toEqual(
      expect.arrayContaining([
        expect.stringContaining("outside the geometry experiment envelope"),
        expect.stringContaining("redundant with admitted Scenario"),
      ]),
    );
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

  test("compares every generated Candidate and revises a redundant selection", async () => {
    const projection = Schema.decodeUnknownSync(
      ScenarioCatalogueProjectionSchema,
    )({
      scenarioId: "admitted-synthetic-scenario",
      title: "Admitted synthetic scenario",
      purpose: "Explore a retained synthetic tactical question.",
      authoredSource: {
        path: "scripts/raw-swarm/sdk-player/scenarios/admitted-synthetic-scenario.md",
        byteLength: 128,
        sha256: "a".repeat(64),
      },
      characterRequirement: "characterSheetsRequired",
      spatialContext: "notRequired",
      contentAvailabilityIntent: "availableOnly",
      sdkSupportBoundary: "supportedOnly/supported",
    });
    const comparisons: Array<{ candidateIndex: number; scenarioId: string }> =
      [];
    let reviewComparison: { readonly conclusion: string } | undefined;
    const agents: ScenarioCampaignAgents = {
      generate: async (input) => ({
        candidates: Array.from({ length: input.candidateCount }, (_, index) =>
          candidate(`catalogue candidate ${input.iteration}-${index}`),
        ),
      }),
      compareCandidate: async ({ candidateIndex, batch, batchIndex }) => {
        comparisons.push({ candidateIndex, scenarioId: batch[0]!.scenarioId });
        return Schema.decodeUnknownSync(ScenarioCatalogueComparisonSchema)({
          schemaVersion: 1,
          conclusion:
            comparisons.length <= 3 ? "redundant" : "meaningfullyDistinct",
          comparedScenarioIds: batch.map(({ scenarioId }) => scenarioId),
          closestMatches:
            comparisons.length <= 3
              ? [
                  {
                    scenarioId: batch[0]!.scenarioId,
                    reason: "The synthetic interaction sequence is repeated.",
                  },
                ]
              : [],
          materialDifferentiators: [],
          basis: {
            tag: "compared",
            batches: [
              {
                batchIndex,
                comparedScenarioIds: batch.map(({ scenarioId }) => scenarioId),
                dimensions: {
                  exploratoryPurpose:
                    "The candidate asks the same first question.",
                  materiallyRelevantMechanics:
                    "The candidate repeats the mechanic.",
                  encounterComposition:
                    "The candidate keeps the encounter shape.",
                  interactionSequence: "The candidate repeats the sequence.",
                  tacticalQuestion:
                    "The candidate asks the same tactical question.",
                  sdkSupportBoundary:
                    "The candidate uses supported operations.",
                  spatialContext: { tag: "notMaterial" },
                },
              },
            ],
          },
        });
      },
      reviewScenario: async ({ catalogueComparison }) => {
        if (catalogueComparison.tag === "retained") {
          reviewComparison = catalogueComparison.comparison;
        }
        return {
          raw: { classification: "supported", evidence: "Synthetic RAW." },
          contentAvailability: {
            classification: "supplied",
            evidence: "Synthetic content.",
          },
          sdkCapability: {
            classification: "supported",
            evidence: "Synthetic SDK.",
          },
          artifactPolicy: {
            classification: "safe",
            evidence: "Synthetic policy.",
          },
          ...readyQuality,
        };
      },
    };
    const result = await runScenarioCampaign(
      {
        ...config,
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestone: 1,
      },
      agents,
      { select: () => 0 },
      {
        tag: "required",
        batches: [[projection]],
        expectedScenarioIds: [projection.scenarioId],
      },
    );
    expect(Either.isRight(result)).toBe(true);
    expect(comparisons).toHaveLength(6);
    expect(reviewComparison).toMatchObject({
      conclusion: "meaningfullyDistinct",
    });
    if (Either.isRight(result) && !("tag" in result.right)) {
      expect(result.right.catalogueComparison).toMatchObject({
        tag: "retained",
        comparison: { conclusion: "meaningfullyDistinct" },
      });
      expect(finalScenarioDisposition(result.right)).toBe("admitted");
    }
  });

  test("authors the first Scenario from an empty admitted catalogue", async () => {
    let retained: unknown;
    const result = await runScenarioCampaign(
      {
        ...config,
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestone: 1,
      },
      {
        generate: async (input) => ({
          candidates: Array.from({ length: input.candidateCount }, (_, index) =>
            candidate(`first-catalogue candidate ${index}`),
          ),
        }),
        reviewScenario: async ({ catalogueComparison }) => {
          retained = catalogueComparison;
          return {
            raw: { classification: "supported", evidence: "Synthetic RAW." },
            contentAvailability: {
              classification: "supplied",
              evidence: "Synthetic content.",
            },
            sdkCapability: {
              classification: "supported",
              evidence: "Synthetic SDK.",
            },
            artifactPolicy: {
              classification: "safe",
              evidence: "Synthetic policy.",
            },
            ...readyQuality,
          };
        },
      },
      { select: () => 0 },
      { tag: "required", batches: [], expectedScenarioIds: [] },
    );
    expect(Either.isRight(result)).toBe(true);
    expect(retained).toMatchObject({
      tag: "retained",
      comparison: {
        conclusion: "meaningfullyDistinct",
        basis: { tag: "noAdmittedScenarios" },
      },
    });
  });

  test("retains a redundant Candidate as rejected when the revision bound is exhausted", async () => {
    const projection = Schema.decodeUnknownSync(
      ScenarioCatalogueProjectionSchema,
    )({
      scenarioId: "admitted-synthetic-scenario",
      title: "Admitted synthetic scenario",
      purpose: "Explore a retained synthetic tactical question.",
      authoredSource: {
        path: "scripts/raw-swarm/sdk-player/scenarios/admitted-synthetic-scenario.md",
        byteLength: 128,
        sha256: "a".repeat(64),
      },
      characterRequirement: "characterSheetsRequired",
      spatialContext: "notRequired",
      contentAvailabilityIntent: "availableOnly",
      sdkSupportBoundary: "supportedOnly/supported",
    });
    let reviewComparison: { readonly conclusion: string } | undefined;
    const result = await runScenarioCampaign(
      {
        ...config,
        minimumIterations: 1,
        maximumIterations: 2,
        reviewMilestone: 1,
      },
      {
        generate: async (input) => ({
          candidates: Array.from({ length: input.candidateCount }, (_, index) =>
            candidate(`always redundant ${index}`),
          ),
        }),
        compareCandidate: async ({ batch, batchIndex }) =>
          Schema.decodeUnknownSync(ScenarioCatalogueComparisonSchema)({
            schemaVersion: 1,
            conclusion: "redundant",
            comparedScenarioIds: batch.map(({ scenarioId }) => scenarioId),
            closestMatches: [
              {
                scenarioId: batch[0]!.scenarioId,
                reason: "The admitted interaction sequence is identical.",
              },
            ],
            materialDifferentiators: [],
            basis: {
              tag: "compared",
              batches: [
                {
                  batchIndex,
                  comparedScenarioIds: batch.map(
                    ({ scenarioId }) => scenarioId,
                  ),
                  dimensions: {
                    exploratoryPurpose: "Same purpose.",
                    materiallyRelevantMechanics: "Same mechanics.",
                    encounterComposition: "Same composition.",
                    interactionSequence: "Same sequence.",
                    tacticalQuestion: "Same question.",
                    sdkSupportBoundary: "Same support boundary.",
                    spatialContext: { tag: "notMaterial" },
                  },
                },
              ],
            },
          }),
        reviewScenario: async ({ catalogueComparison }) => {
          if (catalogueComparison.tag === "retained") {
            reviewComparison = catalogueComparison.comparison;
          }
          return {
            raw: { classification: "supported", evidence: "Synthetic RAW." },
            contentAvailability: {
              classification: "supplied",
              evidence: "Synthetic content.",
            },
            sdkCapability: {
              classification: "supported",
              evidence: "Synthetic SDK.",
            },
            artifactPolicy: {
              classification: "safe",
              evidence: "Synthetic policy.",
            },
            ...readyQuality,
          };
        },
      },
      { select: () => 0 },
      {
        tag: "required",
        batches: [[projection]],
        expectedScenarioIds: [projection.scenarioId],
      },
    );
    expect(Either.isRight(result)).toBe(true);
    expect(reviewComparison).toMatchObject({ conclusion: "redundant" });
    if (Either.isRight(result) && !("tag" in result.right)) {
      expect(finalScenarioDisposition(result.right)).toBe("rejected");
    }
  });
});
