import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";

import type { BattleState } from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { effectiveWalkSpeed } from "./movement-speed.ts";

/**
 * Whether the actor may give itself the Prone condition now: it uses no
 * action and none of the actor's Speed, but is unavailable while that Speed
 * is 0 (`.references/srd-5.2.1/playing-the-game.md#Dropping-Prone`). This is
 * the runtime side of `MovementRule::dropProne`.
 */
export function dropProneAvailable(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || hasCondition(actor.conditions, "prone")) {
    return false;
  }
  const speed = effectiveWalkSpeed(
    state,
    actor,
    state.grapples.some((grapple) => grapple.targetId === actorId),
  );
  return Number(speed) > 0;
}
