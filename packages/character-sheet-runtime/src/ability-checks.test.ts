// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.ability-check-proficiency-bonus
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.ability-check-ability-substitution
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.jump-distance-ability-substitution
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.linked-speed-grant-projection
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-BARD-JACK-OF-ALL-TRADES bard_jack_of_all_trades
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A15 barbarian_primal_knowledge rogue_second_story_work
import { describe, expect, test } from "vitest";
import {
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  armorClassBuild,
  bardJackOfAllTradesBuild,
  characterSheetAbilityCheckAbility,
  characterSheetAbilityCheckProficiencyBonus,
  characterSheetJumpDistanceAbility,
  characterSheetLinkedSpeedGrants,
  jackOfAllTradesAddsHalfProficiencyBonusTestName,
  jackOfAllTradesRequiresBardLevelTwoFeatureTestName,
  jackOfAllTradesRequiresNoOtherProficiencyBonusTestName,
  primalKnowledgeAbilitySubstitutionProjectionTestName,
  requireRight,
  secondStoryWorkProjectionTestName,
  skillProficiencyOverridesJackOfAllTradesTestName,
  unitLibrary
} from "./test-support.ts";

describe("Character Sheet runtime / ability checks", () => {
  test(secondStoryWorkProjectionTestName, () => {
    const baseRogueBuild = armorClassBuild({
      startingClass: "class_rogue",
      advancements: ["class_rogue", "class_rogue"],
    });
    const rogueBuild = {
      ...baseRogueBuild,
      features: [
        {
          kind: "selectedClassChoice",
          selectedFromUnitId: "class_rogue",
          unitId: "subclass_rogue_thief",
        },
      ],
    } as const;

    expect(
      requireRight(
        characterSheetLinkedSpeedGrants(baseRogueBuild, unitLibrary),
      ),
    ).toEqual([]);

    expect(
      requireRight(characterSheetLinkedSpeedGrants(rogueBuild, unitLibrary)),
    ).toEqual([
      {
        sourceUnitId: "rogue_second_story_work",
        speedKind: "climb",
        feet: { kind: "walk_speed" },
      },
    ]);
    expect(
      requireRight(
        characterSheetJumpDistanceAbility({
          build: rogueBuild,
          unitLibrary,
          defaultAbility: "str",
        }),
      ),
    ).toEqual({
      defaultAbility: "str",
      optionalSubstitutions: [
        {
          ability: "dex",
          replaces: "str",
          sourceUnitId: "rogue_second_story_work",
        },
      ],
    });
  });

  test(jackOfAllTradesAddsHalfProficiencyBonusTestName, () => {
    const result = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 2 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );
    const roundedDown = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 5 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );

    expect(result).toEqual({
      tag: "jackOfAllTrades",
      sourceUnitId: "bard_jack_of_all_trades",
      skill: "performance",
      bonus: 1,
    });
    expect(roundedDown).toMatchObject({ tag: "jackOfAllTrades", bonus: 1 });
  });

  test(skillProficiencyOverridesJackOfAllTradesTestName, () => {
    const skillProficiency = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({
          totalLevel: 5,
          proficiencyChoices: [{ kind: "skill", skill: "performance" }],
        }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );
    const expertise = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({
          totalLevel: 5,
          proficiencyChoices: [
            { kind: "skill_expertise", skill: "performance" },
          ],
        }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );

    expect(skillProficiency).toEqual({
      tag: "skillProficiency",
      skill: "performance",
      bonus: 3,
    });
    expect(expertise).toEqual({
      tag: "expertise",
      skill: "performance",
      bonus: 6,
    });
  });

  test(jackOfAllTradesRequiresNoOtherProficiencyBonusTestName, () => {
    const result = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 5 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
      }),
    );

    expect(result).toEqual({ tag: "none", bonus: 0 });
  });

  test(jackOfAllTradesRequiresBardLevelTwoFeatureTestName, () => {
    const result = requireRight(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 1 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );

    expect(result).toEqual({ tag: "none", bonus: 0 });
  });

  test(primalKnowledgeAbilitySubstitutionProjectionTestName, () => {
    const barbarianBuild = armorClassBuild({
      startingClass: "class_barbarian",
      advancements: ["class_barbarian", "class_barbarian"],
    });

    expect(
      requireRight(
        characterSheetAbilityCheckAbility({
          build: barbarianBuild,
          unitLibrary,
          skill: "stealth",
          defaultAbility: "dex",
          activeFeatureUnitIds: [],
        }),
      ),
    ).toEqual({ defaultAbility: "dex", optionalSubstitutions: [] });
    expect(
      requireRight(
        characterSheetAbilityCheckAbility({
          build: barbarianBuild,
          unitLibrary,
          skill: "stealth",
          defaultAbility: "dex",
          activeFeatureUnitIds: ["barbarian_rage"],
        }),
      ),
    ).toEqual({
      defaultAbility: "dex",
      optionalSubstitutions: [
        {
          ability: "str",
          sourceUnitId: "barbarian_primal_knowledge",
          requiredActiveFeatureUnitId: "barbarian_rage",
        },
      ],
    });
    expect(
      requireRight(
        characterSheetAbilityCheckAbility({
          build: barbarianBuild,
          unitLibrary,
          skill: "athletics",
          defaultAbility: "str",
          activeFeatureUnitIds: ["barbarian_rage"],
        }),
      ),
    ).toEqual({ defaultAbility: "str", optionalSubstitutions: [] });
  });
});
