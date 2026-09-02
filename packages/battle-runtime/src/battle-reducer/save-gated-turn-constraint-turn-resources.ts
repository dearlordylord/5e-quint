// Owns bound effect-state queries, action-economy projection, and state
// reconciliation for admitted save-gated turn constraints. Resolution holes
// and spell-resource spending remain in the higher-level runtime owner.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE

import {
  disableActionOrBonusActionExclusion,
  enableActionOrBonusActionExclusion,
} from "@dnd/shared-algebras/action-economy-algebra";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import type {
  BattleCreatureState,
  BattleState,
  BattleTurnResources,
} from "../battle-state-execution.ts";
import {
  boundSaveGatedTurnConstraintBundleEffect,
  type BoundSaveGatedTurnConstraintBundleEffect,
} from "./spell-modifier-binding.ts";

export function saveGatedTurnConstraintBundleEffects(
  state: BattleState,
  combatant: BattleCreatureState | undefined,
): readonly BoundSaveGatedTurnConstraintBundleEffect[] {
  return combatant === undefined
    ? []
    : combatant.activeEffects.flatMap((effect) => {
        if (effect.kind !== "saveGatedTurnConstraintBundle") {
          return [];
        }
        const boundEffect = boundSaveGatedTurnConstraintBundleEffect(
          state,
          effect,
        );
        return boundEffect === undefined ? [] : [boundEffect];
      });
}

export function combatantHasSaveGatedTurnConstraintBundle(
  state: BattleState,
  combatant: BattleCreatureState | undefined,
): boolean {
  return saveGatedTurnConstraintBundleEffects(state, combatant).length > 0;
}

export function saveGatedTurnConstraintActionOrBonusActionTurnResources(
  state: BattleState,
  resources: BattleTurnResources,
  actor: BattleCreatureState | undefined,
): BattleTurnResources {
  return combatantHasSaveGatedTurnConstraintBundle(state, actor)
    ? enableActionOrBonusActionExclusion(resources)
    : resources;
}

export function battleStateWithReconciledCurrentActorTurnConstraint(
  state: BattleState,
): BattleState {
  const actor = state.combatants.get(currentActing(state.initiative));
  const currentTurnResources = combatantHasSaveGatedTurnConstraintBundle(
    state,
    actor,
  )
    ? enableActionOrBonusActionExclusion(state.currentTurnResources)
    : disableActionOrBonusActionExclusion(state.currentTurnResources);
  return currentTurnResources === state.currentTurnResources
    ? state
    : { ...state, currentTurnResources };
}
