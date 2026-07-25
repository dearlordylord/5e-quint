import * as Either from "effect/Either";
import { unitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";

import { battleId, battleObjectId, combatantId } from "../identity.ts";
import {
  characterSeed,
  startBattleRight,
  testCharacterWeaponAttackForUnit,
} from "../battle-runtime-test-support.ts";
import { addBattleCombatant, startBattle } from "./api-lifecycle.ts";

describe("battle lifecycle admission issue aggregation", () => {
  const baseCombatant = characterSeed({ initiative: 20 });

  function mismatchedMainHandCombatant() {
    return characterSeed({
      combatantId: combatantId("mismatched-main"),
      initiative: 18,
      attack: testCharacterWeaponAttackForUnit(unitId("weapon_longsword")),
      selectedLoadout: {
        weapon: {
          itemId: battleObjectId("main:weapon_dagger"),
          unitId: unitId("weapon_dagger"),
          grip: "one_handed",
        },
      },
    });
  }

  function mismatchedBothHandsCombatant() {
    return characterSeed({
      combatantId: combatantId("mismatched-both"),
      initiative: 18,
      attack: testCharacterWeaponAttackForUnit(unitId("weapon_longsword")),
      offHandAttack: testCharacterWeaponAttackForUnit(unitId("weapon_dagger")),
      selectedLoadout: {
        weapon: {
          itemId: battleObjectId("main:weapon_dagger"),
          unitId: unitId("weapon_dagger"),
          grip: "one_handed",
        },
        offHandWeapon: {
          itemId: battleObjectId("off:weapon_shortsword"),
          unitId: unitId("weapon_shortsword"),
        },
      },
    });
  }

  test("startBattle returns a single leaf issue when there is one admission failure", () => {
    const result = startBattle({
      battleId: battleId("single-issue"),
      combatants: [mismatchedMainHandCombatant()],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toEqual({
        tag: "weaponLoadoutMismatch",
        slot: "main-hand",
      });
    }
  });

  test("startBattle returns a flat aggregate retaining both slots when there are two admission failures", () => {
    const result = startBattle({
      battleId: battleId("aggregate-issue"),
      combatants: [mismatchedBothHandsCombatant()],
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toEqual({
        tag: "battleStateInitIssues",
        issues: [
          { tag: "weaponLoadoutMismatch", slot: "main-hand" },
          { tag: "weaponLoadoutMismatch", slot: "off-hand" },
        ],
      });
    }
  });

  test("addBattleCombatant follows the same leaf/aggregate contract as startBattle", () => {
    const state = startBattleRight({
      battleId: battleId("add-combatant"),
      combatants: [baseCombatant],
    });

    const single = addBattleCombatant({
      state,
      combatant: mismatchedMainHandCombatant(),
    });
    expect(Either.isLeft(single)).toBe(true);
    if (Either.isLeft(single)) {
      expect(single.left).toEqual({
        tag: "weaponLoadoutMismatch",
        slot: "main-hand",
      });
    }

    const aggregate = addBattleCombatant({
      state,
      combatant: mismatchedBothHandsCombatant(),
    });
    expect(Either.isLeft(aggregate)).toBe(true);
    if (Either.isLeft(aggregate)) {
      expect(aggregate.left).toEqual({
        tag: "battleStateInitIssues",
        issues: [
          { tag: "weaponLoadoutMismatch", slot: "main-hand" },
          { tag: "weaponLoadoutMismatch", slot: "off-hand" },
        ],
      });
    }
  });
});
