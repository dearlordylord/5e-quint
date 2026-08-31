import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { Match } from "effect";

import {
  evaluateSrdStatBlockCatalogReachability,
  presentStatBlockSummary,
  type SrdStatBlockCatalogReachabilityResult,
} from "../packages/mcp/src/stat-block-catalog-reachability.ts";
import {
  buildStatBlockCatalog,
  decodeSrdStatBlockCollection,
  type SrdStatBlockCollection,
  type SrdStatBlockCollectionDecodeResult,
  type StatBlockCatalogBuildIssue,
  type SrdStatBlockCatalog,
} from "../packages/surface/src/surface/stat-block-catalog.ts";
import { srdStatBlockAggregateInputs } from "../packages/surface/src/surface/generated/srd-stat-block-aggregate.ts";
import {
  SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY,
  SRD_STAT_BLOCK_SOURCE_OCCURRENCE_CARDINALITY,
  SRD_STAT_BLOCK_SOURCE_PATHS,
  type SrdStatBlockParityIssue,
  type SrdStatBlockParityReport,
  type SrdStatBlockSourcePath,
} from "../packages/surface/src/surface/stat-block-parity-observation.ts";
import {
  evaluateSrdStatBlockScopedFidelity,
  type SrdStatBlockScopedFidelityResult,
} from "../packages/surface/src/surface/stat-block-scoped-fidelity.ts";
import { projectSrdStatBlockPeerObservation } from "../packages/surface/src/surface/surface-publication-peer-observation.ts";
import {
  checkDhallJsonCompilerVersion,
  compileDhallToJson,
  runPublicationCheck,
} from "./check-surface-content-json-sync.ts";
import {
  checkSrdStatBlockAggregateSync,
  type SrdStatBlockAggregateSyncResult,
} from "./check-srd-stat-block-aggregate.ts";
import { readSrdStatBlockParity } from "./srd521-stat-block-parity.ts";

export const SRD_STAT_BLOCK_CATALOG_DIAGNOSTIC_EXCLUSIONS = [
  "runtime-execution-#114",
  "selected-graph-binding-#117",
  "hit-dice",
] as const;

export const SRD_STAT_BLOCK_CATALOG_DIAGNOSTIC_BLOCKERS = [
  "aggregate-synchronization",
  "source-denominator",
  "generated-peer-agreement",
  "strict-decode",
  "catalog-parity",
  "provenance",
  "installed-membership",
  "scoped-fidelity",
  "catalog-reachability",
] as const;

export type SrdStatBlockCatalogDiagnosticBlocker =
  (typeof SRD_STAT_BLOCK_CATALOG_DIAGNOSTIC_BLOCKERS)[number];

type ParityIssueOwner =
  | "source-denominator"
  | "generated-peer-agreement"
  | "catalog-parity"
  | "provenance";

const PARITY_ISSUE_OWNER = {
  missing: "catalog-parity",
  extra: "catalog-parity",
  "duplicate-id": "catalog-parity",
  "duplicate-identity": "catalog-parity",
  cardinality: "catalog-parity",
  "divergent-source": "source-denominator",
  "malformed-source": "source-denominator",
  "incomplete-source": "source-denominator",
  "duplicate-source": "source-denominator",
  provenance: "provenance",
  "unreadable-source": "source-denominator",
  "missing-source": "source-denominator",
  "publication-peer": "generated-peer-agreement",
} as const satisfies Readonly<
  Record<SrdStatBlockParityIssue["kind"], ParityIssueOwner>
>;

type OwnedParityIssues = Readonly<
  Record<ParityIssueOwner, readonly SrdStatBlockParityIssue[]>
>;

function ownedParityIssues(
  issues: readonly SrdStatBlockParityIssue[],
): OwnedParityIssues {
  const owned: Record<ParityIssueOwner, SrdStatBlockParityIssue[]> = {
    "source-denominator": [],
    "generated-peer-agreement": [],
    "catalog-parity": [],
    provenance: [],
  };
  for (const issue of issues) owned[PARITY_ISSUE_OWNER[issue.kind]].push(issue);
  return owned;
}

export type SrdStatBlockInstalledMembershipResult =
  | {
      readonly tag: "installed";
      readonly installedCount: number;
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        StatBlockCatalogBuildIssue,
        ...StatBlockCatalogBuildIssue[],
      ];
    }
  | {
      readonly tag: "unavailable";
      readonly cause: "strict-decode";
    };

