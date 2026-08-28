import { join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  checkDhallJsonCompilerVersion,
  compileDhallToJson,
  runSurfacePublicationCheck,
  type PublicationCheckOptions,
  type SurfacePublicationCheckResult,
} from "./check-surface-content-json-sync.ts";
import {
  SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY,
  SRD_STAT_BLOCK_SOURCE_OCCURRENCE_CARDINALITY,
  srdStatBlockSourceIdentityCount,
  srdStatBlockSourceOccurrenceCount,
  type SrdStatBlockParityIssue,
} from "./srd521-stat-block-parity.ts";
import {
  checkSrdStatBlockAggregateSync,
  type SrdStatBlockAggregateSyncResult,
} from "./check-srd-stat-block-aggregate.ts";
import {
  evaluateSrdStatBlockCatalogReachability,
  readSrdStatBlockPresentations,
  type SrdStatBlockCatalogReachabilityReport,
} from "./srd-stat-block-catalog-reachability.ts";
import {
  srdStatBlockCatalog,
  srdStatBlockCollection,
} from "../packages/surface/src/surface/stat-block-catalog.ts";

export const SURFACE_STAT_BLOCK_PARITY_FINAL_BLOCKERS = [
  "aggregate-sync-issues",
  "publication-issues",
  "incomplete-source-coverage",
  "source-occurrence-cardinality",
  "source-identity-cardinality",
  "parity-issues",
  "installed-cardinality",
  "listed-cardinality",
  "presentation-cardinality",
  "reachability-issues",
] as const;

export type SurfaceStatBlockParityFinalBlocker =
  (typeof SURFACE_STAT_BLOCK_PARITY_FINAL_BLOCKERS)[number];

export type SurfaceStatBlockParityFinalCheck = SurfacePublicationCheckResult & {
  readonly aggregateSync: SrdStatBlockAggregateSyncResult;
  readonly catalogReachability: SrdStatBlockCatalogReachabilityReport;
};

export type SurfaceStatBlockParityFinalGateResult =
  | {
      readonly tag: "accepted";
      readonly check: SurfaceStatBlockParityFinalCheck;
    }
  | {
      readonly tag: "rejected";
      readonly check: SurfaceStatBlockParityFinalCheck;
      readonly blockers: readonly SurfaceStatBlockParityFinalBlocker[];
    };

export function evaluateSurfaceStatBlockParityFinal(
  check: SurfaceStatBlockParityFinalCheck,
): SurfaceStatBlockParityFinalGateResult {
  const blockers: SurfaceStatBlockParityFinalBlocker[] = [];
  if (check.aggregateSync.tag === "unsynchronized") {
    blockers.push("aggregate-sync-issues");
  }
  if (check.issues.length > 0) blockers.push("publication-issues");
  if (check.statBlockParity.sourceCoverage.tag !== "complete") {
    blockers.push("incomplete-source-coverage");
  }
  if (
    srdStatBlockSourceOccurrenceCount(check.statBlockParity.discovery) !==
    SRD_STAT_BLOCK_SOURCE_OCCURRENCE_CARDINALITY
  ) {
    blockers.push("source-occurrence-cardinality");
  }
  if (
    srdStatBlockSourceIdentityCount(check.statBlockParity.discovery) !==
    SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY
  ) {
    blockers.push("source-identity-cardinality");
  }
  if (check.statBlockParity.issues.length > 0) blockers.push("parity-issues");
  if (
    check.catalogReachability.installedCount !==
    SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY
  ) {
    blockers.push("installed-cardinality");
  }
  if (
    check.catalogReachability.listedCount !==
    SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY
  ) {
    blockers.push("listed-cardinality");
  }
  if (
    check.catalogReachability.presentationCount !==
    SRD_STAT_BLOCK_SOURCE_IDENTITY_CARDINALITY
  ) {
    blockers.push("presentation-cardinality");
  }
  if (check.catalogReachability.issues.length > 0) {
    blockers.push("reachability-issues");
  }

  return blockers.length === 0
    ? { tag: "accepted", check }
    : { tag: "rejected", check, blockers };
}

export function runSurfaceStatBlockParityFinal(
  options: PublicationCheckOptions,
): SurfaceStatBlockParityFinalGateResult {
  const publication = runSurfacePublicationCheck(options);
  const publicationDir =
    options.publicationDir ??
    join(options.repoRoot, "packages", "surface", "publication");
  return evaluateSurfaceStatBlockParityFinal({
    ...publication,
    aggregateSync: checkSrdStatBlockAggregateSync(options.repoRoot),
    catalogReachability: evaluateSrdStatBlockCatalogReachability({
      installedStatBlocks: srdStatBlockCollection.statBlocks,
      catalog: srdStatBlockCatalog,
      presentations: readSrdStatBlockPresentations(
        join(publicationDir, "srd-surface.json"),
      ),
    }),
  });
}

