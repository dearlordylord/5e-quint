import { describe, expect, it } from "vitest";

import {
  EMPTY_CONDITION_STATE,
  applyCondition,
  hasCondition,
} from "@dnd/shared/conditions-algebra";
import { Hp } from "@dnd/shared/types";

import { statBlockArmorClassState } from "#/reducer-armor-class.ts";
import { resetDeathSaveRuntimeState } from "#/reducer-death-saves.ts";
import {
  addCreatureDeathFailures,
  damageCreatureHp,
  healCreatureHp,
  resolveCreatureDeathSavingThrow,
} from "#/reducer-creature-lifecycle.ts";
import {
  spellcastingAbilityModifier,
  type CreatureState,
} from "#/reducer-state.ts";

function creatureState(overrides: Partial<CreatureState> = {}): CreatureState {
  return {
    hp: Hp(0),
    maxHp: Hp(10),
    tempHp: Hp(0),
    conditions: EMPTY_CONDITION_STATE,
    hasReaction: true,
    units: [],
    armorClass: statBlockArmorClassState(10),
    zeroHpLifecyclePolicy: "usesDeathSavingThrows",
    deathSaves: resetDeathSaveRuntimeState(),
    spellcastingAbilityModifier: spellcastingAbilityModifier(0),
    spellSlots: [],
    slotExpendedThisTurn: false,
    spellSlotsMax: [],
    ...overrides,
  };
}

describe("creature lifecycle death-save integration", () => {
  it("ignores death saves while the creature is above 0 HP", () => {
    const creature = creatureState({ hp: Hp(1) });

    expect(resolveCreatureDeathSavingThrow(creature, 1)).toBe(creature);
    expect(addCreatureDeathFailures(creature, 2)).toBe(creature);
  });

  it("records death saving throw failures on zero-HP creatures", () => {
    const creature = resolveCreatureDeathSavingThrow(creatureState(), 5);

    expect(creature.deathSaves.deathSaves.failures).toBe(1);
    expect(creature.deathSaves.dead).toBe(false);
  });

  it("damage at zero HP adds a death failure, including stable creatures", () => {
    const damaged = damageCreatureHp(
      creatureState({
        deathSaves: {
          deathSaves: { successes: 0, failures: 0 },
          stable: true,
          dead: false,
          hpRegained: false,
        },
      }),
      3,
    );

    expect(damaged.deathSaves.stable).toBe(false);
    expect(damaged.deathSaves.deathSaves.failures).toBe(1);
  });

  it("damage that drops a creature to zero HP makes it unconscious", () => {
    const damaged = damageCreatureHp(creatureState({ hp: Hp(5) }), 5);

    expect(Number(damaged.hp)).toBe(0);
    expect(hasCondition(damaged.conditions, "unconscious")).toBe(true);
    expect(damaged.deathSaves).toEqual(resetDeathSaveRuntimeState());
  });

  it("kills non-death-save creatures when damage drops them to zero HP", () => {
    const damaged = damageCreatureHp(
      creatureState({
        hp: Hp(5),
        zeroHpLifecyclePolicy: "diesAtZeroHp",
      }),
      5,
    );

    expect(Number(damaged.hp)).toBe(0);
    expect(damaged.deathSaves.dead).toBe(true);
  });

  it("kills death-save creatures on massive damage", () => {
    const damaged = damageCreatureHp(
      creatureState({ hp: Hp(5), maxHp: Hp(10) }),
      15,
    );

    expect(Number(damaged.hp)).toBe(0);
    expect(damaged.deathSaves.dead).toBe(true);
  });

  it("supports two death failures for contextual damage at zero HP", () => {
    const damaged = damageCreatureHp(creatureState(), 3, {
      deathFailuresAtZeroHp: 2,
    });

    expect(damaged.deathSaves.deathSaves.failures).toBe(2);
  });

  it("keeps stable creatures unconscious after three successes", () => {
    const one = resolveCreatureDeathSavingThrow(creatureState(), 10);
    const two = resolveCreatureDeathSavingThrow(one, 10);
    const three = resolveCreatureDeathSavingThrow(two, 10);

    expect(three.deathSaves.stable).toBe(true);
    expect(hasCondition(three.conditions, "unconscious")).toBe(true);
  });

  it("returns a natural 20 creature to 1 HP and clears unconscious", () => {
    const creature = creatureState({
      conditions: applyCondition(EMPTY_CONDITION_STATE, "unconscious"),
    });

    const resolved = resolveCreatureDeathSavingThrow(creature, 20);

    expect(Number(resolved.hp)).toBe(1);
    expect(resolved.deathSaves).toEqual(resetDeathSaveRuntimeState());
    expect(hasCondition(resolved.conditions, "unconscious")).toBe(false);
  });

  it("healing clears death saves and unconscious", () => {
    const creature = creatureState({
      conditions: applyCondition(EMPTY_CONDITION_STATE, "unconscious"),
      deathSaves: {
        deathSaves: { successes: 1, failures: 2 },
        stable: false,
        dead: false,
        hpRegained: false,
      },
    });

    const healed = healCreatureHp(creature, 4);

    expect(Number(healed.hp)).toBe(4);
    expect(healed.deathSaves).toEqual(resetDeathSaveRuntimeState());
    expect(hasCondition(healed.conditions, "unconscious")).toBe(false);
  });

  it("ordinary healing does not revive dead creatures", () => {
    const creature = creatureState({
      deathSaves: {
        deathSaves: { successes: 0, failures: 3 },
        stable: false,
        dead: true,
        hpRegained: false,
      },
    });

    expect(healCreatureHp(creature, 4)).toBe(creature);
  });
});
