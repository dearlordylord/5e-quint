import { createRequire } from "node:module";

import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";

import { decodeSrdSurfaceEither } from "./schema.ts";
import {
  closeSrdSurface,
  collectSurfaceAuthoredRelations,
  srdSurface,
} from "./surface-catalog.ts";

const canonicalRelations = collectSurfaceAuthoredRelations(srdSurface);
if (Either.isLeft(canonicalRelations)) {
  throw new Error("The canonical Surface relation graph must be valid.");
}
const canonicalRelationGraph = canonicalRelations.right;

const require = createRequire(import.meta.url);
const corpusAudit: {
  readonly readSurfaceRecords: () => readonly {
    readonly kind: string;
    readonly value: unknown;
  }[];
  readonly collectAuthoredRelations: (records: readonly unknown[]) => readonly {
    readonly id: string;
    readonly fieldPath: string;
    readonly targetRecordId: string;
    readonly relationKind: string;
    readonly relation: string;
    readonly targetKind: string;
  }[];
} = require("../../../../scripts/srd521-surface-authored-corpus-audit.cjs");

const relationKey = (relation: {
  readonly id?: string;
  readonly sourceRecordId?: string;
  readonly fieldPath: string;
  readonly targetRecordId: string;
  readonly relationKind: string;
  readonly relation: string;
  readonly targetKind: string;
}): string =>
  [
    relation.id ?? relation.sourceRecordId,
    relation.fieldPath,
    relation.targetRecordId,
    relation.relationKind,
    relation.relation,
    relation.targetKind,
  ].join("\u0000");

const objectValue = (
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    // The structural guard establishes a string-keyed object at this test-only
    // mutation boundary; the cast adds that index signature for TypeScript.
    return value as Record<string, unknown>;
  }
  throw new Error(`${label} must be an object in the synthetic relation test`);
};

const arrayValue = (value: unknown, label: string): unknown[] => {
  if (Array.isArray(value)) return value;
  throw new Error(`${label} must be an array in the synthetic relation test`);
};

