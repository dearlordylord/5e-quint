import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { describe, expect, test } from "vitest";

import { characterBattleCreatureInitWeaponAttack } from "./battle-init.ts";
import {
  battleProcedureExecutionRefForTest,
  testDaggerAttack,
} from "./battle-runtime.test-support.ts";

describe("battle initialization projections", () => {
  test("retains every optional authored-free weapon execution fact", () => {
    const attack = testDaggerAttack();
    const attackDamageAbilityModifierChoice = {
      procedureRefs: [battleProcedureExecutionRefForTest("synthetic-choice")],
      appliedDamageAbilityModifier: abilityModifier(3),
      declinedDamageAbilityModifier: abilityModifier(0),
    } as const;

    expect(
      characterBattleCreatureInitWeaponAttack({
        ...attack,
        attackDamageAbilityModifierChoice,
        damageBonus: 2,
        damageTypeChoices: ["piercing", "force"],
      }),
    ).toEqual({
      kind: "weapon",
      weapon: attack.weapon,
      ability: attack.ability,
      abilityModifier: attack.abilityModifier,
      attackBonus: attack.attackBonus,
      damageAbilityModifier: attack.damageAbilityModifier,
      attackDamageAbilityModifierChoice,
      damageBonus: 2,
      damageTypeChoices: ["piercing", "force"],
    });
  });
});
