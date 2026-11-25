// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.ATTACK_WEAPON_CHANGE
//
// Where a character's selected-loadout weapons are during a battle: held,
// sheathed or stowed, or on the ground. SRD 5.2.1 Rules Glossary, "Attack
// [Action]", Equipping and Unequipping Weapons: "Equipping a weapon includes
// drawing it from a sheath or picking it up. Unequipping a weapon includes
// sheathing, stowing, or dropping it." Whether the creature can reach a fallen
// weapon, and where a dropped one lands, are the table's rulings (ASSUMPTIONS.md
// A60 and A63).
import { Match } from "effect";
import {
  ATTACK_WEAPON_CHANGE_KINDS,
  type AttackWeaponChange,
} from "../battle-subjects.ts";
import type {
  BattleCreatureState,
  BattleObjectCustody,
  BattleState,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type {
  BattleObjectId,
  BattleTablePositionId,
  CombatantId,
} from "../identity.ts";
import {
  battleStateWithObjectCustody,
  heldWeaponPickupTransition,
  loadoutWeaponHands,
  loadoutWeaponHandsAreFree,
  type LoadoutWeaponSlot,
  loadoutWeaponSlot,
} from "./battle-object-lifecycle.ts";
import {
  battleObjectIsOnGround,
  type BattleEquipmentQuery,
  type BattleActorObjectCustodyQuery,
} from "./object-custody-queries.ts";
import { isCharacterBattleCreatureState } from "./creature-state-queries.ts";
import { combatantActiveDruidWildShape } from "./creature-state-leaves.ts";
import {
  loadoutWeaponIsHeld,
  loadoutWeaponIsStowed,
} from "./character-effective-loadout.ts";

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

const WEAPON_CHANGE_CUSTODY = {
  equip: null,
  stow: { kind: "stowed" },
  drop: { kind: "onGround" },
} as const satisfies Record<
  AttackWeaponChange["kind"],
  Pick<BattleObjectCustody, "kind"> | null
>;

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
  const admission = admittedLoadoutWeaponChange(state, actorId, change);
  return admission.tag === "invalid" ? admission : null;
}

function admittedLoadoutWeaponChange(
  state: BattleState,
  actorId: CombatantId,
  change: AttackWeaponChange,
):
  | LoadoutWeaponChangeIssue
  | {
      readonly tag: "admitted";
      readonly actor: CharacterBattleCreatureState;
      readonly slot: LoadoutWeaponSlot;
    } {
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
      "A weapon change applies to a character's selected-loadout weapons.",
    );
  }
  if (combatantActiveDruidWildShape(actor) !== null) {
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
  const admission = Match.value(change.kind).pipe(
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
  return admission ?? { tag: "admitted", actor, slot };
}

/** Every weapon change this character can make now. */
export function loadoutWeaponChanges(
  state: BattleState,
  actor: BattleCreatureState,
): readonly AttackWeaponChange[] {
  if (!isCharacterBattleCreatureState(actor)) return [];
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
): readonly BattleObjectId[] {
  return loadoutWeaponChanges(state, actor).flatMap((change) =>
    change.kind === "equip" &&
    battleObjectIsOnGround(state, actor.combatantId, change.objectId)
      ? [change.objectId]
      : [],
  );
}

export function loadoutWeaponChangeAttackQuery(
  state: BattleState,
  actorId: CombatantId,
  change: AttackWeaponChange,
):
  | LoadoutWeaponChangeIssue
  | {
      readonly tag: "projected";
      readonly actor: CharacterBattleCreatureState;
      readonly equipment: BattleEquipmentQuery;
    } {
  const admission = admittedLoadoutWeaponChange(state, actorId, change);
  if (admission.tag === "invalid") return admission;
  const actor =
    change.kind === "equip"
      ? actorWithLoadoutWeaponInHand(admission.actor, admission.slot)
      : admission.actor;
  const objects = new Map<BattleObjectId, Pick<BattleObjectCustody, "kind">>(
    state.objectCustody.get(actorId),
  );
  const custody = WEAPON_CHANGE_CUSTODY[change.kind];
  if (custody === null) objects.delete(change.objectId);
  else objects.set(change.objectId, custody);
  const objectCustody = new Map<CombatantId, BattleActorObjectCustodyQuery>(
    state.objectCustody,
  );
  if (objects.size === 0) objectCustody.delete(actorId);
  else objectCustody.set(actorId, objects);
  return {
    tag: "projected",
    actor,
    equipment: { objectCustody, grapples: state.grapples },
  };
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
  const admission = admittedLoadoutWeaponChange(state, actorId, change);
  if (admission.tag === "invalid") return admission;
  return Match.value(change).pipe(
    Match.when({ kind: "equip" }, ({ objectId }) => {
      if (loadoutWeaponIsStowed(state, actorId, objectId)) {
        return applied(
          withLoadoutWeaponInHand(
            battleStateWithObjectCustody(state, actorId, objectId, null),
            admission.actor,
            admission.slot,
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
        withLoadoutWeaponInHand(
          pickedUp.state,
          admission.actor,
          admission.slot,
        ),
      );
    }),
    Match.when({ kind: "stow" }, ({ objectId }) =>
      applied(
        battleStateWithObjectCustody(
          state,
          actorId,
          objectId,
          WEAPON_CHANGE_CUSTODY.stow,
        ),
      ),
    ),
    Match.when({ kind: "drop" }, ({ objectId, positionId }) =>
      applied(
        battleStateWithObjectCustody(state, actorId, objectId, {
          ...WEAPON_CHANGE_CUSTODY.drop,
          positionId,
          source: { kind: "attackWeaponChange" },
        }),
      ),
    ),
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

/** A weapon back in hand holds the hands its admitted loadout grip gives it. */
function actorWithLoadoutWeaponInHand(
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
): CharacterBattleCreatureState {
  const hands = loadoutWeaponHands(actor, slot);
  return {
    ...actor,
    armorClass: {
      ...actor.armorClass,
      ...(hands.includes("left") ? { leftHandUse: slot } : {}),
      ...(hands.includes("right") ? { rightHandUse: slot } : {}),
    },
  };
}

function withLoadoutWeaponInHand(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  slot: LoadoutWeaponSlot,
): BattleState {
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      actor.combatantId,
      actorWithLoadoutWeaponInHand(actor, slot),
    ),
  };
}

function selectedLoadoutWeaponIds(
  actor: CharacterBattleCreatureState,
): readonly BattleObjectId[] {
  const { weapon, offHandWeapon } = actor.origin.selectedLoadout;
  return [weapon?.itemId, offHandWeapon?.itemId].filter(
    (itemId): itemId is BattleObjectId => itemId !== undefined,
  );
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
