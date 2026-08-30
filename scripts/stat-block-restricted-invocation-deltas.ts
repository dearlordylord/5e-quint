import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Either, Schema } from "effect";
import { srdStatBlockCollection } from "../packages/surface/src/surface/stat-block-catalog.ts";
import {
  STAT_BLOCK_SPELL_INVOCATION_DELTA_KINDS,
  StatBlockSpellInvocationDeltasSchema,
} from "../packages/surface/src/surface/schema.ts";
import type {
  SrdStatBlockRecord,
  StatBlockSpellInvocationDeltaKind,
  StatBlockSpellInvocationDeltas,
} from "../packages/surface/src/surface/types.ts";

const RESTRICTED_INVOCATION_FAMILY_ID =
  "stat-block.spell-invocation.restricted";

const EXPECTED_RECONCILIATION_OCCURRENCE_COUNT = 2602;
const EXPECTED_RECONCILIATION_FAMILY_COUNT = 20;
const EXPECTED_RESTRICTED_INVOCATION_ROW_COUNT = 23;
const EXPECTED_RESTRICTED_INVOCATION_RECORD_COUNT = 21;
const EXPECTED_DELTA_OCCURRENCE_COUNT = 49;

const EXPECTED_DELTA_OCCURRENCES_BY_KIND = {
  transformation_form_creature_type_limit: 12,
  temporary_hit_points: 12,
  concentration_requirement: 12,
  effect_termination: 2,
  created_substance_substitution: 1,
  duration_override: 2,
  target_limit: 3,
  movement_trace_suppression: 1,
  appearance_options: 1,
  armor_class_already_includes_effect: 2,
  application_timing: 1,
} as const satisfies Readonly<
  Record<StatBlockSpellInvocationDeltaKind, number>
>;

type ReconciliationRestrictedFamilyEvidence = {
  readonly reconciliationOccurrenceCount: number;
  readonly reconciliationFamilyCount: number;
  readonly state: string;
  readonly occurrenceCount: number;
  readonly statBlockCount: number;
  readonly memberRowIds: readonly string[];
};

export type RestrictedInvocationClassificationRow = {
  readonly rowId: string;
  readonly recordOrdinal: number;
  readonly deltas: StatBlockSpellInvocationDeltas;
};

export type RestrictedInvocationDeltaEvidence = {
  readonly kind: "statBlockRestrictedInvocationDeltaEvidence";
  readonly reconciliation: {
    readonly occurrenceCount: 2602;
    readonly familyCount: 20;
    readonly restrictedInvocationDisposition: "missingOwner";
  };
  readonly classification: {
    readonly rowCount: 23;
    readonly recordCount: 21;
    readonly deltaVocabularyCount: 11;
    readonly deltaOccurrenceCount: 49;
    readonly deltaKindCounts: readonly {
      readonly kind: StatBlockSpellInvocationDeltaKind;
      readonly count: number;
    }[];
  };
};

export type RestrictedInvocationDeltaEvidenceIssue =
  | { readonly kind: "unreadableReconciliation"; readonly reason: string }
  | { readonly kind: "malformedReconciliation" }
  | {
      readonly kind: "reconciliationOccurrenceCountMismatch";
      readonly actual: number;
    }
  | {
      readonly kind: "reconciliationFamilyCountMismatch";
      readonly actual: number;
    }
  | {
      readonly kind: "restrictedFamilyDispositionMismatch";
      readonly actual: string;
    }
  | {
      readonly kind: "restrictedFamilyRowCountMismatch";
      readonly actual: number;
    }
  | {
      readonly kind: "restrictedFamilyRecordCountMismatch";
      readonly actual: number;
    }
  | { readonly kind: "duplicateReconciliationRow"; readonly rowId: string }
  | { readonly kind: "duplicateClassificationRow"; readonly rowId: string }
  | { readonly kind: "missingClassificationRow"; readonly rowId: string }
  | { readonly kind: "unexpectedClassificationRow"; readonly rowId: string }
  | { readonly kind: "classificationRowCountMismatch"; readonly actual: number }
  | {
      readonly kind: "classificationRecordCountMismatch";
      readonly actual: number;
    }
  | {
      readonly kind: "duplicateDeltaKind";
      readonly rowId: string;
      readonly deltaKind: StatBlockSpellInvocationDeltaKind;
    }
  | {
      readonly kind: "deltaKindCountMismatch";
      readonly deltaKind: StatBlockSpellInvocationDeltaKind;
      readonly actual: number;
    }
  | { readonly kind: "deltaOccurrenceCountMismatch"; readonly actual: number };

