// Where a creature's object is when it isn't where its loadout puts it. A leaf
// of reads, so the loadout and hand queries can ask it without the lifecycle
// transitions that change it.
import type {
  BattleGroundObjectState,
  BattleState,
} from "../battle-state-execution.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";

export function battleObjectIsOnGround(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
): boolean {
  return battleGroundObjectState(state, actorId, objectId) !== undefined;
}

/** Where one of an actor's objects lies, if it is on the ground. */
export function battleGroundObjectState(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
): BattleGroundObjectState | undefined {
  const custody = state.objectCustody.get(actorId)?.get(objectId);
  return custody?.kind === "onGround"
    ? { positionId: custody.positionId, source: custody.source }
    : undefined;
}
