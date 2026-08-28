import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { format } from "prettier";

import { srdStatBlockCollection } from "../packages/surface/src/surface/stat-block-catalog.ts";
import {
  analyzeStatBlockProcedurePressure,
  STAT_BLOCK_PROCEDURE_PRESSURE_DISPOSITION_KINDS,
  STAT_BLOCK_PROCEDURE_PRESSURE_OCCURRENCE_KINDS,
  type StatBlockProcedurePressureReport,
  type StatBlockProcedurePressureWitness,
} from "../packages/battle-runtime/src/stat-block-procedure-pressure.ts";
import {
  discoverSrdStatBlocks,
  SRD_STAT_BLOCK_SOURCE_PATHS,
} from "./srd521-stat-block-parity.ts";

export const STAT_BLOCK_PROCEDURE_PRESSURE_ARTIFACT_PATHS = {
  json: "plans/stat-block-procedure-pressure/inventory.json",
  markdown: "plans/stat-block-procedure-pressure/REPORT.md",
} as const;

export type StatBlockProcedurePressureArtifactIssue =
  | {
      readonly kind: "missingArtifact";
      readonly path: string;
    }
  | {
      readonly kind: "staleArtifact";
      readonly path: string;
    };

export type StatBlockProcedurePressureArtifacts = {
  readonly json: string;
  readonly markdown: string;
};

export async function buildStatBlockProcedurePressureArtifacts(): Promise<StatBlockProcedurePressureArtifacts> {
  const sourceDiscovery = discoverSrdStatBlocks(
    SRD_STAT_BLOCK_SOURCE_PATHS.map((sourcePath) => ({
      sourcePath,
      contents: readFileSync(join(process.cwd(), sourcePath), "utf8"),
    })),
  );
  if (sourceDiscovery.issues.length > 0) {
    throw new Error(
      `RAW SRD denominator is not complete: ${JSON.stringify(sourceDiscovery.issues)}`,
    );
  }
  const report = analyzeStatBlockProcedurePressure(
    srdStatBlockCollection.statBlocks,
    sourceDiscovery.occurrences.map(({ anchor }) => anchor),
  );
  return {
    json: await format(JSON.stringify(report), { parser: "json" }),
    markdown: await format(renderStatBlockProcedurePressureMarkdown(report), {
      parser: "markdown",
    }),
  };
}

export function checkStatBlockProcedurePressureArtifacts(
  repoRoot: string,
  expected: StatBlockProcedurePressureArtifacts,
): readonly StatBlockProcedurePressureArtifactIssue[] {
  const issues: StatBlockProcedurePressureArtifactIssue[] = [];
  for (const { path, contents } of artifactEntries(repoRoot, expected)) {
    if (!existsSync(path)) {
      issues.push({ kind: "missingArtifact", path });
    } else if (readFileSync(path, "utf8") !== contents) {
      issues.push({ kind: "staleArtifact", path });
    }
  }
  return issues;
}

export function writeStatBlockProcedurePressureArtifacts(
  repoRoot: string,
  artifacts: StatBlockProcedurePressureArtifacts,
): void {
  for (const { path, contents } of artifactEntries(repoRoot, artifacts)) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
  }
}

function artifactEntries(
  repoRoot: string,
  artifacts: StatBlockProcedurePressureArtifacts,
): readonly { readonly path: string; readonly contents: string }[] {
  return [
    {
      path: join(repoRoot, STAT_BLOCK_PROCEDURE_PRESSURE_ARTIFACT_PATHS.json),
      contents: artifacts.json,
    },
    {
      path: join(
        repoRoot,
        STAT_BLOCK_PROCEDURE_PRESSURE_ARTIFACT_PATHS.markdown,
      ),
      contents: artifacts.markdown,
    },
  ];
}

