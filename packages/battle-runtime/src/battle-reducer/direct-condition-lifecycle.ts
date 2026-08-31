// Direct spell-owned condition lifecycle composite transition.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE

import { battleCreatureWithSpellActiveEffects } from "../active-effect/lifecycle.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleExecutableSpellInvocation,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../effect-execution-ref.ts";
import {
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  conditionHadNonSpellSourceBeforeSpellEffect,
  conditionsAfterExpiringSpellConditionEffects,
} from "./spell-condition-effects-helpers.ts";

type DirectConditionSpellInvocation = Extract<
  BattleExecutableSpellInvocation,
  { readonly procedure: "directCondition" }
>;

type TargetActionEndedSpellConditionEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "targetActionEndedSpellCondition" }
>;

export function applyDirectConditionSpellEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: DirectConditionSpellInvocation,
): BattleState {
  return targetIds.reduce<BattleState>((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const replacing = target.activeEffects.filter((effect) =>
      sameDirectConditionSpellEffect(
        effect,
        actorId,
        invocation.sourceProcedureRef,
        invocation.activeEffect.condition,
      ),
    );
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        ...invocation.activeEffect,
        sourceProcedureRef: invocation.sourceProcedureRef,
        conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
          target,
          invocation.activeEffect.condition,
        ),
      },
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) => !replacing.includes(effect),
      ),
      allocation.effect,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
      ),
    };
  }, state);
}

export function battleStateAfterDirectConditionTargetActionEarlyEndForActor(
  state: BattleState,
  actorId: CombatantId,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  const targetActionConditionSources = actor.activeEffects
    .filter(
      (effect): effect is TargetActionEndedSpellConditionEffect =>
        effect.kind === "targetActionEndedSpellCondition",
    )
    .reduce<
      readonly TargetActionEndedSpellConditionEffect[]
    >((sources, effect) => (sources.some((source) => sameTargetActionConditionSource(effect, source)) ? sources : [...sources, effect]), []);
  return targetActionConditionSources.reduce(
    battleStateAfterTargetActionConditionSourceEarlyEnd,
    state,
  );
}

function sameDirectConditionSpellEffect(
  effect: BattleActiveEffect,
  sourceCombatantId: CombatantId,
  sourceProcedureRef: DirectConditionSpellInvocation["sourceProcedureRef"],
  condition: DirectConditionSpellInvocation["activeEffect"]["condition"],
): boolean {
  return (
    effect.kind === "targetActionEndedSpellCondition" &&
    effect.sourceProcedureRef === sourceProcedureRef &&
    effect.sourceCombatantId === sourceCombatantId &&
    effect.condition === condition
  );
}

function sameTargetActionConditionSource(
  effect: BattleActiveEffect,
  source: TargetActionEndedSpellConditionEffect,
): boolean {
  return (
    effect.kind === "targetActionEndedSpellCondition" &&
    effect.sourceCombatantId === source.sourceCombatantId &&
    effect.sourceProcedureRef === source.sourceProcedureRef
  );
}

function battleStateAfterTargetActionConditionSourceEarlyEnd(
  state: BattleState,
  source: TargetActionEndedSpellConditionEffect,
): BattleState {
  const combatants = new Map(
    [...state.combatants].map(([combatantId, combatant]) => {
      const expiringEffects = combatant.activeEffects.filter((effect) =>
        sameTargetActionConditionSource(effect, source),
      );
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !sameTargetActionConditionSource(effect, source),
      );
      return [
        combatantId,
        activeEffects.length === combatant.activeEffects.length
          ? combatant
          : battleCreatureWithoutExpiringSpellEffects(
              combatant,
              activeEffects,
              expiringEffects,
            ),
      ] as const;
    }),
  );
  return {
    ...state,
    combatants: combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
      combatants,
      {
        sourceCombatantId: source.sourceCombatantId,
        sourceProcedureRef: source.sourceProcedureRef,
      },
    ),
  };
}

function battleCreatureWithoutExpiringSpellEffects(
  combatant: BattleCreatureState,
  activeEffects: readonly BattleActiveEffect[],
  expiringEffects: readonly BattleActiveEffect[],
): BattleCreatureState {
  return combatant.positiveHpUnconscious === null
    ? {
        ...combatant,
        activeEffects,
        conditions: conditionsAfterExpiringSpellConditionEffects(
          combatant.conditions,
          activeEffects,
          expiringEffects,
        ),
      }
    : { ...combatant, activeEffects };
}
