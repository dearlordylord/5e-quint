import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import {
  evaluateSurfaceStatBlockParityFinal,
  runSurfaceStatBlockParityFinal,
  surfaceStatBlockParityFinalOptions,
  type SurfaceStatBlockParityFinalGateResult,
} from "./check-surface-stat-block-parity-final.ts";
import {
  type PublicationIssue,
  type SurfacePublicationCheckResult,
} from "./check-surface-content-json-sync.ts";
import { srdStatBlockCollection } from "../packages/surface/src/surface/stat-block-catalog.ts";
import {
  SRD_STAT_BLOCK_SCOPE,
  SRD_STAT_BLOCK_SOURCE_PATHS,
  type SrdStatBlockParityReport,
} from "./srd521-stat-block-parity.ts";

function cleanParityReport(
  overrides: Partial<SrdStatBlockParityReport> = {},
): SrdStatBlockParityReport {
  return {
    scope: SRD_STAT_BLOCK_SCOPE,
    sourceCoverage: {
      tag: "complete",
      paths: SRD_STAT_BLOCK_SOURCE_PATHS,
    },
    discovery: {
      occurrences: [],
      identities: [],
      issues: [],
    },
    installedRecords: [],
    issues: [],
    ...overrides,
  };
}

function cleanPublicationCheck(
  overrides: Partial<SurfacePublicationCheckResult> = {},
): SurfacePublicationCheckResult {
  return {
    issues: [],
    sourceCount: 0,
    peerCount: 0,
    peerObservations: [],
    statBlockParity: cleanParityReport(),
    ...overrides,
  };
}

function rejectedResult(
  result: SurfaceStatBlockParityFinalGateResult,
): Extract<
  SurfaceStatBlockParityFinalGateResult,
  { readonly tag: "rejected" }
> {
  expect(result.tag).toBe("rejected");
  if (result.tag !== "rejected") {
    throw new Error("Expected final parity gate rejection");
  }
  return result;
}

function repositoryPath(repositoryRoot: string, filePath: string): string {
  return relative(repositoryRoot, filePath).split("\\").join("/");
}

function runFinalGateWithPortableCaseArtifact(
  portableCasesPath: string,
): SurfaceStatBlockParityFinalGateResult {
  const contentDir = mkdtempSync(
    join(tmpdir(), "surface-final-gate-portable-case-content-test-"),
  );

  try {
    const options = surfaceStatBlockParityFinalOptions(process.cwd());
    return runSurfaceStatBlockParityFinal({
      repoRoot: options.repoRoot,
      contentDir,
      portableCasesPath,
      portableCasesBuilder: () => Buffer.from("generated portable cases\n"),
      compile: () => undefined,
    });
  } finally {
    rmSync(contentDir, { force: true, recursive: true });
  }
}