export type SrdStatBlockCatalogDependentResult<T> =
  | { readonly tag: "assessed"; readonly result: T }
  | {
      readonly tag: "unavailable";
      readonly cause:
        | "strict-decode"
        | "installed-membership"
        | "equipment-source";
      readonly message?: string;
    };

type RejectedSrdStatBlockCollectionDecodeResult = Extract<
  SrdStatBlockCollectionDecodeResult,
  { readonly tag: "rejected" }
>;
type DecodedSrdStatBlockCollectionResult = Extract<
  SrdStatBlockCollectionDecodeResult,
  { readonly tag: "decoded" }
>;

export type SrdStatBlockCatalogAssessment =
  | {
      readonly tag: "strict-decode-rejected";
      readonly strictDecode: RejectedSrdStatBlockCollectionDecodeResult;
    }
  | {
      readonly tag: "installed-membership-rejected";
      readonly strictDecode: DecodedSrdStatBlockCollectionResult;
      readonly installedMembership: Extract<
        SrdStatBlockInstalledMembershipResult,
        { readonly tag: "rejected" }
      >;
    }
  | {
      readonly tag: "installed";
      readonly strictDecode: DecodedSrdStatBlockCollectionResult;
      readonly installedMembership: Extract<
        SrdStatBlockInstalledMembershipResult,
        { readonly tag: "installed" }
      >;
      readonly scopedFidelity: SrdStatBlockCatalogDependentResult<SrdStatBlockScopedFidelityResult>;
      readonly catalogReachability: SrdStatBlockCatalogDependentResult<SrdStatBlockCatalogReachabilityResult>;
    };

export type SrdStatBlockCatalogDiagnosticObservation = {
  readonly aggregateSynchronization: SrdStatBlockAggregateSyncResult;
  readonly parity: SrdStatBlockParityReport;
  readonly catalogAssessment: SrdStatBlockCatalogAssessment;
};

export type SrdStatBlockCatalogDiagnostic =
  SrdStatBlockCatalogDiagnosticObservation & {
    readonly sourceDenominator: {
      readonly sourceCoverage: SrdStatBlockParityReport["sourceCoverage"];
      readonly occurrenceCount: number;
      readonly identityCount: number;
      readonly issues: readonly SrdStatBlockParityIssue[];
    };
    readonly generatedPeerAgreement: {
      readonly issues: readonly SrdStatBlockParityIssue[];
    };
    readonly catalogParity: {
      readonly issues: readonly SrdStatBlockParityIssue[];
    };
    readonly provenance: {
      readonly issues: readonly SrdStatBlockParityIssue[];
    };
    readonly exclusions: typeof SRD_STAT_BLOCK_CATALOG_DIAGNOSTIC_EXCLUSIONS;
  };

export type SrdStatBlockCatalogDiagnosticResult =
  | {
      readonly tag: "accepted";
      readonly diagnostic: SrdStatBlockCatalogDiagnostic;
    }
  | {
      readonly tag: "rejected";
      readonly diagnostic: SrdStatBlockCatalogDiagnostic;
      readonly blockers: readonly [
        SrdStatBlockCatalogDiagnosticBlocker,
        ...SrdStatBlockCatalogDiagnosticBlocker[],
      ];
    };

