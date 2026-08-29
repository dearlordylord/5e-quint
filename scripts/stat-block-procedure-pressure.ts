import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { format } from "prettier";

import { srdStatBlockCollection } from "../packages/surface/src/surface/stat-block-catalog.ts";
import {
  resolveAuthoredUnitReference,
  srdUnitCollection,
} from "../packages/surface/src/surface/unit-catalog.ts";
import type {
  SpellRecord,
  StatBlockRecord,
} from "../packages/surface/src/surface/types.ts";
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
const PRE_RESOLUTION_BASELINE_PATH =
  "plans/stat-block-procedure-pressure/pre-resolution-baseline.json";
const PRE_RESOLUTION_BASELINE_REVISION =
  "312a425f5a1ae9723ff192aaadb1ee1600befa27" as const;
const PRE_RESOLUTION_BASELINE_CATALOG_SOURCE_PATH =
  "packages/surface/src/surface/unit-catalog.ts" as const;

type PreResolutionBaselineSourceSnapshot = {
  readonly sourcePath: string;
  readonly gitBlob: string;
  readonly sha256: string;
};

type PreResolutionSpellReferenceBaseline = {
  readonly schema: "dnd.stat-block-spell-reference-pre-resolution-baseline.v1";
  readonly provenance: {
    readonly kind: "srd-5.2.1";
    readonly recordedAtRevision: string;
    readonly sourcePaths: readonly string[];
    readonly sourceSnapshots: readonly PreResolutionBaselineSourceSnapshot[];
    readonly catalogSource: PreResolutionBaselineSourceSnapshot;
  };
  readonly rowIds: readonly string[];
  readonly unresolvedRowIds: readonly string[];
  readonly definitionIds: {
    readonly shipped: readonly string[];
    readonly unresolved: readonly string[];
    readonly profiled: readonly string[];
  };
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
  const sourceAuthority = procedurePressureSourceAuthority(
    sourceDiscovery.identities,
  );
  const pressureReport = analyzeStatBlockProcedurePressure(
    srdStatBlockCollection.statBlocks,
    sourceAuthority,
  );
  const baseline = readPreResolutionSpellReferenceBaseline();
  const source = statBlockSpellReferenceClassificationSource();
  assertPreResolutionBaselineProvenance({
    baseline,
    records: srdStatBlockCollection.statBlocks,
    resolveUnitReference: source.resolveUnitReference,
  });
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
  const baselineSource = preResolutionSpellReferenceClassificationSource(
    source,
    baseline,
  );
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
  assertPreResolutionBaselineBijection({
    baseline,
    records: srdStatBlockCollection.statBlocks,
    currentRows: spellReferenceClassifications,
    baselineRows: preResolutionSpellReferenceClassifications,
    source,
  });
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
    resolveUnitReference: (authoredReference) =>
      resolveAuthoredUnitReference(authoredReference, srdUnitCollection.units)
        ?.canonicalUnitId,
  };
}

function preResolutionSpellReferenceClassificationSource(
  source: StatBlockSpellReferenceClassificationSource,
  baseline: PreResolutionSpellReferenceBaseline,
): StatBlockSpellReferenceClassificationSource {
  const baselineDefinitionIds = new Set(baseline.definitionIds.shipped);
  const expectedDefinitionIds = new Set([
    ...baseline.definitionIds.shipped,
    ...baseline.definitionIds.unresolved,
  ]);
  const missingDefinitions = [...expectedDefinitionIds].filter(
    (unitId) => !source.definitions.has(unitId),
  );
  if (missingDefinitions.length > 0) {
    throw new Error(
      `Pinned pre-resolution baseline definitions are absent from the current authored catalog: ${missingDefinitions.join(", ")}`,
    );
  }
  return {
    definitions: new Map(
      [...source.definitions].filter(([unitId]) =>
        baselineDefinitionIds.has(unitId),
      ),
    ),
    profiledDefinitionIds: new Set(baseline.definitionIds.profiled),
    resolveUnitReference: source.resolveUnitReference,
  };
}

