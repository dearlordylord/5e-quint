import fc from "fast-check";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  decodeBenchmarkId,
  decodeEvidenceSetId,
  decodeExecutionId,
  decodeEvidenceSetDirectory,
  decodeScenarioCampaignId,
  decodeScenarioCandidateId,
  decodeScenarioId,
  evidenceSetDirectory,
  ScenarioIdSchema,
} from "./raw-swarm-identities.ts";
import {
  projectRawSwarmCatalogue,
  readRawSwarmCatalogue,
  type AdmittedScenarioRecord,
} from "./scenario-catalogue.ts";
import { repoRoot } from "./transcript.ts";

const decodeRight = <A>(decoded: Either.Either<A, string>): A => {
  if (Either.isLeft(decoded)) throw new Error(decoded.left);
  return decoded.right;
};

const ids = {
  campaignId: decodeRight(decodeScenarioCampaignId("open-grid-campaign")),
  candidateId: decodeRight(
    decodeScenarioCandidateId("open-grid-campaign-candidate-one"),
  ),
  scenarioId: decodeRight(decodeScenarioId("open-grid-wolf-skeleton-pursuit")),
  executionId: decodeRight(decodeExecutionId("execution-alpha")),
  otherExecutionId: decodeRight(decodeExecutionId("execution-beta")),
  benchmarkId: decodeRight(decodeBenchmarkId("context-profile-comparison")),
  benchmarkEvidenceSetId: decodeRight(
    decodeEvidenceSetId("context-profile-comparison-evidence"),
  ),
  evidenceSetId: decodeRight(decodeEvidenceSetId("evidence-alpha")),
};

const projectedFacts = {
  characterRequirement: {
    tag: "statBlocksOnly" as const,
    evidence: "Canonical stat blocks only.",
  },
  spatialRequirement: {
    tag: "geometryAssisted" as const,
    evidence: "An open grid supplies placement.",
  },
  admission: "admitted" as const,
  contentAvailability: {
    contentAvailabilityIntent: "availableOnly" as const,
    contentReview: {
      classification: "supplied" as const,
      evidence: "Synthetic supplied-content evidence.",
    },
  },
  sdkCapability: {
    tag: "assessed" as const,
    admission: {
      sdkCapabilityIntent: "supportedOnly" as const,
      sdkCapabilityReview: {
        classification: "supported" as const,
        evidence: "Synthetic supported-SDK evidence.",
      },
    },
  },
};

