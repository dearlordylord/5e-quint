import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
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

  it("rejects the current report with source-derived counts and issue details", () => {
    const contentDir = mkdtempSync(
      join(tmpdir(), "surface-final-gate-current-test-"),
    );

    try {
      const result = rejectedResult(
        runSurfaceStatBlockParityFinal({
          repoRoot: process.cwd(),
          contentDir,
          compile: () => undefined,
        }),
      );
      const report = result.check.statBlockParity;

      expect(result.blockers).toEqual(["parity-issues"]);
      expect(result.check.issues).toEqual([]);
      expect(report.sourceCoverage.tag).toBe("complete");
      expect(report.discovery.occurrences).toHaveLength(334);
      expect(report.discovery.identities).toHaveLength(330);
      expect(report.issues).toHaveLength(313);
      expect(
        report.issues.filter((issue) => issue.kind === "missing"),
      ).toHaveLength(309);
      expect(
        report.issues.filter((issue) => issue.kind === "provenance"),
      ).toHaveLength(3);
      const stoneGiant = report.issues.find(
        (issue) =>
          issue.kind === "divergent-source" && issue.name === "Stone Giant",
      );
      expect(stoneGiant).toMatchObject({
        kind: "divergent-source",
        anchors: [
          {
            sourcePath: ".references/srd-5.2.1/Monsters/Monsters-P-S.md",
          },
          {
            sourcePath: ".references/srd-5.2.1/Monsters/Monsters-T-Z.md",
          },
        ],
      });
    } finally {
      rmSync(contentDir, { force: true, recursive: true });
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