function readPreResolutionSpellReferenceBaseline(): PreResolutionSpellReferenceBaseline {
  const parsed: unknown = JSON.parse(
    readFileSync(join(process.cwd(), PRE_RESOLUTION_BASELINE_PATH), "utf8"),
  );
  if (!isUnknownRecord(parsed)) {
    throw new Error(
      "Pre-resolution spell-reference baseline must be an object.",
    );
  }
  if (
    parsed.schema !==
    "dnd.stat-block-spell-reference-pre-resolution-baseline.v1"
  ) {
    throw new Error(
      "Pre-resolution spell-reference baseline schema is invalid.",
    );
  }
  if (!isUnknownRecord(parsed.provenance)) {
    throw new Error(
      "Pre-resolution spell-reference baseline provenance is invalid.",
    );
  }
  const provenanceKind = unknownString(parsed.provenance.kind);
  const recordedAtRevision = unknownString(
    parsed.provenance.recordedAtRevision,
  );
  const sourcePaths = readStringArray(
    parsed.provenance.sourcePaths,
    "pre-resolution baseline provenance sourcePaths",
  );
  if (provenanceKind !== "srd-5.2.1" || recordedAtRevision === undefined) {
    throw new Error(
      "Pre-resolution spell-reference baseline provenance is incomplete.",
    );
  }
  if (recordedAtRevision !== PRE_RESOLUTION_BASELINE_REVISION) {
    throw new Error(
      `Pre-resolution spell-reference baseline must be recorded at ${PRE_RESOLUTION_BASELINE_REVISION}.`,
    );
  }
  if (
    sourcePaths.length !== SRD_STAT_BLOCK_SOURCE_PATHS.length ||
    sourcePaths.some(
      (sourcePath, index) => sourcePath !== SRD_STAT_BLOCK_SOURCE_PATHS[index],
    )
  ) {
    throw new Error(
      "Pre-resolution spell-reference baseline source paths do not match the SRD denominator.",
    );
  }
  const sourceSnapshots = readBaselineSourceSnapshots(
    parsed.provenance.sourceSnapshots,
  );
  const catalogSource = readBaselineSourceSnapshot(
    parsed.provenance.catalogSource,
    "pre-resolution baseline catalogSource",
  );
  if (
    catalogSource.sourcePath !== PRE_RESOLUTION_BASELINE_CATALOG_SOURCE_PATH
  ) {
    throw new Error(
      "Pre-resolution baseline catalogSource does not identify the canonical Unit catalog source.",
    );
  }
  const rowIds = readStringArray(
    parsed.rowIds,
    "pre-resolution baseline rowIds",
  );
  const unresolvedRowIds = readStringArray(
    parsed.unresolvedRowIds,
    "pre-resolution baseline unresolvedRowIds",
  );
  if (!isUnknownRecord(parsed.definitionIds)) {
    throw new Error(
      "Pre-resolution spell-reference baseline definitionIds are invalid.",
    );
  }
  const shipped = readStringArray(
    parsed.definitionIds.shipped,
    "pre-resolution baseline shipped definitionIds",
  );
  const unresolved = readStringArray(
    parsed.definitionIds.unresolved,
    "pre-resolution baseline unresolved definitionIds",
  );
  const profiled = readStringArray(
    parsed.definitionIds.profiled,
    "pre-resolution baseline profiled definitionIds",
  );
  assertUniqueStrings(rowIds, "pre-resolution baseline rowIds");
  assertUniqueStrings(
    unresolvedRowIds,
    "pre-resolution baseline unresolvedRowIds",
  );
  const shippedSet = assertUniqueStrings(
    shipped,
    "pre-resolution baseline shipped definitionIds",
  );
  const unresolvedSet = assertUniqueStrings(
    unresolved,
    "pre-resolution baseline unresolved definitionIds",
  );
  const profiledSet = assertUniqueStrings(
    profiled,
    "pre-resolution baseline profiled definitionIds",
  );
  if ([...shippedSet].some((unitId) => unresolvedSet.has(unitId))) {
    throw new Error(
      "Pre-resolution baseline shipped and unresolved definition memberships overlap.",
    );
  }
  const rowSet = new Set(rowIds);
  if (unresolvedRowIds.some((rowId) => !rowSet.has(rowId))) {
    throw new Error(
      "Pre-resolution baseline unresolved row membership is outside its denominator.",
    );
  }
  if ([...profiledSet].some((unitId) => !shippedSet.has(unitId))) {
    throw new Error(
      "Pre-resolution baseline profiled definitions must be shipped definitions.",
    );
  }
  return {
    schema:
      "dnd.stat-block-spell-reference-pre-resolution-baseline.v1" as const,
    provenance: {
      kind: "srd-5.2.1" as const,
      recordedAtRevision,
      sourcePaths,
      sourceSnapshots,
      catalogSource,
    },
    rowIds,
    unresolvedRowIds,
    definitionIds: { shipped, unresolved, profiled },
  };
}

