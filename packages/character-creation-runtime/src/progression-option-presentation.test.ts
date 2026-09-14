import { describe, expect, test } from "vitest";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { createCharacterDraft, discoverCreationHoles } from "./index.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}
const unitLibrary = catalogResult.catalog;

const expectedFighterLevelTwoOptions = [
  {
    optionId: "13:class_fighter|13:class_fighter:level_2:fixed_hp_gain",
    label: "Fighter 2 (Fixed higher-level HP gain)",
  },
  {
    optionId: "13:class_fighter|15:class_barbarian:level_2:fixed_hp_gain",
    label: "Fighter 1 → Barbarian 1 — Level 2 (Fixed higher-level HP gain)",
  },
  {
    optionId: "13:class_fighter|10:class_bard:level_2:fixed_hp_gain",
    label: "Fighter 1 → Bard 1 — Level 2 (Fixed higher-level HP gain)",
  },
  {
    optionId: "13:class_fighter|12:class_wizard:level_2:fixed_hp_gain",
    label: "Fighter 1 → Wizard 1 — Level 2 (Fixed higher-level HP gain)",
  },
] as const;

function progressionOptions() {
  const holes = discoverCreationHoles({
    draft: createCharacterDraft({ unitLibrary }),
    unitLibrary,
  });
  const progressionHole = holes.find(
    (hole) =>
      hole.source.tag === "draft" &&
      hole.source.path === "draft.progression.initial",
  );
  if (progressionHole?.kind !== "choice") {
    throw new Error("Initial progression must be a choice hole.");
  }
  return progressionHole.options;
}

describe("progression option presentation", () => {
  test("distinguishes every supported ordered progression path", () => {
    const options = progressionOptions();

    expect(new Set(options.map((option) => option.label)).size).toBe(
      options.length,
    );
  });

  test("retains option ids while naming single-class and first multiclass paths", () => {
    const options = progressionOptions();

    for (const expected of expectedFighterLevelTwoOptions) {
      expect(options).toContainEqual(expect.objectContaining(expected));
    }
  });
});
