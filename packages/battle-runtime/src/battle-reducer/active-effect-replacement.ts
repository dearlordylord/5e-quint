import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type { BattleActiveEffectSource } from "../active-effect/source.ts";
import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import { allocateBattleEffectExecutionRef } from "../effect-execution-ref.ts";
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
  replacement: BattleActiveEffect,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter((effect) => !replaces(effect)),
        replacement,
      ],
    }),
  };
}

export function replaceTargetSpellActiveEffect(
  state: BattleState,
  targetId: CombatantId,
  replaces: (effect: BattleActiveEffect) => boolean,
  replacement: BattleActiveEffect,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const activeEffects = [
    ...target.activeEffects.filter((effect) => !replaces(effect)),
    replacement,
  ];
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    ),
  };
}

export function replaceAllocatedTargetSpellActiveEffects(
  state: BattleState,
  targetId: CombatantId,
  replaces: (effect: BattleActiveEffect) => boolean,
  replacements: (
    effectRef: BattleEffectExecutionRef,
  ) => readonly BattleActiveEffect[],
): BattleState {
  const allocation = allocateBattleEffectExecutionRef({
    state,
    ownerId: targetId,
  });
  if (allocation.tag === "ownerNotFound") {
    return state;
  }
  const activeEffects = [
    ...allocation.owner.activeEffects.filter((effect) => !replaces(effect)),
    ...replacements(allocation.effectRef),
  ];
  return {
    ...allocation.state,
    combatants: new Map(allocation.state.combatants).set(
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
