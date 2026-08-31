// Owns reconciliation between typed Slow active effects and the Slow-specific
// Action-or-Bonus-Action legality gate. Generic Action and Bonus Action
// resources remain independently owned by the shared action economy.
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

import { slowActivePenaltiesEffects } from "./slow-active-penalties-effects.ts";

export function combatantHasSlowActivePenalties(
  combatant: BattleCreatureState | undefined,
): boolean {
  return slowActivePenaltiesEffects(combatant).length > 0;
}

export function slowActionOrBonusActionTurnResources(
  resources: BattleTurnResources,
  actor: BattleCreatureState | undefined,
): BattleTurnResources {
  return combatantHasSlowActivePenalties(actor)
    ? enableActionOrBonusActionExclusion(resources)
    : disableActionOrBonusActionExclusion(resources);
}

export function battleStateWithReconciledCurrentActorSlowTurnRestriction(
  state: BattleState,
): BattleState {
  const currentTurnResources = slowActionOrBonusActionTurnResources(
    state.currentTurnResources,
    state.combatants.get(currentActing(state.initiative)),
  );
  return currentTurnResources === state.currentTurnResources
    ? state
    : { ...state, currentTurnResources };
}
