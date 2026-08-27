import fc from "fast-check";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
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
  decodeHistoricalScenarioId,
  decodePlannedScenarioId,
  evidenceSetDirectory,
  ScenarioIdSchema,
} from "./raw-swarm-identities.ts";
import { isCurrentAdmittedScenarioRecord } from "./scenario-admission.ts";
import { projectScenarioCatalogueForAuthoring } from "./scenario-authoring.ts";
import {
  findAuthorableScenarioInCatalogue,
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
  contentAvailability: {
    contentAvailabilityIntent: "availableOnly" as const,
    contentReview: {
      classification: "supplied" as const,
      evidence: "Synthetic supplied-content evidence.",
    },
  },
  sdkCapability: {
    tag: "assessed" as const,
    sdkCapabilityIntent: "supportedOnly" as const,
    sdkCapabilityReview: {
      classification: "supported" as const,
      evidence: "Synthetic supported-SDK evidence.",
    },
  },
};

const CONTAINED_SCENARIO_IDS = [
  "rs48h-20260824t155852z-synthetic-dash-extended-route-001",
  "rs48h-20260824t155852z-synthetic-disengage-crossing-001",
  "rs48h-20260824t155852z-synthetic-disengage-multiple-reactors-001",
  "rs48h-20260824t155852z-synthetic-dodge-defense-lifetime-retry-002",
  "rs48h-20260824t155852z-synthetic-help-attack-held-advantage-retry-002",
  "rs48h-20260824t155852z-synthetic-large-footprint-route-001",
  "rs48h-20260824t155852z-synthetic-shortbow-long-range-disadvantage-retry-002",
  "rs48h-20260824t155852z-synthetic-total-cover-transition-001",
  "rs48h-20260824t155852z-synthetic-wolf-bite-prone-prefix-001",
] as const;

