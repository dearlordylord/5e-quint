import { copyFileSync } from "node:fs";

import { Match } from "effect";
import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";

import { PositiveInteger } from "../packages/shared/src/types.ts";
import { projectSrdStatBlockPeerObservation } from "../packages/surface/src/surface/surface-publication-peer-observation.ts";
import { decodeStatBlockRecords } from "../packages/surface/src/surface/stat-block-catalog.ts";
import {
  evaluateSrdStatBlockCatalogDiagnostic,
  runSrdStatBlockCatalogDiagnostic,
  type SrdStatBlockCatalogDiagnosticObservation,
  type SrdStatBlockCatalogDiagnosticResult,
} from "./check-srd-stat-block-catalog.ts";
import { SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH } from "./srd-stat-block-aggregate.ts";
import { runPublicationCheck } from "./check-surface-content-json-sync.ts";

const MUTATIONS = [
  "aggregate",
  "source-denominator",
  "peer-agreement",
  "strict-decode",
  "catalog-parity",
  "provenance",
  "installed-membership",
  "scoped-fidelity",
  "catalog-reachability",
] as const;
type Mutation = (typeof MUTATIONS)[number];

const EXPECTED_BLOCKER = {
  aggregate: "aggregate-synchronization",
  "source-denominator": "source-denominator",
  "peer-agreement": "generated-peer-agreement",
  "strict-decode": "strict-decode",
  "catalog-parity": "catalog-parity",
  provenance: "provenance",
  "installed-membership": "installed-membership",
  "scoped-fidelity": "scoped-fidelity",
  "catalog-reachability": "catalog-reachability",
} as const;

function acceptedDiagnostic(
  result: SrdStatBlockCatalogDiagnosticResult,
): Extract<SrdStatBlockCatalogDiagnosticResult, { readonly tag: "accepted" }> {
  return Match.value(result).pipe(
    Match.when({ tag: "accepted" }, (accepted) => accepted),
    Match.when({ tag: "rejected" }, ({ blockers }) => {
      throw new Error(`Expected accepted diagnostic: ${blockers.join(", ")}`);
    }),
    Match.exhaustive,
  );
}

function rejectedBlockers(
  result: SrdStatBlockCatalogDiagnosticResult,
): readonly string[] {
  return Match.value(result).pipe(
    Match.when({ tag: "accepted" }, () => {
      throw new Error("Expected rejected diagnostic");
    }),
    Match.when({ tag: "rejected" }, ({ blockers }) => blockers),
    Match.exhaustive,
  );
}

function installedAssessment(
  observation: SrdStatBlockCatalogDiagnosticObservation,
) {
  return Match.value(observation.catalogAssessment).pipe(
    Match.when({ tag: "installed" }, (installed) => installed),
    Match.when({ tag: "strict-decode-rejected" }, () => {
      throw new Error("Canonical catalog assessment was rejected");
    }),
    Match.when({ tag: "provenance-rejected" }, () => {
      throw new Error("Canonical catalog assessment was rejected");
    }),
    Match.when({ tag: "installed-membership-rejected" }, () => {
      throw new Error("Canonical catalog assessment was rejected");
    }),
    Match.exhaustive,
  );
}

function applyMutation(
  observation: SrdStatBlockCatalogDiagnosticObservation,
  mutation: Mutation,
): SrdStatBlockCatalogDiagnosticObservation {
  const installed =
    observation.catalogAssessment.tag === "installed"
      ? observation.catalogAssessment
      : undefined;
  return Match.value(mutation).pipe(
    Match.when("aggregate", () => ({
      ...observation,
      aggregateSynchronization: {
        tag: "unsynchronized" as const,
        issues: [
          {
            kind: "aggregate-out-of-sync" as const,
            file: SRD_STAT_BLOCK_AGGREGATE_RELATIVE_PATH,
          },
        ] as const,
      },
    })),
    Match.when("source-denominator", () => ({
      ...observation,
      parity: {
        ...observation.parity,
        discovery: {
          ...observation.parity.discovery,
          occurrences: observation.parity.discovery.occurrences.slice(1),
        },
      },
    })),
    Match.when("peer-agreement", () => ({
      ...observation,
      parity: {
        ...observation.parity,
        issues: [
          ...observation.parity.issues,
          {
            kind: "publication-peer" as const,
            evidence: {
              tag: "missing" as const,
              recordKind: "statBlock" as const,
              sourcePath: "synthetic-stat-block.dhall",
              peerPath: "synthetic-stat-block.json",
            },
          },
        ],
      },
    })),
    Match.when("strict-decode", () => {
      const strictDecode = decodeStatBlockRecords([{}]);
      if (strictDecode.tag !== "rejected") {
        throw new Error("Malformed aggregate input unexpectedly decoded");
      }
      return {
        ...observation,
        catalogAssessment: {
          tag: "strict-decode-rejected" as const,
          strictDecode,
          partialProvenance: {
            tag: "homogeneous" as const,
            records: [],
          },
          decodedSrdMembership: {
            tag: "unavailable" as const,
            cause: "no-decoded-srd-records" as const,
          },
        },
      };
    }),
    Match.when("catalog-parity", () => ({
      ...observation,
      parity: {
        ...observation.parity,
        issues: [
          ...observation.parity.issues,
          { kind: "missing" as const, name: "Synthetic Missing Creature" },
        ],
      },
    })),
    Match.when("provenance", () => ({
      ...observation,
      parity: {
        ...observation.parity,
        issues: [
          ...observation.parity.issues,
          {
            kind: "provenance" as const,
            reason: "kind" as const,
            name: "Synthetic Provenance Creature",
            statBlockId: observation.parity.installedRecords[0]!.id,
            actualKind: "synthetic-test" as const,
          },
        ],
      },
    })),
    Match.when("installed-membership", () =>
      installed === undefined
        ? observation
        : {
            ...observation,
            catalogAssessment: {
              ...installed,
              installedMembership: {
                ...installed.installedMembership,
                installedCount: PositiveInteger(
                  installed.installedMembership.installedCount - 1,
                ),
              },
            },
          },
    ),
    Match.when("scoped-fidelity", () =>
      installed === undefined
        ? observation
        : {
            ...observation,
            catalogAssessment: {
              ...installed,
              scopedFidelity: {
                tag: "equipment-source-unavailable" as const,
                message: "synthetic equipment failure",
              },
            },
          },
    ),
    Match.when("catalog-reachability", () =>
      installed === undefined
        ? observation
        : {
            ...observation,
            catalogAssessment: {
              ...installed,
              catalogReachability: {
                tag: "unreachable" as const,
                issues: [
                  {
                    kind: "missing-list-entry" as const,
                    statBlockId: installed.provenance.records[0]!.id,
                  },
                ] as const,
              },
            },
          },
    ),
    Match.exhaustive,
  );
}

