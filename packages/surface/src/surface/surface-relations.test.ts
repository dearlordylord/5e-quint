import { createRequire } from "node:module";

import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { StatBlockId, UnitId } from "@dnd/shared/game-facts";

import { decodeSrdSurfaceResult } from "./schema.ts";
import { surfaceSchemaRole } from "./schema-base.ts";
import {
  closeSrdSurface,
  collectSurfaceAuthoredRelations,
  srdSurface,
} from "./surface-catalog.ts";
import { collectSurfaceRecordAuthoredRelations } from "./surface-relations-internal.ts";

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

const mutablePublishedSurface = () => structuredClone(srdSurface);

const mutableUnit = (
  surface: ReturnType<typeof mutablePublishedSurface>,
  id: string,
): Record<string, unknown> => {
  const unit = surface.units.find((record) => record.id === id);
  if (unit === undefined) throw new Error(`Missing published Unit ${id}`);
  return objectValue(unit, id);
};

describe("canonical Surface authored relations", () => {
  it("derives every Stat Block source relation family from schema roles", () => {
    const source = srdSurface.statBlocks.find(
      (record) => record.id === "stat_block_skeleton",
    );
    if (source === undefined) {
      throw new Error("Missing the skeleton Stat Block relation source");
    }
    const schema = Schema.Struct({
      unitReference: surfaceSchemaRole(Schema.String, {
        category: "reference",
        relation: "unit-reference",
        targetKind: "unit",
      }),
      unitDependency: surfaceSchemaRole(Schema.String, {
        category: "dependency",
        relation: "spell-reference",
        targetKind: "unit",
      }),
      statBlockReference: surfaceSchemaRole(Schema.String, {
        category: "reference",
        relation: "recommended-stat-block-reference",
        targetKind: "statBlock",
      }),
      statBlockDependency: surfaceSchemaRole(Schema.String, {
        category: "dependency",
        relation: "monster-reference",
        targetKind: "statBlock",
      }),
    });
    const decoded = collectSurfaceRecordAuthoredRelations({
      source: { sourceKind: "statBlock", value: source },
      schema,
      value: {
        unitReference: "synthetic_unit_target",
        unitDependency: "synthetic_unit_dependency",
        statBlockReference: "synthetic_stat_block_target",
        statBlockDependency: "synthetic_stat_block_dependency",
      },
    });
    const rejected = collectSurfaceRecordAuthoredRelations({
      source: { sourceKind: "statBlock", value: source },
      schema,
      value: {
        unitReference: "",
        unitDependency: " ",
        statBlockReference: "",
        statBlockDependency: " ",
      },
    });

    expect(decoded.issues).toEqual([]);
    expect(decoded.relations).toHaveLength(4);
    expect(decoded.relations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKind: "statBlock",
          targetKind: "unit",
          relationKind: "reference",
          targetRecordId: "synthetic_unit_target",
        }),
        expect.objectContaining({
          sourceKind: "statBlock",
          targetKind: "unit",
          relationKind: "dependency",
          targetRecordId: "synthetic_unit_dependency",
        }),
        expect.objectContaining({
          sourceKind: "statBlock",
          targetKind: "statBlock",
          relationKind: "reference",
          targetRecordId: "synthetic_stat_block_target",
        }),
        expect.objectContaining({
          sourceKind: "statBlock",
          targetKind: "statBlock",
          relationKind: "dependency",
          targetRecordId: "synthetic_stat_block_dependency",
        }),
      ]),
    );
    expect(rejected.relations).toEqual([]);
    expect(rejected.issues).toHaveLength(4);
    expect(rejected.issues.map((issue) => issue.code)).toEqual([
      "invalidRecord",
      "invalidRecord",
      "invalidRecord",
      "invalidRecord",
    ]);
  });

  it("collects relation metadata from decoded records without source scans", () => {
    const result = collectSurfaceAuthoredRelations(srdSurface);

    expect(Result.isFailure(result)).toBe(false);
    if (Result.isFailure(result)) return;

    expect(result.success.length).toBeGreaterThan(0);
    expect(
      result.success.some(
        (relation) =>
          relation.sourceRecordId === "class_fighter" &&
          relation.targetRecordId === "fighter_action_surge" &&
          relation.relationKind === "dependency",
      ),
    ).toBe(true);
    expect(
      result.success.some(
        (relation) =>
          relation.sourceKind === "unit" &&
          "sourceRole" in relation &&
          relation.sourceRecordId === "class_fighter" &&
          relation.targetRecordId === "subclass_fighter_champion" &&
          relation.sourceRole === "class-subclass-choice",
      ),
    ).toBe(true);
    expect(
      result.success.some(
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
    const decoded = decodeSrdSurfaceResult(expanded);

    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;
    const actual = collectSurfaceAuthoredRelations(decoded.success);
    expect(Result.isSuccess(actual)).toBe(true);
    if (Result.isFailure(actual)) return;

    // The corpus audit is a test-only independent oracle. Production traversal
    // receives this already-decoded aggregate and never scans content files.
    const expected = corpusAudit
      .collectAuthoredRelations(sourceRecords)
      .map(relationKey)
      .sort();
    expect(actual.success.map(relationKey).sort()).toEqual(expected);

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
    expect(Result.isSuccess(publishedActual)).toBe(true);
    if (Result.isFailure(publishedActual)) return;
    expect(publishedActual.success.map(relationKey).sort()).toEqual(
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
    const decoded = decodeSrdSurfaceResult(malformedSurface);
    expect(Result.isSuccess(decoded)).toBe(true);
    if (Result.isFailure(decoded)) return;

    expect(() =>
      collectSurfaceAuthoredRelations(decoded.success),
    ).not.toThrow();
    const result = collectSurfaceAuthoredRelations(decoded.success);
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    const invalidIssues = result.failure.filter(
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

  it("reports malformed stat-block reference and dependency targets", () => {
    const malformedSurface = mutablePublishedSurface();
    const wildShapeMechanics = objectValue(
      mutableUnit(malformedSurface, "druid_wild_shape").mechanics,
      "wild shape mechanics",
    );
    const wildShapePhase = objectValue(
      arrayValue(wildShapeMechanics.phases, "wild shape phases")[0],
      "wild shape phase",
    );
    const wildShapeEffect = objectValue(
      arrayValue(wildShapePhase.effects, "wild shape effects")[0],
      "wild shape effect",
    );
    const newForm = objectValue(wildShapeEffect.newForm, "wild shape new form");
    arrayValue(
      newForm.recommendedFormStatBlockIds,
      "recommended wild shape forms",
    )[0] = "";

    const familiarMechanics = objectValue(
      mutableUnit(malformedSurface, "find_familiar").mechanics,
      "find familiar mechanics",
    );
    const familiarCreature = objectValue(
      familiarMechanics.creature,
      "find familiar creature",
    );
    objectValue(
      arrayValue(familiarCreature.normalForms, "familiar forms")[0],
      "familiar form",
    ).statBlockId = " ";

    const result = collectSurfaceAuthoredRelations(malformedSurface);

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "invalidRecord",
          path: "value.mechanics.phases[0].effects[0].newForm.recommendedFormStatBlockIds[0]",
        }),
        expect.objectContaining({
          code: "invalidRecord",
          path: "value.mechanics.creature.normalForms[0].statBlockId",
        }),
      ]),
    );
  });

  it("closes complete dependency graphs while admitting selected references", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      rootUnitIds: [UnitId.make("class_fighter")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
    });

    expect(Result.isFailure(result)).toBe(false);
    if (Result.isFailure(result)) return;

    const unitIds = new Set(
      result.success.units.map((unit) => String(unit.id)),
    );
    const statBlockIds = new Set(
      result.success.statBlocks.map((statBlock) => String(statBlock.id)),
    );
    expect(unitIds.has("class_fighter")).toBe(true);
    expect(unitIds.has("fighter_action_surge")).toBe(true);
    expect(unitIds.has("subclass_fighter_champion")).toBe(false);
    expect(statBlockIds).toEqual(new Set(["stat_block_skeleton"]));
  });

  it("retains a referenced record when the workflow lookup policy requires it", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      rootUnitIds: [UnitId.make("class_fighter")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
      relationSelection: {
        includeReference: (relation) => relation.relation === "subclass-choice",
      },
    });

    expect(Result.isFailure(result)).toBe(false);
    if (Result.isFailure(result)) return;
    expect(result.success.units.some((unit) => unit.kind === "subclass")).toBe(
      true,
    );
  });

  it("lets a workflow reject dependencies through the selection policy", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      rootUnitIds: [UnitId.make("class_fighter")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
      relationSelection: {
        includeDependency: () => false,
      },
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;
    expect(result.success.units.map((record) => String(record.id))).toEqual([
      "class_fighter",
    ]);
  });

  it("reports missing Unit and Stat Block relation targets", () => {
    const units = srdSurface.units.filter(
      (record) => record.id !== "fighter_action_surge",
    );
    const statBlocks = srdSurface.statBlocks.filter(
      (record) => record.id !== "stat_block_bat",
    );
    const firstUnit = units[0];
    const firstStatBlock = statBlocks[0];
    if (firstUnit === undefined || firstStatBlock === undefined) {
      throw new Error("Removing relation targets emptied a Surface family");
    }
    const surfaceWithoutTargets = {
      ...srdSurface,
      units: [firstUnit, ...units.slice(1)] as const,
      statBlocks: [firstStatBlock, ...statBlocks.slice(1)] as const,
    };
    const result = closeSrdSurface({
      surface: surfaceWithoutTargets,
      rootUnitIds: [UnitId.make("class_fighter"), UnitId.make("find_familiar")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "missingTarget",
          targetKind: "unit",
          targetRecordId: "fighter_action_surge",
        }),
        expect.objectContaining({
          code: "missingTarget",
          targetKind: "statBlock",
          targetRecordId: "stat_block_bat",
        }),
      ]),
    );
  });

  it("reports an absent root as a typed closure issue", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      rootUnitIds: [UnitId.make("synthetic_missing_unit")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure[0]).toMatchObject({
      tag: "surfaceRelationClosureIssue",
      code: "missingRoot",
      fieldPath: "<root>",
    });
  });

  it("reports an absent Stat Block root with its record family", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      rootUnitIds: [UnitId.make("weapon_club")],
      rootStatBlockIds: [StatBlockId.make("synthetic_missing_stat_block")],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure[0]).toMatchObject({
      tag: "surfaceRelationClosureIssue",
      code: "missingRoot",
      rootKind: "statBlock",
      rootId: "synthetic_missing_stat_block",
      fieldPath: "<root>",
    });
  });

  it("requires a closed projection to retain both record families", () => {
    const withoutUnit = closeSrdSurface({
      surface: srdSurface,
      rootUnitIds: [],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
    });
    const withoutStatBlock = closeSrdSurface({
      surface: srdSurface,
      rootUnitIds: [UnitId.make("weapon_club")],
      rootStatBlockIds: [],
    });

    expect(Result.isFailure(withoutUnit)).toBe(true);
    expect(Result.isFailure(withoutStatBlock)).toBe(true);
    if (Result.isSuccess(withoutUnit) || Result.isSuccess(withoutStatBlock))
      return;
    expect(withoutUnit.failure[0]).toMatchObject({
      code: "emptyProjection",
      missingFamily: "unit",
    });
    expect(withoutStatBlock.failure[0]).toMatchObject({
      code: "emptyProjection",
      missingFamily: "statBlock",
    });
  });

  it("deduplicates repeated Stat Block roots", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
      rootUnitIds: [UnitId.make("weapon_club")],
      rootStatBlockIds: [
        StatBlockId.make("stat_block_skeleton"),
        StatBlockId.make("stat_block_skeleton"),
      ],
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;
    expect(result.success.statBlocks).toHaveLength(1);
    expect(result.success.statBlocks[0]?.id).toBe("stat_block_skeleton");
  });

  it("passes traversal issues through the closure boundary", () => {
    const malformedSurface = mutablePublishedSurface();
    const familiarMechanics = objectValue(
      mutableUnit(malformedSurface, "find_familiar").mechanics,
      "find familiar mechanics",
    );
    const familiarCreature = objectValue(
      familiarMechanics.creature,
      "find familiar creature",
    );
    objectValue(
      arrayValue(familiarCreature.normalForms, "familiar forms")[0],
      "familiar form",
    ).statBlockId = "";

    const result = closeSrdSurface({
      surface: malformedSurface,
      rootUnitIds: [UnitId.make("find_familiar")],
      rootStatBlockIds: [StatBlockId.make("stat_block_skeleton")],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) return;
    expect(result.failure[0]).toMatchObject({
      tag: "surfaceRelationTraversalIssue",
      code: "invalidRecord",
    });
  });
});
