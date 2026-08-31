import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { Match } from "effect";
import {
  NonNegativeInteger,
  type NonNegativeInteger as NonNegativeIntegerType,
} from "../packages/shared/src/types.ts";

import {
  evaluateSrdStatBlockCatalogReachability,
  presentStatBlockSummary,
  type SrdStatBlockCatalogReachabilityResult,
} from "../packages/mcp/src/stat-block-catalog-reachability.ts";
import {
  buildSrdStatBlockCatalogFromRecords,
  decodeStatBlockRecords,
  evaluateSrdStatBlockProvenance,
  type SrdStatBlockProvenanceResult,
  type StatBlockRecordsDecodeResult,
  type StatBlockCatalogBuildIssue,
} from "../packages/surface/src/surface/stat-block-catalog.ts";
import { srdStatBlockAggregateInputs } from "../packages/surface/src/surface/generated/srd-stat-block-aggregate.ts";
import {
  SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY,
  SRD_STAT_BLOCK_SOURCE_OCCURRENCE_CARDINALITY,
  SRD_STAT_BLOCK_SOURCE_PATHS,
  type SrdStatBlockParityIssue,
  type SrdStatBlockParityReport,
  type SrdStatBlockSourceFile,
  type SrdStatBlockSourcePath,
  type SrdStatBlockSourceReadIssue,
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
  type PublicationIssue,
} from "./check-surface-content-json-sync.ts";
import {
  checkSrdStatBlockAggregateSync,
  type SrdStatBlockAggregateSyncResult,
} from "./check-srd-stat-block-aggregate.ts";
import { deriveSrdStatBlockParity } from "./srd521-stat-block-parity.ts";

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

type SrdStatBlockCatalogDiagnosticBlocker =
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

type SrdStatBlockInstalledMembershipResult =
  | {
      readonly tag: "installed";
      readonly installedCount: NonNegativeIntegerType;
      readonly catalog: Extract<
        ReturnType<typeof buildSrdStatBlockCatalogFromRecords>,
        { readonly tag: "ok" }
      >["catalog"];
    }
  | {
      readonly tag: "rejected";
      readonly issues: readonly [
        StatBlockCatalogBuildIssue,
        ...StatBlockCatalogBuildIssue[],
      ];
    };

type SrdStatBlockScopedFidelityAssessment =
  | {
      readonly tag: "assessed";
      readonly result: SrdStatBlockScopedFidelityResult;
    }
  | {
      readonly tag: "equipment-source-unavailable";
      readonly message: string;
    };

export type SrdStatBlockCatalogAssessment =
  | {
      readonly tag: "strict-decode-rejected";
      readonly strictDecode: Extract<
        StatBlockRecordsDecodeResult,
        { readonly tag: "rejected" }
      >;
      readonly provenance: SrdStatBlockProvenanceResult;
      readonly installedMembership: SrdStatBlockInstalledMembershipResult;
    }
  | {
      readonly tag: "provenance-rejected";
      readonly strictDecode: Extract<
        StatBlockRecordsDecodeResult,
        { readonly tag: "decoded" }
      >;
      readonly provenance: Extract<
        SrdStatBlockProvenanceResult,
        { readonly tag: "mixed" }
      >;
      readonly installedMembership: SrdStatBlockInstalledMembershipResult;
    }
  | {
      readonly tag: "installed-membership-rejected";
      readonly strictDecode: Extract<
        StatBlockRecordsDecodeResult,
        { readonly tag: "decoded" }
      >;
      readonly provenance: Extract<
        SrdStatBlockProvenanceResult,
        { readonly tag: "homogeneous" }
      >;
      readonly installedMembership: Extract<
        SrdStatBlockInstalledMembershipResult,
        { readonly tag: "rejected" }
      >;
    }
  | {
      readonly tag: "installed";
      readonly strictDecode: Extract<
        StatBlockRecordsDecodeResult,
        { readonly tag: "decoded" }
      >;
      readonly provenance: Extract<
        SrdStatBlockProvenanceResult,
        { readonly tag: "homogeneous" }
      >;
      readonly installedMembership: Extract<
        SrdStatBlockInstalledMembershipResult,
        { readonly tag: "installed" }
      >;
      readonly scopedFidelity: SrdStatBlockScopedFidelityAssessment;
      readonly catalogReachability: SrdStatBlockCatalogReachabilityResult;
    };