export type RestrictedInvocationDeltaEvidenceResult =
  | {
      readonly tag: "valid";
      readonly evidence: RestrictedInvocationDeltaEvidence;
    }
  | {
      readonly tag: "invalid";
      readonly issues: readonly [
        RestrictedInvocationDeltaEvidenceIssue,
        ...RestrictedInvocationDeltaEvidenceIssue[],
      ];
    };

type ProcedureSection =
  | "actions"
  | "bonusActions"
  | "reactions"
  | "legendaryActions";

function procedureSections(record: SrdStatBlockRecord): readonly {
  readonly section: ProcedureSection;
  readonly entries: NonNullable<SrdStatBlockRecord["statBlock"]["actions"]>;
}[] {
  return [
    { section: "actions", entries: record.statBlock.actions ?? [] },
    { section: "bonusActions", entries: record.statBlock.bonusActions ?? [] },
    { section: "reactions", entries: record.statBlock.reactions ?? [] },
    {
      section: "legendaryActions",
      entries: record.statBlock.legendaryActions?.entries ?? [],
    },
  ];
}

export function collectRestrictedInvocationClassificationRows(
  records: readonly SrdStatBlockRecord[],
): readonly RestrictedInvocationClassificationRow[] {
  return records.flatMap((record, recordIndex) =>
    procedureSections(record).flatMap(({ section, entries }) =>
      entries.flatMap((entry) => {
        if (
          entry.kind !== "executable" ||
          entry.procedure.kind !== "spellcasting"
        ) {
          return [];
        }
        return entry.procedure.groups.flatMap((group, groupIndex) =>
          group.spells.flatMap((spell, spellIndex) => {
            if (spell.restriction === undefined) return [];
            const location = {
              kind: "spellReference",
              section,
              procedureOrdinal: entry.procedureOrdinal,
              groupOrdinal: groupIndex + 1,
              spellOrdinal: spellIndex + 1,
            } as const;
            return [
              {
                rowId: `stat-block-${String(recordIndex + 1)}:${JSON.stringify(location)}`,
                recordOrdinal: recordIndex + 1,
                deltas: spell.restriction.deltas,
              },
            ];
          }),
        );
      }),
    ),
  );
}

