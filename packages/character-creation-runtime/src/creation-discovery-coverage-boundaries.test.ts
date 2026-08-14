import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { abilityScore } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import type { BackgroundRecord, EffectAtom } from "@dnd/surface/surface/types";
import { Either, Option } from "effect";
import { describe, expect, test } from "vitest";

import { createCharacterDraft } from "./draft.ts";
import {
  originFeatGrantChoiceHoles,
  passiveGrantChoiceHoles,
  discoverCreationHoles,
} from "./discovery.ts";
import { unitSource } from "./hole-factories.ts";
import {
  allFinalizedChoicesSupported,
  executableSupportIssues,
  finalizedBuildEquipment,
} from "./finalization.ts";
import {
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
} from "./phase1-manifest.ts";
import { classUnitId } from "./character-progression-types.ts";
import {
  characterDraftId,
  creationChoiceOptionId,
  draftRevision,
  type AbilityScoreAssignment,
  type CharacterDraft,
  type FinalizedCharacterSelections,
} from "./types.ts";

const catalogResult = buildUnitCatalog({ collections: [srdUnitCollection] });
if (catalogResult.tag !== "ok") {
  throw new Error("The SRD Unit catalog coverage fixture must compose.");
}
const unitLibrary = catalogResult.catalog;

const catalogWithoutClassUnits: UnitCatalog = {
  ...unitLibrary,
  listUnits: () =>
    unitLibrary.listUnits().filter((unit) => unit.kind !== "class"),
};

const baseScores = {
  str: abilityScore(10),
  dex: abilityScore(10),
  con: abilityScore(10),
  int: abilityScore(10),
  wis: abilityScore(10),
  cha: abilityScore(10),
} as const satisfies AbilityScoreAssignment;

function draftWithSelections(
  selections: Partial<CharacterDraft["selections"]>,
): CharacterDraft {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId("draft:coverage-boundary"),
  });
  return {
    ...draft,
    selections: {
      ...draft.selections,
      ...selections,
    },
    revision: draftRevision(0),
  };
}

function finalizedSelections(
  overrides: Partial<FinalizedCharacterSelections> = {},
): FinalizedCharacterSelections {
  return {
    progression: {
      startingClass: classUnitId(authoredUnitId("class_fighter")),
      advancements: [],
    },
    background: authoredUnitId("background_soldier"),
    abilityScoreGeneration: {
      method: "standardArray",
      assignedScores: baseScores,
    },
    backgroundAbilityScoreIncrease: { kind: "oneEach" },
    species: authoredUnitId("species_orc"),
    languages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "neutral", morality: "neutral" },
    choices: [],
    equipment: { selectedUnitIds: [] },
    ...overrides,
  };
}

function equipmentChoices(): FinalizedCharacterSelections["choices"] {
  return [
    {
      kind: "unitChoice",
      source: unitSource(
        authoredUnitId("class_fighter"),
        CLASS_EQUIPMENT_CHOICE_KEY,
      ),
      options: [{ optionId: creationChoiceOptionId("option_a") }],
    },
    {
      kind: "unitChoice",
      source: unitSource(
        authoredUnitId("background_soldier"),
        BACKGROUND_EQUIPMENT_CHOICE_KEY,
      ),
      options: [{ optionId: creationChoiceOptionId("option_a") }],
    },
  ];
}

