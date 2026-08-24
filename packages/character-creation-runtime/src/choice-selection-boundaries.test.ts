import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";

import {
  backgroundToolChoiceHole,
  backgroundToolChoiceSpec,
  choiceOptionIdsFitHole,
  choiceSelectionMatchesHole,
  choiceSelectionOptionIds,
  hasDuplicateOptionIds,
  hasPurchasedUnit,
  hasValidEquipmentPurchaseSelectionForHole,
  sameChoiceSelection,
  sameChoiceSelectionMultiset,
  sameCreationHoleSource,
  sameOptionIdMultiset,
  sameSelectedChoiceOption,
  sameSelectedChoiceOptionMultiset,
  selectedChoiceOptionMatchesHole,
  selectedCoinGrantStartingEquipmentChoice,
  selectedStartingEquipmentChoice,
  skillProficienciesFromChoiceSelections,
  unselectedBackgroundAbilityScoreIncreaseHole,
  unselectedLoadoutHole,
  unselectedPurchaseHole,
  unselectedUnitChoiceHole,
} from "./discovery.ts";
import { createCharacterDraft } from "./draft.ts";
import {
  backgroundAbilityScoreIncreaseOptionId,
  choiceHole,
  draftSource,
  loadoutSource,
  parseBackgroundAbilityScoreIncreaseOptionId,
  startingEquipmentLabel,
  unitSource,
} from "./hole-factories.ts";
import { CLASS_SKILL_PROFICIENCY_CHOICE_KEY } from "./phase1-manifest.ts";
import {
  creationChoiceOptionId,
  creationHoleId,
  exactChoiceCardinality,
  type CharacterChoiceSelection,
  type CharacterSelectedChoiceOption,
  type ChoiceCreationHole,
  type CreationHole,
} from "./types.ts";

const athletics = {
  optionId: creationChoiceOptionId("athletics"),
} as const satisfies CharacterSelectedChoiceOption;
const arcana = {
  optionId: creationChoiceOptionId("arcana"),
} as const satisfies CharacterSelectedChoiceOption;
const perception = {
  optionId: creationChoiceOptionId("perception"),
} as const satisfies CharacterSelectedChoiceOption;
const survival = {
  optionId: creationChoiceOptionId("survival"),
} as const satisfies CharacterSelectedChoiceOption;
const longsword = {
  optionId: creationChoiceOptionId("weapon_longsword"),
  unitRef: { unitId: authoredUnitId("weapon_longsword") },
} as const satisfies CharacterSelectedChoiceOption;

function unitChoice(
  options: readonly CharacterSelectedChoiceOption[],
): CharacterChoiceSelection {
  return {
    kind: "unitChoice",
    source: unitSource(
      authoredUnitId("class_fighter"),
      CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
    ),
    options,
  };
}

function skillChoiceHole(): ChoiceCreationHole {
  const hole = choiceHole({
    source: unitSource(
      authoredUnitId("class_fighter"),
      CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
    ),
    cardinality: exactChoiceCardinality(2),
    options: [
      { optionId: perception.optionId, label: "Perception" },
      { optionId: survival.optionId, label: "Survival" },
    ],
  });
  if (hole?.kind !== "choice") {
    throw new Error("The two-skill choice fixture must produce a choice hole.");
  }
  return hole;
}

