import { describe, expect, test } from "vitest";
import { srdStatBlockCollection } from "../packages/surface/src/surface/stat-block-catalog.ts";

import {
  collectRestrictedInvocationClassificationRows,
  currentRestrictedInvocationDeltaEvidence,
  validateRestrictedInvocationDeltaEvidence,
} from "./stat-block-restricted-invocation-deltas.ts";

describe("restricted Stat Block invocation delta evidence", () => {
  test("proves the reconciliation-row bijection and aggregate classification", () => {
    const result = currentRestrictedInvocationDeltaEvidence(process.cwd());
    if (result.tag === "invalid") {
      throw new Error(JSON.stringify(result.issues));
    }

    expect(result.evidence).toMatchObject({
      reconciliation: {
        occurrenceCount: 2602,
        familyCount: 20,
        restrictedInvocationDisposition: "missingOwner",
      },
      classification: {
        rowCount: 23,
        recordCount: 21,
        researchedFamilyCount: 11,
        deltaVocabularyCount: 11,
        deltaOccurrenceCount: 49,
      },
    });
    expect(result.evidence.classification.deltaKindCounts).toEqual([
      { kind: "transformation_form_creature_type_limit", count: 12 },
      { kind: "temporary_hit_points", count: 12 },
      { kind: "concentration_requirement", count: 12 },
      { kind: "effect_termination", count: 2 },
      { kind: "created_substance_substitution", count: 1 },
      { kind: "duration_override", count: 2 },
      { kind: "target_limit", count: 3 },
      { kind: "movement_trace_suppression", count: 1 },
      { kind: "appearance_options", count: 1 },
      { kind: "armor_class_already_includes_effect", count: 2 },
      { kind: "application_timing", count: 1 },
    ]);

    const serialized = JSON.stringify(result.evidence);
    for (const forbidden of [
      "rowId",
      "statBlockId",
      "spellId",
      "authoredExpression",
      "provenance",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  test("detects missing and multiply classified row evidence", () => {
    const rows = collectRestrictedInvocationClassificationRows(
      srdStatBlockCollection.statBlocks,
    );
    const family = {
      reconciliationOccurrenceCount: 2602,
      reconciliationFamilyCount: 20,
      state: "missingOwner",
      occurrenceCount: 23,
      statBlockCount: 21,
      memberRowIds: rows.map(({ rowId }) => rowId),
    } as const;

    const missing = validateRestrictedInvocationDeltaEvidence({
      family: { ...family, memberRowIds: family.memberRowIds.slice(1) },
      rows,
    });
    expect(missing).toMatchObject({
      tag: "invalid",
      issues: [{ kind: "unexpectedClassificationRow" }],
    });

    const first = rows[0];
    if (first === undefined) {
      throw new Error("Expected restricted invocation rows.");
    }
    const duplicate = validateRestrictedInvocationDeltaEvidence({
      family,
      rows: [...rows, first],
    });
    expect(duplicate).toMatchObject({
      tag: "invalid",
      issues: expect.arrayContaining([
        expect.objectContaining({ kind: "duplicateClassificationRow" }),
      ]),
    });
  });
});
