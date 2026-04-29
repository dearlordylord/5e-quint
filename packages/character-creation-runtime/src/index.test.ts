import { describe, expect, test } from "vitest";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  unitChoiceKey,
  type CharacterDraft,
  type CharacterChoiceSelection,
  type CreationHole,
} from "./index.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog test fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

describe("character creation hole discovery", () => {
  test("discovers the initial manifest draft holes from Surface records", () => {
    const draft = createCharacterDraft({
      unitLibrary,
      draftId: characterDraftId("draft:initial"),
    });
    const holes = discoverCreationHoles({ draft, unitLibrary });

    expect(holeSummary(holes)).toEqual([
      ["singleChoice", "cc:draft:draft.primaryClass", ["class_fighter"]],
      ["singleChoice", "cc:draft:draft.background", ["background_soldier"]],
      ["singleChoice", "cc:draft:draft.species", ["species_orc"]],
      ["abilityScores", "cc:draft:draft.abilityScoreGeneration", []],
      [
        "multiChoice",
        "cc:draft:draft.languages",
        [
          "Common Sign Language",
          "Draconic",
          "Dwarvish",
          "Elvish",
          "Giant",
          "Gnomish",
          "Goblin",
          "Halfling",
          "Orc",
        ],
      ],
      [
        "singleChoice",
        "cc:draft:draft.alignment",
        [
          "lawful_good",
          "neutral_good",
          "chaotic_good",
          "lawful_neutral",
          "neutral_neutral",
          "chaotic_neutral",
          "lawful_evil",
          "neutral_evil",
          "chaotic_evil",
        ],
      ],
    ]);
  });

  test("opens Fighter holes after the class selection", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.primaryClass")).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:class_fighter:fighter_skill_choices"),
    ).toMatchObject({
      kind: "multiChoice",
      min: 2,
      max: 2,
      options: [
        { optionId: "acrobatics" },
        { optionId: "animal_handling" },
        { optionId: "athletics" },
        { optionId: "history" },
        { optionId: "insight" },
        { optionId: "intimidation" },
        { optionId: "persuasion" },
        { optionId: "perception" },
        { optionId: "survival" },
      ],
    });
    expect(
      holeById(
        holes,
        "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
      ),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "defense", unitRef: { unitId: "defense" } }],
    });
    const weaponMasteryHole = holeById(
      holes,
      "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
    );
    expect(weaponMasteryHole).toMatchObject({
      kind: "multiChoice",
      min: 3,
      max: 3,
    });
    expect(optionIds(weaponMasteryHole)).toEqual(
      expect.arrayContaining([
        "weapon_longsword",
        "weapon_spear",
        "weapon_flail",
      ]),
    );
    expect(
      holeById(holes, "cc:unit:class_fighter:class_equipment_choice"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "option_c" }],
    });
  });

  test("opens Soldier holes after class and background selections", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.background")).toBeUndefined();
    const backgroundIncreaseHole = holeById(
      holes,
      "cc:unit:background_soldier:background_ability_score_increase",
    );
    expect(backgroundIncreaseHole).toMatchObject({ kind: "singleChoice" });
    expect(optionIds(backgroundIncreaseHole)).toEqual(
      expect.arrayContaining(["two_and_one:str:con", "one_each"]),
    );
    expect(
      holeById(holes, "cc:unit:background_soldier:background_tool_choice"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "tool_dice_set" }],
    });
    expect(
      holeById(holes, "cc:unit:background_soldier:background_equipment_choice"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "option_a" }, { optionId: "option_b" }],
    });
    expect(
      holeById(holes, "cc:unit:class_fighter:equipment_purchase"),
    ).toBeUndefined();
  });

  test("opens purchase after the manifest coin equipment path is selected", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:unit:class_fighter:class_equipment_choice"),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:background_soldier:background_equipment_choice"),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:class_fighter:equipment_purchase"),
    ).toMatchObject({
      kind: "multiChoice",
      min: 3,
      max: 3,
      options: [
        { optionId: "armor_chain_mail" },
        { optionId: "weapon_longsword" },
        { optionId: "equipment_shield" },
      ],
    });
    expect(
      holeById(holes, "cc:unit:armor_chain_mail:loadout_armor"),
    ).toBeUndefined();
  });

  test("does not open purchase for a non-manifest background equipment path", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_a",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:unit:class_fighter:equipment_purchase"),
    ).toBeUndefined();
  });

  test("opens loadout only for purchased equipment and suppresses filled loadout choices", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        choices: [
          selectedChoice("class_fighter", "class_equipment_choice", "option_c"),
          selectedChoice(
            "background_soldier",
            "background_equipment_choice",
            "option_b",
          ),
          selectedChoice("armor_chain_mail", "loadout_armor", "worn"),
        ],
        equipment: {
          selectedUnitIds: [
            "armor_chain_mail",
            "weapon_longsword",
            "equipment_shield",
          ],
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:unit:class_fighter:equipment_purchase"),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:armor_chain_mail:loadout_armor"),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:equipment_shield:loadout_shield"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "wielded" }],
    });
    expect(
      holeById(holes, "cc:unit:weapon_longsword:loadout_weapon"),
    ).toMatchObject({
      kind: "singleChoice",
      options: [{ optionId: "wielded_one_handed" }],
    });
  });

  test("suppresses already-filled class and background unit-choice holes", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        choices: [
          selectedChoice(
            "class_fighter",
            "fighter_skill_choices",
            "perception",
            "survival",
          ),
          selectedChoice(
            "fighter_fighting_style_l1",
            "fighter_fighting_style",
            "defense",
          ),
          selectedChoice(
            "fighter_weapon_mastery_l1",
            "fighter_weapon_mastery_choices",
            "weapon_longsword",
            "weapon_spear",
            "weapon_flail",
          ),
          selectedChoice(
            "background_soldier",
            "background_ability_score_increase",
            "two_and_one:str:con",
          ),
          selectedChoice(
            "background_soldier",
            "background_tool_choice",
            "tool_dice_set",
          ),
        ],
      }),
      unitLibrary,
    });

    expect(
      holeById(holes, "cc:unit:class_fighter:fighter_skill_choices"),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        "cc:unit:fighter_fighting_style_l1:fighter_fighting_style",
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        "cc:unit:fighter_weapon_mastery_l1:fighter_weapon_mastery_choices",
      ),
    ).toBeUndefined();
    expect(
      holeById(
        holes,
        "cc:unit:background_soldier:background_ability_score_increase",
      ),
    ).toBeUndefined();
    expect(
      holeById(holes, "cc:unit:background_soldier:background_tool_choice"),
    ).toBeUndefined();
  });

  test("suppresses Soldier ability-score increase from the typed draft field", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        primaryClass: "class_fighter",
        background: "background_soldier",
        backgroundAbilityScoreIncrease: {
          kind: "twoAndOne",
          plusTwo: "str",
          plusOne: "con",
        },
      }),
      unitLibrary,
    });

    expect(
      holeById(
        holes,
        "cc:unit:background_soldier:background_ability_score_increase",
      ),
    ).toBeUndefined();
  });

  test("removes selected species from draft holes without adding synthetic species choices", () => {
    const holes = discoverCreationHoles({
      draft: draftWithSelections({
        species: "species_orc",
      }),
      unitLibrary,
    });

    expect(holeById(holes, "cc:draft:draft.species")).toBeUndefined();
    expect(holes.map((hole) => hole.holeId)).not.toContain(
      "cc:unit:species_orc:species-derived-traits",
    );
  });
});

function draftWithSelections(
  selections: Partial<CharacterDraft["selections"]>,
): CharacterDraft {
  const base = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId("draft:with-selections"),
  });

  return {
    ...base,
    selections: {
      ...base.selections,
      ...selections,
    },
  };
}

function holeSummary(
  holes: readonly CreationHole[],
): readonly (readonly [CreationHole["kind"], string, readonly string[]])[] {
  return holes.map((hole) => [
    hole.kind,
    hole.holeId,
    "options" in hole ? hole.options.map((option) => option.optionId) : [],
  ]);
}

function holeById(
  holes: readonly CreationHole[],
  holeId: string,
): CreationHole | undefined {
  return holes.find((hole) => hole.holeId === holeId);
}

function optionIds(hole: CreationHole | undefined): readonly string[] {
  return hole != null && "options" in hole
    ? hole.options.map((option) => option.optionId)
    : [];
}

function selectedChoice(
  unitId: string,
  choiceKey: string,
  ...optionIds: readonly string[]
): CharacterChoiceSelection {
  return {
    source: {
      tag: "unit",
      unitId,
      choiceKey: unitChoiceKey(choiceKey),
    },
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}
