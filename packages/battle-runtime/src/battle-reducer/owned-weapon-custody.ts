// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.ATTACK_WEAPON_CHANGE
//
// Where a character's owned weapons are during a battle: held in a hand slot
// of its loadout, sheathed or stowed, or on the ground. SRD 5.2.1 Rules
// Glossary, "Attack [Action]", Equipping and Unequipping Weapons: "Equipping a
// weapon includes drawing it from a sheath or picking it up. Unequipping a
// weapon includes sheathing, stowing, or dropping it." Whether the creature
// can reach a fallen weapon, and where a dropped one lands, are the table's
// rulings (ASSUMPTIONS.md A60 and A63).
//
// The selected loadout names the weapon in each hand slot. A slot's weapon is
// held unless its custody says it is stowed or on the ground; every other
// owned weapon is carried unless it is on the ground. Equipping a weapon into
// a slot whose weapon isn't in hand moves that weapon out of the loadout, and
// moves the attack bindings with them, so each owned weapon keeps exactly one
// binding (ASSUMPTIONS.md A63).
import { Match } from "effect";
import type { HandUse, WeaponGrip } from "@dnd/shared/types";
import type { UnitId } from "@dnd/shared/game-facts";
import {
  LOADOUT_WEAPON_SLOTS,
  type AttackWeaponChange,
  type LoadoutWeaponSlot,
} from "../battle-subjects.ts";
import type { BoundCharacterWeaponAttackActionOption } from "../battle-action-options.ts";
import type { CharacterBattleLoadoutRef } from "../character-creature-execution-facts.ts";
import type {
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
  battleStateWithGroundObjects,
  battleStateWithObjectCustody,
  loadoutWeaponSlot,
  weaponHandsAreFree,
  weaponSlotHands,
} from "./battle-object-lifecycle.ts";
import { battleObjectIsOnGround } from "./object-custody-queries.ts";
import { isCharacterBattleCreatureState } from "./creature-state-queries.ts";
import { combatantActiveDruidWildShape } from "./creature-state-leaves.ts";
import {
  loadoutWeaponIsHeld,
  loadoutWeaponIsStowed,
} from "./character-effective-loadout.ts";

/** A weapon change with the table's facts it needs: where a dropped one lands. */
export type AppliedAttackWeaponChange =
  | Exclude<AttackWeaponChange, { readonly kind: "drop" }>
  | {
      readonly kind: "drop";
      readonly objectId: BattleObjectId;
      readonly positionId: BattleTablePositionId;
    };

export const OWNED_WEAPON_CHANGE_ISSUE_REASONS = [
  "missingCombatant",
  "actorNotCharacter",
  "activeFormWeaponChangeUnsupported",
  "notOwnedWeapon",
  "weaponAlreadyHeld",
  "weaponNotHeld",
  "slotWeaponHeld",
  "weaponAttackUnknown",
  "noMainWeaponInHand",
  "twoHandedWeaponInOffHand",
  "handsOccupied",
] as const;
export type OwnedWeaponChangeIssueReason =
  (typeof OWNED_WEAPON_CHANGE_ISSUE_REASONS)[number];

export type OwnedWeaponChangeIssue = {
  readonly tag: "invalid";
  readonly reason: OwnedWeaponChangeIssueReason;
  readonly message: string;
};

export type OwnedWeaponChangeResult =
  | { readonly tag: "applied"; readonly state: BattleState }
  | OwnedWeaponChangeIssue;

/**
 * Why this character can't make this weapon change now, or null when it can.
 * One admission for discovery and resolution, so Battle never offers a change
 * that it then refuses.
 */
export function ownedWeaponChangeIssue(
  state: BattleState,
  actorId: CombatantId,
  change: AttackWeaponChange,
): OwnedWeaponChangeIssue | null {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return issue(
      "missingCombatant",
      "A weapon change requires an actor in this battle.",
    );
  }
  if (!isCharacterBattleCreatureState(actor)) {
    return issue(
      "actorNotCharacter",
      "A weapon change applies to a character's owned weapons.",
    );
  }
  if (combatantActiveDruidWildShape(actor) !== null) {
    return issue(
      "activeFormWeaponChangeUnsupported",
      "A creature in Wild Shape can't equip or unequip its weapons.",
    );
  }
  if (!ownedWeaponIds(actor).includes(change.objectId)) {
    return issue(
      "notOwnedWeapon",
      "A weapon change equips or unequips a weapon the character owns.",
    );
  }
  const held = ownedWeaponIsHeld(state, actor, change.objectId);
  return Match.value(change).pipe(
    Match.when({ kind: "equip" }, ({ objectId, slot }) =>
      held
        ? issue("weaponAlreadyHeld", "That weapon is already in hand.")
        : equipIssue(state, actor, objectId, slot),
    ),
    Match.when({ kind: "stow" }, () => unequipIssue(held)),
    Match.when({ kind: "drop" }, () => unequipIssue(held)),
    Match.exhaustive,
  );
}

