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

  it("closes complete dependency graphs while admitting selected references", () => {
    const result = closeSrdSurface({
      surface: srdSurface,
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