export type SrdStatBlockCatalogDiagnosticObservation = {
  readonly aggregateSynchronization: SrdStatBlockAggregateSyncResult;
  readonly parity: SrdStatBlockParityReport;
  readonly publicationCheckIssues: readonly Extract<
    PublicationIssue,
    { readonly kind: "publication-check-failed" }
  >[];
  readonly catalogAssessment: SrdStatBlockCatalogAssessment;
};

type SrdStatBlockCatalogDiagnostic =
  SrdStatBlockCatalogDiagnosticObservation & {
    readonly sourceDenominator: {
      readonly sourceCoverage: SrdStatBlockParityReport["sourceCoverage"];
      readonly occurrenceCount: NonNegativeIntegerType;
      readonly identityCount: NonNegativeIntegerType;
      readonly issues: readonly SrdStatBlockParityIssue[];
    };
    readonly generatedPeerAgreement: {
      readonly issues: readonly (
        | SrdStatBlockParityIssue
        | Extract<
            PublicationIssue,
            { readonly kind: "publication-check-failed" }
          >
      )[];
    };
    readonly catalogParity: {
      readonly issues: readonly SrdStatBlockParityIssue[];
    };
    readonly provenance: {
      readonly issues: readonly (
        | SrdStatBlockParityIssue
        | Extract<
            SrdStatBlockProvenanceResult,
            { readonly tag: "mixed" }
          >["issues"][number]
      )[];
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
  assessment: SrdStatBlockScopedFidelityAssessment,
): boolean {
  return Match.value(assessment).pipe(
    Match.when({ tag: "equipment-source-unavailable" }, () => true),
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
  assessment: SrdStatBlockCatalogReachabilityResult,
): boolean {
  return Match.value(assessment).pipe(
    Match.when({ tag: "reachable" }, () => false),
    Match.when({ tag: "unreachable" }, () => true),
    Match.exhaustive,
  );
}

export function evaluateSrdStatBlockCatalogDiagnostic(
  observation: SrdStatBlockCatalogDiagnosticObservation,
): SrdStatBlockCatalogDiagnosticResult {
  const parityIssues = ownedParityIssues(observation.parity.issues);
  const catalogEvidenceAvailable = Match.value(
    observation.catalogAssessment,
  ).pipe(
    Match.when({ tag: "installed" }, () => true),
    Match.when({ tag: "strict-decode-rejected" }, () => false),
    Match.when({ tag: "provenance-rejected" }, () => false),
    Match.when({ tag: "installed-membership-rejected" }, () => false),
    Match.exhaustive,
  );
  const localProvenanceIssues = Match.value(
    observation.catalogAssessment.provenance,
  ).pipe(
    Match.when({ tag: "mixed" }, ({ issues }) => issues),
    Match.when({ tag: "homogeneous" }, () => []),
    Match.exhaustive,
  );
  const sourceDenominator = {
    sourceCoverage: observation.parity.sourceCoverage,
    occurrenceCount: NonNegativeInteger(
      observation.parity.discovery.occurrences.length,
    ),
    identityCount: NonNegativeInteger(
      observation.parity.discovery.identities.length,
    ),
    issues: parityIssues["source-denominator"],
  };
  const diagnostic: SrdStatBlockCatalogDiagnostic = {
    ...observation,
    sourceDenominator,
    generatedPeerAgreement: {
      issues: [
        ...parityIssues["generated-peer-agreement"],
        ...observation.publicationCheckIssues,
      ],
    },
    catalogParity: {
      issues: catalogEvidenceAvailable ? parityIssues["catalog-parity"] : [],
    },
    provenance: {
      issues: [
        ...localProvenanceIssues,
        ...(catalogEvidenceAvailable ? parityIssues.provenance : []),
      ],
    },
    exclusions: SRD_STAT_BLOCK_CATALOG_DIAGNOSTIC_EXCLUSIONS,
  };
  const blockers: SrdStatBlockCatalogDiagnosticBlocker[] = [];

  const aggregateSynchronizationBlocks = Match.value(
    observation.aggregateSynchronization,
  ).pipe(
    Match.when({ tag: "unsynchronized" }, () => true),
    Match.when({ tag: "synchronized" }, () => false),
    Match.exhaustive,
  );
  if (aggregateSynchronizationBlocks) {
    blockers.push("aggregate-synchronization");
  }
  if (
    Match.value(sourceDenominator.sourceCoverage).pipe(
      Match.when({ tag: "incomplete" }, () => true),
      Match.when({ tag: "complete" }, () => false),
      Match.exhaustive,
    ) ||
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
    Match.when(
      { tag: "strict-decode-rejected" },
      ({ installedMembership }) => ({
        strictDecode: true,
        installedMembership: Match.value(installedMembership).pipe(
          Match.when({ tag: "rejected" }, () => true),
          Match.when({ tag: "installed" }, () => false),
          Match.exhaustive,
        ),
        scopedFidelity: false,
        catalogReachability: false,
      }),
    ),
    Match.when({ tag: "provenance-rejected" }, ({ installedMembership }) => ({
      strictDecode: false,
      installedMembership: Match.value(installedMembership).pipe(
        Match.when({ tag: "rejected" }, () => true),
        Match.when({ tag: "installed" }, () => false),
        Match.exhaustive,
      ),
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

type SourceMaterials = {
  readonly sourceFiles: readonly SrdStatBlockSourceFile[];
  readonly sourceReadIssues: readonly SrdStatBlockSourceReadIssue[];
  readonly sourceByPath: ReadonlyMap<SrdStatBlockSourcePath, string>;
  readonly equipmentSource:
    | { readonly tag: "available"; readonly contents: string }
    | { readonly tag: "unavailable"; readonly message: string };
};

function readSourceMaterials(repositoryRoot: string): SourceMaterials {
  const sourceFiles: SrdStatBlockSourceFile[] = [];
  const sourceReadIssues: SrdStatBlockSourceReadIssue[] = [];
  const sourceByPath = new Map<SrdStatBlockSourcePath, string>();
  for (const sourcePath of SRD_STAT_BLOCK_SOURCE_PATHS) {
    try {
      const contents = readFileSync(join(repositoryRoot, sourcePath), "utf8");
      sourceByPath.set(sourcePath, contents);
      sourceFiles.push({ sourcePath, contents });
    } catch (error) {
      sourceReadIssues.push({ sourcePath, message: String(error) });
    }
  }
  try {
    return {
      sourceFiles,
      sourceReadIssues,
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
      sourceFiles,
      sourceReadIssues,
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
  const strictDecode = decodeStatBlockRecords(
    input.aggregateInputs ?? srdStatBlockAggregateInputs,
  );
  const decodedRecords = strictDecode.decodedRecords;
  const provenance = evaluateSrdStatBlockProvenance(decodedRecords);
  const srdRecords = Match.value(provenance).pipe(
    Match.when({ tag: "homogeneous" }, ({ records }) => records),
    Match.when({ tag: "mixed" }, ({ srdRecords }) => srdRecords),
    Match.exhaustive,
  );
  const catalogBuild = buildSrdStatBlockCatalogFromRecords(srdRecords);
  const installedMembership: SrdStatBlockInstalledMembershipResult =
    Match.value(catalogBuild).pipe(
      Match.when({ tag: "ok" }, ({ collection, catalog }) => ({
        tag: "installed" as const,
        installedCount: NonNegativeInteger(collection.statBlocks.length),
        catalog,
      })),
      Match.when({ tag: "invalid" }, ({ issues }) => ({
        tag: "rejected" as const,
        issues,
      })),
      Match.exhaustive,
    );
  const catalogPhase = Match.value(strictDecode).pipe(
    Match.when({ tag: "rejected" }, (rejected) => ({
      tag: "strict-decode-rejected" as const,
      strictDecode: rejected,
      provenance,
      installedMembership,
    })),
    Match.when({ tag: "decoded" }, (decoded) =>
      Match.value(provenance).pipe(
        Match.when({ tag: "mixed" }, (mixed) => ({
          tag: "provenance-rejected" as const,
          strictDecode: decoded,
          provenance: mixed,
          installedMembership,
        })),
        Match.when({ tag: "homogeneous" }, (homogeneous) =>
          Match.value(installedMembership).pipe(
            Match.when({ tag: "rejected" }, (rejected) => ({
              tag: "installed-membership-rejected" as const,
              strictDecode: decoded,
              provenance: homogeneous,
              installedMembership: rejected,
            })),
            Match.when({ tag: "installed" }, (installed) => ({
              tag: "ready" as const,
              strictDecode: decoded,
              provenance: homogeneous,
              installedMembership: installed,
            })),
            Match.exhaustive,
          ),
        ),
        Match.exhaustive,
      ),
    ),
    Match.exhaustive,
  );
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
  const sourceMaterials = readSourceMaterials(input.repositoryRoot);
  const parity = deriveSrdStatBlockParity({
    sourceFiles: sourceMaterials.sourceFiles,
    sourceReadIssues: sourceMaterials.sourceReadIssues,
    installedStatBlocks: Match.value(catalogPhase).pipe(
      Match.when({ tag: "ready" }, ({ provenance }) => provenance.records),
      Match.when({ tag: "strict-decode-rejected" }, () => []),
      Match.when({ tag: "provenance-rejected" }, () => []),
      Match.when({ tag: "installed-membership-rejected" }, () => []),
      Match.exhaustive,
    ),
    peerObservations,
  });
  const catalogAssessment: SrdStatBlockCatalogAssessment = Match.value(
    catalogPhase,
  ).pipe(
    Match.when({ tag: "strict-decode-rejected" }, (rejected) => rejected),
    Match.when({ tag: "provenance-rejected" }, (rejected) => rejected),
    Match.when(
      { tag: "installed-membership-rejected" },
      (rejected) => rejected,
    ),
    Match.when({ tag: "ready" }, (ready) => {
      const scopedFidelity = Match.value(sourceMaterials.equipmentSource).pipe(
        Match.when({ tag: "unavailable" }, ({ message }) => ({
          tag: "equipment-source-unavailable" as const,
          message,
        })),
        Match.when({ tag: "available" }, ({ contents }) => ({
          tag: "assessed" as const,
          result: evaluateSrdStatBlockScopedFidelity({
            parity,
            sourceByPath: sourceMaterials.sourceByPath,
            authoredRecords: ready.provenance.records,
            equipmentSource: contents,
          }),
        })),
        Match.exhaustive,
      );
      const catalogReachability = evaluateSrdStatBlockCatalogReachability({
        installedStatBlocks: ready.provenance.records,
        catalog: ready.installedMembership.catalog,
        present: presentStatBlockSummary,
      });
      return {
        ...ready,
        tag: "installed" as const,
        scopedFidelity,
        catalogReachability,
      };
    }),
    Match.exhaustive,
  );

  return evaluateSrdStatBlockCatalogDiagnostic({
    aggregateSynchronization: checkSrdStatBlockAggregateSync(
      input.repositoryRoot,
    ),
    parity,
    publicationCheckIssues: publication.issues.filter(
      (
        issue,
      ): issue is Extract<
        PublicationIssue,
        { readonly kind: "publication-check-failed" }
      > => issue.kind === "publication-check-failed",
    ),
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
    Match.when({ tag: "strict-decode-rejected" }, () => 0),
    Match.when({ tag: "provenance-rejected" }, () => 0),
    Match.when({ tag: "installed-membership-rejected" }, () => 0),
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
