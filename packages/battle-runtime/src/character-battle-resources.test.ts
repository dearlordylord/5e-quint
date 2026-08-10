import { describe, expect, test } from "vitest";
import { Either } from "effect";

import type { CharacterBattleClassLevels } from "./character-class-level.ts";
import {
  characterBattleMetamagicState,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  characterBattleResourceSupportedForUnit,
  characterResourceState,
  parseCharacterBattleClassLevels,
} from "./character-battle-resources.ts";
import {
  characterBattleResourceIsPointPool,
  characterBattleResourceIsUnlimited,
  characterBattleResourceIsUseCount,
} from "./character-battle-resource-execution.ts";
import {
  abilityModifier,
  NonNegativeInteger,
  resourceCount,
} from "@dnd/shared/types";
import type { ClassName } from "@dnd/surface/surface/types";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleResourcePoolExecutionRef,
  combatantId,
} from "./identity.ts";
import {
  bardBardicInspirationUnitId,
  bardCuttingWordsUnitId,
  fighterIndomitableUnitId,
  monkMonksFocusUnitId,
  orcAdrenalineRushUnitId,
  paladinChannelDivinityUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellRecord } from "./battle-runtime.test-support.ts";

function classLevelsFor(
  className: ClassName,
  level: number,
): CharacterBattleClassLevels {
  const result = parseCharacterBattleClassLevels([{ className, level }]);
  if (Either.isLeft(result)) {
    throw new Error(result.left.messages.join("; "));
  }
  return result.right;
}

function resourcePoolRefFor(resourceId: string) {
  return battleResourcePoolExecutionRef(
    battleCharacterExecutionScopeRef(
      battleId("character-battle-resources-test"),
      combatantId(resourceId),
      battleExecutionScopeOrdinal(0),
    ),
    NonNegativeInteger(0),
  );
}

describe("character battle resource projections", () => {
  test.each([
    {
      unitId: paladinChannelDivinityUnitId,
      className: "paladin",
      level: 3,
      expected: 2,
    },
    {
      unitId: orcAdrenalineRushUnitId,
      className: "wizard",
      level: 5,
      expected: 3,
    },
    {
      unitId: monkMonksFocusUnitId,
      className: "monk",
      level: 5,
      expected: 5,
    },
    {
      unitId: fighterIndomitableUnitId,
      className: "fighter",
      level: 17,
      expected: 3,
    },
  ] as const)(
    "$unitId projects its supported resource cap",
    ({ unitId, className, level, expected }) => {
      const unit = unitLibrary.requireUnit(unitId);

      expect(
        characterBattleResourceMaxUses({
          unit,
          classLevels: classLevelsFor(className, level),
        }),
      ).toBe(expected);
    },
  );

  test("ability-modifier caps honor a minimum and an omitted minimum", () => {
    const bardicInspiration = unitLibrary.requireUnit(
      bardBardicInspirationUnitId,
    );
    const cuttingWords = unitLibrary.requireUnit(bardCuttingWordsUnitId);

    expect(
      characterBattleResourceMaxUses({
        unit: bardicInspiration,
        classLevels: classLevelsFor("bard", 1),
        capAbilityModifier: abilityModifier(-2),
      }),
    ).toBe(1);
    expect(
      characterBattleResourceMaxUses({
        unit: cuttingWords,
        classLevels: classLevelsFor("bard", 5),
        capAbilityModifier: abilityModifier(4),
      }),
    ).toBe(4);
  });

  test("unlimited and point-pool resources keep their distinct state shapes", () => {
    const unlimitedUnit = unitLibrary.requireUnit("barbarian_retaliation");
    const pointPoolUnit = unitLibrary.requireUnit("sorcerer_font_of_magic");
    const levels = classLevelsFor("barbarian", 10);
    const sorcererLevels = classLevelsFor("sorcerer", 5);

    expect(
      characterBattleResourceMaxUses({
        unit: unlimitedUnit,
        classLevels: levels,
      }),
    ).toBeUndefined();
    expect(
      characterBattleResourceMaxPoints({
        unit: unlimitedUnit,
        classLevels: levels,
      }),
    ).toBeUndefined();
    const unlimited = characterResourceState(
      { unit: unlimitedUnit },
      levels,
      resourcePoolRefFor("unlimited"),
    );
    expect(characterBattleResourceIsUnlimited(unlimited)).toBe(true);
    expect(characterBattleResourceIsUseCount(unlimited)).toBe(true);

    expect(
      characterBattleResourceMaxPoints({
        unit: pointPoolUnit,
        classLevels: sorcererLevels,
      }),
    ).toBe(5);
    expect(
      characterBattleResourceMaxUses({
        unit: pointPoolUnit,
        classLevels: sorcererLevels,
      }),
    ).toBeUndefined();
    const points = characterResourceState(
      { unit: pointPoolUnit },
      sorcererLevels,
      resourcePoolRefFor("point-pool"),
    );
    const explicitlySpent = characterResourceState(
      { unit: pointPoolUnit, pointsRemaining: 2 },
      sorcererLevels,
      resourcePoolRefFor("point-pool-explicit"),
    );
    expect(characterBattleResourceIsPointPool(points)).toBe(true);
    expect(characterBattleResourceIsPointPool(explicitlySpent)).toBe(true);
    if (
      !characterBattleResourceIsPointPool(points) ||
      !characterBattleResourceIsPointPool(explicitlySpent)
    ) {
      throw new Error("Expected point-pool resource states.");
    }
    expect(points.pointsRemaining).toBe(resourceCount(5));
    expect(explicitlySpent.pointsRemaining).toBe(resourceCount(2));
  });

  test("keeps metamagic state absent until its owned point-pool resource is present", () => {
    const unit = unitLibrary.requireUnit("sorcerer_font_of_magic");
    const classLevels = classLevelsFor("sorcerer", 5);
    const resourcePoolRef = resourcePoolRefFor("sorcery-points");
    const metamagic = {
      sorceryPointResourceUnitId: unit.id,
      spellUseLimit: "one_per_spell_unless_option_allows_stacking" as const,
      knownOptions: [],
    };

    expect(characterBattleMetamagicState(metamagic, [], [])).toBeUndefined();

    const resource = characterResourceState(
      { unit },
      classLevels,
      resourcePoolRef,
    );
    expect(
      characterBattleMetamagicState(
        metamagic,
        [resource],
        [{ resourcePoolRef, unit }],
      ),
    ).toEqual({
      sorceryPointResourcePoolRef: resourcePoolRef,
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [],
    });
  });

  test("does not admit a spell as a character battle resource", () => {
    expect(
      characterBattleResourceSupportedForUnit(spellRecord("acid_splash")),
    ).toBe(false);
  });
});
