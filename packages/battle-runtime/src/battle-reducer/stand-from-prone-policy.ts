import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";

import type { BattleState } from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { saveGatedConditionWithRepeatEffects } from "./staged-condition-repeat-save.ts";
import {
  battleMovementBudgetForActor,
  effectiveWalkSpeed,
} from "./movement-speed.ts";

export function standFromProneCostFeet(
  state: BattleState,
  actorId: CombatantId,
): number | null {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || !hasCondition(actor.conditions, "prone")) {
    return null;
  }
  if (saveGatedConditionWithRepeatEffects(actor).length > 0) {
    return null;
  }
  const speed = effectiveWalkSpeed(
    state,
    actor,
    state.grapples.some((grapple) => grapple.targetId === actorId),
  );
  const cost = Math.floor(Number(speed) / 2);
  const remaining = battleMovementBudgetForActor(state, actorId).remainingFeet;
  return cost <= 0 || Number(remaining) < cost ? null : cost;
}
