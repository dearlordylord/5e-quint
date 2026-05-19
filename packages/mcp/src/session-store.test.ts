import {
  abilityScoreAssignment,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetDruidWildShapeKnownForms,
  characterSheetId,
} from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { availableCharacterSession } from "./session-store.ts";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-use-count-resource
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("MCP session store test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const DRUID_WILD_SHAPE_KNOWN_FORM_IDS = [
  "stat_block_rat",
  "stat_block_riding_horse",
  "stat_block_spider",
  "stat_block_wolf",
] as const;

describe("MCP character sessions", () => {
  test("requires and stores explicit Wild Shape known forms", () => {
    const missingKnownForms = availableCharacterSession({
      characterId: characterSheetId("character:mcp-druid-wild-shape-missing"),
      build: druidWildShapeBuild(),
      maximumHp: Hp(16),
      currentHp: Hp(16),
      tempHp: Hp(0),
      conditions: [],
      unitLibrary,
    });
    expect(missingKnownForms).toMatchObject({
      _tag: "Left",
      left: {
        tag: "characterSessionIssue",
        message:
          "Wild Shape known forms require selected Beast Stat Block identities.",
      },
    });

    const session = availableCharacterSession({
      characterId: characterSheetId("character:mcp-druid-wild-shape"),
      build: druidWildShapeBuild(),
      maximumHp: Hp(16),
      currentHp: Hp(16),
      tempHp: Hp(0),
      conditions: [],
      unitLibrary,
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
    });

    expect(Either.isRight(session)).toBe(true);
    if (Either.isRight(session)) {
      expect(
        characterSheetDruidWildShapeKnownForms(session.right)?.statBlockIds,
      ).toEqual(DRUID_WILD_SHAPE_KNOWN_FORM_IDS);
    }
  });
});

function druidWildShapeBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_druid"),
      advancements: [
        {
          classUnitId: classUnitId("class_druid"),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 10,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_druid",
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["druidic_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function expectRight<T, E>(value: Either.Either<T, E>): T {
  if (Either.isLeft(value)) {
    throw new Error(`Expected right: ${JSON.stringify(value.left)}`);
  }
  return value.right;
}
