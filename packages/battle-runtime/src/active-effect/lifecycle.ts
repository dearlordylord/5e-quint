// Active Effect lifecycle: pure-effect operations over a creature's effect list.
// This module is a value-leaf — it depends only on effect types and the
// conditions algebra, never on battle-reducer runtime. Spell-coupled
// apply-from-invocation logic stays in battle-reducer/ and calls into here.
// See plans/ACTIVE_EFFECT_DEEP_MODULE.md.
import {
  applyCondition,
  removeCondition,
  type ConditionState,
} from "@dnd/shared-algebras/conditions-algebra";
import type { Condition, HandUse } from "@dnd/shared/types";
import type { BattleActiveEffect } from "./types.ts";
import type { BattleCreatureState } from "../battle-reducer.ts";

const HIDEOUS_LAUGHTER_CONDITIONS = [
  "prone",
  "incapacitated",
] as const satisfies ReadonlyArray<Condition>;

export type ConditionApplyingActiveEffect =
  | Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>
  | Extract<
      BattleActiveEffect,
      { readonly kind: "targetActionEndedSpellCondition" }
    >
  | Extract<BattleActiveEffect, { readonly kind: "spellConditionRepeatSave" }>
  | Extract<BattleActiveEffect, { readonly kind: "spellConditionEndTurnSave" }>
  | Extract<BattleActiveEffect, { readonly kind: "sleepPendingRepeatSave" }>
  | Extract<BattleActiveEffect, { readonly kind: "sleepUnconscious" }>
  | Extract<BattleActiveEffect, { readonly kind: "hideousLaughter" }>;

export type SingleConditionApplyingActiveEffect = Exclude<
  ConditionApplyingActiveEffect,
  Extract<BattleActiveEffect, { readonly kind: "hideousLaughter" }>
>;

export function isConditionApplyingActiveEffect(
  effect: BattleActiveEffect,
): effect is ConditionApplyingActiveEffect {
  return (
    effect.kind === "spellCondition" ||
    effect.kind === "targetActionEndedSpellCondition" ||
    effect.kind === "spellConditionRepeatSave" ||
    effect.kind === "spellConditionEndTurnSave" ||
    effect.kind === "sleepPendingRepeatSave" ||
    effect.kind === "sleepUnconscious" ||
    effect.kind === "hideousLaughter"
  );
}

export function activeEffectCondition(
  effect: SingleConditionApplyingActiveEffect,
): Condition {
  if (
    effect.kind === "spellCondition" ||
    effect.kind === "targetActionEndedSpellCondition" ||
    effect.kind === "spellConditionRepeatSave" ||
    effect.kind === "spellConditionEndTurnSave"
  )
    return effect.condition;
  return effect.kind === "sleepPendingRepeatSave"
    ? "incapacitated"
    : "unconscious";
}

export function activeEffectConditions(
  effect: ConditionApplyingActiveEffect,
): readonly Condition[] {
  return effect.kind === "hideousLaughter"
    ? HIDEOUS_LAUGHTER_CONDITIONS
    : [activeEffectCondition(effect)];
}

export function conditionsAfterApplyingSpellConditionEffects(
  conditions: ConditionState,
  activeEffects: readonly BattleActiveEffect[],
): ConditionState {
  const conditionImmunities = activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "conditionImmunity" }
    > => effect.kind === "conditionImmunity",
  );
  const baseConditions = conditionImmunities.reduce(
    (nextConditions, immunity) =>
      removeCondition(nextConditions, immunity.condition),
    conditions,
  );
  return activeEffects
    .filter(isConditionApplyingActiveEffect)
    .reduce((nextConditions, effect) => {
      return activeEffectConditions(effect).reduce(
        (conditionState, condition) =>
          conditionImmunities.some(
            (immunity) => immunity.condition === condition,
          )
            ? conditionState
            : applyCondition(conditionState, condition),
        nextConditions,
      );
    }, baseConditions);
}

export const SPELL_CREATED_HELD_OBJECT_HAND_USE =
  "spellCreatedHeldObject" as const satisfies HandUse;

function spellCreatedHeldObjectEffectIsHeld(effect: BattleActiveEffect): boolean {
  return (
    effect.kind === "spellCreatedHeldObject" &&
    effect.objectState.kind === "held"
  );
}

export function battleCreatureWithoutSpellCreatedHeldObjectHand(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (
    combatant.armorClass.leftHandUse !== SPELL_CREATED_HELD_OBJECT_HAND_USE &&
    combatant.armorClass.rightHandUse !== SPELL_CREATED_HELD_OBJECT_HAND_USE
  ) {
    return combatant;
  }
  return {
    ...combatant,
    armorClass: {
      ...combatant.armorClass,
      leftHandUse:
        combatant.armorClass.leftHandUse === SPELL_CREATED_HELD_OBJECT_HAND_USE
          ? "free"
          : combatant.armorClass.leftHandUse,
      rightHandUse:
        combatant.armorClass.rightHandUse === SPELL_CREATED_HELD_OBJECT_HAND_USE
          ? "free"
          : combatant.armorClass.rightHandUse,
    },
  };
}

export function battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return combatant.activeEffects.some(spellCreatedHeldObjectEffectIsHeld)
    ? combatant
    : battleCreatureWithoutSpellCreatedHeldObjectHand(combatant);
}

export function battleCreatureWithSpellActiveEffects(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
): BattleCreatureState {
  const nextCombatant =
    combatant.positiveHpUnconscious === null
      ? {
          ...combatant,
          activeEffects,
          conditions: conditionsAfterApplyingSpellConditionEffects(
            combatant.conditions,
            activeEffects,
          ),
        }
      : { ...combatant, activeEffects };
  return battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects(
    nextCombatant,
  );
}