describe("Raw Swarm scenario catalogue", () => {
  test("projects one admitted scenario regardless of its executions and benchmark children", () => {
    const record = {
      schemaVersion: 1,
      scenarioId: ids.scenarioId,
      title: "Open-grid Wolf and Skeleton pursuit",
      purpose: "Explore pursuit and melee engagement through the public SDK.",
      authoredSource: {
        path: "scenario.md",
        byteLength: 1,
        sha256: "a".repeat(64),
      },
      admissionReview: {
        path: "review.json",
        byteLength: 1,
        sha256: "b".repeat(64),
      },
      stageFacts: { path: "facts.json", byteLength: 1, sha256: "c".repeat(64) },
    } satisfies AdmittedScenarioRecord;

    const projected = projectRawSwarmCatalogue({
      scenarios: [{ ...record, ...projectedFacts }],
      executions: [
        {
          schemaVersion: 1,
          executionId: ids.executionId,
          scenarioId: ids.scenarioId,
          evidenceSetId: ids.evidenceSetId,
        },
        {
          schemaVersion: 1,
          executionId: ids.otherExecutionId,
          scenarioId: ids.scenarioId,
          evidenceSetId: decodeRight(decodeEvidenceSetId("evidence-beta")),
        },
      ],
      benchmarks: [
        {
          schemaVersion: 1,
          benchmarkId: ids.benchmarkId,
          evidenceSetId: ids.benchmarkEvidenceSetId,
          executionIds: [ids.executionId, ids.otherExecutionId],
        },
      ],
      rejectedCandidates: [
        {
          schemaVersion: 1,
          candidateId: ids.candidateId,
          campaignId: ids.campaignId,
          evidenceSetId: decodeRight(decodeEvidenceSetId("rejection-evidence")),
          reason: "The authored spatial facts contradict each other.",
        },
      ],
    });

    expect(projected).toEqual(
      Either.right({
        scenarios: [
          {
            ...record,
            ...projectedFacts,
            executionIds: ["execution-alpha", "execution-beta"],
            benchmarkIds: ["context-profile-comparison"],
          },
        ],
        rejectedCandidates: [
          {
            schemaVersion: 1,
            candidateId: "open-grid-campaign-candidate-one",
            campaignId: "open-grid-campaign",
            evidenceSetId: "rejection-evidence",
            reason: "The authored spatial facts contradict each other.",
          },
        ],
      }),
    );

    const renamedExecution = projectRawSwarmCatalogue({
      scenarios: [{ ...record, ...projectedFacts }],
      executions: [
        {
          schemaVersion: 1,
          executionId: decodeRight(decodeExecutionId("renamed-execution")),
          scenarioId: ids.scenarioId,
          evidenceSetId: decodeRight(decodeEvidenceSetId("renamed-evidence")),
        },
      ],
      benchmarks: [],
      rejectedCandidates: [],
    });
    expect(renamedExecution).toMatchObject({
      right: {
        scenarios: [
          {
            scenarioId: "open-grid-wolf-skeleton-pursuit",
            executionIds: ["renamed-execution"],
          },
        ],
      },
    });
  });

  test("returns precise failures for duplicate and dangling relationships", () => {
    const record = {
      schemaVersion: 1,
      scenarioId: ids.scenarioId,
      title: "Open-grid Wolf and Skeleton pursuit",
      purpose: "Explore pursuit and melee engagement through the public SDK.",
      authoredSource: {
        path: "scenario.md",
        byteLength: 1,
        sha256: "a".repeat(64),
      },
      admissionReview: {
        path: "review.json",
        byteLength: 1,
        sha256: "b".repeat(64),
      },
      stageFacts: { path: "facts.json", byteLength: 1, sha256: "c".repeat(64) },
    } satisfies AdmittedScenarioRecord;
    const source = { ...record, ...projectedFacts };
    expect(
      projectRawSwarmCatalogue({
        scenarios: [source, source],
        executions: [],
        benchmarks: [],
        rejectedCandidates: [],
      }),
    ).toMatchObject({
      left: expect.arrayContaining([
        expect.objectContaining({ tag: "duplicateScenarioId" }),
      ]),
    });
    expect(
      projectRawSwarmCatalogue({
        scenarios: [source, source],
        executions: [
          {
            schemaVersion: 1,
            executionId: ids.executionId,
            scenarioId: decodeRight(decodeScenarioId("missing-scenario")),
            evidenceSetId: ids.evidenceSetId,
          },
        ],
        benchmarks: [],
        rejectedCandidates: [],
      }),
    ).toMatchObject({
      left: expect.arrayContaining([
        expect.objectContaining({ tag: "duplicateScenarioId" }),
        expect.objectContaining({ tag: "danglingExecutionScenario" }),
      ]),
    });
    expect(
      projectRawSwarmCatalogue({
        scenarios: [source],
        executions: [
          {
            schemaVersion: 1,
            executionId: ids.executionId,
            scenarioId: decodeRight(decodeScenarioId("missing-scenario")),
            evidenceSetId: ids.evidenceSetId,
          },
        ],
        benchmarks: [],
        rejectedCandidates: [],
      }),
    ).toMatchObject({
      left: expect.arrayContaining([
        expect.objectContaining({ tag: "danglingExecutionScenario" }),
      ]),
    });
    expect(
      projectRawSwarmCatalogue({
        scenarios: [source],
        executions: [],
        benchmarks: [
          {
            schemaVersion: 1,
            benchmarkId: ids.benchmarkId,
            evidenceSetId: ids.benchmarkEvidenceSetId,
            executionIds: [ids.executionId, ids.otherExecutionId],
          },
        ],
        rejectedCandidates: [],
      }),
    ).toMatchObject({
      left: expect.arrayContaining([
        expect.objectContaining({ tag: "danglingBenchmarkExecution" }),
      ]),
    });
    const rejection = {
      schemaVersion: 1 as const,
      candidateId: ids.candidateId,
      campaignId: ids.campaignId,
      evidenceSetId: decodeRight(decodeEvidenceSetId("candidate-evidence")),
      reason: "Synthetic rejection.",
    };
    expect(
      projectRawSwarmCatalogue({
        scenarios: [source],
        executions: [],
        benchmarks: [],
        rejectedCandidates: [rejection, rejection],
      }),
    ).toMatchObject({
      left: expect.arrayContaining([
        expect.objectContaining({ tag: "duplicateCandidateId" }),
      ]),
    });
    expect(
      projectRawSwarmCatalogue({
        scenarios: [source],
        executions: [
          {
            schemaVersion: 1,
            executionId: ids.executionId,
            scenarioId: ids.scenarioId,
            evidenceSetId: ids.evidenceSetId,
          },
        ],
        benchmarks: [],
        rejectedCandidates: [
          { ...rejection, evidenceSetId: ids.evidenceSetId },
        ],
      }),
    ).toMatchObject({
      left: expect.arrayContaining([
        expect.objectContaining({ tag: "duplicateEvidenceSetId" }),
      ]),
    });

    const otherScenarioId = decodeRight(
      decodeScenarioId("other-synthetic-scenario"),
    );
    const otherSource = { ...source, scenarioId: otherScenarioId };
    expect(
      projectRawSwarmCatalogue({
        scenarios: [source, otherSource],
        executions: [
          {
            schemaVersion: 1,
            executionId: ids.executionId,
            scenarioId: ids.scenarioId,
            evidenceSetId: ids.evidenceSetId,
          },
          {
            schemaVersion: 1,
            executionId: ids.otherExecutionId,
            scenarioId: otherScenarioId,
            evidenceSetId: decodeRight(decodeEvidenceSetId("other-evidence")),
          },
        ],
        benchmarks: [
          {
            schemaVersion: 1,
            benchmarkId: ids.benchmarkId,
            evidenceSetId: ids.benchmarkEvidenceSetId,
            executionIds: [ids.executionId, ids.otherExecutionId],
          },
        ],
        rejectedCandidates: [],
      }),
    ).toMatchObject({
      left: expect.arrayContaining([
        expect.objectContaining({ tag: "benchmarkScenarioMismatch" }),
      ]),
    });
    expect(
      projectRawSwarmCatalogue({
        scenarios: [source],
        executions: [
          {
            schemaVersion: 1,
            executionId: ids.executionId,
            scenarioId: ids.scenarioId,
            evidenceSetId: ids.evidenceSetId,
          },
        ],
        benchmarks: [
          {
            schemaVersion: 1,
            benchmarkId: ids.benchmarkId,
            evidenceSetId: ids.benchmarkEvidenceSetId,
            executionIds: [ids.executionId, ids.executionId],
          },
        ],
        rejectedCandidates: [],
      }),
    ).toMatchObject({
      left: expect.arrayContaining([
        expect.objectContaining({ tag: "duplicateBenchmarkExecution" }),
      ]),
    });
  });

  test("orders catalogue output deterministically", () => {
    const record = (scenarioId: string): AdmittedScenarioRecord => ({
      schemaVersion: 1,
      scenarioId: decodeRight(decodeScenarioId(scenarioId)),
      title: scenarioId,
      purpose: `Explore ${scenarioId}.`,
      authoredSource: {
        path: `${scenarioId}.md`,
        byteLength: 1,
        sha256: "a".repeat(64),
      },
      admissionReview: {
        path: `${scenarioId}.review.json`,
        byteLength: 1,
        sha256: "b".repeat(64),
      },
      stageFacts: {
        path: `${scenarioId}.facts.json`,
        byteLength: 1,
        sha256: "c".repeat(64),
      },
    });
    fc.assert(
      fc.property(
        fc.shuffledSubarray([record("bravo"), record("alpha")], {
          minLength: 2,
          maxLength: 2,
        }),
        (scenarios) => {
          const result = projectRawSwarmCatalogue({
            scenarios: scenarios.map((scenario) => ({
              ...scenario,
              ...projectedFacts,
            })),
            executions: [],
            benchmarks: [],
            rejectedCandidates: [],
          });
          expect(result).toMatchObject({
            right: {
              scenarios: [{ scenarioId: "alpha" }, { scenarioId: "bravo" }],
            },
          });
        },
      ),
    );
  });

  test("preserves arbitrary branded relationships and rejects duplicate benchmark children", () => {
    const record = {
      schemaVersion: 1,
      scenarioId: ids.scenarioId,
      title: "Open-grid Wolf and Skeleton pursuit",
      purpose: "Explore pursuit and melee engagement through the public SDK.",
      authoredSource: {
        path: "scenario.md",
        byteLength: 1,
        sha256: "a".repeat(64),
      },
      admissionReview: {
        path: "review.json",
        byteLength: 1,
        sha256: "b".repeat(64),
      },
      stageFacts: { path: "facts.json", byteLength: 1, sha256: "c".repeat(64) },
    } satisfies AdmittedScenarioRecord;
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z0-9]{1,16}$/), {
          minLength: 5,
          maxLength: 5,
        }),
        ([first, second, firstEvidence, secondEvidence, benchmark]) => {
          const firstExecutionId = decodeRight(
            decodeExecutionId(`execution-${first}`),
          );
          const secondExecutionId = decodeRight(
            decodeExecutionId(`execution-${second}`),
          );
          const executions = [
            {
              schemaVersion: 1 as const,
              executionId: firstExecutionId,
              scenarioId: ids.scenarioId,
              evidenceSetId: decodeRight(
                decodeEvidenceSetId(`evidence-${firstEvidence}`),
              ),
            },
            {
              schemaVersion: 1 as const,
              executionId: secondExecutionId,
              scenarioId: ids.scenarioId,
              evidenceSetId: decodeRight(
                decodeEvidenceSetId(`evidence-${secondEvidence}`),
              ),
            },
          ];
          const benchmarkId = decodeRight(
            decodeBenchmarkId(`benchmark-${benchmark}`),
          );
          const base = {
            scenarios: [{ ...record, ...projectedFacts }],
            executions,
            rejectedCandidates: [],
          } as const;
          expect(
            projectRawSwarmCatalogue({
              ...base,
              benchmarks: [
                {
                  schemaVersion: 1,
                  benchmarkId,
                  evidenceSetId: decodeRight(
                    decodeEvidenceSetId(`benchmark-evidence-${benchmark}`),
                  ),
                  executionIds: [firstExecutionId, secondExecutionId],
                },
              ],
            }),
          ).toMatchObject({
            right: {
              scenarios: [
                {
                  scenarioId: ids.scenarioId,
                  executionIds: expect.arrayContaining([
                    firstExecutionId,
                    secondExecutionId,
                  ]),
                  benchmarkIds: [benchmarkId],
                },
              ],
            },
          });
          expect(
            projectRawSwarmCatalogue({
              ...base,
              benchmarks: [
                {
                  schemaVersion: 1,
                  benchmarkId,
                  evidenceSetId: decodeRight(
                    decodeEvidenceSetId(`duplicate-evidence-${benchmark}`),
                  ),
                  executionIds: [firstExecutionId, firstExecutionId],
                },
              ],
            }),
          ).toMatchObject({
            left: expect.arrayContaining([
              expect.objectContaining({ tag: "duplicateBenchmarkExecution" }),
            ]),
          });
        },
      ),
    );
  });

  test("reads mechanics and support facts from referenced canonical authorities", () => {
    const repositoryRoot = mkdtempSync(
      resolve(tmpdir(), "raw-swarm-catalogue-"),
    );
    const scenarios = resolve(repositoryRoot, "scenarios");
    mkdirSync(scenarios);
    const write = (relativePath: string, value: string) => {
      const path = resolve(repositoryRoot, relativePath);
      writeFileSync(path, value);
      return {
        path: relativePath,
        byteLength: Buffer.byteLength(value),
        sha256: createHash("sha256").update(value).digest("hex"),
      };
    };
    try {
      const prose = write(
        "scenarios/open-grid-wolf-skeleton-pursuit.md",
        "A synthetic open-grid pursuit.\n",
      );
      const reviewValue = {
        scenarioId: "open-grid-wolf-skeleton-pursuit",
        scenarioSha256: prose.sha256,
        gitSha: "a".repeat(40),
        admitReviewedUnsupported: false,
        rawReview: {
          classification: "supported",
          evidence: "Local synthetic evidence.",
        },
        policyReview: {
          classification: "safe",
          evidence: "No PHB+ identity or expression.",
        },
        reviewScope: "rawContentSdkCapabilityPolicyQuality",
        scenarioQuality: {
          classification: "ready",
          evidence: "The objective is mechanically meaningful.",
        },
        contentAvailabilityIntent: "availableOnly",
        contentReview: {
          classification: "supplied",
          evidence: "Canonical stat blocks are supplied.",
        },
        sdkCapabilityIntent: "supportedOnly",
        sdkCapabilityReview: {
          classification: "supported",
          evidence: "The public SDK represents the scenario.",
        },
      };
      const review = write(
        "scenarios/open-grid-wolf-skeleton-pursuit.md.scenario-review.json",
        `${JSON.stringify(reviewValue)}\n`,
      );
      const factsValue = {
        schemaVersion: 1,
        scenarioId: "open-grid-wolf-skeleton-pursuit",
        scenarioSha256: prose.sha256,
        source: "scenarioGenerationCandidate",
        facts: {
          schemaVersion: 1,
          characterRequirement: projectedFacts.characterRequirement,
          spatialRequirement: projectedFacts.spatialRequirement,
        },
      };
      const facts = write(
        "scenarios/open-grid-wolf-skeleton-pursuit.md.stage-facts.json",
        `${JSON.stringify(factsValue)}\n`,
      );
      const scenarioRecordPath = resolve(
        scenarios,
        "open-grid-wolf-skeleton-pursuit.scenario.json",
      );
      const scenarioRecord = {
        schemaVersion: 1,
        scenarioId: "open-grid-wolf-skeleton-pursuit",
        title: "Open-grid Wolf and Skeleton pursuit",
        purpose: "Explore pursuit and melee engagement through the public SDK.",
        authoredSource: prose,
        admissionReview: review,
        stageFacts: facts,
      } as const;
      writeFileSync(scenarioRecordPath, `${JSON.stringify(scenarioRecord)}\n`);

      const evidence = resolve(repositoryRoot, "out", "evidence-alpha");
      mkdirSync(evidence, { recursive: true });
      writeFileSync(
        resolve(evidence, "execution.json"),
        `${JSON.stringify({ schemaVersion: 1, executionId: "execution-alpha", scenarioId: "open-grid-wolf-skeleton-pursuit", evidenceSetId: "evidence-alpha" })}\n`,
      );
      const secondEvidence = resolve(repositoryRoot, "out", "evidence-beta");
      mkdirSync(secondEvidence, { recursive: true });
      writeFileSync(
        resolve(secondEvidence, "execution.json"),
        `${JSON.stringify({ schemaVersion: 1, executionId: "execution-beta", scenarioId: "open-grid-wolf-skeleton-pursuit", evidenceSetId: "evidence-beta" })}\n`,
      );
      writeFileSync(
        resolve(repositoryRoot, "out", "benchmark.json"),
        `${JSON.stringify({ schemaVersion: 1, benchmarkId: "context-profile-comparison", evidenceSetId: "context-profile-comparison-evidence", executionIds: ["execution-alpha", "execution-beta"] })}\n`,
      );
      writeFileSync(
        resolve(repositoryRoot, "out", "candidate-rejection.json"),
        `${JSON.stringify({ schemaVersion: 1, candidateId: "rejected-candidate", campaignId: "rejected-campaign", evidenceSetId: "rejection-evidence", reason: "The candidate is incoherent." })}\n`,
      );

      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        right: {
          scenarios: [
            {
              scenarioId: "open-grid-wolf-skeleton-pursuit",
              purpose:
                "Explore pursuit and melee engagement through the public SDK.",
              characterRequirement: projectedFacts.characterRequirement,
              spatialRequirement: projectedFacts.spatialRequirement,
              admission: "admitted",
              contentAvailability: {
                contentAvailabilityIntent: "availableOnly",
                contentReview: { classification: "supplied" },
              },
              sdkCapability: {
                tag: "assessed",
                admission: {
                  sdkCapabilityIntent: "supportedOnly",
                  sdkCapabilityReview: { classification: "supported" },
                },
              },
              executionIds: ["execution-alpha", "execution-beta"],
              benchmarkIds: ["context-profile-comparison"],
            },
          ],
          rejectedCandidates: [{ candidateId: "rejected-candidate" }],
        },
      });

      writeFileSync(
        scenarioRecordPath,
        `${JSON.stringify({
          ...scenarioRecord,
          authoredSource: { ...prose, path: "scenarios/missing.md" },
        })}\n`,
      );
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        left: expect.arrayContaining([
          expect.objectContaining({ tag: "unreadableCatalogueAuthority" }),
        ]),
      });

      const contradictoryReview = write(
        "scenarios/open-grid-wolf-skeleton-pursuit.md.scenario-review.json",
        `${JSON.stringify({ ...reviewValue, scenarioId: "other-scenario" })}\n`,
      );
      writeFileSync(
        scenarioRecordPath,
        `${JSON.stringify({
          ...scenarioRecord,
          admissionReview: contradictoryReview,
        })}\n`,
      );
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        left: expect.arrayContaining([
          expect.objectContaining({ tag: "catalogueScenarioIdentityMismatch" }),
        ]),
      });

      const changedFacts = write(
        "scenarios/open-grid-wolf-skeleton-pursuit.md.stage-facts.json",
        `${JSON.stringify({
          ...factsValue,
          facts: {
            ...factsValue.facts,
            spatialRequirement: {
              tag: "notRequired",
              evidence: "The canonical authority now requires no geometry.",
            },
          },
        })}\n`,
      );
      const restoredReview = write(
        "scenarios/open-grid-wolf-skeleton-pursuit.md.scenario-review.json",
        `${JSON.stringify(reviewValue)}\n`,
      );
      writeFileSync(
        scenarioRecordPath,
        `${JSON.stringify({
          ...scenarioRecord,
          admissionReview: restoredReview,
          stageFacts: changedFacts,
        })}\n`,
      );
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        right: {
          scenarios: [
            {
              scenarioId: "open-grid-wolf-skeleton-pursuit",
              spatialRequirement: { tag: "notRequired" },
            },
          ],
        },
      });

      writeFileSync(resolve(secondEvidence, "execution.json"), "not-json\n");
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        left: expect.arrayContaining([
          expect.objectContaining({ tag: "invalidRelationshipRecord" }),
        ]),
      });
    } finally {
      rmSync(repositoryRoot, { recursive: true });
    }
  });

  test("renders every checked-in admitted scenario and no opaque generated scenario source", () => {
    const scenarioDirectory = resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios",
    );
    const names = readdirSync(scenarioDirectory);
    expect(names.some((name) => /^generated-battle-[0-9]+/.test(name))).toBe(
      false,
    );
    const admittedSourceCount = names.filter((name) =>
      name.endsWith(".md"),
    ).length;
    const output = execFileSync(
      "pnpm",
      ["raw-swarm:catalogue", "--", "--json"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    const jsonStart = output.indexOf("[\n");
    expect(jsonStart).toBeGreaterThanOrEqual(0);
    const rendered = Schema.decodeUnknownSync(
      Schema.Array(Schema.Struct({ scenarioId: ScenarioIdSchema })),
    )(JSON.parse(output.slice(jsonStart)));
    expect(rendered).toHaveLength(admittedSourceCount);
    expect(new Set(rendered.map(({ scenarioId }) => scenarioId)).size).toBe(
      admittedSourceCount,
    );
  });

  test("identity parsers reject traversal and opaque generated scenario ids", () => {
    for (const decode of [
      decodeScenarioCampaignId,
      decodeScenarioCandidateId,
      decodeScenarioId,
      decodeExecutionId,
      decodeBenchmarkId,
      decodeEvidenceSetId,
    ]) {
      expect(Either.isLeft(decode("../outside"))).toBe(true);
    }
    expect(Either.isLeft(decodeScenarioId("generated-battle-123"))).toBe(true);
    expect(
      Either.isRight(
        decodeEvidenceSetId("generated-battle-009-equivalent-023"),
      ),
    ).toBe(true);
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z0-9]{1,20}$/), (suffix) => {
        for (const decode of [
          decodeScenarioCampaignId,
          decodeScenarioCandidateId,
          decodeScenarioId,
          decodeExecutionId,
          decodeBenchmarkId,
          decodeEvidenceSetId,
        ]) {
          expect(Either.isLeft(decode(`../${suffix}`))).toBe(true);
        }
      }),
    );
    fc.assert(
      fc.property(
        fc
          .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789"), {
            minLength: 1,
            maxLength: 30,
          })
          .map((characters) => characters.join("")),
        (value) => {
          const evidenceSetId = decodeRight(decodeEvidenceSetId(value));
          expect(
            decodeEvidenceSetDirectory(
              evidenceSetDirectory("/tmp/raw-swarm-evidence", evidenceSetId),
            ),
          ).toEqual(Either.right(evidenceSetId));
        },
      ),
    );
  });
});