describe("canonical Surface authored relations", () => {
  it("collects relation metadata from decoded records without source scans", () => {
    const result = collectSurfaceAuthoredRelations(srdSurface);

    expect(Either.isLeft(result)).toBe(false);
    if (Either.isLeft(result)) return;

    expect(result.right.length).toBeGreaterThan(0);
    expect(
      result.right.some(
        (relation) =>
          relation.sourceRecordId === "class_fighter" &&
          relation.targetRecordId === "fighter_action_surge" &&
          relation.relationKind === "dependency",
      ),
    ).toBe(true);
    expect(
      result.right.some(
        (relation) =>
          relation.sourceRecordId === "druid_wild_shape" &&
          relation.targetKind === "statBlock" &&
          relation.relation === "recommended-stat-block-reference",
      ),
    ).toBe(true);
  });

  it("covers every relation in the schema-decodable Surface corpus", () => {
    const sourceRecords = corpusAudit.readSurfaceRecords();
    const expanded = {
      kind: "srd-5.2.1-surface-catalog",
      units: sourceRecords
        .filter((record) => record.kind !== "statBlock")
        .map((record) => record.value),
      statBlocks: sourceRecords
        .filter((record) => record.kind === "statBlock")
        .map((record) => record.value),
    };
    const decoded = decodeSrdSurfaceEither(expanded);

    expect(Either.isRight(decoded)).toBe(true);
    if (Either.isLeft(decoded)) return;
    const actual = collectSurfaceAuthoredRelations(decoded.right);
    expect(Either.isRight(actual)).toBe(true);
    if (Either.isLeft(actual)) return;

    // The corpus audit is a test-only independent oracle. Production traversal
    // receives this already-decoded aggregate and never scans content files.
    const expected = corpusAudit
      .collectAuthoredRelations(sourceRecords)
      .map(relationKey)
      .sort();
    expect(actual.right.map(relationKey).sort()).toEqual(expected);

    // Keep the distinction explicit: these records are schema-decodable but
    // not all are currently in the generated startup publication.
    const publishedIds = new Set([
      ...srdSurface.units.map((record) => String(record.id)),
      ...srdSurface.statBlocks.map((record) => String(record.id)),
    ]);
    const publishedExpected = corpusAudit
      .collectAuthoredRelations(sourceRecords)
      .filter((relation) => publishedIds.has(relation.id))
      .map(relationKey)
      .sort();
    const publishedActual = collectSurfaceAuthoredRelations(srdSurface);
    expect(Either.isRight(publishedActual)).toBe(true);
    if (Either.isLeft(publishedActual)) return;
    expect(publishedActual.right.map(relationKey).sort()).toEqual(
      publishedExpected,
    );
  });

  it("reports every independently malformed authored target without throwing", () => {
    const malformedRecords = corpusAudit.readSurfaceRecords().map((record) => ({
      kind: record.kind,
      value: structuredClone(record.value),
    }));
    const crystalBall = malformedRecords.find(
      (record) =>
        objectValue(record.value, "crystal ball").id ===
        "magic_item_crystal_ball_of_mind_reading",
    );
    const quarterstaff = malformedRecords.find(
      (record) =>
        objectValue(record.value, "quarterstaff").id ===
        "magic_item_quarterstaff_of_the_acrobat",
    );
    if (crystalBall === undefined || quarterstaff === undefined) {
      throw new Error("Expected synthetic relation fixtures in the corpus");
    }

    const crystalMechanics = objectValue(
      objectValue(crystalBall.value, "crystal ball").mechanics,
      "crystal ball mechanics",
    );
    const crystalGrants = arrayValue(
      crystalMechanics.grants,
      "crystal ball grants",
    );
    const crystalGrant = objectValue(crystalGrants[1], "crystal ball grant");
    objectValue(
      crystalGrant.durationOverride,
      "crystal ball duration override",
    ).endsWhenGrantedSpellEnds = "";

    const quarterstaffMechanics = objectValue(
      objectValue(quarterstaff.value, "quarterstaff").mechanics,
      "quarterstaff mechanics",
    );
    const quarterstaffGrants = arrayValue(
      quarterstaffMechanics.grants,
      "quarterstaff grants",
    );
    objectValue(
      objectValue(quarterstaffGrants[0], "quarterstaff first grant")
        .weaponFilter,
      "quarterstaff first weapon filter",
    ).itemId = " ";
    objectValue(
      objectValue(quarterstaffGrants[1], "quarterstaff second grant")
        .weaponFilter,
      "quarterstaff second weapon filter",
    ).itemId = " synthetic malformed ";

    const malformedSurface = {
      kind: "srd-5.2.1-surface-catalog" as const,
      units: malformedRecords
        .filter((record) => record.kind !== "statBlock")
        .map((record) => record.value),
      statBlocks: malformedRecords
        .filter((record) => record.kind === "statBlock")
        .map((record) => record.value),
    };
    const decoded = decodeSrdSurfaceEither(malformedSurface);
    expect(Either.isRight(decoded)).toBe(true);
    if (Either.isLeft(decoded)) return;

    expect(() => collectSurfaceAuthoredRelations(decoded.right)).not.toThrow();
    const result = collectSurfaceAuthoredRelations(decoded.right);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    const invalidIssues = result.left.filter(
      (issue) => issue.code === "invalidRecord",
    );
    expect(invalidIssues).toHaveLength(3);
    expect(invalidIssues.map((issue) => issue.path)).toEqual(
      expect.arrayContaining([
        "value.mechanics.grants[1].durationOverride.endsWhenGrantedSpellEnds",
        "value.mechanics.grants[0].weaponFilter.itemId",
        "value.mechanics.grants[1].weaponFilter.itemId",
      ]),
    );
  });

  it("closes complete dependency graphs while admitting selected references", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      relationGraph: canonicalRelationGraph,
      rootUnitIds: [UnitId.make("class_fighter")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
    });

    expect(Either.isLeft(result)).toBe(false);
    if (Either.isLeft(result)) return;

    const unitIds = new Set(result.right.units.map((unit) => String(unit.id)));
    const statBlockIds = new Set(
      result.right.statBlocks.map((statBlock) => String(statBlock.id)),
    );
    expect(unitIds.has("class_fighter")).toBe(true);
    expect(unitIds.has("fighter_action_surge")).toBe(true);
    expect(unitIds.has("subclass_fighter_champion")).toBe(false);
    expect(statBlockIds).toEqual(new Set(["stat_block_skeleton"]));
  });

  it("retains a referenced record when the workflow lookup policy requires it", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      relationGraph: canonicalRelationGraph,
      rootUnitIds: [UnitId.make("class_fighter")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
      relationSelection: {
        includeReference: (relation) => relation.relation === "subclass-choice",
      },
    });

    expect(Either.isLeft(result)).toBe(false);
    if (Either.isLeft(result)) return;
    expect(result.right.units.some((unit) => unit.kind === "subclass")).toBe(
      true,
    );
  });

  it("reports an absent root as a typed closure issue", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      relationGraph: canonicalRelationGraph,
      rootUnitIds: [UnitId.make("synthetic_missing_unit")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left[0]).toMatchObject({
      tag: "surfaceRelationClosureIssue",
      code: "missingRoot",
      fieldPath: "<root>",
    });
  });
});
