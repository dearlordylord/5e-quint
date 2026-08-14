import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Option } from "effect";
import { describe, expect, test } from "vitest";

import {
  hasSupportedCoinEquipmentPath,
  magicInitiateSpellListsForUnitIds,
  originFeatGrantChoiceHoles,
} from "./discovery.ts";
import { createCharacterDraft } from "./draft.ts";
import { CHARACTER_CREATION_SUPPORT_PROFILE } from "./support-gates.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog discovery fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

const catalogWithoutClasses: UnitCatalog = {
  ...unitLibrary,
  listUnits: () =>
    unitLibrary.listUnits().filter((unit) => unit.kind !== "class"),
};

const skilled = unitLibrary.requireUnit("feat_skilled");
if (skilled.kind !== "feat") {
  throw new Error("The Skilled fixture must remain a feat.");
}
const syntheticOriginFeat = {
  ...skilled,
  id: authoredUnitId("synthetic_multi_grant_origin_feat"),
  name: "Synthetic Multi-Grant Origin Feat",
  provenance: {
    kind: "synthetic-test",
    section: "creation discovery branch boundaries",
  },
  mechanics: {
    family: "passive",
    grants: [
      {
        kind: "grant_expertise",
        choiceCount: {
          kind: "class_level_additional_choices",
          initial: 2,
          increases: [{ atLevel: 9, choose: 2 }],
        },
        skills: { kind: "owned_skill_proficiencies_without_expertise" },
      },
      {
        kind: "grant_language_choice",
        count: 1,
        source: "character_creation_language_tables",
      },
      { kind: "grant_feat", categories: ["origin"] },
    ],
  },
} as const satisfies UnitRecord;

const catalogWithSyntheticOriginFeat: UnitCatalog = {
  ...unitLibrary,
  getUnit: (id) =>
    id === syntheticOriginFeat.id
      ? Option.some(syntheticOriginFeat)
      : unitLibrary.getUnit(id),
  listUnits: () => [...unitLibrary.listUnits(), syntheticOriginFeat],
};

describe("creation discovery defensive boundaries", () => {
  test("omits absent origin feats and derives Skilled choices with empty ownership", () => {
    expect(
      originFeatGrantChoiceHoles(
        authoredUnitId("synthetic_missing_origin_feat"),
        unitLibrary,
      ),
    ).toEqual([]);

    expect(
      originFeatGrantChoiceHoles(authoredUnitId("feat_skilled"), unitLibrary),
    ).toMatchObject([
      {
        kind: "choice",
        source: { unitId: "feat_skilled" },
        cardinality: { tag: "exactly", count: 3 },
      },
    ]);
  });

  test("keeps only Magic Initiate lists backed by an installed class list", () => {
    const unitIds = [
      authoredUnitId("synthetic_missing_origin_feat"),
      authoredUnitId("feat_savage_attacker"),
      authoredUnitId("feat_magic_initiate_wizard"),
    ];

    expect(magicInitiateSpellListsForUnitIds(unitIds, unitLibrary)).toEqual([
      "wizard",
    ]);
    expect(
      magicInitiateSpellListsForUnitIds(unitIds, catalogWithoutClasses),
    ).toEqual([]);
  });

  test("derives expertise, language, and category-list feat grants from one origin feat", () => {
    const holes = originFeatGrantChoiceHoles(
      syntheticOriginFeat.id,
      catalogWithSyntheticOriginFeat,
      { ownedSkillProficiencies: ["arcana", "history"] },
    );

    expect(
      holes.map(({ source, cardinality, options }) => ({
        source,
        cardinality,
        optionIds: options.map(({ optionId }) => optionId),
      })),
    ).toEqual([
      {
        source: {
          tag: "unitChoice",
          unitId: syntheticOriginFeat.id,
          choiceKey: "class_feature_proficiency_choice",
        },
        cardinality: { tag: "exactly", count: 2 },
        optionIds: ["arcana", "history"],
      },
      {
        source: {
          tag: "unitChoice",
          unitId: syntheticOriginFeat.id,
          choiceKey: "class_feature_language_choice",
        },
        cardinality: { tag: "exactly", count: 1 },
        optionIds: [
          "Common",
          "Common Sign Language",
          "Draconic",
          "Dwarvish",
          "Elvish",
          "Giant",
          "Gnomish",
          "Goblin",
          "Halfling",
          "Orc",
          "Abyssal",
          "Celestial",
          "Deep Speech",
          "Druidic",
          "Infernal",
          "Primordial",
          "Sylvan",
          "Thieves' Cant",
          "Undercommon",
        ],
      },
      {
        source: {
          tag: "unitChoice",
          unitId: syntheticOriginFeat.id,
          choiceKey: "class_feature_feat_choice",
        },
        cardinality: { tag: "exactly", count: 1 },
        optionIds: [
          "alert",
          "feat_magic_initiate_cleric",
          "feat_magic_initiate_druid",
          "feat_magic_initiate_wizard",
          "feat_savage_attacker",
          "feat_skilled",
          "synthetic_multi_grant_origin_feat",
        ],
      },
    ]);
  });

  test("rejects an incomplete coin path", () => {
    expect(
      hasSupportedCoinEquipmentPath({
        draft: createCharacterDraft({}),
        unitLibrary,
        supportProfile: CHARACTER_CREATION_SUPPORT_PROFILE,
      }),
    ).toBe(false);
  });
});
