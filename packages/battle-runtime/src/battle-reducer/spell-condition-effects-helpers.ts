// Spell-condition effect helpers shared between M (damage_apply) and
// P (spells_holes_fills). Cycle #19 in REFACTOR_MAP.md — both clusters need
// these small helpers; hoisting them here keeps M↔P unidirectional. Mechanical
// extraction — no behavior change.

import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import type { Condition } from "@dnd/shared/types";
import type { SpellId } from "../identity.ts";
import type { CombatantId } from "../identity.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
} from "../battle-reducer.ts";

export function conditionHasNonSpellSource(
  combatant: BattleCreatureState,
  condition: Condition,
): boolean {
  return (
    hasCondition(combatant.conditions, condition) &&
    !combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellCondition" && effect.condition === condition,
    )
  );
}

export function conditionHadNonSpellSourceBeforeSpellEffect(
  combatant: BattleCreatureState,
  condition: Condition,
): boolean {
  return (
    conditionHasNonSpellSource(combatant, condition) ||
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellCondition" &&
        effect.condition === condition &&
        effect.conditionHadNonSpellSource,
    )
  );
}

export function spellRestraintEffects(
  state: BattleState,
  combatantId: CombatantId,
): readonly Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>[] {
  const combatant = state.combatants.get(combatantId);
  if (
    combatant === undefined ||
    !hasCondition(combatant.conditions, "restrained")
  ) {
    return [];
  }
  return combatant.activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "spellCondition" }
    > =>
      effect.kind === "spellCondition" &&
      effect.condition === "restrained" &&
      effect.escape !== null,
  );
}

export type SpellRestraintEffectEntry = {
  readonly targetId: CombatantId;
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellCondition" }
  >;
};

export function spellRestraintEffectEntries(
  state: BattleState,
): readonly SpellRestraintEffectEntry[] {
  return [...state.combatants.keys()].flatMap((targetId) =>
    spellRestraintEffects(state, targetId).map((effect) => ({
      targetId,
      effect,
    })),
  );
}

export function spellRestraintEffectFor(
  state: BattleState,
  combatantId: CombatantId,
  sourceSpellId: SpellId,
  sourceCombatantId: CombatantId,
):
  | Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>
  | undefined {
  return spellRestraintEffects(state, combatantId).find(
    (effect) =>
      effect.sourceSpellId === sourceSpellId &&
      effect.sourceCombatantId === sourceCombatantId,
  );
}

export function removeSpellConditionEffect(
  state: BattleState,
  combatantId: CombatantId,
  effect: Extract<BattleActiveEffect, { readonly kind: "spellCondition" }>,
): BattleState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    return state;
  }
  const activeEffects = combatant.activeEffects.filter(
    (candidate) => candidate !== effect,
  );
  const nextCombatant: BattleCreatureState =
    combatant.positiveHpUnconscious === null
      ? {
          ...combatant,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            combatant.conditions,
            activeEffects,
            [effect],
          ),
        }
      : { ...combatant, activeEffects };
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, nextCombatant),
  };
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
    .filter((effect) => effect.kind === "spellCondition")
    .filter(
      (effect) =>
        !activeEffects.some(
          (candidate) =>
            candidate.kind === "conditionImmunity" &&
            candidate.condition === effect.condition,
        ),
    )
    .reduce(
      (nextConditions, effect) =>
        applyCondition(nextConditions, effect.condition),
      baseConditions,
    );
}

export function conditionsAfterExpiringSpellConditionEffects(
  conditions: ConditionState,
  remainingEffects: readonly BattleActiveEffect[],
  expiringEffects: readonly BattleActiveEffect[],
): ConditionState {
  return expiringEffects
    .filter((effect) => effect.kind === "spellCondition")
    .reduce((nextConditions, effect) => {
      const stillHasSpellSource = remainingEffects.some(
        (remaining) =>
          remaining.kind === "spellCondition" &&
          remaining.condition === effect.condition,
      );
      return stillHasSpellSource || effect.conditionHadNonSpellSource
        ? nextConditions
        : removeCondition(nextConditions, effect.condition);
    }, conditions);
}
