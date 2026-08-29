import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import type { BattleActiveEffectSource } from "../active-effect/source.ts";
import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import {
  allocateBattleEffectOccurrenceForCreature,
  allocateBattleEffectOccurrencesForCreature,
  type BattleSourcedEffectOccurrenceTemplate,
  type BattleSourcedEffectOccurrenceTemplateList,
} from "../effect-execution-ref.ts";
import { combatantsAfterConcentrationSpellEffectsEndedIfNoEffects } from "./spell-condition-effects-helpers.ts";

/**
 * Source identity is part of the active-effect value for spell and feature
 * effects. Keep the three matching relations explicit: full source identity,
 * procedure occurrence only, and source-combatant identity only. Full source
 * matching accepts either an existing source-bearing value or explicit refs
 * when the surrounding workflow has not built an active effect yet.
 */
export function activeEffectSourceMatches(
  effect: BattleActiveEffectSource,
  source: BattleActiveEffectSource,
): boolean {
  return sourceRefsMatch(
    effect,
    source.sourceProcedureRef,
    source.sourceCombatantId,
  );
}

export function activeEffectSourceRefsMatch(
  effect: BattleActiveEffectSource,
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceCombatantId: CombatantId,
): boolean {
  return sourceRefsMatch(effect, sourceProcedureRef, sourceCombatantId);
}

export function activeEffectProcedureMatches(
  effect: BattleActiveEffectSource,
  sourceProcedureRef: BattleProcedureExecutionRef,
): boolean {
  return effect.sourceProcedureRef === sourceProcedureRef;
}

export function activeEffectHasSourceCombatant(
  effect: BattleActiveEffectSource,
  combatantId: CombatantId,
): boolean {
  return effect.sourceCombatantId === combatantId;
}

function sourceRefsMatch(
  effect: BattleActiveEffectSource,
  sourceProcedureRef: BattleProcedureExecutionRef,
  sourceCombatantId: CombatantId,
): boolean {
  return (
    effect.sourceProcedureRef === sourceProcedureRef &&
    effect.sourceCombatantId === sourceCombatantId
  );
}

export function replaceTargetActiveEffect(
  state: BattleState,
  targetId: CombatantId,
  replaces: (effect: BattleActiveEffect) => boolean,
  replacement: BattleSourcedEffectOccurrenceTemplate,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: replacement,
  });
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...allocation.owner,
      activeEffects: [
        ...allocation.owner.activeEffects.filter((effect) => !replaces(effect)),
        allocation.effect,
      ],
    }),
  };
}

export function replaceTargetSpellActiveEffect(
  state: BattleState,
  targetId: CombatantId,
  replaces: (effect: BattleActiveEffect) => boolean,
  replacement: BattleSourcedEffectOccurrenceTemplate,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const allocation = allocateBattleEffectOccurrenceForCreature({
    owner: target,
    effect: replacement,
  });
  const activeEffects = [
    ...allocation.owner.activeEffects.filter((effect) => !replaces(effect)),
    allocation.effect,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
    ),
  };
}

export function replaceAllocatedTargetSpellActiveEffects(
  state: BattleState,
  targetId: CombatantId,
  replaces: (effect: BattleActiveEffect) => boolean,
  replacements: BattleSourcedEffectOccurrenceTemplateList,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const allocation = allocateBattleEffectOccurrencesForCreature({
    owner: target,
    effects: replacements,
  });
  const activeEffects = [
    ...allocation.owner.activeEffects.filter((effect) => !replaces(effect)),
    ...allocation.effects,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
    ),
  };
}

export function replaceTargetActiveEffectsEndingDisplacedConcentrations(
  state: BattleState,
  targetId: CombatantId,
  activeEffects: readonly BattleActiveEffect[],
  displacedEffects: readonly {
    readonly sourceCombatantId: CombatantId;
    readonly sourceProcedureRef: BattleProcedureExecutionRef;
  }[],
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) return state;
  const withReplacement = {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects,
    }),
  };
  const combatants = displacedEffects.reduce<
    ReadonlyMap<CombatantId, BattleCreatureState>
  >(
    (nextCombatants, effect) =>
      combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
        nextCombatants,
        effect,
      ),
    withReplacement.combatants,
  );
  return { ...withReplacement, combatants };
}