describe("standalone SRD Stat Block catalog diagnostic", () => {
  let canonical: SrdStatBlockCatalogDiagnosticObservation;

  beforeAll(() => {
    const result = acceptedDiagnostic(
      runSrdStatBlockCatalogDiagnostic({
        repositoryRoot: process.cwd(),
        compile: (sourcePath, outputPath) => {
          copyFileSync(sourcePath.replace(/\.dhall$/, ".json"), outputPath);
          return undefined;
        },
      }),
    );
    canonical = result.diagnostic;
  }, 30_000);

  it("proves the complete 334 to 330 to 330 catalog without expanding deferred scope", () => {
    const result = acceptedDiagnostic(
      evaluateSrdStatBlockCatalogDiagnostic(canonical),
    );
    const installed = installedAssessment(result.diagnostic);

    expect(result.diagnostic.sourceDenominator).toMatchObject({
      occurrenceCount: 334,
      identityCount: 330,
      issues: [],
    });
    expect(installed.installedMembership.installedCount).toBe(330);
    expect(result.diagnostic.catalogParity.issues).toEqual([]);
    expect(result.diagnostic.provenance.issues).toEqual([]);
    expect(result.diagnostic.generatedPeerAgreement.issues).toEqual([]);
    expect(result.diagnostic.exclusions).toEqual([
      "runtime-execution-#114",
      "selected-graph-binding-#117",
      "hit-dice",
    ]);
  });

  it("accumulates every independent diagnostic failure", () => {
    const independentMutations = MUTATIONS.filter(
      (mutation) => mutation !== "strict-decode",
    );
    const mutated = independentMutations.reduce(applyMutation, canonical);
    expect(
      rejectedBlockers(evaluateSrdStatBlockCatalogDiagnostic(mutated)),
    ).toEqual(
      independentMutations.map((mutation) => EXPECTED_BLOCKER[mutation]),
    );
  });

  it("retains precise scoped-projection issues in the public diagnostic", () => {
    const installed = installedAssessment(canonical);
    expect(installed.scopedFidelity.tag).toBe("assessed");
    if (installed.scopedFidelity.tag !== "assessed") return;
    expect(installed.scopedFidelity.result.tag).toBe("consistent");
    if (installed.scopedFidelity.result.tag !== "consistent") return;
    const occurrence = installed.scopedFidelity.result.occurrences[0];
    expect(occurrence).toBeDefined();
    if (occurrence === undefined) return;
    const failure = {
      tag: "projection-issues" as const,
      issues: [
        {
          kind: "unsupported-evidence" as const,
          anchor: {
            kind: "raw" as const,
            sourcePath: occurrence.source.anchor.sourcePath,
            heading: occurrence.source.anchor.heading,
            lineStart: occurrence.source.anchor.lineStart,
            lineEnd: occurrence.source.anchor.lineEnd,
            field: "challengeRating",
          },
          evidence: "99",
          supported: "a canonical challenge rating",
        },
      ] as const,
    };
    const mutated: SrdStatBlockCatalogDiagnosticObservation = {
      ...canonical,
      catalogAssessment: {
        ...installed,
        scopedFidelity: {
          tag: "assessed",
          result: {
            tag: "inconsistent",
            issues: [
              {
                kind: "raw-projection-failed",
                source: occurrence.source,
                failure,
              },
            ],
            authoredAdmissions:
              installed.scopedFidelity.result.authoredAdmissions,
          },
        },
      },
    };

    const result = evaluateSrdStatBlockCatalogDiagnostic(mutated);
    expect(result.tag).toBe("rejected");
    expect(result.diagnostic.catalogAssessment).toMatchObject({
      tag: "installed",
      scopedFidelity: {
        tag: "assessed",
        result: {
          tag: "inconsistent",
          issues: [{ failure }],
        },
      },
    });
  });

  it("retains exact blocker sets for every nonempty mutation subset and order", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom(...MUTATIONS), {
          minLength: 1,
          maxLength: MUTATIONS.length,
        }),
        (mutations) => {
          const mutated = mutations.reduce(applyMutation, canonical);
          const strictDecodeRejected = mutations.includes("strict-decode");
          const shadowedByStrictDecode = new Set<Mutation>([
            "catalog-parity",
            "provenance",
            "installed-membership",
            "scoped-fidelity",
            "catalog-reachability",
          ]);
          const observableMutations = strictDecodeRejected
            ? mutations.filter(
                (mutation) => !shadowedByStrictDecode.has(mutation),
              )
            : mutations;
          expect(
            new Set(
              rejectedBlockers(evaluateSrdStatBlockCatalogDiagnostic(mutated)),
            ),
          ).toEqual(
            new Set(
              observableMutations.map((mutation) => EXPECTED_BLOCKER[mutation]),
            ),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it("accumulates strict decode, provenance, and duplicate identity issues", () => {
    const installed = installedAssessment(canonical);
    const first = installed.provenance.records[0]!;
    const nonSrd = {
      ...first,
      provenance: { kind: "synthetic-test" as const, section: "synthetic" },
    };
    const result = runSrdStatBlockCatalogDiagnostic({
      repositoryRoot: process.cwd(),
      aggregateInputs: [{}, nonSrd, first, first],
      compile: (sourcePath, outputPath) => {
        copyFileSync(sourcePath.replace(/\.dhall$/, ".json"), outputPath);
        return undefined;
      },
    });

    expect(rejectedBlockers(result)).toEqual([
      "strict-decode",
      "provenance",
      "installed-membership",
    ]);
    expect(result.diagnostic.provenance.issues[0]).toMatchObject({
      code: "nonSrdStatBlockProvenance",
      inputOrdinal: 2,
    });
  });

  it("does not invent catalog parity failures when strict decode is unavailable", () => {
    const result = runSrdStatBlockCatalogDiagnostic({
      repositoryRoot: process.cwd(),
      aggregateInputs: [{}],
      compile: (sourcePath, outputPath) => {
        copyFileSync(sourcePath.replace(/\.dhall$/, ".json"), outputPath);
        return undefined;
      },
    });

    expect(rejectedBlockers(result)).toEqual(["strict-decode"]);
    expect(result.diagnostic.catalogParity.issues).toEqual([]);
    expect(result.diagnostic.provenance.issues).toEqual([]);
    expect(result.diagnostic.sourceDenominator).toMatchObject({
      occurrenceCount: 334,
      identityCount: 330,
      issues: [],
    });
    expect(result.diagnostic.catalogAssessment).toMatchObject({
      tag: "strict-decode-rejected",
      partialProvenance: { tag: "homogeneous", records: [] },
      decodedSrdMembership: {
        tag: "unavailable",
        cause: "no-decoded-srd-records",
      },
    });
  });

  it("does not admit Unit-only publication observations to the Stat Block result", () => {
    expect(
      projectSrdStatBlockPeerObservation({
        tag: "source-failed",
        reason: "compile",
        recordKind: "other",
        sourcePath: "synthetic-unit.dhall",
        peerPath: "synthetic-unit.json",
        message: "synthetic Unit failure",
      }),
    ).toBeUndefined();
    expect(evaluateSrdStatBlockCatalogDiagnostic(canonical).tag).toBe(
      "accepted",
    );
  });

  it("turns throwing compiler callbacks into peer evidence without losing independent facts", () => {
    const result = runSrdStatBlockCatalogDiagnostic({
      repositoryRoot: process.cwd(),
      compile: () => {
        throw new Error("synthetic compiler failure");
      },
    });

    expect(rejectedBlockers(result)).toEqual(["generated-peer-agreement"]);
    expect(result.diagnostic.sourceDenominator).toMatchObject({
      occurrenceCount: 334,
      identityCount: 330,
      issues: [],
    });
    expect(result.diagnostic.catalogAssessment.tag).toBe("installed");
  });

  it("returns typed evidence when publication discovery is unreadable", () => {
    const result = runPublicationCheck({
      repoRoot: process.cwd(),
      contentDir: `${process.cwd()}/synthetic-missing-surface-content`,
      compile: () => undefined,
    });

    expect(result).toMatchObject({
      sourceCount: 0,
      peerCount: 0,
      peerObservations: [],
      issues: [{ kind: "publication-check-failed", stage: "discovery" }],
    });
  });
});
