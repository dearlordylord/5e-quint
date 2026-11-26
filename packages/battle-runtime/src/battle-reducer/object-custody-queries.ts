// A creature's owned objects and their custody outside the loadout. A leaf
// of reads, so the loadout and hand queries can ask it without the lifecycle
// transitions that change it.
import type {
  BattleGroundObjectState,
  BattleObjectCustody,
  BattleState,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";

/** Custody queries need location kinds, not table-supplied ground geometry. */
export type BattleActorObjectCustodyQuery = ReadonlyMap<
  BattleObjectId,
  Pick<BattleObjectCustody, "kind">
>;
export type BattleObjectCustodyQuery = {
  readonly objectCustody: ReadonlyMap<
    CombatantId,
    BattleActorObjectCustodyQuery
  >;
};

export type BattleEquipmentQuery = BattleObjectCustodyQuery &
  Pick<BattleState, "grapples">;

export function battleObjectIsOnGround(
  state: BattleObjectCustodyQuery,
  actorId: CombatantId,
  objectId: BattleObjectId,
): boolean {
  return state.objectCustody.get(actorId)?.get(objectId)?.kind === "onGround";
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

/** The battle objects of every weapon the character owns: its loadout's, then the rest. */
export function ownedWeaponObjectIds(
  actor: CharacterBattleCreatureState,
): readonly BattleObjectId[] {
  const { weapon, offHandWeapon } = actor.origin.selectedLoadout;
  return [
    ...[weapon?.itemId, offHandWeapon?.itemId].filter(
      (itemId): itemId is BattleObjectId => itemId !== undefined,
    ),
    ...actor.origin.otherOwnedWeaponAttacks.map(
      ({ weaponObjectId }) => weaponObjectId,
    ),
  ];
}
