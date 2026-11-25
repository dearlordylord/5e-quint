// KERNEL-COVERAGE: runtime-owner BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";

import type {
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import { zeroHpLifecycleIsTerminal } from "./creature-state-leaves.ts";
import { effectiveWalkSpeed } from "./movement-speed.ts";
import { conditionApplicationPreventedByConditionImmunity } from "./spell-condition-effects-helpers.ts";

/**
 * Whether the actor may give itself the Prone condition now: it uses no
 * action and none of the actor's Speed, but is unavailable while that Speed
 * is 0 (`.references/srd-5.2.1/playing-the-game.md#Dropping-Prone`). This is
 * the runtime side of `MovementRule::dropProne`.
 */
export function dropProneAvailable(
  state: BattleState,
  actor: BattleCreatureState,
): boolean {
  if (
    zeroHpLifecycleIsTerminal(actor) ||
    hasCondition(actor.conditions, "prone") ||
    conditionApplicationPreventedByConditionImmunity(actor, "prone")
  ) {
    return false;
  }
  const speed = effectiveWalkSpeed(state, actor);
  return Number(speed) > 0;
}
