// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.WEAPON_GRIP_CHANGE
//
// A character changes how it holds its main weapon during a battle.
// SRD 5.2.1 equipment.md "Versatile": the weapon "can be used with one or two
// hands" and deals its Versatile damage "when used with two hands to make a
// melee attack". The SRD gives a change of grip no cost and no timing, so it
// costs nothing and Battle offers it on the creature's own turn while it can
// act (ASSUMPTIONS.md A65). The grip decides the hands the weapon holds; the
// Versatile damage and every hand check read the grip when they apply.
import { loadoutHandUses } from "@dnd/shared-algebras/armor-class-algebra";
import { WEAPON_GRIPS, type WeaponGrip } from "@dnd/shared/types";
import { Match, Result } from "effect";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type {
  BattleRuntimeCommand,
  BattleSubject,
} from "../battle-subjects.ts";
import type { CharacterBattleLoadoutRef } from "../character-creature-execution-facts.ts";
import { characterEffectiveLoadout } from "./character-effective-loadout.ts";
import { isCharacterBattleCreatureState } from "./creature-state-queries.ts";
import {
  combatantActiveDruidWildShape,
  combatantCanTakeActions,
  combatantHandUses,
  currentActorId,
} from "./creature-state-leaves.ts";
import { versatileMeleeDamageIsUnsupported } from "../weapon-melee-grip-damage.ts";
import { invalidResult, resolvedResult } from "./result-helpers.ts";

export const WEAPON_GRIP_CHANGE_COMMANDS = [
  "changeWeaponGrip",
] as const satisfies readonly BattleRuntimeCommand[];

export type WeaponGripChangeSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: (typeof WEAPON_GRIP_CHANGE_COMMANDS)[number];
  }
>;

export function isWeaponGripChangeSubject(
  subject: BattleSubject,
): subject is WeaponGripChangeSubject {
  return (
    subject.tag === "runtimeCommand" &&
    WEAPON_GRIP_CHANGE_COMMANDS.some((command) => command === subject.command)
  );
}

export const WEAPON_GRIP_CHANGE_REFUSAL_REASONS = [
  "notOwnTurn",
  "cannotAct",
  "actorNotCharacter",
  "activeFormGripUnsupported",
  "noHeldMainWeapon",
  "alreadyHeldWithGrip",
  "mainWeaponAttackUnknown",
  "handOccupied",
  "unsupportedVersatileDamage",
] as const;

/** Why a creature can't hold its main weapon with a grip now. */
export type WeaponGripChangeRefusal = {
  readonly reason: (typeof WEAPON_GRIP_CHANGE_REFUSAL_REASONS)[number];
  readonly message: string;
};

/** A grip change Battle admits: the character and the main weapon it holds. */
type WeaponGripChangeAdmission = {
  readonly actor: CharacterBattleCreatureState;
  readonly weapon: NonNullable<CharacterBattleLoadoutRef["weapon"]>;
  readonly grip: WeaponGrip;
};

/**
 * Whether the actor can change its main weapon to `grip` now. Battle needs the
 * main weapon's attack to tell its properties. A two-handed grip
 * needs the other hand free of any shield, off-hand weapon, grapple or held
 * object, and Versatile damage Battle can execute.
 */
export function weaponGripChangeAdmission(
  state: BattleState,
  actor: BattleCreatureState,
  grip: WeaponGrip,
): Result.Result<WeaponGripChangeAdmission, WeaponGripChangeRefusal> {
  return Result.flatMap(gripChangeCharacter(state, actor), (character) =>
    mainWeaponGripChange(state, character, grip),
  );
}

/** The current actor as a character that can change its grip now. */
function gripChangeCharacter(
  state: BattleState,
  actor: BattleCreatureState,
): Result.Result<CharacterBattleCreatureState, WeaponGripChangeRefusal> {
  if (actor.combatantId !== currentActorId(state)) {
    return refused(
      "notOwnTurn",
      "A creature changes its weapon grip on its own turn.",
    );
  }
  if (!combatantCanTakeActions(actor)) {
    return refused(
      "cannotAct",
      "A creature that can't act can't change its weapon grip.",
    );
  }
  if (!isCharacterBattleCreatureState(actor)) {
    return refused(
      "actorNotCharacter",
      "Only a character's loadout main weapon has a grip.",
    );
  }
  return combatantActiveDruidWildShape(actor) === null
    ? Result.succeed(actor)
    : refused(
        "activeFormGripUnsupported",
        "Battle doesn't change a weapon grip while Wild Shape is active.",
      );
}