function unequipIssue(held: boolean): OwnedWeaponChangeIssue | null {
  return held
    ? null
    : issue("weaponNotHeld", "Only a weapon in hand can be unequipped.");
}

/**
 * Why this weapon, not in hand, can't go in this slot. The slot's own weapon
 * goes back with the loadout's grip. Another weapon needs Battle to know its
 * attack, and the slot's weapon, if any, to be out of hand and known too, so
 * that it can leave the loadout. Battle's Attack action attacks with the main
 * weapon, and the off hand holds the second weapon of the Light property's
 * Bonus Action attack, so another weapon goes in the off hand only beside a
 * main weapon in hand. A Two-Handed weapon can't be held in the off hand, and
 * the hands the slot gives the weapon must be free.
 */
function equipIssue(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  objectId: BattleObjectId,
  slot: LoadoutWeaponSlot,
): OwnedWeaponChangeIssue | null {
  const plan = equipPlan(state, actor, objectId, slot);
  if (plan.tag === "invalid") return plan;
  return weaponHandsAreFree(state, actor, plan.hands)
    ? null
    : issue(
        "handsOccupied",
        "The hands that hold this weapon are holding something else.",
      );
}

/** How an admitted equip puts the weapon in its slot. */
type EquipPlan = {
  readonly tag: "planned";
  readonly hands: readonly ("left" | "right")[];
  readonly grip: WeaponGrip | undefined;
  /** The weapon's binding when it comes from outside this slot. */
  readonly moved: BoundCharacterWeaponAttackActionOption | undefined;
};

function equipPlan(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  objectId: BattleObjectId,
  slot: LoadoutWeaponSlot,
): EquipPlan | OwnedWeaponChangeIssue {
  if (loadoutWeaponSlot(actor, objectId) === slot) {
    // The slot's own weapon goes back as the loadout holds it: its hands
    // follow the loadout's main grip, whether or not the main weapon is in
    // hand, so a two-handed main weapon keeps the off hand.
    const loadoutMainGrip = actor.origin.selectedLoadout.weapon?.grip;
    const grip = Match.value(slot).pipe(
      Match.when("mainWeapon", () => loadoutMainGrip),
      Match.when("offWeapon", () => undefined),
      Match.exhaustive,
    );
    return planned(slot, loadoutMainGrip, grip, undefined);
  }
  const binding = ownedWeaponAttack(actor, objectId);
  if (binding === undefined) {
    return issue(
      "weaponAttackUnknown",
      "Battle can't tell what this weapon is, so it stays in its own slot.",
    );
  }
  const refusal =
    slotVacancyIssue(state, actor, slot) ??
    slotFitIssue(state, actor, slot, binding);
  if (refusal !== null) return refusal;
  const grip = enteringGrip(slot, binding);
  return planned(slot, mainGripBeside(state, actor, slot, grip), grip, binding);
}

/** The plan to put a weapon in a slot beside a main weapon with this grip. */
function planned(
  slot: LoadoutWeaponSlot,
  mainWeaponGrip: WeaponGrip | undefined,
  grip: WeaponGrip | undefined,
  moved: BoundCharacterWeaponAttackActionOption | undefined,
): EquipPlan {
  return {
    tag: "planned",
    hands: weaponSlotHands(slot, mainWeaponGrip),
    grip,
    moved,
  };
}

/** Why the slot's own weapon can't leave it for another: it's in hand, or unknown. */
function slotVacancyIssue(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
): OwnedWeaponChangeIssue | null {
  const occupant = slotWeapon(actor.origin.selectedLoadout, slot);
  if (occupant === undefined) return null;
  if (loadoutWeaponIsHeld(state, actor.combatantId, occupant.itemId)) {
    return issue(
      "slotWeaponHeld",
      "That hand slot's weapon is still in hand; unequip it first.",
    );
  }
  return slotAttack(actor, slot) === undefined
    ? issue(
        "weaponAttackUnknown",
        "Battle can't tell what that slot's weapon is, so it stays in the loadout.",
      )
    : null;
}