function renderStatBlockProcedurePressureMarkdown(
  report: StatBlockProcedurePressureReport,
): string {
  const lines = [
    "# Stat Block Procedure Pressure",
    "",
    "> Generated planning evidence. Runtime code must not import this directory. Regenerate with `pnpm generate:stat-block-procedure-pressure`.",
    "",
    `The SRD catalog contributes **${String(report.recordCount)} records** and **${String(report.occurrenceCount)} procedure-bearing occurrences**. The proposed capability leaves are frequency-ranked planning pressure, not a support registry or completion ledger.`,
    "",
    "## Occurrence coverage",
    "",
    "| Occurrence kind | Count |",
    "| --- | ---: |",
    ...STAT_BLOCK_PROCEDURE_PRESSURE_OCCURRENCE_KINDS.map(
      (kind) => `| ${kind} | ${String(report.occurrenceCounts[kind])} |`,
    ),
    "",
    "## Dispositions",
    "",
    "| Disposition | Count |",
    "| --- | ---: |",
    ...STAT_BLOCK_PROCEDURE_PRESSURE_DISPOSITION_KINDS.map(
      (kind) => `| ${kind} | ${String(report.dispositionCounts[kind])} |`,
    ),
    "",
    "## Bounded generic capability proposals",
    "",
    "Pressure score is occurrence count plus distinct Stat Block count. At most 24 proposals are emitted.",
    "",
    "| Rank | Occurrence | Surface shape | Failed facts | Occurrences | Records | Pressure | Source examples |",
    "| ---: | --- | --- | --- | ---: | ---: | ---: | --- |",
    ...report.capabilityProposals.map(
      (proposal) =>
        `| ${String(proposal.rank)} | ${proposal.occurrenceKind} | ${escapeTableCell(JSON.stringify(proposal.surfaceShape))} | ${escapeTableCell(proposal.failedFacts.join(", "))} | ${String(proposal.occurrenceCount)} | ${String(proposal.statBlockCount)} | ${String(proposal.pressureScore)} | ${proposal.exampleWitnesses.map(sourceWitnessMarkdown).join(", ")} |`,
    ),
    "",
    "The JSON companion contains every occurrence, its identity-free structural shape, closed disposition, source witness, structural frequency group, and the same bounded proposal ranking.",
    "",
  ];
  return lines.join("\n");
}

function sourceWitnessMarkdown(
  witness: StatBlockProcedurePressureWitness,
): string {
  if (witness.source.kind === "unresolved") {
    return escapeTableCell(witness.statBlockName);
  }
  const lineFragment =
    witness.source.firstLine === witness.source.lastLine
      ? `L${String(witness.source.firstLine)}`
      : `L${String(witness.source.firstLine)}-L${String(witness.source.lastLine)}`;
  return `[${escapeTableCell(witness.statBlockName)}](../../${witness.source.path}#${lineFragment})`;
}

function escapeTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function runSelfTest(): void {
  const fixtureRoot = mkdtempSync(
    join(tmpdir(), "stat-block-procedure-pressure-self-test-"),
  );
  const artifacts = {
    json: "synthetic json\n",
    markdown: "synthetic markdown\n",
  };
  try {
    const missing = checkStatBlockProcedurePressureArtifacts(
      fixtureRoot,
      artifacts,
    );
    if (
      missing.length !== 2 ||
      !missing.every(({ kind }) => kind === "missingArtifact")
    ) {
      throw new Error(
        `Expected two accumulated missing-artifact issues, received ${JSON.stringify(missing)}.`,
      );
    }
    writeStatBlockProcedurePressureArtifacts(fixtureRoot, artifacts);
    const clean = checkStatBlockProcedurePressureArtifacts(
      fixtureRoot,
      artifacts,
    );
    if (clean.length !== 0) {
      throw new Error(
        `Expected clean generated artifacts: ${JSON.stringify(clean)}.`,
      );
    }
    for (const { path } of artifactEntries(fixtureRoot, artifacts)) {
      writeFileSync(path, "stale\n");
    }
    const stale = checkStatBlockProcedurePressureArtifacts(
      fixtureRoot,
      artifacts,
    );
    if (
      stale.length !== 2 ||
      !stale.every(({ kind }) => kind === "staleArtifact")
    ) {
      throw new Error(
        `Expected two accumulated stale-artifact issues, received ${JSON.stringify(stale)}.`,
      );
    }
  } finally {
    rmSync(fixtureRoot, { force: true, recursive: true });
  }
  console.log("Stat Block procedure pressure self-test passed.");
}

async function main(): Promise<void> {
  const supportedArguments = new Set(["--self-test", "--write"]);
  const unsupported = process.argv
    .slice(2)
    .filter((argument) => !supportedArguments.has(argument));
  if (unsupported.length > 0) {
    console.error(`Unsupported arguments: ${unsupported.join(", ")}.`);
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const repoRoot = process.cwd();
  const artifacts = await buildStatBlockProcedurePressureArtifacts();
  if (process.argv.includes("--write")) {
    writeStatBlockProcedurePressureArtifacts(repoRoot, artifacts);
    console.log(
      `Wrote ${STAT_BLOCK_PROCEDURE_PRESSURE_ARTIFACT_PATHS.json} and ${STAT_BLOCK_PROCEDURE_PRESSURE_ARTIFACT_PATHS.markdown}.`,
    );
    return;
  }

  const issues = checkStatBlockProcedurePressureArtifacts(repoRoot, artifacts);
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`${issue.kind}: ${issue.path}`);
    }
    console.error(
      "Run pnpm generate:stat-block-procedure-pressure to refresh the generated planning evidence.",
    );
    process.exitCode = 1;
    return;
  }
  console.log("Stat Block procedure pressure artifacts are current.");
}

if (process.argv[1]?.endsWith("stat-block-procedure-pressure.ts") === true) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
