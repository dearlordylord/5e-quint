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

export type BattleHeldWeaponPickup = {
  readonly interaction: ResolvedBattleObjectInteraction;
  readonly loadoutSlot: "mainWeapon" | "offHandWeapon";
};

export type ResolvedBattleObjectInteraction = {
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly actorSpace: {
    readonly kind: "actorSpace";
    readonly positionId: BattleTablePositionId;
  };
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
        | "positionMismatch"
        | "selectedLoadoutMismatch";
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

export function applyBattleHeldWeaponPickup(
  state: BattleState,
  pickup: BattleHeldWeaponPickup,
): BattleHeldWeaponPickupResult {
  const interaction = pickup.interaction;
  const actor = state.combatants.get(interaction.actorId);
  if (actor === undefined) {
    return {
      tag: "invalid",
      reason: "missingCombatant",
      message: "Battle object pickup requires an actor in this battle.",
    };
  }
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
  const actorGroundObjects = state.groundObjects.get(interaction.actorId);
  const groundObject = actorGroundObjects?.get(interaction.objectId);
  if (groundObject === undefined) {
    return {
      tag: "invalid",
      reason: "objectNotOnGround",
      message: "Battle object pickup requires an object on the ground.",
    };
  }
  if (groundObject.positionId !== interaction.actorSpace.positionId) {
    return {
      tag: "invalid",
      reason: "positionMismatch",
      message: "Battle object pickup must use the object's ground position.",
    };
  }
  const loadoutObject =
    pickup.loadoutSlot === "mainWeapon"
      ? actor.origin.selectedLoadout.weapon
      : actor.origin.selectedLoadout.offHandWeapon;
  if (loadoutObject?.itemId !== interaction.objectId) {
    return {
      tag: "invalid",
      reason: "selectedLoadoutMismatch",
      message:
        "Held-weapon pickup must restore the matching selected weapon loadout slot.",
    };
  }
  const groundObjects = new Map(state.groundObjects);
  const remainingActorGroundObjects = new Map(actorGroundObjects);
  remainingActorGroundObjects.delete(interaction.objectId);
  const [firstRemaining, ...otherRemaining] = remainingActorGroundObjects;
  if (firstRemaining === undefined) {
    groundObjects.delete(interaction.actorId);
  } else {
    groundObjects.set(
      interaction.actorId,
      battleActorGroundObjectsFromEntries([firstRemaining, ...otherRemaining]),
    );
  }
  return {
    tag: "applied",
    state: { ...state, groundObjects },
  };
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