/** Why another weapon can't go in the off hand now. The main slot takes any. */
function slotFitIssue(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
  binding: BoundCharacterWeaponAttackActionOption,
): OwnedWeaponChangeIssue | null {
  return Match.value(slot).pipe(
    Match.when("mainWeapon", () => null),
    Match.when("offWeapon", () => offHandFitIssue(state, actor, binding)),
    Match.exhaustive,
  );
}

function offHandFitIssue(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  binding: BoundCharacterWeaponAttackActionOption,
): OwnedWeaponChangeIssue | null {
  if (mainGripBeside(state, actor, "offWeapon", undefined) === undefined) {
    return issue(
      "noMainWeaponInHand",
      "A weapon goes in the off hand beside a main weapon in hand.",
    );
  }
  return isTwoHanded(binding)
    ? issue(
        "twoHandedWeaponInOffHand",
        "A Two-Handed weapon can't be held in the off hand.",
      )
    : null;
}

/** The grip another weapon goes in the main hand with: two hands for a Two-Handed one. */
function enteringGrip(
  slot: LoadoutWeaponSlot,
  binding: BoundCharacterWeaponAttackActionOption,
): WeaponGrip | undefined {
  return Match.value(slot).pipe(
    Match.when("mainWeapon", () =>
      isTwoHanded(binding) ? ("two_handed" as const) : ("one_handed" as const),
    ),
    Match.when("offWeapon", () => undefined),
    Match.exhaustive,
  );
}

function isTwoHanded(binding: BoundCharacterWeaponAttackActionOption): boolean {
  return binding.weapon.properties.some(({ kind }) => kind === "two_handed");
}

/**
 * The main weapon's grip that decides the slot's hands: the grip it goes in
 * with for the main slot, and for the off slot the grip of a main weapon
 * still in hand.
 */
function mainGripBeside(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
  grip: WeaponGrip | undefined,
): WeaponGrip | undefined {
  return Match.value(slot).pipe(
    Match.when("mainWeapon", () => grip),
    Match.when("offWeapon", () => heldMainWeaponGrip(state, actor)),
    Match.exhaustive,
  );
}

function heldMainWeaponGrip(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): WeaponGrip | undefined {
  const main = actor.origin.selectedLoadout.weapon;
  return main !== undefined &&
    loadoutWeaponIsHeld(state, actor.combatantId, main.itemId)
    ? main.grip
    : undefined;
}

/** Every weapon change this character can make now. */
export function ownedWeaponChanges(
  state: BattleState,
  actor: BattleCreatureState,
): readonly AttackWeaponChange[] {
  if (!isCharacterBattleCreatureState(actor)) return [];
  return ownedWeaponIds(actor).flatMap((objectId) =>
    weaponChangesOf(objectId).filter(
      (change) =>
        ownedWeaponChangeIssue(state, actor.combatantId, change) === null,
    ),
  );
}

/** Every weapon change that names this weapon, possible now or not. */
function weaponChangesOf(
  objectId: BattleObjectId,
): readonly AttackWeaponChange[] {
  return [
    ...LOADOUT_WEAPON_SLOTS.map(
      (slot): AttackWeaponChange => ({ kind: "equip", objectId, slot }),
    ),
    { kind: "stow", objectId },
    { kind: "drop", objectId },
  ];
}

/**
 * The equips that pick this character's fallen loadout weapons back up into
 * their own slots, which it can make now.
 */
export function groundedLoadoutWeaponPickups(
  state: BattleState,
  actor: BattleCreatureState,
): readonly Extract<AttackWeaponChange, { readonly kind: "equip" }>[] {
  if (!isCharacterBattleCreatureState(actor)) return [];
  return ownedWeaponChanges(state, actor).flatMap((change) =>
    change.kind === "equip" &&
    loadoutWeaponSlot(actor, change.objectId) === change.slot &&
    battleObjectIsOnGround(state, actor.combatantId, change.objectId)
      ? [change]
      : [],
  );
}

/**
 * Applies a weapon change that `ownedWeaponChangeIssue` admits. Equip draws a
 * carried weapon or picks a fallen one up into its slot; stow sheathes or
 * stows a held one, and drop lets a held one fall where the table places it.
 */
