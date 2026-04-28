import { describe, expect, it } from "vitest";

import { EMPTY_CONDITION_STATE } from "@dnd/shared-algebras/conditions-algebra";
import { resetDeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";
import type { Hp } from "@dnd/shared/types";

import { statBlockArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { applyHpDamage } from "#/reducer-damage.ts";
import { spellcastingAbilityModifier } from "#/reducer-state.ts";
import type { CreatureState } from "#/reducer-state.ts";

function creatureState(overrides: Partial<CreatureState> = {}): CreatureState {
  return {
    hp: 5 as Hp,
    maxHp: 5 as Hp,
    tempHp: 0 as Hp,
    conditions: EMPTY_CONDITION_STATE,
    hasReaction: true,
    units: [],
    armorClass: statBlockArmorClassState(10),
    zeroHpLifecyclePolicy: "diesAtZeroHp",
    deathSaves: resetDeathSaveRuntimeState(),
    spellcastingAbilityModifier: spellcastingAbilityModifier(0),
    spellSlots: [],
    slotExpendedThisTurn: false,
    spellSlotsMax: [],
    ...overrides,
  };
}

describe("applyHpDamage", () => {
  it("clamps HP at 0", () => {
    const result = applyHpDamage(creatureState({ hp: 3 as Hp }), 8);

    expect(result.hp).toBe(0);
  });

  it("subtracts damage from HP when temporary HP is absent", () => {
    const result = applyHpDamage(creatureState({ hp: 5 as Hp }), 2);

    expect(result.hp).toBe(3);
  });

  it("absorbs damage with temporary HP before HP", () => {
    const result = applyHpDamage(
      creatureState({ hp: 5 as Hp, tempHp: 3 as Hp }),
      4,
    );

    expect(result.tempHp).toBe(0);
    expect(result.hp).toBe(4);
  });

  it("does not let negative damage heal", () => {
    const result = applyHpDamage(creatureState({ hp: 3 as Hp }), -2);

    expect(result.hp).toBe(3);
  });
});