function readStringArray(value: unknown, label: string): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item): item is string => typeof item === "string")
  ) {
    throw new Error(`${label} must be an array of strings.`);
  }
  return value;
}

function readBaselineSourceSnapshots(
  value: unknown,
): readonly PreResolutionBaselineSourceSnapshot[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Pre-resolution baseline provenance sourceSnapshots must be an array.",
    );
  }
  const snapshots = value.map((snapshot, index) =>
    readBaselineSourceSnapshot(
      snapshot,
      `pre-resolution baseline sourceSnapshots row ${String(index + 1)}`,
    ),
  );
  if (
    snapshots.length !== SRD_STAT_BLOCK_SOURCE_PATHS.length ||
    snapshots.some(
      (snapshot, index) =>
        snapshot.sourcePath !== SRD_STAT_BLOCK_SOURCE_PATHS[index],
    )
  ) {
    throw new Error(
      "Pre-resolution baseline sourceSnapshots do not match the SRD denominator.",
    );
  }
  assertUniqueStrings(
    snapshots.map(({ sourcePath }) => sourcePath),
    "pre-resolution baseline sourceSnapshots source paths",
  );
  return snapshots;
}

function readBaselineSourceSnapshot(
  value: unknown,
  label: string,
): PreResolutionBaselineSourceSnapshot {
  if (!isUnknownRecord(value)) {
    throw new Error(`${label} must be an object.`);
  }
  const sourcePath = unknownString(value.sourcePath);
  const gitBlob = unknownString(value.gitBlob);
  const sha256 = unknownString(value.sha256);
  if (
    sourcePath === undefined ||
    gitBlob === undefined ||
    sha256 === undefined
  ) {
    throw new Error(`${label} is incomplete.`);
  }
  if (!/^[0-9a-f]{40}$/.test(gitBlob)) {
    throw new Error(`${label} gitBlob is not a Git object id.`);
  }
  if (!/^[0-9a-f]{64}$/.test(sha256)) {
    throw new Error(`${label} sha256 is not a SHA-256 digest.`);
  }
  return { sourcePath, gitBlob, sha256 };
}

function assertUniqueStrings(
  values: readonly string[],
  label: string,
): Set<string> {
  const unique = new Set(values);
  if (unique.size !== values.length) {
    throw new Error(`${label} must not contain duplicate members.`);
  }
  return unique;
}

function unrestrictedSpellReferenceDefinitionIds(
  records: readonly StatBlockRecord[],
  resolveUnitReference: (authoredReference: string) => string | undefined,
): ReadonlySet<string> {
  const definitionIds = new Set<string>();
  for (const record of records) {
    const sections = [
      record.statBlock.actions,
      record.statBlock.bonusActions,
      record.statBlock.reactions,
      record.statBlock.legendaryActions?.entries,
    ];
    for (const entries of sections) {
      for (const entry of entries ?? []) {
        if (
          entry.kind !== "executable" ||
          entry.procedure.kind !== "spellcasting"
        ) {
          continue;
        }
        for (const group of entry.procedure.groups) {
          for (const reference of group.spells) {
            if (reference.restriction === undefined) {
              definitionIds.add(
                resolveUnitReference(reference.spellId) ?? reference.spellId,
              );
            }
          }
        }
      }
    }
  }
  return definitionIds;
}

