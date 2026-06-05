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
const HYPNOTIC_PATTERN_CONDITIONS = [
  "charmed",
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
  | Extract<BattleActiveEffect, { readonly kind: "hideousLaughter" }>
  | Extract<BattleActiveEffect, { readonly kind: "hypnoticPatternControl" }>;

export type SingleConditionApplyingActiveEffect = Exclude<
  ConditionApplyingActiveEffect,
  Extract<
    BattleActiveEffect,
    { readonly kind: "hideousLaughter" | "hypnoticPatternControl" }
  >
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
    effect.kind === "hideousLaughter" ||
    effect.kind === "hypnoticPatternControl"
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
  if (effect.kind === "hideousLaughter") {
    return HIDEOUS_LAUGHTER_CONDITIONS;
  }
  if (effect.kind === "hypnoticPatternControl") {
    return HYPNOTIC_PATTERN_CONDITIONS;
  }
  return [activeEffectCondition(effect)];
}

export type ShapeShiftOwnerActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "druidWildShapeForm" | "spellShapeShiftedForm" }
>;

export function isShapeShiftOwnerActiveEffect(
  effect: BattleActiveEffect,
): effect is ShapeShiftOwnerActiveEffect {
  return (
    effect.kind === "druidWildShapeForm" ||
    effect.kind === "spellShapeShiftedForm"
  );
}

export function activeEffectsWithoutShapeShiftOwner(
  activeEffects: readonly BattleActiveEffect[],
): readonly BattleActiveEffect[] {
  return activeEffects.filter(
    (effect) => !isShapeShiftOwnerActiveEffect(effect),
  );
}

export function activeEffectsWithShapeShiftOwnerReplaced(
  activeEffects: readonly BattleActiveEffect[],
  owner: ShapeShiftOwnerActiveEffect,
): readonly BattleActiveEffect[] {
  return [...activeEffectsWithoutShapeShiftOwner(activeEffects), owner];
}

export function activeShapeShiftOwnerEffect(
  activeEffects: readonly BattleActiveEffect[],
): ShapeShiftOwnerActiveEffect | null {
  for (let index = activeEffects.length - 1; index >= 0; index -= 1) {
    const effect = activeEffects[index];
    if (effect !== undefined && isShapeShiftOwnerActiveEffect(effect)) {
      return effect;
    }
  }
  return null;
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
  const shapeShiftOwner = activeShapeShiftOwnerEffect(activeEffects);
  const exclusiveActiveEffects =
    shapeShiftOwner === null
      ? activeEffects
      : activeEffectsWithShapeShiftOwnerReplaced(activeEffects, shapeShiftOwner);
  const nextCombatant =
    combatant.positiveHpUnconscious === null
      ? {
          ...combatant,
          activeEffects: exclusiveActiveEffects,
          conditions: conditionsAfterApplyingSpellConditionEffects(
            combatant.conditions,
            exclusiveActiveEffects,
          ),
        }
      : { ...combatant, activeEffects: exclusiveActiveEffects };
  return battleCreatureWithSpellCreatedHeldObjectHandStateFromActiveEffects(
    nextCombatant,
  );
}
