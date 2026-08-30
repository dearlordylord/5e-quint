import { describe, expect, it } from "vitest";

import {
  buildUnitCatalog,
  srdUnitCollection,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import { Option, Result } from "effect";
import {
  CHARACTER_CREATION_WORKFLOW_HORIZON,
  characterCreationWorkflowProgressions,
  deriveCharacterCreationWorkflowRoots,
} from "./workflow-horizon.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag === "invalid") {
  throw new Error("The canonical SRD Unit collection must build for this test");
}

describe("character creation workflow horizon", () => {
  it("retains single-class level one/two paths and first multiclass gains", () => {
    const progressions = characterCreationWorkflowProgressions();

    expect(progressions.length).toBeGreaterThan(0);
    expect(
      progressions.every(
        (progression) =>
          progression.advancements.length + 1 <=
          CHARACTER_CREATION_WORKFLOW_HORIZON.maxCharacterLevel,
      ),
    ).toBe(true);
    expect(
      progressions.some(
        (progression) =>
          progression.advancements.length === 1 &&
          progression.advancements[0]?.classUnitId !==
            progression.startingClass,
      ),
    ).toBe(true);
  });

  it("derives roots from catalog mechanics and discovery families", () => {
    const roots = deriveCharacterCreationWorkflowRoots({
      unitLibrary: unitCatalogResult.catalog,
    });
    expect(Result.isSuccess(roots)).toBe(true);
    if (Result.isFailure(roots)) return;
    const rootIds = new Set(roots.success.unitIds.map(String));
    const units = unitCatalogResult.catalog.listUnits();

    expect(rootIds.size).toBe(roots.success.unitIds.length);
    expect(
      units
        .filter((unit) => unit.kind === "class")
        .every((unit) => rootIds.has(String(unit.id))),
    ).toBe(true);
    expect(
      units
        .filter((unit) => unit.kind === "background" || unit.kind === "species")
        .every((unit) => rootIds.has(String(unit.id))),
    ).toBe(true);
    expect(
      units
        .filter((unit) => unit.kind === "spell" && unit.mechanics.level <= 1)
        .every((unit) => rootIds.has(String(unit.id))),
    ).toBe(true);
    expect(
      units
        .filter((unit) => unit.kind === "spell" && unit.mechanics.level > 1)
        .some((unit) => !rootIds.has(String(unit.id))),
    ).toBe(true);
    expect(
      units
        .filter(
          (unit) =>
            unit.kind === "feat" ||
            unit.kind === "species_trait" ||
            unit.kind === "mastery",
        )
        .every((unit) => rootIds.has(String(unit.id))),
    ).toBe(true);
  });

  it("reports every support-profile root absent from the supplied catalog", () => {
    const missingUnitIds = new Set(["class_fighter", "background_soldier"]);
    const units = unitCatalogResult.catalog
      .listUnits()
      .filter((unit) => !missingUnitIds.has(String(unit.id)));
    const unitsById = new Map(units.map((unit) => [String(unit.id), unit]));
    const incompleteCatalog: UnitCatalog = {
      listUnits: () => units,
      getUnit: (unitId) => Option.fromNullishOr(unitsById.get(unitId)),
      requireUnit: (unitId) => unitsById.get(unitId)!,
    };

    const roots = deriveCharacterCreationWorkflowRoots({
      unitLibrary: incompleteCatalog,
    });

    expect(roots).toEqual(
      Result.fail(
        expect.arrayContaining([
          {
            tag: "missingCharacterCreationWorkflowRoot",
            unitId: "class_fighter",
          },
          {
            tag: "missingCharacterCreationWorkflowRoot",
            unitId: "background_soldier",
          },
        ]),
      ),
    );
  });
});
