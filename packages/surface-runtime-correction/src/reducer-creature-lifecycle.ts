import {
  applyCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { Hp } from "@dnd/shared/types";

import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
} from "@dnd/shared-algebras/death-saves-algebra";
import type { CreatureState } from "#/reducer-state.ts";

export type CreatureDamageContext = {
  readonly deathFailuresAtZeroHp?: 1 | 2;
};

function isAtZeroHp(creature: CreatureState): boolean {
  return Number(creature.hp) <= 0;
}

function usesDeathSavingThrows(creature: CreatureState): boolean {
  return creature.zeroHpLifecyclePolicy === "usesDeathSavingThrows";
}

function deadCreature(creature: CreatureState): CreatureState {
  return {
    ...creature,
    hp: Hp(0),
    deathSaves: {
      deathSaves: {
        successes: 0,
        failures: 3,
      },
      stable: false,
      dead: true,
      hpRegained: false,
    },
  };
}

function withDeathSaveOutcomeApplied(
  creature: CreatureState,
  deathSaves: ReturnType<typeof resolveDeathSavingThrow>,
): CreatureState {
  if (deathSaves.hpRegained) {
    return {
      ...creature,
      hp: Hp(1),
      conditions: removeCondition(creature.conditions, "unconscious"),
      deathSaves: resetDeathSaveRuntimeState(),
    };
  }

  if (deathSaves.stable) {
    return {
      ...creature,
      conditions: applyCondition(creature.conditions, "unconscious"),
      deathSaves,
    };
  }

  return {
    ...creature,
    deathSaves,
  };
}

export function resolveCreatureDeathSavingThrow(
  creature: CreatureState,
  d20Roll: number,
): CreatureState {
  if (!usesDeathSavingThrows(creature)) return creature;
  if (!isAtZeroHp(creature)) return creature;
  return withDeathSaveOutcomeApplied(
    creature,
    resolveDeathSavingThrow(creature.deathSaves, d20Roll),
  );
}

export function addCreatureDeathFailures(
  creature: CreatureState,
  count: number,
): CreatureState {
  if (!usesDeathSavingThrows(creature)) return creature;
  if (!isAtZeroHp(creature)) return creature;
  return withDeathSaveOutcomeApplied(
    creature,
    addDeathFailures(creature.deathSaves, count),
  );
}

export function damageCreatureHp(
  creature: CreatureState,
  damageAmount: number,
  context: CreatureDamageContext = {},
): CreatureState {
  if (damageAmount <= 0 || creature.deathSaves.dead) return creature;

  if (isAtZeroHp(creature)) {
    if (!usesDeathSavingThrows(creature)) return deadCreature(creature);
    return addCreatureDeathFailures(
      creature,
      context.deathFailuresAtZeroHp ?? 1,
    );
  }

  const currentHp = Number(creature.hp);
  const nextHp = Hp(Math.max(0, Number(creature.hp) - damageAmount));
  if (Number(nextHp) > 0) {
    return {
      ...creature,
      hp: nextHp,
    };
  }

  if (
    !usesDeathSavingThrows(creature) ||
    damageAmount - currentHp >= Number(creature.maxHp)
  ) {
    return deadCreature(creature);
  }

  return {
    ...creature,
    hp: nextHp,
    conditions: applyCondition(creature.conditions, "unconscious"),
    deathSaves: resetDeathSaveRuntimeState(),
  };
}

export function healCreatureHp(
  creature: CreatureState,
  hp: number,
): CreatureState {
  if (creature.deathSaves.dead) return creature;
  if (hp <= 0) return creature;

  return {
    ...creature,
    hp: Hp(Math.min(Number(creature.maxHp), Number(creature.hp) + hp)),
    conditions: removeCondition(creature.conditions, "unconscious"),
    deathSaves: resetDeathSaveRuntimeState(),
  };
}
