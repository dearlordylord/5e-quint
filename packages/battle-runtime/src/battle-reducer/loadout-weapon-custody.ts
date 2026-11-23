// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.ATTACK_WEAPON_CHANGE
//
// Where a character's selected-loadout weapons are during a battle: held,
// sheathed or stowed, or on the ground. SRD 5.2.1 Rules Glossary, "Attack
// [Action]", Equipping and Unequipping Weapons: "Equipping a weapon includes
// drawing it from a sheath or picking it up. Unequipping a weapon includes
// sheathing, stowing, or dropping it." Whether the creature can reach a fallen
// weapon, and where a dropped one lands, are the table's rulings (ASSUMPTIONS.md
// A60 and A63).
import type { HandUse } from "@dnd/shared/types";
import { Match } from "effect";
import {
  ATTACK_WEAPON_CHANGE_KINDS,
  type AttackWeaponChange,
} from "../battle-subjects.ts";
import type {
  BattleActorStowedLoadoutWeapons,
  BattleCreatureState,
  BattleState,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type {
  BattleObjectId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import {
  battleObjectIsOnGround,
  battleStateWithGroundObjects,
  heldWeaponPickupTransition,
  loadoutWeaponIsHeld,
  loadoutWeaponIsStowed,
} from "./battle-object-lifecycle.ts";
import { combatantHandUses } from "./creature-state-leaves.ts";
import { loadoutHandUses } from "@dnd/shared-algebras/armor-class-algebra";

/** A weapon change with the table's facts it needs: where a dropped one lands. */
export type AppliedAttackWeaponChange =
  | {
      readonly kind: Exclude<AttackWeaponChange["kind"], "drop">;
      readonly objectId: BattleObjectId;
    }
  | {
      readonly kind: "drop";
      readonly objectId: BattleObjectId;
      readonly positionId: BattleTablePositionId;
    };

export const LOADOUT_WEAPON_CHANGE_ISSUE_REASONS = [
  "missingCombatant",
  "actorNotCharacter",
  "activeFormWeaponChangeUnsupported",
  "notSelectedLoadoutWeapon",
  "weaponAlreadyHeld",
  "weaponNotHeld",
  "handsOccupied",
] as const;
export type LoadoutWeaponChangeIssueReason =
  (typeof LOADOUT_WEAPON_CHANGE_ISSUE_REASONS)[number];

export type LoadoutWeaponChangeIssue = {
  readonly tag: "invalid";
  readonly reason: LoadoutWeaponChangeIssueReason;
  readonly message: string;
};

export type LoadoutWeaponChangeResult =
  | { readonly tag: "applied"; readonly state: BattleState }
  | LoadoutWeaponChangeIssue;

type LoadoutWeaponSlot = Extract<HandUse, "mainWeapon" | "offWeapon">;

/**
 * Why this character can't make this weapon change now, or null when it can.
 * One admission for discovery and resolution, so Battle never offers a change
 * that it then refuses.
 */
export function loadoutWeaponChangeIssue(
  state: BattleState,
  actorId: CombatantId,
  change: AttackWeaponChange,
): LoadoutWeaponChangeIssue | null {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return issue(
      "missingCombatant",
      "A weapon change requires an actor in this battle.",
    );
  }
  if (!isCharacter(actor)) {
    return issue(
      "actorNotCharacter",
      "A weapon change applies to a character's selected-loadout weapons.",
    );
  }
  if (
    actor.activeEffects.some((effect) => effect.kind === "druidWildShapeForm")
  ) {
    return issue(
      "activeFormWeaponChangeUnsupported",
      "A creature in Wild Shape can't equip or unequip its loadout weapons.",
    );
  }
  const slot = loadoutWeaponSlot(actor, change.objectId);
  if (slot === null) {
    return issue(
      "notSelectedLoadoutWeapon",
      "A weapon change equips or unequips a weapon of the selected loadout.",
    );
  }
  const held = loadoutWeaponIsHeld(state, actorId, change.objectId);
  return Match.value(change.kind).pipe(
    Match.when("equip", () => {
      if (held) {
        return issue("weaponAlreadyHeld", "That weapon is already in hand.");
      }
      return loadoutWeaponHandsAreFree(state, actor, slot)
        ? null
        : issue(
            "handsOccupied",
            "The hands that hold this weapon are holding something else.",
          );
    }),
    Match.whenOr("stow", "drop", () =>
      held
        ? null
        : issue("weaponNotHeld", "Only a weapon in hand can be unequipped."),
    ),
    Match.exhaustive,
  );
}

/** Every weapon change this character can make now. */
export function loadoutWeaponChanges(
  state: BattleState,
  actor: BattleCreatureState,
): readonly AttackWeaponChange[] {
  if (!isCharacter(actor)) return [];
  return selectedLoadoutWeaponIds(actor).flatMap((objectId) =>
    ATTACK_WEAPON_CHANGE_KINDS.map(
      (kind): AttackWeaponChange => ({ kind, objectId }),
    ).filter(
      (change) =>
        loadoutWeaponChangeIssue(state, actor.combatantId, change) === null,
    ),
  );
}

/** The fallen loadout weapons this character can pick back up now. */
export function groundedLoadoutWeaponPickups(
  state: BattleState,
  actor: BattleCreatureState,
): readonly AttackWeaponChange[] {
  return loadoutWeaponChanges(state, actor).filter(
    (change) =>
      change.kind === "equip" &&
      battleObjectIsOnGround(state, actor.combatantId, change.objectId),
  );
}

/**
 * Applies a weapon change that `loadoutWeaponChangeIssue` admits. Equip draws
 * a stowed weapon or picks a fallen one up; stow sheathes or stows a held one;
 * drop lets a held one fall where the table places it.
 */
export function stateWithLoadoutWeaponChange(
  state: BattleState,
  actorId: CombatantId,
  change: AppliedAttackWeaponChange,
): LoadoutWeaponChangeResult {
  const admission = loadoutWeaponChangeIssue(state, actorId, change);
  if (admission !== null) return admission;
  return Match.value(change).pipe(
    Match.when({ kind: "equip" }, ({ objectId }) => {
      if (loadoutWeaponIsStowed(state, actorId, objectId)) {
        return applied(
          withLoadoutWeaponInHand(
            withStowedWeapons(
              state,
              actorId,
              [...(state.stowedLoadoutWeapons.get(actorId) ?? [])].filter(
                (stowed) => stowed !== objectId,
              ),
            ),
            actorId,
            objectId,
          ),
        );
      }
      const pickedUp = heldWeaponPickupTransition(state, { actorId, objectId });
      /* v8 ignore start -- @preserve -- loadoutWeaponChangeIssue has just admitted a loadout weapon that is neither held nor stowed, so it is on the ground. */
      if (pickedUp.tag === "invalid") {
        return issue("weaponNotHeld", pickedUp.message);
      }
      /* v8 ignore stop -- @preserve */
      return applied(
        withLoadoutWeaponInHand(pickedUp.state, actorId, objectId),
      );
    }),
    Match.when({ kind: "stow" }, ({ objectId }) =>
      applied(
        withStowedWeapons(state, actorId, [
          ...(state.stowedLoadoutWeapons.get(actorId) ?? []),
          objectId,
        ]),
      ),
    ),
    Match.when({ kind: "drop" }, ({ objectId, positionId }) => {
      const placed = battleStateWithGroundObjects(state, [
        {
          actorId,
          objectId,
          positionId,
          source: { kind: "attackWeaponChange" },
        },
      ]);
      /* v8 ignore start -- @preserve -- loadoutWeaponChangeIssue has just admitted a held weapon, which is not on the ground. */
      if (placed.tag === "conflict") {
        return issue("weaponNotHeld", placed.message);
      }
      /* v8 ignore stop -- @preserve */
      return applied(placed.state);
    }),
    Match.exhaustive,
  );
}

/** Whether the change has already been applied to this state. */
export function loadoutWeaponChangeIsApplied(
  state: BattleState,
  actorId: CombatantId,
  change: AttackWeaponChange,
): boolean {
  return Match.value(change.kind).pipe(
    Match.when("equip", () =>
      loadoutWeaponIsHeld(state, actorId, change.objectId),
    ),
    Match.when("stow", () =>
      loadoutWeaponIsStowed(state, actorId, change.objectId),
    ),
    Match.when("drop", () =>
      battleObjectIsOnGround(state, actorId, change.objectId),
    ),
    Match.exhaustive,
  );
}

/**
 * The hands a loadout weapon occupies are those its selected loadout's grip
 * gives it, whatever the hand state says now: a spell-created object can
 * take a hand the weapon left and then leave it simply free.
 */
function loadoutWeaponHands(
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

/** Each hand the weapon goes back into must be empty. */
function loadoutWeaponHandsAreFree(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
): boolean {
  const current = combatantHandUses(state, actor, state.grapples);
  const hands = loadoutWeaponHands(actor, slot);
  return hands.length > 0 && hands.every((hand) => current[hand] === "free");
}

/** A weapon back in hand holds the hands its loadout grip gives it. */
function withLoadoutWeaponInHand(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
): BattleState {
  const actor = state.combatants.get(actorId);
  /* v8 ignore next -- @preserve -- loadoutWeaponChangeIssue has just admitted this character's loadout weapon. */
  if (actor === undefined || !isCharacter(actor)) return state;
  const slot = loadoutWeaponSlot(actor, objectId);
  /* v8 ignore next -- @preserve -- the same admission proved the slot. */
  if (slot === null) return state;
  const hands = loadoutWeaponHands(actor, slot);
  const combatants = new Map(state.combatants);
  combatants.set(actorId, {
    ...actor,
    armorClass: {
      ...actor.armorClass,
      ...(hands.includes("left") ? { leftHandUse: slot } : {}),
      ...(hands.includes("right") ? { rightHandUse: slot } : {}),
    },
  });
  return { ...state, combatants };
}

function loadoutWeaponSlot(
  actor: CharacterBattleCreatureState,
  objectId: BattleObjectId,
): LoadoutWeaponSlot | null {
  const { weapon, offHandWeapon } = actor.origin.selectedLoadout;
  if (weapon?.itemId === objectId) return "mainWeapon";
  if (offHandWeapon?.itemId === objectId) return "offWeapon";
  return null;
}

function selectedLoadoutWeaponIds(
  actor: CharacterBattleCreatureState,
): readonly BattleObjectId[] {
  const { weapon, offHandWeapon } = actor.origin.selectedLoadout;
  return [weapon?.itemId, offHandWeapon?.itemId].filter(
    (itemId): itemId is BattleObjectId => itemId !== undefined,
  );
}

function withStowedWeapons(
  state: BattleState,
  actorId: CombatantId,
  stowed: readonly BattleObjectId[],
): BattleState {
  const stowedLoadoutWeapons = new Map(state.stowedLoadoutWeapons);
  if (stowed.length === 0) {
    stowedLoadoutWeapons.delete(actorId);
  } else {
    // Brands are erased at runtime; the length check proves this Set cannot
    // encode the redundant actor-with-no-stowed-weapons state.
    // eslint-disable-next-line no-restricted-syntax -- the length check is the runtime proof required by this erased non-empty-set brand
    const actorStowed = new Set(
      stowed,
    ) as unknown as BattleActorStowedLoadoutWeapons;
    stowedLoadoutWeapons.set(actorId, actorStowed);
  }
  return { ...state, stowedLoadoutWeapons };
}

function isCharacter(
  actor: BattleCreatureState,
): actor is CharacterBattleCreatureState {
  return actor.origin.kind === "character";
}

function applied(state: BattleState): LoadoutWeaponChangeResult {
  return { tag: "applied", state };
}

function issue(
  reason: LoadoutWeaponChangeIssueReason,
  message: string,
): LoadoutWeaponChangeIssue {
  return { tag: "invalid", reason, message };
}
