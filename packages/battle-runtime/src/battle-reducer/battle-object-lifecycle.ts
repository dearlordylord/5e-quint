import { loadoutHandUses } from "@dnd/shared-algebras/armor-class-algebra";
import type { HandUse } from "@dnd/shared/types";
import { combatantHandUses } from "./creature-state-leaves.ts";
import { battleObjectIsOnGround } from "./object-custody-queries.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.OBJECT_INTERACTION_COST
import type {
  BattleDroppedObjectSource,
  BattleGroundObjectState,
  BattleCreatureState,
  BattleActorObjectCustody,
  BattleObjectCustody,
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

/** A selected-loadout weapon on the ground that its owner picks up. */
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
        | "notSelectedLoadoutWeapon"
        | "handsOccupied";
      readonly message: string;
    };

export function battleStateWithGroundObjects(
  state: BattleState,
  placements: readonly BattleGroundObjectPlacement[],
): BattleGroundObjectPlacementResult {
  let placed = state;
  for (const { actorId, objectId, ...groundObject } of placements) {
    if (placed.objectCustody.get(actorId)?.has(objectId) === true) {
      return {
        tag: "conflict",
        actorId,
        objectId,
        message: "Battle object is already on the ground or stowed.",
      };
    }
    placed = battleStateWithObjectCustody(placed, actorId, objectId, {
      kind: "onGround",
      ...groundObject,
    });
  }
  return { tag: "applied", state: placed };
}

/** Every object on the ground, with its owner. */
export function battleGroundObjectPlacements(
  state: BattleState,
): readonly BattleGroundObjectPlacement[] {
  return [...state.objectCustody].flatMap(([actorId, objects]) =>
    [...objects].flatMap(([objectId, custody]) =>
      custody.kind === "onGround"
        ? [
            {
              actorId,
              objectId,
              positionId: custody.positionId,
              source: custody.source,
            },
          ]
        : [],
    ),
  );
}

/**
 * The state with one of an actor's objects in this custody, or, for null,
 * back where its loadout puts it. A new entry comes first.
 */
export function battleStateWithObjectCustody(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
  custody: BattleObjectCustody | null,
): BattleState {
  const others = [...(state.objectCustody.get(actorId) ?? [])];
  const index = others.findIndex(([id]) => id === objectId);
  const entries =
    custody === null
      ? others.filter(([id]) => id !== objectId)
      : index === -1
        ? [[objectId, custody] as const, ...others]
        : others.map((entry, at) =>
            at === index ? ([objectId, custody] as const) : entry,
          );
  const objectCustody = new Map(state.objectCustody);
  const [first, ...rest] = entries;
  if (first === undefined) {
    objectCustody.delete(actorId);
  } else {
    objectCustody.set(
      actorId,
      battleActorObjectCustodyFromEntries([first, ...rest]),
    );
  }
  return { ...state, objectCustody };
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
  return {
    tag: "applied",
    state: battleStateWithoutGroundObject(
      state,
      pickup.actorId,
      pickup.objectId,
    ),
  };
}

/** The state with one of an actor's objects no longer on the ground. */
export function battleStateWithoutGroundObject(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
): BattleState {
  return battleObjectIsOnGround(state, actorId, objectId)
    ? battleStateWithObjectCustody(state, actorId, objectId, null)
    : state;
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
  const slot = loadoutWeaponSlot(actor, objectId);
  if (slot === null) {
    return {
      tag: "invalid",
      reason: "notSelectedLoadoutWeapon",
      message:
        "Held-weapon pickup restores only a weapon of the selected loadout.",
    };
  }
  if (!loadoutWeaponHandsAreFree(state, actor, slot)) {
    return {
      tag: "invalid",
      reason: "handsOccupied",
      message:
        "Held-weapon pickup requires every hand of its selected loadout slot to be free.",
    };
  }
  return null;
}

/** The hand use a selected-loadout weapon has in its loadout. */
export type LoadoutWeaponSlot = Extract<HandUse, "mainWeapon" | "offWeapon">;

/** Which loadout slot this weapon fills, or null when it isn't a loadout weapon. */
export function loadoutWeaponSlot(
  actor: CharacterBattleCreatureState,
  objectId: BattleObjectId,
): LoadoutWeaponSlot | null {
  const { weapon, offHandWeapon } = actor.origin.selectedLoadout;
  if (weapon?.itemId === objectId) return "mainWeapon";
  if (offHandWeapon?.itemId === objectId) return "offWeapon";
  return null;
}

/**
 * The hands a loadout weapon occupies are those its selected loadout's grip
 * gives it, whatever the hand state says now: a spell-created object can
 * take a hand the weapon left and then leave it simply free.
 */
export function loadoutWeaponHands(
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
): readonly ("left" | "right")[] {
  const { shield, offHandWeapon, weapon } = actor.origin.selectedLoadout;
  const loadout = loadoutHandUses({
    holdsShield: shield !== undefined,
    holdsOffHandWeapon: offHandWeapon !== undefined,
    mainWeaponGrip: weapon?.grip,
  });
  return (
    [
      ["left", loadout.leftHandUse],
      ["right", loadout.rightHandUse],
    ] as const
  ).flatMap(([hand, use]) => (use === slot ? [hand] : []));
}

/**
 * Whether a loadout weapon can go back in hand: its loadout gives it at least
 * one hand, and every such hand is empty.
 */
export function loadoutWeaponHandsAreFree(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
): boolean {
  const current = combatantHandUses(state, actor, state.grapples);
  const hands = loadoutWeaponHands(actor, slot);
  return hands.length > 0 && hands.every((hand) => current[hand] === "free");
}

function battleActorObjectCustodyFromEntries(
  entries: readonly [
    readonly [BattleObjectId, BattleObjectCustody],
    ...ReadonlyArray<readonly [BattleObjectId, BattleObjectCustody]>,
  ],
): BattleActorObjectCustody {
  // Brands are erased at runtime; the non-empty tuple proves this Map cannot
  // encode the redundant actor-with-no-object-custody state.
  // eslint-disable-next-line no-restricted-syntax -- the tuple is the runtime proof required by this erased non-empty-map brand
  return new Map(entries) as unknown as BattleActorObjectCustody;
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
