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
import { srdUnitCollection } from "../packages/surface/src/surface/unit-catalog.ts";
import type { SpellRecord } from "../packages/surface/src/surface/types.ts";
import {
  analyzeStatBlockProcedurePressure,
  classifyUnrestrictedStatBlockSpellReferences,
  countUnrestrictedStatBlockSpellReferenceDefinitions,
  STAT_BLOCK_PROCEDURE_PRESSURE_DISPOSITION_KINDS,
  STAT_BLOCK_PROCEDURE_PRESSURE_OCCURRENCE_KINDS,
  type StatBlockProcedurePressureReport,
  type StatBlockSpellReferenceClassification,
  type StatBlockSpellReferenceClassificationSource,
  type StatBlockSpellReferenceDefinitionCounts,
  type StatBlockSpellReferenceDefinitionStatus,
  type StatBlockSpellReferenceProfileStatus,
  type StatBlockProcedurePressureSourceAuthority,
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

export type StatBlockSpellReferenceClassificationSummary = {
  readonly total: number;
  readonly distinctDefinitionCount: number;
  readonly unresolvedDefinitionCount: number;
  readonly definitionStatus: Readonly<
    Record<StatBlockSpellReferenceDefinitionStatus, number>
  >;
  readonly profileStatus: Readonly<
    Record<StatBlockSpellReferenceProfileStatus, number>
  >;
  readonly primaryPartition: Readonly<{
    readonly shippedProfiled: number;
    readonly shippedUnprofiled: number;
    readonly unresolved: number;
  }>;
  readonly facets: Readonly<{
    readonly longCasting: number;
    readonly shippedConcentration: number;
  }>;
};

type GeneratedStatBlockProcedurePressureReport =
  StatBlockProcedurePressureReport & {
    readonly spellReferenceClassifications: readonly StatBlockSpellReferenceClassification[];
    readonly preResolutionSpellReferenceClassifications: readonly StatBlockSpellReferenceClassification[];
    readonly spellReferenceClassificationSummaries: Readonly<{
      readonly current: StatBlockSpellReferenceClassificationSummary;
      readonly preResolution: StatBlockSpellReferenceClassificationSummary;
    }>;
  };

type UnitProfileCoverageMatrix = {
  readonly profiles: readonly {
    readonly id: string;
    readonly profileKind: string;
    readonly runtimeOwners: readonly string[];
  }[];
  readonly units: readonly {
    readonly collectionId: string | undefined;
    readonly kind: string;
    readonly unitId: string;
    readonly catalogAdmissionStatus: string | undefined;
    readonly profileIds: readonly string[];
  }[];
};

const UNIT_PROFILE_COVERAGE_MATRIX_PATH =
  "plans/unit-profile-coverage/unit-matrix.json";

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
  const sourceAuthority = procedurePressureSourceAuthority(
    sourceDiscovery.identities,
  );
  const pressureReport = analyzeStatBlockProcedurePressure(
    srdStatBlockCollection.statBlocks,
    sourceAuthority,
  );
  const source = statBlockSpellReferenceClassificationSource();
  const spellReferenceClassifications =
    classifyUnrestrictedStatBlockSpellReferences(
      srdStatBlockCollection.statBlocks,
      sourceAuthority,
      source,
    );
  const definitionCounts = countUnrestrictedStatBlockSpellReferenceDefinitions(
    srdStatBlockCollection.statBlocks,
    sourceAuthority,
    source,
  );
  const baselineSource =
    preResolutionSpellReferenceClassificationSource(source);
  const preResolutionSpellReferenceClassifications =
    classifyUnrestrictedStatBlockSpellReferences(
      srdStatBlockCollection.statBlocks,
      sourceAuthority,
      baselineSource,
    );
  const preResolutionDefinitionCounts =
    countUnrestrictedStatBlockSpellReferenceDefinitions(
      srdStatBlockCollection.statBlocks,
      sourceAuthority,
      baselineSource,
    );
  const report: GeneratedStatBlockProcedurePressureReport = {
    ...pressureReport,
    spellReferenceClassifications,
    preResolutionSpellReferenceClassifications,
    spellReferenceClassificationSummaries: {
      current: summarizeSpellReferenceClassifications(
        spellReferenceClassifications,
        definitionCounts,
      ),
      preResolution: summarizeSpellReferenceClassifications(
        preResolutionSpellReferenceClassifications,
        preResolutionDefinitionCounts,
      ),
    },
  };
  return {
    json: await format(JSON.stringify(report), { parser: "json" }),
    markdown: await format(renderStatBlockProcedurePressureMarkdown(report), {
      parser: "markdown",
    }),
  };
}