describe("creation discovery public boundary branches", () => {
  test("does not invent Magic Initiate holes without a class spell list", () => {
    expect(
      originFeatGrantChoiceHoles(
        authoredUnitId("feat_magic_initiate_wizard"),
        catalogWithoutClassUnits,
      ),
    ).toEqual([]);
  });

  test("accepts the multi-category feat-grant shape", () => {
    const grant = {
      kind: "grant_feat",
      categories: ["general", "origin"],
    } as const satisfies Extract<EffectAtom, { kind: "grant_feat" }>;

    const holes = passiveGrantChoiceHoles(
      authoredUnitId("synthetic_category_grant"),
      grant,
      unitLibrary,
      { excludedMagicInitiateSpellLists: [] },
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
          unitId: "synthetic_category_grant",
          choiceKey: "class_feature_feat_choice",
        },
        cardinality: { tag: "exactly", count: 1 },
        optionIds: [
          "feat_ability_score_improvement",
          "feat_grappler",
          "alert",
          "feat_magic_initiate_cleric",
          "feat_magic_initiate_druid",
          "feat_magic_initiate_wizard",
          "feat_savage_attacker",
          "feat_skilled",
        ],
      },
    ]);
  });

  test("keeps species discovery stable when the selected background is unsupported", () => {
    const absentBackground = discoverCreationHoles({
      draft: draftWithSelections({
        background: authoredUnitId("missing_background"),
        species: authoredUnitId("species_human"),
      }),
      unitLibrary,
    });
    const unreadableBackground = discoverCreationHoles({
      draft: draftWithSelections({
        background: authoredUnitId("class_fighter"),
        species: authoredUnitId("species_human"),
      }),
      unitLibrary,
    });

    expect(absentBackground).toEqual(unreadableBackground);
    expect(absentBackground).toContainEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          unitId: "species_human_skillful",
        }),
      }),
    );
  });

  test("omits class equipment while retaining background equipment without progression", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        background: authoredUnitId("background_soldier"),
        species: authoredUnitId("species_orc"),
      }),
      unitLibrary,
    });
    expect(holes).toContainEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          unitId: "background_soldier",
          choiceKey: BACKGROUND_EQUIPMENT_CHOICE_KEY,
        }),
      }),
    );
    expect(holes).not.toContainEqual(
      expect.objectContaining({
        source: expect.objectContaining({
          unitId: "class_fighter",
          choiceKey: CLASS_EQUIPMENT_CHOICE_KEY,
        }),
      }),
    );
  });

  test("keeps independently readable equipment sources when the other source is absent or unreadable", () => {
    const draft = draftWithSelections({
      progression: {
        startingClass: classUnitId(authoredUnitId("class_fighter")),
        advancements: [],
      },
      background: authoredUnitId("background_soldier"),
      species: authoredUnitId("species_orc"),
    });
    const equipmentSourceIds = (catalog: UnitCatalog) =>
      discoverCreationHoles({ draft, unitLibrary: catalog }).flatMap((hole) =>
        hole.source.tag === "unitChoice" &&
        (hole.source.choiceKey === CLASS_EQUIPMENT_CHOICE_KEY ||
          hole.source.choiceKey === BACKGROUND_EQUIPMENT_CHOICE_KEY)
          ? [hole.source.unitId]
          : [],
      );
    const catalogWithSource = (
      sourceUnitId: string,
      replacement: ReturnType<UnitCatalog["getUnit"]>,
    ): UnitCatalog => ({
      ...unitLibrary,
      getUnit: (unitId) =>
        unitId === sourceUnitId ? replacement : unitLibrary.getUnit(unitId),
    });
    const unreadableUnit = Option.some(unitLibrary.requireUnit("weapon_spear"));

    for (const catalog of [
      catalogWithSource("class_fighter", Option.none()),
      catalogWithSource("class_fighter", unreadableUnit),
    ]) {
      expect(equipmentSourceIds(catalog)).toContain("background_soldier");
      expect(equipmentSourceIds(catalog)).not.toContain("class_fighter");
    }
    for (const catalog of [
      catalogWithSource("background_soldier", Option.none()),
      catalogWithSource("background_soldier", unreadableUnit),
    ]) {
      expect(equipmentSourceIds(catalog)).toContain("class_fighter");
      expect(equipmentSourceIds(catalog)).not.toContain("background_soldier");
    }
  });
});

describe("finalization equipment and support boundary branches", () => {
  test("does not enumerate species traits for an unsupported species id", () => {
    expect(
      allFinalizedChoicesSupported(
        finalizedSelections({ species: authoredUnitId("synthetic_species") }),
        unitLibrary,
      ),
    ).toBe(true);
  });

  test("rejects a purchased Unit outside the support profile", () => {
    const issues = executableSupportIssues(
      finalizedSelections({
        choices: equipmentChoices(),
        equipment: {
          selectedUnitIds: [authoredUnitId("synthetic_purchased_item")],
        },
      }),
      unitLibrary,
    );
    expect(issues).toContainEqual({
      tag: "unsupportedFinalization",
      cause: { tag: "unsupportedEquipmentSelection" },
    });
  });

  test("projects valid coin grants and keeps distinct starting catalog items", () => {
    const result = finalizedBuildEquipment(
      finalizedSelections({ choices: equipmentChoices() }),
      unitLibrary,
    );
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.startingEquipmentCurrencyRemainderCp).toBe(1800);
      expect(result.right.owned).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "catalogItem",
            itemId: "main:weapon_spear",
          }),
          expect.objectContaining({
            kind: "catalogItem",
            itemId: "main:weapon_shortbow",
          }),
        ]),
      );
    }
  });

  test("combines a purchased catalog item with the same starting item", () => {
    const result = finalizedBuildEquipment(
      finalizedSelections({
        choices: equipmentChoices(),
        equipment: { selectedUnitIds: [authoredUnitId("weapon_spear")] },
      }),
      unitLibrary,
    );
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(
        result.right.owned.filter(
          (item) =>
            item.kind === "catalogItem" &&
            String(item.itemId) === "main:weapon_spear",
        ),
      ).toHaveLength(1);
    }
  });

  test("supports a background without a supported tool-choice hole", () => {
    const background = unitLibrary.requireUnit("background_soldier");
    if (background.kind !== "background") {
      throw new Error("Expected the Soldier fixture to be a background.");
    }
    const artisanBackground = {
      ...background,
      toolProficiency: {
        kind: "tool_category_choice",
        category: "artisan_tool",
        choose: 1,
      },
    } as const satisfies BackgroundRecord;
    const catalog: UnitCatalog = {
      ...unitLibrary,
      getUnit: (id) =>
        id === "background_soldier"
          ? Option.some(artisanBackground)
          : unitLibrary.getUnit(id),
    };

    expect(allFinalizedChoicesSupported(finalizedSelections(), catalog)).toBe(
      true,
    );
  });
});