describe("Raw Swarm scenario catalogue", () => {
  test("rejects a scenario catalogue root symlink that escapes the repository", () => {
    const repositoryRoot = mkdtempSync(
      resolve(tmpdir(), "raw-swarm-catalogue-root-"),
    );
    const outside = mkdtempSync(resolve(tmpdir(), "raw-swarm-catalogue-out-"));
    try {
      symlinkSync(outside, resolve(repositoryRoot, "scenarios"));
      const result = readRawSwarmCatalogue({
        repositoryRoot,
        scenarioDirectory: resolve(repositoryRoot, "scenarios"),
        evidenceDirectory: resolve(repositoryRoot, "out"),
      });
      expect(Either.isLeft(result)).toBe(true);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test("rejects a discovered scenario record symlink that escapes the repository", () => {
    const repositoryRoot = mkdtempSync(
      resolve(tmpdir(), "raw-swarm-catalogue-record-"),
    );
    const scenarios = resolve(repositoryRoot, "scenarios");
    const outside = mkdtempSync(resolve(tmpdir(), "raw-swarm-catalogue-out-"));
    try {
      mkdirSync(scenarios);
      const outsideRecord = resolve(outside, "escaped.scenario.json");
      writeFileSync(outsideRecord, "{}\n");
      symlinkSync(outsideRecord, resolve(scenarios, "escaped.scenario.json"));
      const result = readRawSwarmCatalogue({
        repositoryRoot,
        scenarioDirectory: scenarios,
        evidenceDirectory: resolve(repositoryRoot, "out"),
      });
      expect(Either.isLeft(result)).toBe(true);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test("rejects a dangling evidence-root symlink instead of treating it as absent", () => {
    const repositoryRoot = mkdtempSync(
      resolve(tmpdir(), "raw-swarm-catalogue-evidence-root-"),
    );
    const scenarios = resolve(repositoryRoot, "scenarios");
    const evidenceDirectory = resolve(repositoryRoot, "out");
    try {
      mkdirSync(scenarios);
      symlinkSync(
        resolve(repositoryRoot, "missing-evidence"),
        evidenceDirectory,
      );
      const result = readRawSwarmCatalogue({
        repositoryRoot,
        scenarioDirectory: scenarios,
        evidenceDirectory,
      });
      expect(result).toMatchObject({
        _tag: "Left",
        left: [
          expect.objectContaining({
            tag: "unreadableEvidenceDirectory",
            path: evidenceDirectory,
          }),
        ],
      });
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  test("renders a new current admission against its retained predecessor catalogue", () => {
    const repositoryRoot = mkdtempSync(
      resolve(tmpdir(), "raw-swarm-catalogue-predecessors-"),
    );
    const scenarios = resolve(repositoryRoot, "scenarios");
    mkdirSync(scenarios);
    const writeAuthority = (relativePath: string, value: unknown) => {
      const path = resolve(repositoryRoot, relativePath);
      const bytes = `${JSON.stringify(value)}\n`;
      writeFileSync(path, bytes);
      return {
        path: relativePath,
        byteLength: Buffer.byteLength(bytes),
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    };
    const writeScenario = (
      scenarioId: string,
      predecessorScenarioIds: readonly string[],
      catalogueComparison: unknown,
    ) => {
      const prosePath = `scenarios/${scenarioId}.md`;
      const prose = `${scenarioId} asks a synthetic tactical question.\n`;
      writeFileSync(resolve(repositoryRoot, prosePath), prose);
      const proseAuthority = {
        path: prosePath,
        byteLength: Buffer.byteLength(prose),
        sha256: createHash("sha256").update(prose).digest("hex"),
      };
      const review = writeAuthority(`${prosePath}.scenario-review.json`, {
        scenarioId,
        scenarioSha256: proseAuthority.sha256,
        gitSha: "a".repeat(40),
        admitReviewedUnsupported: false,
        rawReview: { classification: "supported", evidence: "Synthetic RAW." },
        policyReview: { classification: "safe", evidence: "Synthetic policy." },
        reviewScope: "rawContentSdkCapabilityPolicyQuality",
        scenarioQuality: {
          classification: "ready",
          evidence: "Synthetic quality evidence.",
        },
        contentAvailabilityIntent: "availableOnly",
        contentReview: {
          classification: "supplied",
          evidence: "Synthetic content.",
        },
        sdkCapabilityIntent: "supportedOnly",
        sdkCapabilityReview: {
          classification: "supported",
          evidence: "Synthetic SDK.",
        },
        catalogueComparison,
      });
      const facts = writeAuthority(`${prosePath}.stage-facts.json`, {
        schemaVersion: 1,
        scenarioId,
        scenarioSha256: proseAuthority.sha256,
        source: "scenarioGenerationCandidate",
        facts: {
          schemaVersion: 1,
          characterRequirement: projectedFacts.characterRequirement,
          spatialRequirement: projectedFacts.spatialRequirement,
        },
      });
      writeFileSync(
        resolve(scenarios, `${scenarioId}.scenario.json`),
        `${JSON.stringify({
          schemaVersion: 2,
          scenarioId,
          title: `Synthetic ${scenarioId}`,
          purpose: `Explore ${scenarioId}.`,
          predecessorScenarioIds,
          authoredSource: proseAuthority,
          admissionReview: review,
          stageFacts: facts,
        })}\n`,
      );
    };
    const comparison = (ids: readonly string[]) =>
      ids.length === 0
        ? {
            schemaVersion: 1,
            conclusion: "meaningfullyDistinct",
            comparedScenarioIds: [],
            closestMatches: [],
            materialDifferentiators: [],
            basis: { tag: "noAdmittedScenarios" },
          }
        : {
            schemaVersion: 1,
            conclusion: "meaningfullyDistinct",
            comparedScenarioIds: ids,
            closestMatches: [],
            materialDifferentiators: [],
            basis: {
              tag: "compared",
              batches: [
                {
                  batchIndex: 0,
                  comparedScenarioIds: ids,
                  dimensions: {
                    exploratoryPurpose: "Distinct purpose.",
                    materiallyRelevantMechanics: "Distinct mechanics.",
                    encounterComposition: "Distinct composition.",
                    interactionSequence: "Distinct sequence.",
                    tacticalQuestion: "Distinct question.",
                    sdkSupportBoundary: "Supported boundary.",
                    spatialContext: { tag: "notMaterial" },
                  },
                },
              ],
            },
          };
    try {
      writeScenario("first-synthetic", [], comparison([]));
      writeScenario(
        "second-synthetic",
        ["first-synthetic"],
        comparison(["first-synthetic"]),
      );
      const result = readRawSwarmCatalogue({
        repositoryRoot,
        scenarioDirectory: scenarios,
        evidenceDirectory: resolve(repositoryRoot, "out"),
      });
      expect(Either.isRight(result)).toBe(true);
      if (Either.isRight(result)) {
        expect(
          result.right.scenarios.map(({ scenarioId }) => scenarioId),
        ).toEqual(["first-synthetic", "second-synthetic"]);
        expect(
          findAuthorableScenarioInCatalogue({
            catalogue: result.right,
            scenarioId: decodeRight(decodeScenarioId("second-synthetic")),
          }),
        ).toMatchObject({ _tag: "Right" });
      }

      writeScenario(
        "second-synthetic",
        ["missing-synthetic"],
        comparison(["missing-synthetic"]),
      );
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        _tag: "Left",
        left: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("predecessor absent"),
          }),
        ]),
      });

      writeScenario(
        "second-synthetic",
        ["second-synthetic"],
        comparison(["second-synthetic"]),
      );
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        _tag: "Left",
        left: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("cannot include the Scenario"),
          }),
        ]),
      });

      writeScenario("second-synthetic", ["first-synthetic"], comparison([]));
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        _tag: "Left",
        left: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("comparison is incomplete"),
          }),
        ]),
      });
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  test("rejects an execution/profile kind mismatch instead of erasing the tag", () => {
    const record = {
      schemaVersion: 1,
      scenarioId: ids.scenarioId,
      title: "Synthetic scenario",
      purpose: "Explore a synthetic tactical question.",
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
    const result = projectRawSwarmCatalogue({
      scenarios: [{ ...record, ...projectedFacts }],
      containedScenarios: [],
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
          comparisonTargets: [
            { tag: "executionProfile", executionId: ids.executionId },
            { tag: "execution", executionId: ids.otherExecutionId },
          ],
        },
      ],
      rejectedCandidates: [],
    });
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toContainEqual(
        expect.objectContaining({
          tag: "benchmarkExecutionKindMismatch",
          executionId: ids.executionId,
        }),
      );
    }
  });

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
      containedScenarios: [],
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
          comparisonTargets: [
            { tag: "execution", executionId: ids.executionId },
            { tag: "execution", executionId: ids.otherExecutionId },
          ],
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
        containedScenarios: [],
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
      containedScenarios: [],
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
        containedScenarios: [],
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
        containedScenarios: [],
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
        containedScenarios: [],
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
        containedScenarios: [],
        executions: [],
        benchmarks: [
          {
            schemaVersion: 1,
            benchmarkId: ids.benchmarkId,
            evidenceSetId: ids.benchmarkEvidenceSetId,
            comparisonTargets: [
              { tag: "execution", executionId: ids.executionId },
              { tag: "execution", executionId: ids.otherExecutionId },
            ],
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
        containedScenarios: [],
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
        containedScenarios: [],
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
        containedScenarios: [],
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
            comparisonTargets: [
              { tag: "execution", executionId: ids.executionId },
              { tag: "execution", executionId: ids.otherExecutionId },
            ],
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
        containedScenarios: [],
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
            comparisonTargets: [
              { tag: "execution", executionId: ids.executionId },
              { tag: "execution", executionId: ids.executionId },
            ],
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
            containedScenarios: [],
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
            containedScenarios: [],
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
                  comparisonTargets: [
                    { tag: "execution", executionId: firstExecutionId },
                    { tag: "execution", executionId: secondExecutionId },
                  ],
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
                  comparisonTargets: [
                    { tag: "execution", executionId: firstExecutionId },
                    { tag: "execution", executionId: firstExecutionId },
                  ],
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

      const secondProse = write(
        "scenarios/second-synthetic.md",
        "A second synthetic scenario.\n",
      );
      const historicalReviewValue = reviewValue;
      const secondReview = write(
        "scenarios/second-synthetic.md.scenario-review.json",
        `${JSON.stringify({
          ...historicalReviewValue,
          scenarioId: "second-synthetic",
          scenarioSha256: secondProse.sha256,
        })}\n`,
      );
      const secondFacts = write(
        "scenarios/second-synthetic.md.stage-facts.json",
        `${JSON.stringify({
          ...factsValue,
          scenarioId: "second-synthetic",
          scenarioSha256: secondProse.sha256,
        })}\n`,
      );
      writeFileSync(
        resolve(scenarios, "second-synthetic.scenario.json"),
        `${JSON.stringify({
          ...scenarioRecord,
          scenarioId: "second-synthetic",
          title: "Second synthetic scenario",
          purpose: "Explore a second synthetic question.",
          authoredSource: secondProse,
          admissionReview: secondReview,
          stageFacts: secondFacts,
        })}\n`,
      );

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
        `${JSON.stringify({
          schemaVersion: 1,
          benchmarkId: "context-profile-comparison",
          evidenceSetId: "context-profile-comparison-evidence",
          comparisonTargets: [
            { tag: "execution", executionId: "execution-alpha" },
            { tag: "execution", executionId: "execution-beta" },
          ],
        })}\n`,
      );
      const rejectionRecord = {
        schemaVersion: 1 as const,
        candidateId: "rejected-candidate",
        campaignId: "rejected-campaign",
        evidenceSetId: "rejection-evidence",
        reason: "The candidate is incoherent.",
      };
      const rejectionPath = resolve(
        repositoryRoot,
        "out",
        "candidate-rejection.json",
      );
      writeFileSync(rejectionPath, `${JSON.stringify(rejectionRecord)}\n`);

      const profileRoot = resolve(
        repositoryRoot,
        "out",
        "fixed-scenario-benchmark",
        "profile-benchmark",
      );
      const profileAuthority = (name: string) => ({
        path: `synthetic/${name}`,
        byteLength: 1,
        sha256: "a".repeat(64),
      });
      const writeProfile = (
        executionId: string,
        evidenceSetId: string,
        profile: "documentDeclarationSet" | "boundedCapabilityProjection",
      ) => {
        const profilePath = resolve(
          profileRoot,
          profile,
          "execution-profile.json",
        );
        mkdirSync(resolve(profilePath, ".."), { recursive: true });
        writeFileSync(
          profilePath,
          `${JSON.stringify({
            schemaVersion: 1,
            executionId,
            evidenceSetId,
            profile,
            scenarioId: "open-grid-wolf-skeleton-pursuit",
            implementationGitSha: "a".repeat(40),
            scenarioBundle: {
              scenario: profileAuthority("scenario.md"),
              scenarioRecord: profileAuthority("scenario.scenario.json"),
              scenarioReview: profileAuthority("scenario-review.json"),
              stageFacts: profileAuthority("stage-facts.json"),
              stagePlan: profileAuthority("stage-plan.json"),
              characters: profileAuthority("characters.ts"),
              setup: profileAuthority("setup.ts"),
            },
            contextManifest: profileAuthority("context-manifest.json"),
          })}\n`,
        );
      };
      writeProfile(
        "profile-execution-alpha",
        "profile-evidence-alpha",
        "documentDeclarationSet",
      );
      writeProfile(
        "profile-execution-beta",
        "profile-evidence-beta",
        "boundedCapabilityProjection",
      );
      writeFileSync(
        resolve(profileRoot, "benchmark.json"),
        `${JSON.stringify({
          schemaVersion: 1,
          benchmarkId: "profile-benchmark",
          evidenceSetId: "profile-benchmark-evidence",
          comparisonTargets: [
            { tag: "executionProfile", executionId: "profile-execution-alpha" },
            { tag: "executionProfile", executionId: "profile-execution-beta" },
          ],
        })}\n`,
      );

      const initialCatalogue = readRawSwarmCatalogue({
        repositoryRoot,
        scenarioDirectory: scenarios,
        evidenceDirectory: resolve(repositoryRoot, "out"),
      });
      expect(Either.isRight(initialCatalogue)).toBe(true);
      if (Either.isRight(initialCatalogue)) {
        const firstScenario = initialCatalogue.right.scenarios.find(
          ({ scenarioId }) => scenarioId === "open-grid-wolf-skeleton-pursuit",
        );
        expect(firstScenario).toMatchObject({
          purpose:
            "Explore pursuit and melee engagement through the public SDK.",
          characterRequirement: projectedFacts.characterRequirement,
          spatialRequirement: projectedFacts.spatialRequirement,
          contentAvailability: {
            contentAvailabilityIntent: "availableOnly",
            contentReview: { classification: "supplied" },
          },
          sdkCapability: {
            tag: "assessed",
            sdkCapabilityIntent: "supportedOnly",
            sdkCapabilityReview: { classification: "supported" },
          },
          executionIds: expect.arrayContaining([
            "execution-alpha",
            "execution-beta",
            "profile-execution-alpha",
            "profile-execution-beta",
          ]),
          benchmarkIds: expect.arrayContaining([
            "context-profile-comparison",
            "profile-benchmark",
          ]),
        });
        expect(initialCatalogue.right.rejectedCandidates).toEqual([
          expect.objectContaining({ candidateId: "rejected-candidate" }),
        ]);
      }
      const benchmarkPath = resolve(repositoryRoot, "out", "benchmark.json");
      const benchmarkValue = JSON.parse(
        readFileSync(benchmarkPath, "utf8"),
      ) as {
        comparisonTargets: readonly { tag: string; executionId: string }[];
      };
      writeFileSync(
        benchmarkPath,
        `${JSON.stringify({
          ...benchmarkValue,
          comparisonTargets: [
            benchmarkValue.comparisonTargets[0],
            benchmarkValue.comparisonTargets[0],
          ],
        })}\n`,
      );
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        left: [
          expect.objectContaining({
            tag: "duplicateBenchmarkExecution",
            benchmarkId: "context-profile-comparison",
          }),
        ],
      });
      writeFileSync(benchmarkPath, `${JSON.stringify(benchmarkValue)}\n`);
      writeFileSync(
        rejectionPath,
        `${JSON.stringify({
          ...rejectionRecord,
          predecessorScenarioIds: ["open-grid-wolf-skeleton-pursuit"],
          predecessorBatches: [
            {
              batchIndex: 0,
              scenarioIds: ["open-grid-wolf-skeleton-pursuit"],
            },
          ],
          catalogueComparison: {
            schemaVersion: 1,
            conclusion: "meaningfullyDistinct",
            comparedScenarioIds: ["open-grid-wolf-skeleton-pursuit"],
            closestMatches: [],
            materialDifferentiators: [],
            basis: {
              tag: "compared",
              batches: [
                {
                  batchIndex: 0,
                  comparedScenarioIds: ["open-grid-wolf-skeleton-pursuit"],
                  dimensions: {
                    exploratoryPurpose:
                      "The candidate asks a distinct question.",
                    materiallyRelevantMechanics:
                      "The candidate uses distinct mechanics.",
                    encounterComposition:
                      "The candidate has a distinct composition.",
                    interactionSequence:
                      "The candidate has a distinct sequence.",
                    tacticalQuestion: "The candidate asks a distinct tactic.",
                    sdkSupportBoundary: "The candidate stays within support.",
                    spatialContext: { tag: "notMaterial" },
                  },
                },
              ],
            },
          },
        })}\n`,
      );
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({ right: expect.anything() });
      writeFileSync(rejectionPath, `${JSON.stringify(rejectionRecord)}\n`);
      const incompleteReview = write(
        "scenarios/open-grid-wolf-skeleton-pursuit.md.scenario-review.json",
        `${JSON.stringify({
          ...reviewValue,
          catalogueComparison: {
            schemaVersion: 1,
            conclusion: "meaningfullyDistinct",
            comparedScenarioIds: ["open-grid-wolf-skeleton-pursuit"],
            closestMatches: [],
            materialDifferentiators: [],
            basis: {
              tag: "compared",
              batches: [
                {
                  batchIndex: 0,
                  comparedScenarioIds: ["open-grid-wolf-skeleton-pursuit"],
                  dimensions: {
                    exploratoryPurpose:
                      "The candidate asks a distinct question.",
                    materiallyRelevantMechanics:
                      "The candidate uses distinct mechanics.",
                    encounterComposition:
                      "The candidate has a distinct composition.",
                    interactionSequence:
                      "The candidate has a distinct sequence.",
                    tacticalQuestion: "The candidate asks a distinct tactic.",
                    sdkSupportBoundary: "The candidate stays within support.",
                    spatialContext: { tag: "notMaterial" },
                  },
                },
              ],
            },
          },
        })}\n`,
      );
      writeFileSync(
        scenarioRecordPath,
        `${JSON.stringify({ ...scenarioRecord, admissionReview: incompleteReview })}\n`,
      );
      expect(
        readRawSwarmCatalogue({
          repositoryRoot,
          scenarioDirectory: scenarios,
          evidenceDirectory: resolve(repositoryRoot, "out"),
        }),
      ).toMatchObject({
        left: expect.arrayContaining([
          expect.objectContaining({
            tag: "invalidCatalogueRecord",
            message: expect.stringContaining(
              "current admitted Scenario record",
            ),
          }),
        ]),
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
      const restoredCatalogue = readRawSwarmCatalogue({
        repositoryRoot,
        scenarioDirectory: scenarios,
        evidenceDirectory: resolve(repositoryRoot, "out"),
      });
      expect(Either.isRight(restoredCatalogue)).toBe(true);
      if (Either.isRight(restoredCatalogue)) {
        expect(
          restoredCatalogue.right.scenarios.find(
            ({ scenarioId }) =>
              scenarioId === "open-grid-wolf-skeleton-pursuit",
          )?.spatialRequirement,
        ).toMatchObject({ tag: "notRequired" });
      }

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
    const liveScenarioManifestCount = names.filter(
      (name) =>
        name.endsWith(".scenario.json") &&
        !name.endsWith(".scenario.contained.json"),
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
    expect(rendered).toHaveLength(liveScenarioManifestCount);
    expect(new Set(rendered.map(({ scenarioId }) => scenarioId)).size).toBe(
      liveScenarioManifestCount,
    );
  }, 15_000);

  test("keeps every current admission predecessor within the live catalogue", () => {
    const scenarioDirectory = resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios",
    );
    const catalogue = readRawSwarmCatalogue({
      repositoryRoot: repoRoot,
      scenarioDirectory,
      evidenceDirectory: resolve(repoRoot, "scripts/raw-swarm/out"),
    });
    expect(Either.isRight(catalogue)).toBe(true);
    if (Either.isLeft(catalogue)) return;
    const liveScenarioIds = new Set(
      catalogue.right.scenarios.map(({ scenarioId }) => scenarioId),
    );

    for (const record of catalogue.right.scenarios) {
      if (!isCurrentAdmittedScenarioRecord(record)) continue;
      expect(
        record.predecessorScenarioIds.every((scenarioId: string) =>
          liveScenarioIds.has(scenarioId),
        ),
      ).toBe(true);
    }
  });

  test("contains historical authorities without exposing them to authoring", () => {
    const scenarioDirectory = resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios",
    );
    const catalogue = readRawSwarmCatalogue({
      repositoryRoot: repoRoot,
      scenarioDirectory,
      evidenceDirectory: resolve(repoRoot, "scripts/raw-swarm/out"),
    });
    expect(Either.isRight(catalogue)).toBe(true);
    if (Either.isLeft(catalogue)) return;

    expect(catalogue.right.scenarios).toHaveLength(14);
    expect(catalogue.right.containedScenarios).toHaveLength(
      CONTAINED_SCENARIO_IDS.length,
    );
    expect(
      catalogue.right.containedScenarios.map(({ scenarioId }) => scenarioId),
    ).toEqual([...CONTAINED_SCENARIO_IDS].sort());

    const liveScenarioIds = new Set(
      catalogue.right.scenarios.map(({ scenarioId }) => scenarioId),
    );
    const allScenarioIds = new Set([
      ...liveScenarioIds,
      ...catalogue.right.containedScenarios.map(({ scenarioId }) => scenarioId),
    ]);
    expect(
      liveScenarioIds.has(
        "rs48h-20260824t155852z-synthetic-total-cover-transition-001",
      ),
    ).toBe(false);
    expect(
      projectScenarioCatalogueForAuthoring(catalogue.right).map(
        ({ scenarioId }) => scenarioId,
      ),
    ).not.toContain(
      "rs48h-20260824t155852z-synthetic-total-cover-transition-001",
    );

    for (const record of catalogue.right.scenarios) {
      if (!isCurrentAdmittedScenarioRecord(record)) continue;
      expect(
        record.predecessorScenarioIds.every((scenarioId) =>
          liveScenarioIds.has(scenarioId),
        ),
      ).toBe(true);
    }
    for (const record of catalogue.right.containedScenarios) {
      if (!isCurrentAdmittedScenarioRecord(record)) continue;
      expect(
        record.predecessorScenarioIds.every((scenarioId) =>
          allScenarioIds.has(scenarioId),
        ),
      ).toBe(true);
    }

    const totalCoverId =
      "rs48h-20260824t155852z-synthetic-total-cover-transition-001";
    const totalCover = catalogue.right.containedScenarios.find(
      ({ scenarioId }) => scenarioId === totalCoverId,
    );
    expect(totalCover?.authoredSource).toMatchObject({
      byteLength: 1435,
      sha256:
        "9002c593ea2ac558a30f815f6fd62d2fef2daa48d2e656a8ebd13e13e29c2654",
    });
    expect(
      createHash("sha256")
        .update(
          readFileSync(
            resolve(
              scenarioDirectory,
              `${totalCoverId}.scenario.contained.json`,
            ),
          ),
        )
        .digest("hex"),
    ).toBe("549c8bcfbc2d6374fb821621b614199d56ecc920a05fd326e5ed947708dc272d");
  });

  test("validates historical contained relationships without widening live authoring", () => {
    const repositoryRoot = mkdtempSync(
      resolve(tmpdir(), "raw-swarm-contained-relationships-"),
    );
    const scenarios = resolve(repositoryRoot, "scenarios");
    const evidenceDirectory = resolve(repositoryRoot, "out");
    mkdirSync(scenarios);
    const writeJson = (relativePath: string, value: unknown) => {
      const path = resolve(repositoryRoot, relativePath);
      mkdirSync(resolve(path, ".."), { recursive: true });
      const bytes = `${JSON.stringify(value)}\n`;
      writeFileSync(path, bytes);
      return {
        path: relativePath,
        byteLength: Buffer.byteLength(bytes),
        sha256: createHash("sha256").update(bytes).digest("hex"),
      };
    };
    const writeScenario = (input: {
      readonly scenarioId: string;
      readonly manifestSuffix: ".scenario.json" | ".scenario.contained.json";
    }) => {
      const prosePath = `scenarios/${input.scenarioId}.md`;
      const prose = `${input.scenarioId} asks a synthetic historical question.\n`;
      writeFileSync(resolve(repositoryRoot, prosePath), prose);
      const proseAuthority = {
        path: prosePath,
        byteLength: Buffer.byteLength(prose),
        sha256: createHash("sha256").update(prose).digest("hex"),
      };
      const review = writeJson(`${prosePath}.scenario-review.json`, {
        scenarioId: input.scenarioId,
        scenarioSha256: proseAuthority.sha256,
        gitSha: "a".repeat(40),
        admitReviewedUnsupported: false,
        rawReview: { classification: "supported", evidence: "Synthetic RAW." },
        policyReview: { classification: "safe", evidence: "Synthetic policy." },
        reviewScope: "rawContentSdkCapabilityPolicyQuality",
        scenarioQuality: {
          classification: "ready",
          evidence: "Synthetic quality evidence.",
        },
        contentAvailabilityIntent: "availableOnly",
        contentReview: {
          classification: "supplied",
          evidence: "Synthetic content.",
        },
        sdkCapabilityIntent: "supportedOnly",
        sdkCapabilityReview: {
          classification: "supported",
          evidence: "Synthetic SDK.",
        },
      });
      const facts = writeJson(`${prosePath}.stage-facts.json`, {
        schemaVersion: 1,
        scenarioId: input.scenarioId,
        scenarioSha256: proseAuthority.sha256,
        source: "scenarioGenerationCandidate",
        facts: {
          schemaVersion: 1,
          characterRequirement: projectedFacts.characterRequirement,
          spatialRequirement: projectedFacts.spatialRequirement,
        },
      });
      writeJson(`scenarios/${input.scenarioId}${input.manifestSuffix}`, {
        schemaVersion: 1,
        scenarioId: input.scenarioId,
        title: `Synthetic ${input.scenarioId}`,
        purpose: `Explore ${input.scenarioId}.`,
        authoredSource: proseAuthority,
        admissionReview: review,
        stageFacts: facts,
      });
    };
    try {
      const containedScenarioId = "contained-history-target";
      const liveScenarioId = "live-authoring-scenario";
      writeScenario({
        scenarioId: containedScenarioId,
        manifestSuffix: ".scenario.contained.json",
      });
      writeScenario({
        scenarioId: liveScenarioId,
        manifestSuffix: ".scenario.json",
      });
      writeJson("out/contained-execution/execution.json", {
        schemaVersion: 1,
        executionId: "execution-contained-history",
        scenarioId: containedScenarioId,
        evidenceSetId: "evidence-contained-history",
      });
      writeJson("out/contained-rejection/candidate-rejection.json", {
        schemaVersion: 1,
        candidateId: "contained-rejection-candidate",
        campaignId: "contained-rejection-campaign",
        evidenceSetId: "evidence-contained-rejection",
        reason: "The Candidate retained an invalid historical relationship.",
        predecessorScenarioIds: [containedScenarioId],
        predecessorBatches: [
          { batchIndex: 0, scenarioIds: [containedScenarioId] },
        ],
        catalogueComparison: {
          schemaVersion: 1,
          conclusion: "meaningfullyDistinct",
          comparedScenarioIds: [containedScenarioId],
          closestMatches: [],
          materialDifferentiators: [],
          basis: {
            tag: "compared",
            batches: [
              {
                batchIndex: 0,
                comparedScenarioIds: [containedScenarioId],
                dimensions: {
                  exploratoryPurpose: "Distinct purpose.",
                  materiallyRelevantMechanics: "Distinct mechanics.",
                  encounterComposition: "Distinct composition.",
                  interactionSequence: "Distinct sequence.",
                  tacticalQuestion: "Distinct question.",
                  sdkSupportBoundary: "Supported boundary.",
                  spatialContext: { tag: "notMaterial" },
                },
              },
            ],
          },
        },
      });

      const result = readRawSwarmCatalogue({
        repositoryRoot,
        scenarioDirectory: scenarios,
        evidenceDirectory,
      });
      expect(Either.isRight(result)).toBe(true);
      if (Either.isLeft(result)) return;
      expect(
        result.right.scenarios.map(({ scenarioId }) => scenarioId),
      ).toEqual([liveScenarioId]);
      expect(result.right.containedScenarios).toMatchObject([
        {
          scenarioId: containedScenarioId,
          executionIds: ["execution-contained-history"],
        },
      ]);
      expect(result.right.rejectedCandidates).toMatchObject([
        { candidateId: "contained-rejection-candidate" },
      ]);
      expect(
        projectScenarioCatalogueForAuthoring(result.right).map(
          ({ scenarioId }) => scenarioId,
        ),
      ).toEqual([liveScenarioId]);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
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
    for (const generatedBattleId of [
      "generated-battle",
      "generated-battle-123",
      "generated-battle-123-suffix",
      "generated-battleground",
    ]) {
      expect(Either.isLeft(decodeScenarioId(generatedBattleId))).toBe(true);
      expect(
        Either.isRight(decodeHistoricalScenarioId(generatedBattleId)),
      ).toBe(true);
    }
    expect(
      Either.isRight(decodeScenarioId("prefix-generated-battle-123")),
    ).toBe(true);
    expect(
      Either.isRight(decodePlannedScenarioId("generated-battle-123")),
    ).toBe(true);
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