function assertPreResolutionBaselineProvenance(args: {
  readonly baseline: PreResolutionSpellReferenceBaseline;
  readonly records: readonly StatBlockRecord[];
  readonly resolveUnitReference: (
    authoredReference: string,
  ) => string | undefined;
}): void {
  const revision = execFileSync(
    "git",
    ["rev-parse", "--verify", `${PRE_RESOLUTION_BASELINE_REVISION}^{commit}`],
    { cwd: process.cwd(), encoding: "utf8" },
  ).trim();
  if (revision !== PRE_RESOLUTION_BASELINE_REVISION) {
    throw new Error(
      `Pinned pre-resolution baseline revision resolved to ${revision}, expected ${PRE_RESOLUTION_BASELINE_REVISION}.`,
    );
  }

  for (const snapshot of args.baseline.provenance.sourceSnapshots) {
    assertBaselineSourceSnapshot(
      snapshot,
      PRE_RESOLUTION_BASELINE_REVISION,
      "SRD source",
      true,
    );
  }
  assertBaselineSourceSnapshot(
    args.baseline.provenance.catalogSource,
    PRE_RESOLUTION_BASELINE_REVISION,
    "Unit catalog source",
    false,
  );

  const expectedDefinitionIds = new Set([
    ...args.baseline.definitionIds.shipped,
    ...args.baseline.definitionIds.unresolved,
  ]);
  const historicalCatalog = readGitRevisionFile(
    PRE_RESOLUTION_BASELINE_REVISION,
    args.baseline.provenance.catalogSource.sourcePath,
  ).toString("utf8");
  const importedContentIds = new Set(
    [
      ...historicalCatalog.matchAll(
        /from\s+["']\.\.\/\.\.\/content\/([^"']+)\.json["'];/g,
      ),
    ].map((match) => match[1] ?? ""),
  );
  const historicalShippedDefinitionIds = new Set(
    [...importedContentIds].filter((unitId) =>
      expectedDefinitionIds.has(unitId),
    ),
  );
  assertStringSetEqual(
    historicalShippedDefinitionIds,
    new Set(args.baseline.definitionIds.shipped),
    "historical pre-resolution shipped definition membership",
  );

  const observedDefinitionIds = unrestrictedSpellReferenceDefinitionIds(
    args.records,
    args.resolveUnitReference,
  );
  const historicalUnresolvedDefinitionIds = new Set(
    [...observedDefinitionIds].filter(
      (definitionId) => !historicalShippedDefinitionIds.has(definitionId),
    ),
  );
  assertStringSetEqual(
    historicalUnresolvedDefinitionIds,
    new Set(args.baseline.definitionIds.unresolved),
    "historical pre-resolution unresolved definition membership",
  );
}

function assertBaselineSourceSnapshot(
  snapshot: PreResolutionBaselineSourceSnapshot,
  revision: string,
  label: string,
  checkCurrentFile: boolean,
): void {
  const historicalBytes = readGitRevisionFile(revision, snapshot.sourcePath);
  const historicalSha256 = sha256Bytes(historicalBytes);
  if (historicalSha256 !== snapshot.sha256) {
    throw new Error(
      `${label} ${snapshot.sourcePath} does not match its pinned SHA-256 digest.`,
    );
  }
  const historicalGitBlob = execFileSync(
    "git",
    ["rev-parse", `${revision}:${snapshot.sourcePath}`],
    { cwd: process.cwd(), encoding: "utf8" },
  ).trim();
  if (historicalGitBlob !== snapshot.gitBlob) {
    throw new Error(
      `${label} ${snapshot.sourcePath} does not match its pinned Git blob.`,
    );
  }
  if (checkCurrentFile) {
    const currentBytes = readFileSync(join(process.cwd(), snapshot.sourcePath));
    if (sha256Bytes(currentBytes) !== snapshot.sha256) {
      throw new Error(
        `${label} ${snapshot.sourcePath} changed after the pinned pre-resolution revision.`,
      );
    }
  }
}

function readGitRevisionFile(revision: string, sourcePath: string): Buffer {
  try {
    return execFileSync("git", ["show", `${revision}:${sourcePath}`], {
      cwd: process.cwd(),
      maxBuffer: 5_000_000,
    });
  } catch (error) {
    throw new Error(
      `Unable to read pinned Git source ${revision}:${sourcePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function sha256Bytes(value: Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function assertStringSetEqual(
  actual: ReadonlySet<string>,
  expected: ReadonlySet<string>,
  label: string,
): void {
  const missing = [...expected].filter((member) => !actual.has(member));
  const extra = [...actual].filter((member) => !expected.has(member));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label} differs (missing: ${missing.join(", ")}; extra: ${extra.join(", ")}).`,
    );
  }
}