function duplicateValues<Value extends string>(
  values: readonly Value[],
): readonly Value[] {
  const seen = new Set<Value>();
  const duplicates = new Set<Value>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function validateRestrictedInvocationDeltaEvidence(input: {
  readonly family: ReconciliationRestrictedFamilyEvidence;
  readonly rows: readonly RestrictedInvocationClassificationRow[];
}): RestrictedInvocationDeltaEvidenceResult {
  const issues: RestrictedInvocationDeltaEvidenceIssue[] = [];
  const { family, rows } = input;

  if (
    family.reconciliationOccurrenceCount !==
    EXPECTED_RECONCILIATION_OCCURRENCE_COUNT
  ) {
    issues.push({
      kind: "reconciliationOccurrenceCountMismatch",
      actual: family.reconciliationOccurrenceCount,
    });
  }
  if (
    family.reconciliationFamilyCount !== EXPECTED_RECONCILIATION_FAMILY_COUNT
  ) {
    issues.push({
      kind: "reconciliationFamilyCountMismatch",
      actual: family.reconciliationFamilyCount,
    });
  }
  if (family.state !== "missingOwner") {
    issues.push({
      kind: "restrictedFamilyDispositionMismatch",
      actual: family.state,
    });
  }
  if (family.occurrenceCount !== EXPECTED_RESTRICTED_INVOCATION_ROW_COUNT) {
    issues.push({
      kind: "restrictedFamilyRowCountMismatch",
      actual: family.occurrenceCount,
    });
  }
  if (family.statBlockCount !== EXPECTED_RESTRICTED_INVOCATION_RECORD_COUNT) {
    issues.push({
      kind: "restrictedFamilyRecordCountMismatch",
      actual: family.statBlockCount,
    });
  }

  for (const rowId of duplicateValues(family.memberRowIds)) {
    issues.push({ kind: "duplicateReconciliationRow", rowId });
  }
  const rowIds = rows.map(({ rowId }) => rowId);
  for (const rowId of duplicateValues(rowIds)) {
    issues.push({ kind: "duplicateClassificationRow", rowId });
  }
  const expectedRows = new Set(family.memberRowIds);
  const classifiedRows = new Set(rowIds);
  for (const rowId of expectedRows) {
    if (!classifiedRows.has(rowId)) {
      issues.push({ kind: "missingClassificationRow", rowId });
    }
  }
  for (const rowId of classifiedRows) {
    if (!expectedRows.has(rowId)) {
      issues.push({ kind: "unexpectedClassificationRow", rowId });
    }
  }
  if (rows.length !== EXPECTED_RESTRICTED_INVOCATION_ROW_COUNT) {
    issues.push({
      kind: "classificationRowCountMismatch",
      actual: rows.length,
    });
  }
  const recordCount = new Set(rows.map(({ recordOrdinal }) => recordOrdinal))
    .size;
  if (recordCount !== EXPECTED_RESTRICTED_INVOCATION_RECORD_COUNT) {
    issues.push({
      kind: "classificationRecordCountMismatch",
      actual: recordCount,
    });
  }

  const kindCounts = new Map<StatBlockSpellInvocationDeltaKind, number>();
  let deltaOccurrenceCount = 0;
  for (const row of rows) {
    const kinds = row.deltas.map(({ kind }) => kind);
    for (const duplicateKind of duplicateValues(kinds)) {
      issues.push({
        kind: "duplicateDeltaKind",
        rowId: row.rowId,
        deltaKind: duplicateKind,
      });
    }
    for (const kind of kinds) {
      kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
      deltaOccurrenceCount += 1;
    }
  }
  for (const kind of STAT_BLOCK_SPELL_INVOCATION_DELTA_KINDS) {
    const actual = kindCounts.get(kind) ?? 0;
    if (actual !== EXPECTED_DELTA_OCCURRENCES_BY_KIND[kind]) {
      issues.push({ kind: "deltaKindCountMismatch", deltaKind: kind, actual });
    }
  }
  if (deltaOccurrenceCount !== EXPECTED_DELTA_OCCURRENCE_COUNT) {
    issues.push({
      kind: "deltaOccurrenceCountMismatch",
      actual: deltaOccurrenceCount,
    });
  }

  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return { tag: "invalid", issues: [firstIssue, ...remainingIssues] };
  }

  return {
    tag: "valid",
    evidence: {
      kind: "statBlockRestrictedInvocationDeltaEvidence",
      reconciliation: {
        occurrenceCount: EXPECTED_RECONCILIATION_OCCURRENCE_COUNT,
        familyCount: EXPECTED_RECONCILIATION_FAMILY_COUNT,
        restrictedInvocationDisposition: "missingOwner",
      },
      classification: {
        rowCount: EXPECTED_RESTRICTED_INVOCATION_ROW_COUNT,
        recordCount: EXPECTED_RESTRICTED_INVOCATION_RECORD_COUNT,
        deltaVocabularyCount: STAT_BLOCK_SPELL_INVOCATION_DELTA_KINDS.length,
        deltaOccurrenceCount: EXPECTED_DELTA_OCCURRENCE_COUNT,
        deltaKindCounts: STAT_BLOCK_SPELL_INVOCATION_DELTA_KINDS.map(
          (kind) => ({ kind, count: kindCounts.get(kind) ?? 0 }),
        ),
      },
    },
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function loadReconciliationRestrictedFamily(path: string):
  | {
      readonly tag: "loaded";
      readonly family: ReconciliationRestrictedFamilyEvidence;
    }
  | {
      readonly tag: "invalid";
      readonly issue: RestrictedInvocationDeltaEvidenceIssue;
    } {
  let document: unknown;
  try {
    document = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return {
      tag: "invalid",
      issue: { kind: "unreadableReconciliation", reason: String(error) },
    };
  }
  if (
    !isObject(document) ||
    !isObject(document.source) ||
    typeof document.source.occurrenceCount !== "number" ||
    !Array.isArray(document.families)
  ) {
    return { tag: "invalid", issue: { kind: "malformedReconciliation" } };
  }
  const family = document.families.find(
    (candidate) =>
      isObject(candidate) && candidate.id === RESTRICTED_INVOCATION_FAMILY_ID,
  );
  if (
    !isObject(family) ||
    typeof family.state !== "string" ||
    typeof family.occurrenceCount !== "number" ||
    typeof family.statBlockCount !== "number" ||
    !Array.isArray(family.memberRowIds) ||
    !family.memberRowIds.every((rowId) => typeof rowId === "string")
  ) {
    return { tag: "invalid", issue: { kind: "malformedReconciliation" } };
  }
  return {
    tag: "loaded",
    family: {
      reconciliationOccurrenceCount: document.source.occurrenceCount,
      reconciliationFamilyCount: document.families.length,
      state: family.state,
      occurrenceCount: family.occurrenceCount,
      statBlockCount: family.statBlockCount,
      memberRowIds: family.memberRowIds,
    },
  };
}

export function currentRestrictedInvocationDeltaEvidence(
  repositoryRoot: string,
): RestrictedInvocationDeltaEvidenceResult {
  const loaded = loadReconciliationRestrictedFamily(
    join(
      repositoryRoot,
      "plans/stat-block-execution-reconciliation/inventory.json",
    ),
  );
  if (loaded.tag === "invalid") {
    return { tag: "invalid", issues: [loaded.issue] };
  }
  return validateRestrictedInvocationDeltaEvidence({
    family: loaded.family,
    rows: collectRestrictedInvocationClassificationRows(
      srdStatBlockCollection.statBlocks,
    ),
  });
}

function runSelfTest(repositoryRoot: string): boolean {
  const loaded = loadReconciliationRestrictedFamily(
    join(
      repositoryRoot,
      "plans/stat-block-execution-reconciliation/inventory.json",
    ),
  );
  if (loaded.tag === "invalid") return false;
  const rows = collectRestrictedInvocationClassificationRows(
    srdStatBlockCollection.statBlocks,
  );
  const missingBijection = validateRestrictedInvocationDeltaEvidence({
    family: {
      ...loaded.family,
      memberRowIds: loaded.family.memberRowIds.slice(1),
    },
    rows,
  });
  const duplicateBijection = validateRestrictedInvocationDeltaEvidence({
    family: {
      ...loaded.family,
      memberRowIds: [
        ...loaded.family.memberRowIds,
        loaded.family.memberRowIds[0] ?? "synthetic-missing-row",
      ],
    },
    rows,
  });
  const duplicateDelta = Schema.decodeUnknownEither(
    StatBlockSpellInvocationDeltasSchema,
  )([
    { kind: "target_limit", target: "self" },
    { kind: "target_limit", target: "self" },
  ]);
  return (
    missingBijection.tag === "invalid" &&
    missingBijection.issues.some(
      ({ kind }) => kind === "unexpectedClassificationRow",
    ) &&
    duplicateBijection.tag === "invalid" &&
    duplicateBijection.issues.some(
      ({ kind }) => kind === "duplicateReconciliationRow",
    ) &&
    Either.isLeft(duplicateDelta)
  );
}

function main(): void {
  if (process.argv.includes("--self-test")) {
    if (!runSelfTest(process.cwd())) {
      process.exitCode = 1;
      console.error("Restricted invocation delta evidence self-test failed.");
      return;
    }
    console.log("Restricted invocation delta evidence self-test passed.");
    return;
  }
  const result = currentRestrictedInvocationDeltaEvidence(process.cwd());
  if (result.tag === "invalid") {
    process.exitCode = 1;
    console.error(JSON.stringify(result.issues, null, 2));
    return;
  }
  console.log(JSON.stringify(result.evidence, null, 2));
}

if (
  process.argv.some((argument) =>
    argument.endsWith("stat-block-restricted-invocation-deltas.ts"),
  )
) {
  main();
}