/** The character's held main weapon taking `grip`, when the weapon allows it. */
function mainWeaponGripChange(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  grip: WeaponGrip,
): Result.Result<WeaponGripChangeAdmission, WeaponGripChangeRefusal> {
  const weapon = characterEffectiveLoadout(state, actor).weapon;
  if (weapon === undefined) {
    return refused(
      "noHeldMainWeapon",
      "The creature isn't holding its main weapon.",
    );
  }
  if (weapon.grip === grip) {
    return refused(
      "alreadyHeldWithGrip",
      "The main weapon is already held with this grip.",
    );
  }
  const attack = actor.origin.attack;
  if (attack === null || attack.weaponObjectId !== weapon.itemId) {
    return refused(
      "mainWeaponAttackUnknown",
      "Battle can't tell what this main weapon is, so it keeps its grip.",
    );
  }
  const handRefusal = Match.value(grip).pipe(
    Match.when("one_handed", () => null),
    Match.when("two_handed", () =>
      twoHandedGripRefusal(state, actor, attack.weapon),
    ),
    Match.exhaustive,
  );
  return handRefusal === null
    ? Result.succeed({ actor, weapon, grip })
    : Result.fail(handRefusal);
}

type MainWeaponAttackWeapon = NonNullable<
  CharacterBattleCreatureState["origin"]["attack"]
>["weapon"];

function twoHandedGripRefusal(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  weapon: MainWeaponAttackWeapon,
): WeaponGripChangeRefusal | null {
  if (combatantHandUses(state, actor, state.grapples).left !== "free") {
    return {
      reason: "handOccupied",
      message: "A two-handed grip needs the other hand free.",
    };
  }
  return versatileMeleeDamageIsUnsupported(weapon)
    ? {
        reason: "unsupportedVersatileDamage",
        message:
          "Battle executes only dice Versatile damage, so this weapon keeps its one-handed grip.",
      }
    : null;
}

function refused(
  reason: WeaponGripChangeRefusal["reason"],
  message: string,
): Result.Result<never, WeaponGripChangeRefusal> {
  return Result.fail({ reason, message });
}

/** The grip changes the current actor can make to its main weapon. */
export function weaponGripChangeActs(
  state: BattleState,
  actor: BattleCreatureState,
): BattleActDiscoveryCandidate[] {
  return WEAPON_GRIPS.filter((grip) =>
    Result.isSuccess(weaponGripChangeAdmission(state, actor, grip)),
  ).map((grip) => ({
    subject: {
      tag: "runtimeCommand",
      actorId: actor.combatantId,
      command: "changeWeaponGrip",
      grip,
    },
    initialHoles: [],
  }));
}

export function resolveWeaponGripChange(
  input: BattleResolutionInput & { readonly subject: WeaponGripChangeSubject },
): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "The creature is no longer in the battle.",
    );
  }
  const admission = weaponGripChangeAdmission(
    input.state,
    actor,
    input.subject.grip,
  );
  if (Result.isFailure(admission)) {
    return invalidResult(
      input.state,
      "staleSubject",
      admission.failure.message,
    );
  }
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Changing a weapon grip takes no fills.",
    );
  }
  return resolvedResult(weaponGripChanged(input.state, admission.success));
}

/**
 * The main weapon held with the admitted grip. The loadout's hands follow the
 * grip: a two-handed grip holds both, and a one-handed grip gives the other
 * hand back to the shield or off-hand weapon the loadout holds there, if any.
 */
function weaponGripChanged(
  state: BattleState,
  { actor, weapon, grip }: WeaponGripChangeAdmission,
): BattleState {
  const selected = actor.origin.selectedLoadout;
  const changed: CharacterBattleCreatureState = {
    ...actor,
    armorClass: {
      ...actor.armorClass,
      ...loadoutHandUses({
        holdsShield: selected.shield !== undefined,
        holdsOffHandWeapon: selected.offHandWeapon !== undefined,
        mainWeaponGrip: grip,
      }),
    },
    origin: {
      ...actor.origin,
      selectedLoadout: { ...selected, weapon: { ...weapon, grip } },
    },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(actor.combatantId, changed),
  };
}