function statBlockSpellReferenceClassificationSource(): StatBlockSpellReferenceClassificationSource {
  const definitions = new Map<string, SpellRecord>();
  for (const unit of srdUnitCollection.units) {
    if (unit.kind === "spell") definitions.set(unit.id, unit);
  }
  const matrix = readUnitProfileCoverageMatrix();
  return {
    definitions,
    profiledDefinitionIds: profiledSpellDefinitionIds(matrix),
  };
}

function preResolutionSpellReferenceClassificationSource(
  source: StatBlockSpellReferenceClassificationSource,
): StatBlockSpellReferenceClassificationSource {
  const matrix = readUnitProfileCoverageMatrix();
  const baselineDefinitionIds = new Set(
    matrix.units
      .filter(
        ({ collectionId, kind, catalogAdmissionStatus }) =>
          collectionId === "srd-5.2.1" &&
          kind === "spell" &&
          catalogAdmissionStatus === "installed",
      )
      .map(({ unitId }) => unitId),
  );
  return {
    definitions: new Map(
      [...source.definitions].filter(([unitId]) =>
        baselineDefinitionIds.has(unitId),
      ),
    ),
    profiledDefinitionIds: source.profiledDefinitionIds,
  };
}

function profiledSpellDefinitionIds(
  matrix: UnitProfileCoverageMatrix,
): ReadonlySet<string> {
  const profiles = new Map(
    matrix.profiles.map((profile) => [profile.id, profile]),
  );
  return new Set(
    matrix.units
      .filter(
        ({ collectionId, kind }) =>
          collectionId === "srd-5.2.1" && kind === "spell",
      )
      .filter(({ profileIds }) =>
        profileIds.some((profileId) => {
          const profile = profiles.get(profileId);
          if (profile === undefined) return false;
          return (
            profile.profileKind === "spell-invocation" ||
            (profile.profileKind === "table-caller" &&
              profile.runtimeOwners.some((owner) =>
                owner.includes("packages/battle-runtime"),
              ))
          );
        }),
      )
      .map(({ unitId }) => unitId),
  );
}

function readUnitProfileCoverageMatrix(): UnitProfileCoverageMatrix {
  const parsed: unknown = JSON.parse(
    readFileSync(
      join(process.cwd(), UNIT_PROFILE_COVERAGE_MATRIX_PATH),
      "utf8",
    ),
  );
  if (!isUnknownRecord(parsed)) {
    throw new Error("Unit profile coverage matrix must be an object.");
  }
  const profiles = readMatrixProfiles(parsed.profiles);
  const units = readMatrixUnits(parsed.units);
  return { profiles, units };
}

function readMatrixProfiles(
  value: unknown,
): UnitProfileCoverageMatrix["profiles"] {
  if (!Array.isArray(value)) {
    throw new Error("Unit profile coverage matrix profiles must be an array.");
  }
  return value.map((profile, index) => {
    if (!isUnknownRecord(profile)) {
      throw new Error(`Profile row ${String(index + 1)} is not an object.`);
    }
    const id = unknownString(profile.id);
    const profileKind = unknownString(profile.profileKind);
    const runtimeOwners =
      Array.isArray(profile.runtimeOwners) &&
      profile.runtimeOwners.every(
        (owner): owner is string => typeof owner === "string",
      )
        ? profile.runtimeOwners
        : [];
    if (id === undefined || profileKind === undefined) {
      throw new Error(`Profile row ${String(index + 1)} is incomplete.`);
    }
    return { id, profileKind, runtimeOwners };
  });
}