export function stateWithOwnedWeaponChange(
  state: BattleState,
  actorId: CombatantId,
  change: AppliedAttackWeaponChange,
): OwnedWeaponChangeResult {
  const admission = ownedWeaponChangeIssue(state, actorId, change);
  if (admission !== null) return admission;
  return Match.value(change).pipe(
    Match.when({ kind: "equip" }, ({ objectId, slot }) =>
      equippedWeapon(state, actorId, objectId, slot),
    ),
    Match.when({ kind: "stow" }, ({ objectId }) =>
      applied(
        battleStateWithObjectCustody(state, actorId, objectId, {
          kind: "stowed",
        }),
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
      /* v8 ignore start -- @preserve -- ownedWeaponChangeIssue has just admitted a held weapon, which is not on the ground. */
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
export function ownedWeaponChangeIsApplied(
  state: BattleState,
  actorId: CombatantId,
  change: AttackWeaponChange,
): boolean {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || !isCharacterBattleCreatureState(actor))
    return false;
  return Match.value(change).pipe(
    Match.when(
      { kind: "equip" },
      ({ objectId, slot }) =>
        loadoutWeaponSlot(actor, objectId) === slot &&
        loadoutWeaponIsHeld(state, actorId, objectId),
    ),
    Match.when({ kind: "stow" }, ({ objectId }) =>
      loadoutWeaponIsStowed(state, actorId, objectId),
    ),
    Match.when({ kind: "drop" }, ({ objectId }) =>
      battleObjectIsOnGround(state, actorId, objectId),
    ),
    Match.exhaustive,
  );
}

/**
 * The weapon in its slot and in hand. A weapon from outside the slot takes
 * the slot's attack binding place; the slot's previous weapon, out of hand,
 * leaves the loadout with its binding and keeps lying where it fell if it
 * fell. The weapon's own former slot, if it had one, is left empty. The hands
 * follow: the weapon's hands hold it, and a hand only the slot's previous
 * weapon or the weapon's former slot held is free.
 */
function equippedWeapon(
  state: BattleState,
  actorId: CombatantId,
  objectId: BattleObjectId,
  slot: LoadoutWeaponSlot,
): OwnedWeaponChangeResult {
  const actor = state.combatants.get(actorId);
  /* v8 ignore next -- @preserve -- ownedWeaponChangeIssue has just admitted this character. */
  if (actor === undefined || !isCharacterBattleCreatureState(actor))
    return applied(state);
  const plan = equipPlan(state, actor, objectId, slot);
  /* v8 ignore next -- @preserve -- the same admission planned this equip. */
  if (plan.tag === "invalid") return plan;
  const formerSlot = loadoutWeaponSlot(actor, objectId);
  const departing = slotWeapon(actor.origin.selectedLoadout, slot);
  const moved = {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      armorClass: {
        ...actor.armorClass,
        ...handUsesWithWeaponInSlot(actor, plan.hands, slot, formerSlot),
      },
      origin:
        plan.moved === undefined
          ? actor.origin
          : originWithWeaponInSlot(actor, plan.moved, slot, plan.grip),
    }),
  };
  const inHand = battleStateWithObjectCustody(moved, actorId, objectId, null);
  return applied(
    departing === undefined ||
      departing.itemId === objectId ||
      !loadoutWeaponIsStowed(inHand, actorId, departing.itemId)
      ? inHand
      : battleStateWithObjectCustody(inHand, actorId, departing.itemId, null),
  );
}

/**
 * The weapon's hands hold it, and a hand only the slot's previous weapon or
 * the weapon's former slot held is free; any other hand keeps what it holds.
 */
function handUsesWithWeaponInSlot(
  actor: CharacterBattleCreatureState,
  hands: readonly ("left" | "right")[],
  slot: LoadoutWeaponSlot,
  formerSlot: LoadoutWeaponSlot | null,
): Pick<
  CharacterBattleCreatureState["armorClass"],
  "leftHandUse" | "rightHandUse"
> {
  const freed: readonly HandUse[] =
    formerSlot === null ? [slot] : [slot, formerSlot];
  const use = (hand: "left" | "right", current: HandUse): HandUse => {
    if (hands.includes(hand)) return slot;
    return freed.includes(current) ? "free" : current;
  };
  return {
    leftHandUse: use("left", actor.armorClass.leftHandUse),
    rightHandUse: use("right", actor.armorClass.rightHandUse),
  };
}

type SlotContents = {
  readonly ref: { readonly itemId: BattleObjectId; readonly unitId: UnitId };
  readonly attack: BoundCharacterWeaponAttackActionOption | undefined;
};

/**
 * The origin with this weapon's binding in the slot. The slot's previous
 * weapon leaves the loadout with its binding, and the weapon's former slot,
 * if it had one, is left empty.
 */
function originWithWeaponInSlot(
  actor: CharacterBattleCreatureState,
  binding: BoundCharacterWeaponAttackActionOption,
  slot: LoadoutWeaponSlot,
  grip: WeaponGrip | undefined,
): CharacterBattleCreatureState["origin"] {
  const { origin } = actor;
  const departing = slotAttack(actor, slot);
  const equipped: SlotContents = {
    ref: {
      itemId: binding.weaponObjectId,
      unitId: binding.weapon.weaponUnitId,
    },
    attack: binding,
  };
  const after = (target: LoadoutWeaponSlot): SlotContents | undefined =>
    target === slot
      ? equipped
      : slotContents(actor, target, binding.weaponObjectId);
  const main = after("mainWeapon");
  const off = after("offWeapon");
  const {
    weapon: _weapon,
    offHandWeapon: _offHandWeapon,
    ...withoutWeapons
  } = origin.selectedLoadout;
  const { offHandAttack: _offHandAttack, ...withoutOffHandAttack } = origin;
  return {
    ...withoutOffHandAttack,
    selectedLoadout: {
      ...withoutWeapons,
      ...(main === undefined
        ? {}
        : { weapon: { ...main.ref, grip: mainGrip(slot, grip, origin) } }),
      ...(off === undefined ? {} : { offHandWeapon: off.ref }),
    },
    attack: main?.attack ?? null,
    ...(off?.attack === undefined ? {} : { offHandAttack: off.attack }),
    otherOwnedWeaponAttacks: [
      ...origin.otherOwnedWeaponAttacks.filter(
        ({ weaponObjectId }) => weaponObjectId !== binding.weaponObjectId,
      ),
      ...(departing === undefined ? [] : [departing]),
    ],
  };
}

/** A slot's weapon and binding as they are, unless the moving weapon leaves it. */
function slotContents(
  actor: CharacterBattleCreatureState,
  target: LoadoutWeaponSlot,
  leaving: BattleObjectId,
): SlotContents | undefined {
  const weapon = slotWeapon(actor.origin.selectedLoadout, target);
  if (weapon === undefined || weapon.itemId === leaving) return undefined;
  return { ref: weapon, attack: slotAttack(actor, target) };
}

/** The main weapon's grip: the entering one's, or the kept one's own. */
function mainGrip(
  slot: LoadoutWeaponSlot,
  grip: WeaponGrip | undefined,
  origin: CharacterBattleCreatureState["origin"],
): WeaponGrip {
  return Match.value(slot).pipe(
    Match.when("mainWeapon", () => grip ?? "one_handed"),
    Match.when(
      "offWeapon",
      () => origin.selectedLoadout.weapon?.grip ?? "one_handed",
    ),
    Match.exhaustive,
  );
}

/** Whether one of the character's owned weapons is in its hand now. */
function ownedWeaponIsHeld(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  objectId: BattleObjectId,
): boolean {
  return (
    loadoutWeaponSlot(actor, objectId) !== null &&
    loadoutWeaponIsHeld(state, actor.combatantId, objectId)
  );
}

/** The battle objects of every weapon the character owns: its loadout's, then the rest. */
function ownedWeaponIds(
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

/** The attack Battle bound for one of the character's owned weapons. */
function ownedWeaponAttack(
  actor: CharacterBattleCreatureState,
  objectId: BattleObjectId,
): BoundCharacterWeaponAttackActionOption | undefined {
  const { attack, offHandAttack, otherOwnedWeaponAttacks } = actor.origin;
  return [
    ...(attack === null ? [] : [attack]),
    ...(offHandAttack === undefined ? [] : [offHandAttack]),
    ...otherOwnedWeaponAttacks,
  ].find(({ weaponObjectId }) => weaponObjectId === objectId);
}

function slotWeapon(
  loadout: CharacterBattleLoadoutRef,
  slot: LoadoutWeaponSlot,
): { readonly itemId: BattleObjectId; readonly unitId: UnitId } | undefined {
  return Match.value(slot).pipe(
    Match.when("mainWeapon", () => loadout.weapon),
    Match.when("offWeapon", () => loadout.offHandWeapon),
    Match.exhaustive,
  );
}

/** The attack bound for the weapon in a slot, when it is that weapon's. */
function slotAttack(
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
): BoundCharacterWeaponAttackActionOption | undefined {
  const weapon = slotWeapon(actor.origin.selectedLoadout, slot);
  const attack = Match.value(slot).pipe(
    Match.when("mainWeapon", () => actor.origin.attack ?? undefined),
    Match.when("offWeapon", () => actor.origin.offHandAttack),
    Match.exhaustive,
  );
  return weapon !== undefined && attack?.weaponObjectId === weapon.itemId
    ? attack
    : undefined;
}

function applied(state: BattleState): OwnedWeaponChangeResult {
  return { tag: "applied", state };
}

function issue(
  reason: OwnedWeaponChangeIssueReason,
  message: string,
): OwnedWeaponChangeIssue {
  return { tag: "invalid", reason, message };
}
