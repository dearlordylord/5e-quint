// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.OBJECT_INTERACTION_COST
import type { CharacterBattleLoadoutRef } from "../character-creature-execution-facts.ts";
import type {
  BattleDroppedObjectSource,
  BattleGroundObjectState,
  BattleCreatureState,
  BattleActorGroundObjects,
  BattleState,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type {
  BattleObjectId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";

export type BattleGroundObjectPlacement = BattleGroundObjectState & {
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
};

/** A selected-loadout weapon on the ground that its owner can pick up. */
export type BattleHeldWeaponPickup = {
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
};

export type BattleGroundObjectPlacementResult =
  | { readonly tag: "applied"; readonly state: BattleState }
  | {
      readonly tag: "conflict";
      readonly actorId: CombatantId;
      readonly objectId: BattleObjectId;
      readonly message: string;
    };

export type BattleHeldWeaponPickupResult =
  | { readonly tag: "applied"; readonly state: BattleState }
  | {
      readonly tag: "invalid";
      readonly reason:
        | "missingCombatant"
        | "actorNotCharacter"
        | "activeFormPickupUnsupported"
        | "objectNotOnGround"
        | "notSelectedLoadoutWeapon";
      readonly message: string;
    };

export function battleStateWithGroundObjects(
  state: BattleState,
  placements: readonly BattleGroundObjectPlacement[],
): BattleGroundObjectPlacementResult {
  if (placements.length === 0) return { tag: "applied", state };
  const groundObjects = new Map(state.groundObjects);
  for (const { actorId, objectId, ...groundObject } of placements) {
    const actorGroundObjects = new Map(groundObjects.get(actorId) ?? []);
    if (actorGroundObjects.has(objectId)) {
      return {
        tag: "conflict",
        actorId,
        objectId,
        message: "Battle object is already on the ground.",
      };
    }
    groundObjects.set(
      actorId,
      battleActorGroundObjectsFromEntries([
        [objectId, groundObject],
        ...actorGroundObjects,
      ]),
    );
  }
  return { tag: "applied", state: { ...state, groundObjects } };
}

export function characterEffectiveLoadout(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): CharacterBattleLoadoutRef {
  return characterEffectiveLoadoutFromOrigin(
    state,
    actor.combatantId,
    actor.origin,
  );
}

export function characterEffectiveLoadoutFromOrigin(
  state: BattleState,
  actorId: CombatantId,
  origin: CharacterBattleCreatureState["origin"],
): CharacterBattleLoadoutRef {
  const selected = origin.selectedLoadout;
  const groundObjects = state.groundObjects.get(actorId);
  return {
    ...(selected.armor === undefined ||
    groundObjects?.has(selected.armor.itemId) === true
      ? {}
      : { armor: selected.armor }),
    ...(selected.shield === undefined ||
    groundObjects?.has(selected.shield.itemId) === true
      ? {}
      : { shield: selected.shield }),
    ...(selected.weapon === undefined ||
    groundObjects?.has(selected.weapon.itemId) === true
      ? {}
      : { weapon: selected.weapon }),
    ...(selected.offHandWeapon === undefined ||
    groundObjects?.has(selected.offHandWeapon.itemId) === true
      ? {}
      : { offHandWeapon: selected.offHandWeapon }),
  };
}

export function battleObjectIsOnGround(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
): boolean {
  return state.groundObjects.get(actorId)?.has(objectId) === true;
}

/**
 * Puts a fallen selected-loadout weapon back in its owner's hand. The
 * caller charges the object interaction; the table decides whether the
 * creature can reach the object, by taking the pickup only when it can
 * (ASSUMPTIONS.md A60).
 */
export function heldWeaponPickupTransition(
  state: BattleState,
  pickup: BattleHeldWeaponPickup,
): BattleHeldWeaponPickupResult {
  const actor = state.combatants.get(pickup.actorId);
  if (actor === undefined) {
    return {
      tag: "invalid",
      reason: "missingCombatant",
      message: "Battle object pickup requires an actor in this battle.",
    };
  }
  const issue = heldWeaponPickupIssue(state, actor, pickup.objectId);
  if (issue !== null) return issue;
  const actorGroundObjects = state.groundObjects.get(pickup.actorId);
  /* v8 ignore start -- @preserve -- heldWeaponPickupIssue has just proved the object is on this actor's ground. */
  if (actorGroundObjects === undefined) {
    return OBJECT_NOT_ON_GROUND;
  }
  /* v8 ignore stop -- @preserve */
  const groundObjects = new Map(state.groundObjects);
  const remainingActorGroundObjects = new Map(actorGroundObjects);
  remainingActorGroundObjects.delete(pickup.objectId);
  const [firstRemaining, ...otherRemaining] = remainingActorGroundObjects;
  if (firstRemaining === undefined) {
    groundObjects.delete(pickup.actorId);
  } else {
    groundObjects.set(
      pickup.actorId,
      battleActorGroundObjectsFromEntries([firstRemaining, ...otherRemaining]),
    );
  }
  return {
    tag: "applied",
    state: { ...state, groundObjects },
  };
}

const OBJECT_NOT_ON_GROUND = {
  tag: "invalid",
  reason: "objectNotOnGround",
  message: "Battle object pickup requires an object on the ground.",
} as const satisfies BattleHeldWeaponPickupResult;

/**
 * Why this actor can't pick this weapon back up, or null when it can. One
 * admission for discovery and the transition, so Battle never offers a pickup
 * that it then refuses. Whether the creature can reach the object is the
 * table's ruling (ASSUMPTIONS.md A60).
 */
function heldWeaponPickupIssue(
  state: BattleState,
  actor: BattleCreatureState,
  objectId: BattleObjectId,
): Extract<BattleHeldWeaponPickupResult, { readonly tag: "invalid" }> | null {
  if (!battleObjectLifecycleActorIsCharacter(actor)) {
    return {
      tag: "invalid",
      reason: "actorNotCharacter",
      message: "Battle loadout object pickup requires a character actor.",
    };
  }
  if (
    actor.activeEffects.some((effect) => effect.kind === "druidWildShapeForm")
  ) {
    return {
      tag: "invalid",
      reason: "activeFormPickupUnsupported",
      message:
        "This narrow held-weapon restoration operation does not support pickup while Wild Shape is active.",
    };
  }
  if (!battleObjectIsOnGround(state, actor.combatantId, objectId)) {
    return OBJECT_NOT_ON_GROUND;
  }
  if (!selectedLoadoutWeaponIds(actor).includes(objectId)) {
    return {
      tag: "invalid",
      reason: "notSelectedLoadoutWeapon",
      message:
        "Held-weapon pickup restores only a weapon of the selected loadout.",
    };
  }
  return null;
}

/** The fallen selected-loadout weapons the actor can pick back up. */
export function groundedHeldWeaponPickups(
  state: BattleState,
  actor: BattleCreatureState,
): readonly BattleHeldWeaponPickup[] {
  if (!battleObjectLifecycleActorIsCharacter(actor)) return [];
  return selectedLoadoutWeaponIds(actor)
    .filter(
      (objectId) => heldWeaponPickupIssue(state, actor, objectId) === null,
    )
    .map((objectId) => ({ actorId: actor.combatantId, objectId }));
}

function selectedLoadoutWeaponIds(
  actor: CharacterBattleCreatureState,
): readonly BattleObjectId[] {
  const { weapon, offHandWeapon } = actor.origin.selectedLoadout;
  return [weapon?.itemId, offHandWeapon?.itemId].filter(
    (itemId): itemId is BattleObjectId => itemId !== undefined,
  );
}

function battleActorGroundObjectsFromEntries(
  entries: readonly [
    readonly [BattleObjectId, BattleGroundObjectState],
    ...ReadonlyArray<readonly [BattleObjectId, BattleGroundObjectState]>,
  ],
): BattleActorGroundObjects {
  // Brands are erased at runtime; the non-empty tuple proves this Map cannot
  // encode the redundant actor-with-no-ground-objects state.
  // eslint-disable-next-line no-restricted-syntax -- the tuple is the runtime proof required by this erased non-empty-map brand
  return new Map(entries) as unknown as BattleActorGroundObjects;
}

function battleObjectLifecycleActorIsCharacter(
  actor: BattleCreatureState,
): actor is CharacterBattleCreatureState {
  return actor.origin.kind === "character";
}

export function wildShapeGroundObjectPlacement(input: {
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly positionId: BattleTablePositionId;
  readonly source: Extract<
    BattleDroppedObjectSource,
    { readonly kind: "druidWildShape" }
  >;
}): BattleGroundObjectPlacement {
  return input;
}