function assertPreResolutionBaselineBijection(args: {
  readonly baseline: PreResolutionSpellReferenceBaseline;
  readonly records: readonly StatBlockRecord[];
  readonly currentRows: readonly StatBlockSpellReferenceClassification[];
  readonly baselineRows: readonly StatBlockSpellReferenceClassification[];
  readonly source: StatBlockSpellReferenceClassificationSource;
}): void {
  const baselineRowSet = assertUniqueStrings(
    args.baseline.rowIds,
    "pre-resolution baseline rowIds",
  );
  const currentRowIds = args.currentRows.map(({ rowId }) => rowId);
  const currentRowSet = assertUniqueStrings(
    currentRowIds,
    "current spell-reference classification rowIds",
  );
  assertStringSetEqual(
    currentRowSet,
    baselineRowSet,
    "current classification row denominator",
  );
  const baselineClassificationRowSet = assertUniqueStrings(
    args.baselineRows.map(({ rowId }) => rowId),
    "pre-resolution classification rowIds",
  );
  assertStringSetEqual(
    baselineClassificationRowSet,
    baselineRowSet,
    "pre-resolution classification row denominator",
  );
  const currentUnresolvedRowSet = assertUniqueStrings(
    args.currentRows
      .filter(({ definitionStatus }) => definitionStatus === "unresolved")
      .map(({ rowId }) => rowId),
    "current unresolved spell-reference rowIds",
  );
  assertStringSetEqual(
    currentUnresolvedRowSet,
    new Set(),
    "current unresolved spell-reference rows",
  );
  const baselineUnresolvedRowSet = new Set(args.baseline.unresolvedRowIds);
  const observedPreResolutionUnresolvedRowSet = assertUniqueStrings(
    args.baselineRows
      .filter(({ definitionStatus }) => definitionStatus === "unresolved")
      .map(({ rowId }) => rowId),
    "pre-resolution unresolved spell-reference rowIds",
  );
  assertStringSetEqual(
    observedPreResolutionUnresolvedRowSet,
    baselineUnresolvedRowSet,
    "pinned pre-resolution unresolved row membership",
  );

  const expectedDefinitionIds = new Set([
    ...args.baseline.definitionIds.shipped,
    ...args.baseline.definitionIds.unresolved,
  ]);
  const observedDefinitionIds = unrestrictedSpellReferenceDefinitionIds(
    args.records,
    args.source.resolveUnitReference,
  );
  assertStringSetEqual(
    observedDefinitionIds,
    expectedDefinitionIds,
    "current unrestricted spell-reference definition membership",
  );
  const missingAuthoredDefinitions = [...observedDefinitionIds].filter(
    (definitionId) => !args.source.definitions.has(definitionId),
  );
  if (missingAuthoredDefinitions.length > 0) {
    throw new Error(
      `Current unrestricted spell-reference definitions are absent from the authored catalog: ${missingAuthoredDefinitions.join(", ")}`,
    );
  }
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
    `The pre-resolution view is the pinned SRD baseline in \`${PRE_RESOLUTION_BASELINE_PATH}\`, used to prove the #418 partition: 286 = 104 shipped/profiled + 111 shipped/unprofiled + 71 unresolved, with 21 long-casting rows and 104 shipped Concentration rows. The current view reflects the admitted SRD definitions; these rows remain non-executable until a typed owner admits them.`,
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
  const baseline = readPreResolutionSpellReferenceBaseline();
  assertPreResolutionBaselineProvenance({
    baseline,
    records: srdStatBlockCollection.statBlocks,
    resolveUnitReference: currentSource.resolveUnitReference,
  });
  const baselineSource = preResolutionSpellReferenceClassificationSource(
    currentSource,
    baseline,
  );
  const baselineRows = classifyUnrestrictedStatBlockSpellReferences(
    srdStatBlockCollection.statBlocks,
    sourceAuthority,
    baselineSource,
  );
  const baselineDefinitionCounts =
    countUnrestrictedStatBlockSpellReferenceDefinitions(
      srdStatBlockCollection.statBlocks,
      sourceAuthority,
      baselineSource,
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
  if (
    baselineSummary.primaryPartition.shippedProfiled +
      baselineSummary.primaryPartition.shippedUnprofiled +
      baselineSummary.primaryPartition.unresolved !==
    baselineSummary.total
  ) {
    throw new Error(
      `Pre-resolution primary partition does not cover its denominator: ${JSON.stringify(baselineSummary.primaryPartition)}`,
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
  assertPreResolutionBaselineBijection({
    baseline,
    records: srdStatBlockCollection.statBlocks,
    currentRows,
    baselineRows,
    source: currentSource,
  });
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
  const derivedCurrentFacets = {
    longCasting: currentRows.filter(
      ({ castingTimeKind }) =>
        castingTimeKind === "minutes" || castingTimeKind === "hours",
    ).length,
    shippedConcentration: currentRows.filter(
      ({ definitionStatus, durationKind }) =>
        definitionStatus === "shipped" && durationKind === "concentration",
    ).length,
  };
  if (
    currentSummary.facets.longCasting !== derivedCurrentFacets.longCasting ||
    currentSummary.facets.shippedConcentration !==
      derivedCurrentFacets.shippedConcentration
  ) {
    throw new Error(
      `Current spell-reference facets are not derived from current rows: ${JSON.stringify({ summary: currentSummary.facets, derived: derivedCurrentFacets })}`,
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