describe("choice-selection structural equality", () => {
  test("rejects malformed hole construction inputs at their typed boundary", () => {
    expect(
      choiceHole({
        source: draftSource("draft.background"),
        cardinality: undefined,
        options: [],
      }),
    ).toBeUndefined();
    expect(
      choiceHole({
        source: draftSource("draft.background"),
        cardinality: exactChoiceCardinality(2),
        options: [{ optionId: athletics.optionId, label: "Athletics" }],
      }),
    ).toBeUndefined();
  });

  test("projects complete equipment-package labels and parses background increase option ids", () => {
    expect(
      startingEquipmentLabel({
        id: "synthetic_bundle",
        kind: "item_bundle",
        items: [
          {
            kind: "draft_owned_item",
            itemName: "Synthetic Item",
            quantity: 2,
          },
          { kind: "selected_tool_proficiency" },
        ],
        coinsGp: 4,
      }),
    ).toBe(
      "synthetic_bundle — equipment package: 2 × Synthetic Item, item matching the selected tool proficiency; plus 4 GP",
    );
    expect(
      startingEquipmentLabel({
        id: "synthetic_currency",
        kind: "coin_grant",
        coinsGp: 50,
      }),
    ).toBe("synthetic_currency — 50 GP instead of an equipment package");
    expect(
      parseBackgroundAbilityScoreIncreaseOptionId(
        backgroundAbilityScoreIncreaseOptionId({ kind: "oneEach" }),
      ),
    ).toEqual({ kind: "oneEach" });
    expect(
      parseBackgroundAbilityScoreIncreaseOptionId(
        creationChoiceOptionId("two_and_one:str:str"),
      ),
    ).toBeUndefined();
  });

  test("enforces choice cardinality, membership, and selected-option identity", () => {
    const hole = skillChoiceHole();

    expect(
      choiceOptionIdsFitHole(hole, [perception.optionId, survival.optionId]),
    ).toBe(true);
    expect(choiceOptionIdsFitHole(hole, [perception.optionId])).toBe(false);
    expect(
      choiceOptionIdsFitHole(hole, [
        perception.optionId,
        survival.optionId,
        creationChoiceOptionId("history"),
      ]),
    ).toBe(false);
    expect(
      choiceOptionIdsFitHole(hole, [perception.optionId, perception.optionId]),
    ).toBe(false);
    expect(
      choiceOptionIdsFitHole(hole, [
        perception.optionId,
        creationChoiceOptionId("arcana"),
      ]),
    ).toBe(false);
    expect(selectedChoiceOptionMatchesHole(perception, hole)).toBe(true);
    expect(selectedChoiceOptionMatchesHole(longsword, hole)).toBe(false);
    expect(
      choiceSelectionMatchesHole(unitChoice([survival, perception]), hole),
    ).toBe(true);
    expect(
      choiceSelectionMatchesHole(
        {
          kind: "unitChoice",
          source: unitSource(
            authoredUnitId("class_wizard"),
            CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
          ),
          options: [survival, perception],
        },
        hole,
      ),
    ).toBe(false);
  });

  test("compares each creation-hole source by its domain identity", () => {
    const fighterSkills = unitSource(
      authoredUnitId("class_fighter"),
      CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
    );

    expect(
      sameCreationHoleSource(
        draftSource("draft.background"),
        draftSource("draft.background"),
      ),
    ).toBe(true);
    expect(
      sameCreationHoleSource(
        draftSource("draft.background"),
        draftSource("draft.species"),
      ),
    ).toBe(false);
    expect(sameCreationHoleSource(fighterSkills, fighterSkills)).toBe(true);
    expect(
      sameCreationHoleSource(
        fighterSkills,
        unitSource(
          authoredUnitId("class_wizard"),
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        ),
      ),
    ).toBe(false);
    expect(
      sameCreationHoleSource(
        loadoutSource(authoredUnitId("class_fighter"), "weapon"),
        loadoutSource(authoredUnitId("class_fighter"), "weapon"),
      ),
    ).toBe(true);
    expect(
      sameCreationHoleSource(
        loadoutSource(authoredUnitId("class_fighter"), "weapon"),
        loadoutSource(authoredUnitId("class_fighter"), "armor"),
      ),
    ).toBe(false);
    expect(
      sameCreationHoleSource(draftSource("draft.background"), fighterSkills),
    ).toBe(false);
  });

  test("projects only skill options from non-ignored Unit choices", () => {
    const nonSkillOption = {
      optionId: creationChoiceOptionId("synthetic_not_a_skill"),
    } as const satisfies CharacterSelectedChoiceOption;
    const loadoutChoice = {
      kind: "loadout",
      source: loadoutSource(authoredUnitId("weapon_longsword"), "weapon"),
      options: [longsword],
    } as const satisfies CharacterChoiceSelection;
    const choices = [unitChoice([athletics, nonSkillOption]), loadoutChoice];

    expect(skillProficienciesFromChoiceSelections(choices)).toEqual([
      "athletics",
    ]);
    expect(skillProficienciesFromChoiceSelections(choices, () => true)).toEqual(
      [],
    );
  });

  test("compares selected options as order-independent multisets", () => {
    expect(sameSelectedChoiceOption(athletics, athletics)).toBe(true);
    expect(sameSelectedChoiceOption(athletics, arcana)).toBe(false);
    expect(
      sameSelectedChoiceOption(longsword, {
        ...longsword,
        unitRef: { unitId: authoredUnitId("weapon_greatsword") },
      }),
    ).toBe(false);
    expect(
      sameSelectedChoiceOptionMultiset(
        [athletics, arcana],
        [arcana, athletics],
      ),
    ).toBe(true);
    expect(
      sameSelectedChoiceOptionMultiset([athletics], [athletics, arcana]),
    ).toBe(false);
    expect(sameSelectedChoiceOptionMultiset([athletics], [arcana])).toBe(false);
    expect(
      sameOptionIdMultiset(["athletics", "arcana"], ["arcana", "athletics"]),
    ).toBe(true);
    expect(sameOptionIdMultiset(["athletics"], ["arcana"])).toBe(false);
  });

  test("compares unit and loadout selections using their respective identity", () => {
    const selectedSkills = unitChoice([athletics, arcana]);
    const reorderedSkills = unitChoice([arcana, athletics]);
    const selectedWeapon = {
      kind: "loadout",
      source: loadoutSource(authoredUnitId("class_fighter"), "weapon"),
      options: [{ optionId: creationChoiceOptionId("weapon_longsword") }],
    } as const satisfies CharacterChoiceSelection;
    const sameWeaponOptionFromAnotherSlot = {
      ...selectedWeapon,
      source: loadoutSource(authoredUnitId("class_fighter"), "armor"),
    } as const satisfies CharacterChoiceSelection;

    expect(choiceSelectionOptionIds(selectedSkills)).toEqual([
      "athletics",
      "arcana",
    ]);
    expect(sameChoiceSelection(selectedSkills, reorderedSkills)).toBe(true);
    expect(sameChoiceSelection(selectedSkills, selectedWeapon)).toBe(false);
    expect(
      sameChoiceSelection(selectedWeapon, sameWeaponOptionFromAnotherSlot),
    ).toBe(false);
    expect(
      sameChoiceSelectionMultiset(
        [selectedSkills, selectedWeapon],
        [selectedWeapon, reorderedSkills],
      ),
    ).toBe(true);
    expect(
      sameChoiceSelectionMultiset([selectedSkills], [selectedWeapon]),
    ).toBe(false);
  });

  test("detects duplicate option identities", () => {
    expect(
      hasDuplicateOptionIds([
        creationChoiceOptionId("athletics"),
        creationChoiceOptionId("arcana"),
      ]),
    ).toBe(false);
    expect(
      hasDuplicateOptionIds([
        creationChoiceOptionId("athletics"),
        creationChoiceOptionId("athletics"),
      ]),
    ).toBe(true);
  });

  test("treats absent optional holes and purchases as absent domain states", () => {
    const draft = createCharacterDraft({});
    const abilityScoreHole = {
      kind: "abilityScores",
      holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
      source: draftSource("draft.abilityScoreGeneration"),
      methods: ["standardArray"],
    } as const satisfies CreationHole;

    expect(
      selectedStartingEquipmentChoice(draft, undefined, []),
    ).toBeUndefined();
    expect(
      selectedCoinGrantStartingEquipmentChoice(draft, undefined, []),
    ).toBeUndefined();
    expect(unselectedUnitChoiceHole(draft, undefined)).toEqual([]);
    expect(
      unselectedBackgroundAbilityScoreIncreaseHole(draft, undefined),
    ).toEqual([]);
    expect(unselectedPurchaseHole(draft, undefined)).toEqual([]);
    expect(unselectedLoadoutHole(draft, undefined, true)).toEqual([]);
    expect(unselectedLoadoutHole(draft, skillChoiceHole(), true)).toEqual([]);
    expect(
      hasValidEquipmentPurchaseSelectionForHole(draft, skillChoiceHole()),
    ).toBe(false);
    expect(
      hasPurchasedUnit(draft, authoredUnitId("synthetic_absent_purchase")),
    ).toBe(false);
    const { equipment: omittedEquipment, ...selectionsWithoutEquipment } =
      draft.selections;
    expect(omittedEquipment).toBeUndefined();
    expect(
      hasPurchasedUnit(
        { ...draft, selections: selectionsWithoutEquipment },
        authoredUnitId("synthetic_absent_purchase"),
      ),
    ).toBe(false);
    expect(
      hasPurchasedUnit(
        {
          ...draft,
          selections: {
            ...draft.selections,
            equipment: {
              selectedUnitIds: [authoredUnitId("weapon_quarterstaff")],
            },
          },
        },
        authoredUnitId("weapon_quarterstaff"),
      ),
    ).toBe(true);
    expect(choiceOptionIdsFitHole(abilityScoreHole, [])).toBe(false);
    const unsupportedArtisanToolChoice = {
      kind: "tool_category_choice",
      category: "artisan_tool",
      choose: 1,
    } as const;
    expect(
      backgroundToolChoiceSpec(unsupportedArtisanToolChoice),
    ).toBeUndefined();
    expect(
      backgroundToolChoiceHole(
        draft,
        unitSource(
          authoredUnitId("synthetic_background"),
          CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
        ),
        unsupportedArtisanToolChoice,
      ),
    ).toEqual([]);
  });
});
