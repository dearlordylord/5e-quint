import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";

import {
  choiceOptionIdsFitHole,
  choiceSelectionMatchesHole,
  choiceSelectionOptionIds,
  hasDuplicateOptionIds,
  sameChoiceSelection,
  sameChoiceSelectionMultiset,
  sameCreationHoleSource,
  sameOptionIdMultiset,
  sameSelectedChoiceOption,
  sameSelectedChoiceOptionMultiset,
  selectedChoiceOptionMatchesHole,
} from "./discovery.ts";
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
  exactChoiceCardinality,
  type CharacterChoiceSelection,
  type CharacterSelectedChoiceOption,
  type ChoiceCreationHole,
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

  test("projects equipment and background increase option labels", () => {
    expect(
      startingEquipmentLabel({
        id: "synthetic_bundle",
        kind: "item_bundle",
        items: [{ kind: "draft_owned_item", itemName: "Synthetic Item" }],
      }),
    ).toBe("synthetic_bundle");
    expect(
      parseBackgroundAbilityScoreIncreaseOptionId(
        backgroundAbilityScoreIncreaseOptionId({ kind: "oneEach" }),
      ),
    ).toEqual({ kind: "oneEach" });
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
});
