import { describe, expect, test } from "vitest";

import sphinxOfValorInput from "../../content/stat_block_sphinx_of_valor.json";
import { decodeStatBlockRecordSync } from "./schema.ts";
import {
  resolveAuthoredUnitReference,
  srdUnitCollection,
} from "./unit-catalog.ts";
import type { StatBlockRecord } from "./types.ts";

const sphinxOfValor = decodeStatBlockRecordSync(sphinxOfValorInput);

function findSphinxHeroesFeastReference(
  record: StatBlockRecord,
): string | undefined {
  for (const entry of record.statBlock.actions ?? []) {
    if (
      entry.kind !== "executable" ||
      entry.procedure.kind !== "spellcasting"
    ) {
      continue;
    }
    for (const group of entry.procedure.groups) {
      const reference = group.spells.find(
        ({ spellId }) => spellId === "heroes'_feast",
      );
      if (reference !== undefined) return reference.spellId;
    }
  }
  return undefined;
}

describe("authored Unit reference resolver", () => {
  test("resolves canonical catalog IDs without changing them", () => {
    const resolution = resolveAuthoredUnitReference(
      "heroes_feast",
      srdUnitCollection.units,
    );

    expect(resolution?.canonicalUnitId).toBe("heroes_feast");
    expect(resolution?.authoredReference).toBe("heroes_feast");
  });

  test("resolves source-authored spell references while preserving source spelling", () => {
    const sourceReference = findSphinxHeroesFeastReference(sphinxOfValor);
    expect(sourceReference).toBe("heroes'_feast");

    const resolution = resolveAuthoredUnitReference(
      sourceReference!,
      srdUnitCollection.units,
    );

    expect(resolution?.canonicalUnitId).toBe("heroes_feast");
    expect(resolution?.authoredReference).toBe("heroes'_feast");
  });

  test("does not choose an ambiguous normalized catalog identity", () => {
    const first = srdUnitCollection.units.find(
      ({ id }) => id === "heroes_feast",
    );
    if (first === undefined) throw new Error("Expected Heroes' Feast Unit");

    const ambiguous = [
      { ...first, id: "heroes'feast" as typeof first.id },
      { ...first, id: "heroes’feast" as typeof first.id },
    ];
    expect(
      resolveAuthoredUnitReference("heroesfeast", ambiguous),
    ).toBeUndefined();
  });
});