function readMatrixUnits(value: unknown): UnitProfileCoverageMatrix["units"] {
  if (!Array.isArray(value)) {
    throw new Error("Unit profile coverage matrix units must be an array.");
  }
  return value.map((unit, index) => {
    if (!isUnknownRecord(unit)) {
      throw new Error(`Unit row ${String(index + 1)} is not an object.`);
    }
    const collectionId = unknownString(unit.collectionId);
    const kind = unknownString(unit.kind);
    const unitId = unknownString(unit.unitId);
    if (kind === undefined || unitId === undefined) {
      throw new Error(`Unit row ${String(index + 1)} is incomplete.`);
    }
    const catalogAdmission = isUnknownRecord(unit.catalogAdmission)
      ? unknownString(unit.catalogAdmission.status)
      : undefined;
    const claim = isUnknownRecord(unit.claim) ? unit.claim : undefined;
    const profileIds =
      claim !== undefined && Array.isArray(claim.profileIds)
        ? claim.profileIds.filter(
            (profileId): profileId is string => typeof profileId === "string",
          )
        : [];
    return {
      collectionId,
      kind,
      unitId,
      catalogAdmissionStatus: catalogAdmission,
      profileIds,
    };
  });
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unknownString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function summarizeSpellReferenceClassifications(
  rows: readonly StatBlockSpellReferenceClassification[],
  definitionCounts: StatBlockSpellReferenceDefinitionCounts,
): StatBlockSpellReferenceClassificationSummary {
  const count = (
    predicate: (row: StatBlockSpellReferenceClassification) => boolean,
  ): number => rows.filter(predicate).length;
  return {
    total: rows.length,
    distinctDefinitionCount: definitionCounts.total,
    unresolvedDefinitionCount: definitionCounts.unresolved,
    definitionStatus: {
      shipped: count(({ definitionStatus }) => definitionStatus === "shipped"),
      unresolved: count(
        ({ definitionStatus }) => definitionStatus === "unresolved",
      ),
    },
    profileStatus: {
      profiled: count(({ profileStatus }) => profileStatus === "profiled"),
      unprofiled: count(({ profileStatus }) => profileStatus === "unprofiled"),
    },
    primaryPartition: {
      shippedProfiled: count(
        ({ definitionStatus, profileStatus }) =>
          definitionStatus === "shipped" && profileStatus === "profiled",
      ),
      shippedUnprofiled: count(
        ({ definitionStatus, profileStatus }) =>
          definitionStatus === "shipped" && profileStatus === "unprofiled",
      ),
      unresolved: count(
        ({ definitionStatus }) => definitionStatus === "unresolved",
      ),
    },
    facets: {
      longCasting: count(
        ({ castingTimeKind }) =>
          castingTimeKind === "minutes" || castingTimeKind === "hours",
      ),
      shippedConcentration: count(
        ({ definitionStatus, durationKind }) =>
          definitionStatus === "shipped" && durationKind === "concentration",
      ),
    },
  };
}

function procedurePressureSourceAuthority(
  identities: ReturnType<typeof discoverSrdStatBlocks>["identities"],
): StatBlockProcedurePressureSourceAuthority {
  return {
    identities: identities.map(({ name, occurrences }) => {
      const [first, ...remaining] = occurrences;
      if (first === undefined) {
        throw new Error(
          "A discovered SRD identity must own a source occurrence.",
        );
      }
      return {
        name,
        anchors: [first.anchor, ...remaining.map(({ anchor }) => anchor)],
      };
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
  report: GeneratedStatBlockProcedurePressureReport,
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
    "## Unrestricted spell-reference classification",
    "",
    "The current catalog join is identity-free: each row carries only its structural row ID, definition/profile status, group kind, source section, cast-level presence, casting-time kind, and duration kind. Authored spell IDs, names, and provenance are consulted at the catalog boundary and are not emitted in this join.",
    "",
    "| Join view | Rows | Definitions | Unresolved definitions | Shipped | Unresolved | Profiled | Unprofiled | Long casting | Shipped Concentration |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...(["current", "preResolution"] as const).map((view) => {
      const summary = report.spellReferenceClassificationSummaries[view];
      return `| ${view} | ${String(summary.total)} | ${String(summary.distinctDefinitionCount)} | ${String(summary.unresolvedDefinitionCount)} | ${String(summary.definitionStatus.shipped)} | ${String(summary.definitionStatus.unresolved)} | ${String(summary.profileStatus.profiled)} | ${String(summary.profileStatus.unprofiled)} | ${String(summary.facets.longCasting)} | ${String(summary.facets.shippedConcentration)} |`;
    }),
    "",
    "The pre-resolution view is the pinned baseline used to prove the #418 partition: 286 = 104 shipped/profiled + 111 shipped/unprofiled + 71 unresolved, with 21 long-casting rows and 104 shipped Concentration rows. The current view reflects the admitted SRD definitions; these rows remain non-executable until a typed owner admits them.",
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
    "The JSON companion contains every occurrence with a stable structural row ID, its identity-free structural shape, closed disposition, source witness, structural frequency group, and the same bounded proposal ranking. Every group and proposal carries the complete member-row relationship; example witnesses remain a short presentation aid rather than the membership authority.",
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

function runSpellReferenceClassificationSelfTest(): void {
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
  const sourceAuthority = procedurePressureSourceAuthority(
    sourceDiscovery.identities,
  );
  const currentSource = statBlockSpellReferenceClassificationSource();
  const baselineRows = classifyUnrestrictedStatBlockSpellReferences(
    srdStatBlockCollection.statBlocks,
    sourceAuthority,
    preResolutionSpellReferenceClassificationSource(currentSource),
  );
  const baselineDefinitionCounts =
    countUnrestrictedStatBlockSpellReferenceDefinitions(
      srdStatBlockCollection.statBlocks,
      sourceAuthority,
      preResolutionSpellReferenceClassificationSource(currentSource),
    );
  const baselineSummary = summarizeSpellReferenceClassifications(
    baselineRows,
    baselineDefinitionCounts,
  );
  if (
    baselineSummary.total !== 286 ||
    baselineSummary.distinctDefinitionCount !== 101 ||
    baselineSummary.unresolvedDefinitionCount !== 35 ||
    baselineSummary.primaryPartition.shippedProfiled !== 104 ||
    baselineSummary.primaryPartition.shippedUnprofiled !== 111 ||
    baselineSummary.primaryPartition.unresolved !== 71 ||
    baselineSummary.facets.longCasting !== 21 ||
    baselineSummary.facets.shippedConcentration !== 104
  ) {
    throw new Error(
      `Unexpected pre-resolution Stat Block spell-reference classification: ${JSON.stringify(baselineSummary)}`,
    );
  }
  for (const row of baselineRows) {
    const primaryBucket =
      row.definitionStatus === "unresolved"
        ? "unresolved"
        : row.profileStatus === "profiled"
          ? "shippedProfiled"
          : "shippedUnprofiled";
    if (
      (primaryBucket === "unresolved" &&
        row.definitionStatus !== "unresolved") ||
      (primaryBucket !== "unresolved" && row.definitionStatus !== "shipped")
    ) {
      throw new Error(
        `Primary classification buckets are not disjoint: ${JSON.stringify(row)}`,
      );
    }
  }
  const currentRows = classifyUnrestrictedStatBlockSpellReferences(
    srdStatBlockCollection.statBlocks,
    sourceAuthority,
    currentSource,
  );
  const currentDefinitionCounts =
    countUnrestrictedStatBlockSpellReferenceDefinitions(
      srdStatBlockCollection.statBlocks,
      sourceAuthority,
      currentSource,
    );
  const currentSummary = summarizeSpellReferenceClassifications(
    currentRows,
    currentDefinitionCounts,
  );
  if (
    currentSummary.total !== 286 ||
    currentSummary.distinctDefinitionCount !== 101 ||
    currentSummary.unresolvedDefinitionCount !== 0 ||
    currentSummary.definitionStatus.shipped !== 286 ||
    currentSummary.definitionStatus.unresolved !== 0
  ) {
    throw new Error(
      `Unexpected current Stat Block spell-reference classification: ${JSON.stringify(currentSummary)}`,
    );
  }
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
  runSpellReferenceClassificationSelfTest();
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
