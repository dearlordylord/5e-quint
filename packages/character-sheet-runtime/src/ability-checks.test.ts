// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.ability-check-proficiency-bonus
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.ability-check-ability-substitution
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.jump-distance-ability-substitution
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.linked-speed-grant-projection
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-CLASS-BARD-JACK-OF-ALL-TRADES bard_jack_of_all_trades
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L13UG-A15 barbarian_primal_knowledge rogue_second_story_work
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";
import {
  CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
  CHARACTER_SHEET_OTHER_PROFICIENCY_BONUS_APPLIES,
  armorClassBuild,
  bardJackOfAllTradesBuild,
  characterSheetAbilityCheckAbility,
  characterSheetAbilityCheckProficiencyBonus,
  characterSheetAbilityCheckProficiencyBonusProjection,
  characterSheetJumpDistanceAbility,
  characterSheetLinkedSpeedGrants,
  jackOfAllTradesAddsHalfProficiencyBonusTestName,
  jackOfAllTradesRequiresBardLevelTwoFeatureTestName,
  jackOfAllTradesRequiresNoOtherProficiencyBonusTestName,
  primalKnowledgeAbilitySubstitutionProjectionTestName,
  requireSuccess,
  secondStoryWorkProjectionTestName,
  skillProficiencyOverridesJackOfAllTradesTestName,
  unitLibrary,
} from "./test-support.test-support.ts";

function expectSecondStoryWorkProjection() {
  const baseRogueBuild = armorClassBuild({
    startingClass: "class_rogue",
    advancements: ["class_rogue", "class_rogue"],
  });
  const rogueBuild = {
    ...baseRogueBuild,
    features: [
      {
        kind: "selectedClassChoice",
        selectedFromUnitId: authoredUnitId("class_rogue"),
        unitId: authoredUnitId("subclass_rogue_thief"),
      },
    ],
  } as const;

  expect(
    requireSuccess(
      characterSheetLinkedSpeedGrants(baseRogueBuild, unitLibrary),
    ),
  ).toEqual([]);

  expect(
    requireSuccess(characterSheetLinkedSpeedGrants(rogueBuild, unitLibrary)),
  ).toEqual([
    {
      sourceUnitId: authoredUnitId("rogue_second_story_work"),
      speedKind: "climb",
      feet: { kind: "walk_speed" },
    },
  ]);
  expect(
    requireSuccess(
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
        sourceUnitId: authoredUnitId("rogue_second_story_work"),
      },
    ],
  });
}

describe("Character Sheet runtime / ability checks", () => {
  test(secondStoryWorkProjectionTestName, expectSecondStoryWorkProjection);

  test("projects linked speeds from the Ranger Roving composite feature", () => {
    const rangerBuild = armorClassBuild({
      startingClass: "class_ranger",
      advancements: Array.from({ length: 5 }, () => "class_ranger"),
    });

    expect(
      requireRight(characterSheetLinkedSpeedGrants(rangerBuild, unitLibrary)),
    ).toEqual([
      {
        sourceUnitId: authoredUnitId("ranger_roving"),
        speedKind: "climb",
        feet: { kind: "walk_speed" },
      },
      {
        sourceUnitId: authoredUnitId("ranger_roving"),
        speedKind: "swim",
        feet: { kind: "walk_speed" },
      },
    ]);
  });

  test(jackOfAllTradesAddsHalfProficiencyBonusTestName, () => {
    const input = {
      build: bardJackOfAllTradesBuild({ totalLevel: 2 }),
      unitLibrary,
      skill: "performance" as const,
      otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
    };
    const result = requireSuccess(
      characterSheetAbilityCheckProficiencyBonus(input),
    );
    const roundedDown = requireSuccess(
      characterSheetAbilityCheckProficiencyBonus({
        build: bardJackOfAllTradesBuild({ totalLevel: 5 }),
        unitLibrary,
        skill: "performance",
        otherProficiencyBonus: CHARACTER_SHEET_NO_OTHER_PROFICIENCY_BONUS,
      }),
    );

    expect(result).toEqual({
      tag: "jackOfAllTrades",
      sourceUnitId: authoredUnitId("bard_jack_of_all_trades"),
      skill: "performance",
      bonus: 1,
    });
    expect(
      requireSuccess(
        characterSheetAbilityCheckProficiencyBonusProjection(input),
      ),
    ).toEqual({
      proficiencyBonus: result,
      qRoute: [
        {
          kind: "projectCharacterSheetFacts",
          subject: "abilityCheckProjection",
          owner: "buildProjection",
        },
      ],
    });
    expect(roundedDown).toMatchObject({ tag: "jackOfAllTrades", bonus: 1 });
  });

  test(skillProficiencyOverridesJackOfAllTradesTestName, () => {
    const skillProficiency = requireSuccess(
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
    const expertise = requireSuccess(
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
    const result = requireSuccess(
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
    const result = requireSuccess(
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
      requireSuccess(
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
      requireSuccess(
        characterSheetAbilityCheckAbility({
          build: barbarianBuild,
          unitLibrary,
          skill: "stealth",
          defaultAbility: "dex",
          activeFeatureUnitIds: [authoredUnitId("barbarian_rage")],
        }),
      ),
    ).toEqual({
      defaultAbility: "dex",
      optionalSubstitutions: [
        {
          ability: "str",
          sourceUnitId: authoredUnitId("barbarian_primal_knowledge"),
          requiredActiveFeatureUnitId: "barbarian_rage",
        },
      ],
    });
    expect(
      requireSuccess(
        characterSheetAbilityCheckAbility({
          build: barbarianBuild,
          unitLibrary,
          skill: "athletics",
          defaultAbility: "str",
          activeFeatureUnitIds: [authoredUnitId("barbarian_rage")],
        }),
      ),
    ).toEqual({ defaultAbility: "str", optionalSubstitutions: [] });
  });
});
