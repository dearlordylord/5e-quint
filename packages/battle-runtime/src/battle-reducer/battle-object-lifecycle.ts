import type { CharacterBattleLoadoutRef } from "../character-creature-execution-facts.ts";
import { loadoutHandUses } from "@dnd/shared-algebras/armor-class-algebra";
import type { WeaponGrip } from "@dnd/shared/types";
import { combatantHandUses } from "./creature-state-leaves.ts";
import { battleObjectIsOnGround } from "./object-custody-queries.ts";
// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.OBJECT_INTERACTION_COST
import type {
  BattleDroppedObjectSource,
  BattleGroundObjectState,
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
import type { LoadoutWeaponSlot } from "../battle-subjects.ts";

export type BattleGroundObjectPlacement = BattleGroundObjectState & {
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

/** Which loadout slot this weapon fills, or null when it isn't a loadout weapon. */
export function loadoutWeaponSlot(
  loadout: CharacterBattleLoadoutRef,
  objectId: BattleObjectId,
): LoadoutWeaponSlot | null {
  const { weapon, offHandWeapon } = loadout;
  if (weapon?.itemId === objectId) return "mainWeapon";
  if (offHandWeapon?.itemId === objectId) return "offWeapon";
  return null;
}

/**
 * The hands a weapon in this hand slot holds when the main weapon has this
 * grip (or there is none): the main weapon takes the right hand, and the left
 * too with a two-handed grip; an off-hand weapon takes the left hand unless a
 * two-handed main weapon holds it.
 */
export function weaponSlotHands(
  slot: LoadoutWeaponSlot,
  mainWeaponGrip: WeaponGrip | undefined,
): readonly ("left" | "right")[] {
  const loadout = loadoutHandUses({
    holdsShield: false,
    holdsOffHandWeapon: slot === "offWeapon",
    mainWeaponGrip,
  });
  return (
    [
      ["left", loadout.leftHandUse],
      ["right", loadout.rightHandUse],
    ] as const
  ).flatMap(([hand, use]) => (use === slot ? [hand] : []));
}

/**
 * Whether a weapon can go in these hands: it has at least one, and every one
 * is empty.
 */
export function weaponHandsAreFree(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  hands: readonly ("left" | "right")[],
): boolean {
  const current = combatantHandUses(state, actor, state.grapples);
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