/**
 * Keep the final gate's publication inputs aligned with the ordinary
 * publication command. The portable case artifact is part of publication
 * evidence, even though it is not part of the stat-block parity report.
 */
export function surfaceStatBlockParityFinalOptions(
  repoRoot: string,
): PublicationCheckOptions & { readonly portableCasesPath: string } {
  const contentDir = join(repoRoot, "packages", "surface", "content");
  return {
    repoRoot,
    contentDir,
    publicationDir: join(repoRoot, "packages", "surface", "publication"),
    portableCasesPath: join(
      repoRoot,
      "packages/surface/portable-cases/srd-surface-cases.json",
    ),
    compile: compileDhallToJson,
  };
}

type ParityIssueCount = {
  readonly kind: SrdStatBlockParityIssue["kind"];
  readonly count: number;
};

function parityIssueCounts(
  issues: readonly SrdStatBlockParityIssue[],
): readonly ParityIssueCount[] {
  const counts = new Map<SrdStatBlockParityIssue["kind"], number>();
  for (const issue of issues) {
    counts.set(issue.kind, (counts.get(issue.kind) ?? 0) + 1);
  }
  return Array.from(counts, ([kind, count]) => ({ kind, count })).sort(
    (left, right) => left.kind.localeCompare(right.kind),
  );
}

function describeSourceCoverage(check: SurfacePublicationCheckResult): string {
  const coverage = check.statBlockParity.sourceCoverage;
  if (coverage.tag === "complete") {
    return `complete (${coverage.paths.length} source paths)`;
  }
  return [
    "incomplete",
    `available=${coverage.availablePaths.length}`,
    `missing=${coverage.missingPaths.length}`,
    `unreadable=${coverage.unreadablePaths.length}`,
    `incomplete=${coverage.incompletePaths.length}`,
  ].join(" ");
}

function reportRejectedGate(
  result: Extract<
    SurfaceStatBlockParityFinalGateResult,
    { readonly tag: "rejected" }
  >,
): void {
  const { check } = result;
  const report = check.statBlockParity;
  const occurrenceCount = srdStatBlockSourceOccurrenceCount(report.discovery);
  const identityCount = srdStatBlockSourceIdentityCount(report.discovery);
  const issueCounts = parityIssueCounts(report.issues)
    .map(({ kind, count }) => `${kind}=${count}`)
    .join(", ");

  console.error(
    `SRD stat-block parity final acceptance rejected: ${occurrenceCount} source occurrences, ${identityCount} source identities, ${report.issues.length} parity issues.`,
  );
  console.error(`Blockers: ${result.blockers.join(", ")}.`);
  console.error(`Publication issues: ${check.issues.length}.`);
  console.error(
    `Aggregate sync: ${check.aggregateSync.tag}. Catalog reachability: installed=${check.catalogReachability.installedCount} listed=${check.catalogReachability.listedCount} presented=${check.catalogReachability.presentationCount} issues=${check.catalogReachability.issues.length}.`,
  );
  console.error(`Source coverage: ${describeSourceCoverage(check)}.`);
  console.error(`Parity issue counts: ${issueCounts || "none"}.`);
  for (const issue of check.issues) {
    console.error(`- publication-issue: ${JSON.stringify(issue)}`);
  }
  if (check.aggregateSync.tag === "unsynchronized") {
    for (const issue of check.aggregateSync.issues) {
      console.error(`- aggregate-sync-issue: ${JSON.stringify(issue)}`);
    }
  }
  for (const issue of check.catalogReachability.issues) {
    console.error(`- reachability-issue: ${JSON.stringify(issue)}`);
  }
  for (const issue of report.issues) {
    if (issue.kind !== "missing") {
      console.error(`- parity-issue: ${JSON.stringify(issue)}`);
    }
  }
}

function main(): void {
  const repoRoot = process.cwd();
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

  const result = runSurfaceStatBlockParityFinal(
    surfaceStatBlockParityFinalOptions(repoRoot),
  );
  if (result.tag === "rejected") {
    reportRejectedGate(result);
    process.exitCode = 1;
    return;
  }

  const report = result.check.statBlockParity;
  console.log(
    `SRD stat-block parity final acceptance passed: ${srdStatBlockSourceOccurrenceCount(report.discovery)} source occurrences, ${srdStatBlockSourceIdentityCount(report.discovery)} source identities, ${report.issues.length} parity issues.`,
  );
}

if (
  process.argv[1]?.endsWith("check-surface-stat-block-parity-final.ts") === true
) {
  main();
}
