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
  srdStatBlockSourceIdentityCount,
  srdStatBlockSourceOccurrenceCount,
  type SrdStatBlockParityIssue,
} from "./srd521-stat-block-parity.ts";

export const SURFACE_STAT_BLOCK_PARITY_FINAL_BLOCKERS = [
  "publication-issues",
  "incomplete-source-coverage",
  "parity-issues",
] as const;

export type SurfaceStatBlockParityFinalBlocker =
  (typeof SURFACE_STAT_BLOCK_PARITY_FINAL_BLOCKERS)[number];

export type SurfaceStatBlockParityFinalGateResult =
  | {
      readonly tag: "accepted";
      readonly check: SurfacePublicationCheckResult;
    }
  | {
      readonly tag: "rejected";
      readonly check: SurfacePublicationCheckResult;
      readonly blockers: readonly SurfaceStatBlockParityFinalBlocker[];
    };

export function evaluateSurfaceStatBlockParityFinal(
  check: SurfacePublicationCheckResult,
): SurfaceStatBlockParityFinalGateResult {
  const blockers: SurfaceStatBlockParityFinalBlocker[] = [];
  if (check.issues.length > 0) blockers.push("publication-issues");
  if (check.statBlockParity.sourceCoverage.tag !== "complete") {
    blockers.push("incomplete-source-coverage");
  }
  if (check.statBlockParity.issues.length > 0) blockers.push("parity-issues");

  return blockers.length === 0
    ? { tag: "accepted", check }
    : { tag: "rejected", check, blockers };
}

export function runSurfaceStatBlockParityFinal(
  options: PublicationCheckOptions,
): SurfaceStatBlockParityFinalGateResult {
  return evaluateSurfaceStatBlockParityFinal(
    runSurfacePublicationCheck(options),
  );
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
  console.error(`Source coverage: ${describeSourceCoverage(check)}.`);
  console.error(`Parity issue counts: ${issueCounts || "none"}.`);
  for (const issue of check.issues) {
    console.error(`- publication-issue: ${JSON.stringify(issue)}`);
  }
  for (const issue of report.issues) {
    if (issue.kind !== "missing") {
      console.error(`- parity-issue: ${JSON.stringify(issue)}`);
    }
  }
}

function main(): void {
  const repoRoot = process.cwd();
  const contentDir = join(repoRoot, "packages", "surface", "content");
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

  const result = runSurfaceStatBlockParityFinal({
    repoRoot,
    contentDir,
    publicationDir: join(repoRoot, "packages", "surface", "publication"),
    compile: compileDhallToJson,
  });
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