describe("Surface stat-block parity final gate", () => {
  it("passes the complete publication artifact set to the operation", () => {
    const options = surfaceStatBlockParityFinalOptions("/synthetic/repository");

    expect(options.publicationDir).toBe(
      "/synthetic/repository/packages/surface/publication",
    );
    expect(options.portableCasesPath).toBe(
      "/synthetic/repository/packages/surface/portable-cases/srd-surface-cases.json",
    );
  });

  it("accepts a clean publication and complete parity report", () => {
    const check = cleanPublicationCheck();

    expect(evaluateSurfaceStatBlockParityFinal(check)).toEqual({
      tag: "accepted",
      check,
    });
  });

  it("accepts the complete reconciled catalog with source-derived counts", () => {
    const contentDir = mkdtempSync(
      join(tmpdir(), "surface-final-gate-current-test-"),
    );

    try {
      const result = runSurfaceStatBlockParityFinal({
        repoRoot: process.cwd(),
        contentDir,
        compile: () => undefined,
      });
      expect(result.tag).toBe("accepted");
      const report = result.check.statBlockParity;

      expect(result.check.issues).toEqual([]);
      expect(report.sourceCoverage.tag).toBe("complete");
      expect(report.discovery.occurrences).toHaveLength(334);
      expect(report.discovery.identities).toHaveLength(330);
      expect(srdStatBlockCollection.statBlocks).toHaveLength(330);
      expect(report.issues).toEqual([]);
    } finally {
      rmSync(contentDir, { force: true, recursive: true });
    }
  });

  it("reports a missing portable case artifact through the real final gate", () => {
    const artifactDir = mkdtempSync(
      join(tmpdir(), "surface-final-gate-missing-portable-case-test-"),
    );
    const portableCasesPath = join(artifactDir, "srd-surface-cases.json");

    try {
      const result = rejectedResult(
        runFinalGateWithPortableCaseArtifact(portableCasesPath),
      );

      expect(result.blockers).toEqual(["publication-issues"]);
      expect(result.check.issues).toEqual([
        {
          kind: "missing-portable-case-artifact",
          file: repositoryPath(process.cwd(), portableCasesPath),
        },
      ]);
    } finally {
      rmSync(artifactDir, { force: true, recursive: true });
    }
  });

  it("reports a stale portable case artifact through the real final gate", () => {
    const artifactDir = mkdtempSync(
      join(tmpdir(), "surface-final-gate-stale-portable-case-test-"),
    );
    const portableCasesPath = join(artifactDir, "srd-surface-cases.json");
    writeFileSync(
      portableCasesPath,
      Buffer.from("stale portable case artifact\n"),
    );

    try {
      const result = rejectedResult(
        runFinalGateWithPortableCaseArtifact(portableCasesPath),
      );

      expect(result.blockers).toEqual(["publication-issues"]);
      expect(result.check.issues).toEqual([
        {
          kind: "out-of-sync-portable-case-artifact",
          file: repositoryPath(process.cwd(), portableCasesPath),
        },
      ]);
    } finally {
      rmSync(artifactDir, { force: true, recursive: true });
    }
  });

  it("rejects incomplete source coverage even without parity issue rows", () => {
    const report = cleanParityReport({
      sourceCoverage: {
        tag: "incomplete",
        availablePaths: [SRD_STAT_BLOCK_SOURCE_PATHS[0]],
        missingPaths: SRD_STAT_BLOCK_SOURCE_PATHS.slice(1),
        unreadablePaths: [],
        incompletePaths: [],
      },
    });
    const result = rejectedResult(
      evaluateSurfaceStatBlockParityFinal(
        cleanPublicationCheck({ statBlockParity: report }),
      ),
    );

    expect(result.blockers).toEqual(["incomplete-source-coverage"]);
    expect(result.check.statBlockParity.sourceCoverage).toEqual(
      report.sourceCoverage,
    );
  });

  it("rejects unreadable source coverage and retains its diagnostic", () => {
    const sourcePath = SRD_STAT_BLOCK_SOURCE_PATHS[0];
    const report = cleanParityReport({
      sourceCoverage: {
        tag: "incomplete",
        availablePaths: SRD_STAT_BLOCK_SOURCE_PATHS.slice(1),
        missingPaths: [],
        unreadablePaths: [sourcePath],
        incompletePaths: [],
      },
      issues: [
        {
          kind: "unreadable-source",
          sourcePath,
          message: "synthetic unreadable source",
        },
      ],
    });
    const result = rejectedResult(
      evaluateSurfaceStatBlockParityFinal(
        cleanPublicationCheck({ statBlockParity: report }),
      ),
    );

    expect(result.blockers).toEqual([
      "incomplete-source-coverage",
      "parity-issues",
    ]);
    expect(result.check.statBlockParity.issues).toEqual(report.issues);
  });

  it("rejects publication failure even when parity is otherwise clean", () => {
    const publicationIssue: PublicationIssue = {
      kind: "missing-publication-artifact",
      file: "packages/surface/portable-cases/srd-surface-cases.json",
    };
    const result = rejectedResult(
      evaluateSurfaceStatBlockParityFinal(
        cleanPublicationCheck({ issues: [publicationIssue] }),
      ),
    );

    expect(result.blockers).toEqual(["publication-issues"]);
    expect(result.check.issues).toEqual([publicationIssue]);
    expect(result.check.statBlockParity.issues).toEqual([]);
  });
});