function scopedFidelityBlocks(
  assessment: SrdStatBlockCatalogDependentResult<SrdStatBlockScopedFidelityResult>,
): boolean {
  return Match.value(assessment).pipe(
    Match.when({ tag: "unavailable" }, () => true),
    Match.when({ tag: "assessed" }, ({ result }) =>
      Match.value(result).pipe(
        Match.when({ tag: "consistent" }, () => false),
        Match.when({ tag: "inconsistent" }, () => true),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

function reachabilityBlocks(
  assessment: SrdStatBlockCatalogDependentResult<SrdStatBlockCatalogReachabilityResult>,
): boolean {
  return Match.value(assessment).pipe(
    Match.when({ tag: "unavailable" }, () => true),
    Match.when({ tag: "assessed" }, ({ result }) =>
      Match.value(result).pipe(
        Match.when({ tag: "reachable" }, () => false),
        Match.when({ tag: "unreachable" }, () => true),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

export function evaluateSrdStatBlockCatalogDiagnostic(
  observation: SrdStatBlockCatalogDiagnosticObservation,
): SrdStatBlockCatalogDiagnosticResult {
  const parityIssues = ownedParityIssues(observation.parity.issues);
  const catalogEvidenceAvailable =
    observation.catalogAssessment.tag === "installed";
  const sourceDenominator = {
    sourceCoverage: observation.parity.sourceCoverage,
    occurrenceCount: observation.parity.discovery.occurrences.length,
    identityCount: observation.parity.discovery.identities.length,
    issues: parityIssues["source-denominator"],
  };
  const diagnostic: SrdStatBlockCatalogDiagnostic = {
    ...observation,
    sourceDenominator,
    generatedPeerAgreement: {
      issues: parityIssues["generated-peer-agreement"],
    },
    catalogParity: {
      issues: catalogEvidenceAvailable ? parityIssues["catalog-parity"] : [],
    },
    provenance: {
      issues: catalogEvidenceAvailable ? parityIssues.provenance : [],
    },
    exclusions: SRD_STAT_BLOCK_CATALOG_DIAGNOSTIC_EXCLUSIONS,
  };
  const blockers: SrdStatBlockCatalogDiagnosticBlocker[] = [];

  if (observation.aggregateSynchronization.tag === "unsynchronized") {
    blockers.push("aggregate-synchronization");
  }
  if (
    sourceDenominator.sourceCoverage.tag === "incomplete" ||
    sourceDenominator.occurrenceCount !==
      SRD_STAT_BLOCK_SOURCE_OCCURRENCE_CARDINALITY ||
    sourceDenominator.identityCount !==
      SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY ||
    sourceDenominator.issues.length > 0
  ) {
    blockers.push("source-denominator");
  }
  if (diagnostic.generatedPeerAgreement.issues.length > 0) {
    blockers.push("generated-peer-agreement");
  }
  const catalogAssessmentBlockers = Match.value(
    observation.catalogAssessment,
  ).pipe(
    Match.when({ tag: "strict-decode-rejected" }, () => ({
      strictDecode: true,
      installedMembership: false,
      scopedFidelity: false,
      catalogReachability: false,
    })),
    Match.when({ tag: "installed-membership-rejected" }, () => ({
      strictDecode: false,
      installedMembership: true,
      scopedFidelity: false,
      catalogReachability: false,
    })),
    Match.when(
      { tag: "installed" },
      ({ installedMembership, scopedFidelity, catalogReachability }) => ({
        strictDecode: false,
        installedMembership:
          installedMembership.installedCount !==
          SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY,
        scopedFidelity: scopedFidelityBlocks(scopedFidelity),
        catalogReachability: reachabilityBlocks(catalogReachability),
      }),
    ),
    Match.exhaustive,
  );
  if (catalogAssessmentBlockers.strictDecode) {
    blockers.push("strict-decode");
  }
  if (diagnostic.catalogParity.issues.length > 0) {
    blockers.push("catalog-parity");
  }
  if (diagnostic.provenance.issues.length > 0) {
    blockers.push("provenance");
  }
  if (catalogAssessmentBlockers.installedMembership) {
    blockers.push("installed-membership");
  }
  if (catalogAssessmentBlockers.scopedFidelity) {
    blockers.push("scoped-fidelity");
  }
  if (catalogAssessmentBlockers.catalogReachability) {
    blockers.push("catalog-reachability");
  }
  const firstBlocker = blockers[0];
  return firstBlocker === undefined
    ? { tag: "accepted", diagnostic }
    : {
        tag: "rejected",
        diagnostic,
        blockers: [firstBlocker, ...blockers.slice(1)],
      };
}

type InstalledCatalogResult =
  | {
      readonly tag: "installed";
      readonly membership: Extract<
        SrdStatBlockInstalledMembershipResult,
        { readonly tag: "installed" }
      >;
      readonly collection: SrdStatBlockCollection;
      readonly catalog: SrdStatBlockCatalog;
    }
  | {
      readonly tag: "installed-membership-rejected";
      readonly membership: Extract<
        SrdStatBlockInstalledMembershipResult,
        { readonly tag: "rejected" }
      >;
    }
  | {
      readonly tag: "strict-decode-rejected";
      readonly membership: Extract<
        SrdStatBlockInstalledMembershipResult,
        { readonly tag: "unavailable" }
      >;
    };

function buildDecodedCatalog(
  strictDecode: SrdStatBlockCollectionDecodeResult,
): InstalledCatalogResult {
  return Match.value(strictDecode).pipe(
    Match.when({ tag: "rejected" }, () => ({
      tag: "strict-decode-rejected" as const,
      membership: {
        tag: "unavailable" as const,
        cause: "strict-decode" as const,
      },
    })),
    Match.when({ tag: "decoded" }, ({ collection }) =>
      Match.value(buildStatBlockCatalog({ collections: [collection] })).pipe(
        Match.when({ tag: "invalid" }, ({ issues }) => {
          const firstIssue = issues[0];
          /* v8 ignore start -- @preserve -- invalid catalog construction always carries at least one build issue */
          if (firstIssue === undefined) {
            throw new Error("Invalid Stat Block catalog has no build issue");
          }
          /* v8 ignore stop -- @preserve */
          return {
            tag: "installed-membership-rejected" as const,
            membership: {
              tag: "rejected" as const,
              issues: [firstIssue, ...issues.slice(1)] as const,
            },
          };
        }),
        Match.when({ tag: "ok" }, ({ catalog }) => ({
          tag: "installed" as const,
          membership: {
            tag: "installed" as const,
            installedCount: collection.statBlocks.length,
          },
          collection,
          catalog,
        })),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
}

type SourceMaterials = {
  readonly sourceByPath: ReadonlyMap<SrdStatBlockSourcePath, string>;
  readonly equipmentSource:
    | { readonly tag: "available"; readonly contents: string }
    | { readonly tag: "unavailable"; readonly message: string };
};

function readSourceMaterials(repositoryRoot: string): SourceMaterials {
  const sourceByPath = new Map<SrdStatBlockSourcePath, string>();
  for (const sourcePath of SRD_STAT_BLOCK_SOURCE_PATHS) {
    try {
      sourceByPath.set(
        sourcePath,
        readFileSync(join(repositoryRoot, sourcePath), "utf8"),
      );
    } catch {
      // The parity reader owns the typed source-path diagnostic.
    }
  }
  try {
    return {
      sourceByPath,
      equipmentSource: {
        tag: "available",
        contents: readFileSync(
          join(repositoryRoot, ".references/srd-5.2.1/Equipment.md"),
          "utf8",
        ),
      },
    };
  } catch (error) {
    return {
      sourceByPath,
      equipmentSource: { tag: "unavailable", message: String(error) },
    };
  }
}

export function runSrdStatBlockCatalogDiagnostic(input: {
  readonly repositoryRoot: string;
  readonly compile: (
    sourcePath: string,
    outputPath: string,
  ) => string | undefined;
  readonly aggregateInputs?: readonly [unknown, ...unknown[]];
}): SrdStatBlockCatalogDiagnosticResult {
  const strictDecode = decodeSrdStatBlockCollection(
    input.aggregateInputs ?? srdStatBlockAggregateInputs,
  );
  const installed = buildDecodedCatalog(strictDecode);
  const publication = runPublicationCheck({
    repoRoot: input.repositoryRoot,
    contentDir: join(input.repositoryRoot, "packages", "surface", "content"),
    compile: input.compile,
  });
  const peerObservations = publication.peerObservations.flatMap(
    (observation) => {
      const projected = projectSrdStatBlockPeerObservation(observation);
      return projected === undefined ? [] : [projected];
    },
  );
  const installedRecords =
    installed.tag === "installed" ? installed.collection.statBlocks : [];
  const parity = readSrdStatBlockParity({
    repoRoot: input.repositoryRoot,
    installedStatBlocks: installedRecords,
    peerObservations,
  });
  const sourceMaterials = readSourceMaterials(input.repositoryRoot);
  const scopedFidelity =
    installed.tag === "installed"
      ? Match.value(sourceMaterials.equipmentSource).pipe(
          Match.when({ tag: "unavailable" }, ({ message }) => ({
            tag: "unavailable" as const,
            cause: "equipment-source" as const,
            message,
          })),
          Match.when({ tag: "available" }, ({ contents }) => ({
            tag: "assessed" as const,
            result: evaluateSrdStatBlockScopedFidelity({
              parity,
              sourceByPath: sourceMaterials.sourceByPath,
              authoredRecords: installed.collection.statBlocks,
              equipmentSource: contents,
            }),
          })),
          Match.exhaustive,
        )
      : {
          tag: "unavailable" as const,
          cause:
            installed.tag === "strict-decode-rejected"
              ? ("strict-decode" as const)
              : ("installed-membership" as const),
        };
  const catalogReachability =
    installed.tag === "installed"
      ? {
          tag: "assessed" as const,
          result: evaluateSrdStatBlockCatalogReachability({
            installedStatBlocks: installed.collection.statBlocks,
            catalog: installed.catalog,
            present: presentStatBlockSummary,
          }),
        }
      : {
          tag: "unavailable" as const,
          cause:
            installed.tag === "strict-decode-rejected"
              ? ("strict-decode" as const)
              : ("installed-membership" as const),
        };

  const catalogAssessment: SrdStatBlockCatalogAssessment = Match.value(
    strictDecode,
  ).pipe(
    Match.when({ tag: "rejected" }, (rejected) => ({
      tag: "strict-decode-rejected" as const,
      strictDecode: rejected,
    })),
    Match.when({ tag: "decoded" }, (decoded) =>
      Match.value(installed).pipe(
        Match.when({ tag: "installed" }, ({ membership }) => ({
          tag: "installed" as const,
          strictDecode: decoded,
          installedMembership: membership,
          scopedFidelity,
          catalogReachability,
        })),
        Match.when(
          { tag: "installed-membership-rejected" },
          ({ membership }) => ({
            tag: "installed-membership-rejected" as const,
            strictDecode: decoded,
            installedMembership: membership,
          }),
        ),
        Match.when({ tag: "strict-decode-rejected" }, () => {
          throw new Error(
            "Decoded Stat Block collection produced a strict-decode rejection",
          );
        }),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );

  return evaluateSrdStatBlockCatalogDiagnostic({
    aggregateSynchronization: checkSrdStatBlockAggregateSync(
      input.repositoryRoot,
    ),
    parity,
    catalogAssessment,
  });
}

function main(): void {
  const compiler = spawnSync("dhall-to-json", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (compiler.error || compiler.status !== 0) {
    console.error(
      "dhall-to-json is required to verify Surface content JSON sync.",
    );
    process.exitCode = 1;
    return;
  }
  const compilerVersionIssue = checkDhallJsonCompilerVersion(compiler.stdout);
  if (compilerVersionIssue !== undefined) {
    console.error(compilerVersionIssue);
    process.exitCode = 1;
    return;
  }

  const result = runSrdStatBlockCatalogDiagnostic({
    repositoryRoot: process.cwd(),
    compile: compileDhallToJson,
  });
  const { sourceDenominator } = result.diagnostic;
  const summary = `${sourceDenominator.occurrenceCount} source occurrences, ${sourceDenominator.identityCount} agreeing identities, ${Match.value(
    result.diagnostic.catalogAssessment,
  ).pipe(
    Match.when(
      { tag: "installed" },
      ({ installedMembership }) => installedMembership.installedCount,
    ),
    Match.when({ tag: "installed-membership-rejected" }, () => 0),
    Match.when({ tag: "strict-decode-rejected" }, () => 0),
    Match.exhaustive,
  )} strictly decoded and installed Stat Blocks`;

  Match.value(result).pipe(
    Match.when({ tag: "accepted" }, () => {
      console.log(`SRD Stat Block catalog diagnostic passed: ${summary}.`);
      console.log(
        `Excluded: ${SRD_STAT_BLOCK_CATALOG_DIAGNOSTIC_EXCLUSIONS.join(", ")}.`,
      );
    }),
    Match.when({ tag: "rejected" }, ({ blockers, diagnostic }) => {
      console.error(`SRD Stat Block catalog diagnostic rejected: ${summary}.`);
      console.error(`Blockers: ${blockers.join(", ")}.`);
      console.error(JSON.stringify(diagnostic, null, 2));
      process.exitCode = 1;
    }),
    Match.exhaustive,
  );
}

if (process.argv[1]?.endsWith("check-srd-stat-block-catalog.ts") === true) {
  main();
}
