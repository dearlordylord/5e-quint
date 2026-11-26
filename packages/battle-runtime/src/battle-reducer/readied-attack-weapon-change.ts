// KERNEL-COVERAGE: runtime-owner BATTLE.ACTION.ATTACK_WEAPON_CHANGE
//
// SRD 5.2.1 Rules Glossary, "Ready [Action]": the creature chooses "the
// action you will take in response to that trigger" and can "take your
// Reaction right after the trigger finishes". "Attack [Action]", Equipping
// and Unequipping Weapons: "You can either equip or unequip one weapon when
// you make an attack as part of this action. You do so either before or after
// the attack." A readied Attack's attack is such an attack, so its release
// carries the one change, right before or right after it. Preparing Ready
// makes no attack, so it grants none (ASSUMPTIONS.md A63).
import { Match } from "effect";
import type { BoundSupportedAttackActionOption } from "../battle-action-options.ts";
import type {
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  AttackWeaponChange,
  BattleInterruptSubject,
  BattleReleaseReadiedAttackSubject,
  BattleReleaseReadiedActionSubject,
  BattleReadyActionSubject,
  ReadiedAttackWeaponChange,
} from "../battle-subjects.ts";
import {
  isReadiedWeaponChangeActionSubject,
  readiedAttackWeaponChangesEqual,
} from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import {
  fillsWithoutWeaponChange,
  resolveBeforeWeaponChangeAfter,
  resolveWithWeaponChangeBefore,
  stateWithWeaponChangeAfterAttack,
  weaponChangeDropOutcome,
} from "./attack-weapon-change.ts";
import { unarmedStrikeOptionTargetHole } from "./hole-helpers.ts";
import { isCharacterBattleCreatureState } from "./creature-state-queries.ts";
import {
  ownedWeaponChanges,
  ownedWeaponIsHeld,
  stateWithProspectiveWeaponChange,
  stateWithOwnedWeaponChange,
} from "./owned-weapon-custody.ts";
import { attackActionOptionsAfterWeaponChange } from "./attack-damage-apply.ts";
import { readiedAttackOption } from "./ready.ts";
import { invalidResult } from "./result-helpers.ts";
import { isThrownWeaponAttack } from "./thrown-weapon-attack.ts";

/** Which readied attack, against which target, a release makes. */
export type ReadiedAttackRelease = Pick<
  BattleReleaseReadiedAttackSubject,
  "reactorId" | "targetId" | "procedureRef"
>;

type ReadiedUnarmedStrikeSubject = Extract<
  BattleReadyActionSubject,
  { readonly tag: "action"; readonly action: "grapple" | "shove" }
>;
type ReadiedReleaseSubject =
  | BattleReleaseReadiedAttackSubject
  | BattleReleaseReadiedActionSubject;

/** Release-time legality, without spending the interrupted creature's action. */
export function readiedUnarmedStrikeIsAvailable(
  state: BattleState,
  subject: ReadiedUnarmedStrikeSubject,
): boolean {
  return (
    unarmedStrikeOptionTargetHole(state, subject.actorId, subject.action)
      .choices.length > 0
  );
}

export function readiedUnarmedStrikeWeaponChanges(
  state: BattleState,
  subject: ReadiedUnarmedStrikeSubject,
): readonly ReadiedAttackWeaponChange[] {
  const actor = state.combatants.get(subject.actorId);
  if (actor === undefined) return [];
  const changes = ownedWeaponChanges(state, actor);
  return [
    ...changes
      .filter((change) => {
        const changed = stateWithProspectiveWeaponChange(
          state,
          subject.actorId,
          change,
        );
        return (
          changed.tag === "applied" &&
          readiedUnarmedStrikeIsAvailable(changed.state, subject)
        );
      })
      .map(
        (change): ReadiedAttackWeaponChange => ({
          timing: "beforeAttack",
          change,
        }),
      ),
    ...readiedUnarmedStrikeWeaponChangesAfter(state, subject),
  ];
}

function readiedUnarmedStrikeWeaponChangesAfter(
  state: BattleState,
  subject: ReadiedUnarmedStrikeSubject,
): readonly ReadiedAttackWeaponChange[] {
  const actor = state.combatants.get(subject.actorId);
  return actor !== undefined && readiedUnarmedStrikeIsAvailable(state, subject)
    ? ownedWeaponChanges(state, actor).map((change) => ({
        timing: "afterAttack",
        change,
      }))
    : [];
}

function readiedActionWeaponChangesAfter(
  state: BattleState,
  reactorId: CombatantId,
): readonly ReadiedAttackWeaponChange[] {
  const readied = state.readiedResponses.get(reactorId);
  if (readied?.response.kind !== "action") return [];
  const subject = readied.response.subject;
  return isReadiedWeaponChangeActionSubject(subject)
    ? readiedUnarmedStrikeWeaponChangesAfter(state, subject)
    : [];
}

/**
 * The weapon changes a reactor can make with the readied attack against this
 * target: before it, any change after which the attack is still there, and
 * after it, any change the hands allow once the attack is over.
 */
export function readiedAttackWeaponChanges(
  state: BattleState,
  release: ReadiedAttackRelease,
): readonly ReadiedAttackWeaponChange[] {
  return [
    ...readiedAttackWeaponChangesBefore(state, release),
    ...readiedAttackWeaponChangesAfter(state, release),
  ];
}

function readiedAttackWeaponChangesBefore(
  state: BattleState,
  release: ReadiedAttackRelease,
): readonly ReadiedAttackWeaponChange[] {
  const reactor = state.combatants.get(release.reactorId);
  if (reactor === undefined) return [];
  return ownedWeaponChanges(state, reactor)
    .filter((change) => readiedAttackAfterChange(state, release, change))
    .map((change) => ({ timing: "beforeAttack", change }));
}

function readiedAttackAfterChange(
  state: BattleState,
  release: ReadiedAttackRelease,
  change: AttackWeaponChange,
): boolean {
  return (
    readiedAttackOption(
      state,
      release.reactorId,
      release.targetId,
      release.procedureRef,
      attackActionOptionsAfterWeaponChange(state, release.reactorId, change),
    ) !== undefined
  );
}

function readiedAttackWeaponChangesAfter(
  state: BattleState,
  release: ReadiedAttackRelease,
): readonly ReadiedAttackWeaponChange[] {
  const attack = readiedAttackOption(
    state,
    release.reactorId,
    release.targetId,
    release.procedureRef,
  );
  if (attack === undefined) return [];
  const afterAttack = stateWithHandsAfterAttack(
    state,
    release.reactorId,
    attack,
  );
  const reactor = afterAttack?.combatants.get(release.reactorId);
  /* v8 ignore start -- @preserve -- readiedAttackOption has just found the reactor's attack, the projection keeps its combatants, and a weapon in hand can be stowed. */
  if (afterAttack === undefined || reactor === undefined) return [];
  /* v8 ignore stop -- @preserve */
  const thrown = thrownWeaponObjectId(attack);
  return ownedWeaponChanges(afterAttack, reactor)
    .filter((change) => change.objectId !== thrown)
    .map((change) => ({ timing: "afterAttack", change }));
}

/**
 * The battle as the attack leaves the attacker's hands: a thrown weapon in
 * hand has left it. Where it lands is the table's answer, which the
 * hands don't need, so the projection stows it; no change after the attack
 * names the thrown weapon, since it rests wherever it lands. Undefined when
 * the thrown weapon in hand can't leave it.
 */
function stateWithHandsAfterAttack(
  state: BattleState,
  attackerId: CombatantId,
  attack: BoundSupportedAttackActionOption,
): BattleState | undefined {
  const thrown = thrownWeaponObjectId(attack);
  if (thrown === undefined) return state;
  const actor = state.combatants.get(attackerId);
  if (!isCharacterBattleCreatureState(actor)) return undefined;
  // A spare or stowed Thrown weapon is drawn and released within the attack.
  if (!ownedWeaponIsHeld(state, actor, thrown)) return state;
  const released = stateWithOwnedWeaponChange(state, attackerId, {
    kind: "stow",
    objectId: thrown,
  });
  /* v8 ignore next -- @preserve -- A weapon in hand can be stowed. */
  return released.tag === "applied" ? released.state : undefined;
}

function thrownWeaponObjectId(
  attack: BoundSupportedAttackActionOption,
): AttackWeaponChange["objectId"] | undefined {
  return isThrownWeaponAttack(attack) ? attack.weaponObjectId : undefined;
}

/**
 * Resolves a readied attack's release, with the weapon change it carries
 * made right before or right after the attack. Battle admits the change
 * against the battle as discovery offered it.
 */
export function resolveReadiedReleaseWithWeaponChange<
  Input extends BattleResolutionInput & {
    readonly subject: ReadiedReleaseSubject;
  },
>(
  input: Input,
  resolveAttack: (input: Input) => BattleResolutionResult,
): BattleResolutionResult {
  const weaponChange = input.subject.weaponChange;
  if (weaponChange === undefined) return resolveAttack(input);
  const reactorId = input.subject.reactorId;
  return Match.value(weaponChange.timing).pipe(
    Match.when("beforeAttack", () =>
      resolveWithWeaponChangeBefore(
        input,
        reactorId,
        weaponChange.change,
        resolveAttack,
      ),
    ),
    Match.when("afterAttack", () =>
      resolveReadiedAttackThenWeaponChange(input, weaponChange, resolveAttack),
    ),
    Match.exhaustive,
  );
}

function resolveReadiedAttackThenWeaponChange<
  Input extends BattleResolutionInput & {
    readonly subject: ReadiedReleaseSubject;
  },
>(
  input: Input,
  weaponChange: ReadiedAttackWeaponChange,
  resolveAttack: (input: Input) => BattleResolutionResult,
): BattleResolutionResult {
  const changes =
    input.subject.command === "releaseReadiedAttack"
      ? readiedAttackWeaponChangesAfter(input.state, input.subject)
      : readiedActionWeaponChangesAfter(input.state, input.subject.reactorId);
  const offered = changes.some((candidate) =>
    readiedAttackWeaponChangesEqual(candidate, weaponChange),
  );
  /* v8 ignore start -- @preserve -- The Reaction window admits only the releases it offers, and a resumed readied attack finds the reactor's hands as they were before it, a thrown weapon back in hand. */
  if (!offered) {
    return invalidResult(
      input.state,
      "staleSubject",
      "That weapon change can't follow this readied attack.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return resolveBeforeWeaponChangeAfter(
    input,
    input.subject.reactorId,
    weaponChange.change,
    resolveAttack,
  );
}

/**
 * The battle once a readied attack is over, however it got there: directly,
 * or through the Reaction windows its hit and damage opened. A change after
 * the attack is made now, after any Reaction to it, and a weapon either
 * change dropped is reported once. Any other procedure the Reaction window
 * ran ends as it is.
 */
export function readiedReleaseWeaponChangeEnd(
  state: BattleState,
  procedure: {
    readonly subject: BattleInterruptSubject;
    readonly fills: readonly BattleFill[];
  },
): {
  readonly state: BattleState;
  readonly droppedObjects: readonly BattleDroppedObjectOutcome[];
} {
  const subject = procedure.subject;
  if (
    (subject.command !== "releaseReadiedAttack" &&
      subject.command !== "releaseReadiedAction") ||
    subject.weaponChange === undefined
  ) {
    return { state, droppedObjects: [] };
  }
  const { timing, change } = subject.weaponChange;
  const dropped =
    change.kind === "drop"
      ? [weaponChangeDropOutcome(subject.reactorId, change.objectId)]
      : [];
  return Match.value(timing).pipe(
    Match.when("beforeAttack", () => ({ state, droppedObjects: dropped })),
    Match.when("afterAttack", () => {
      const changed = stateWithWeaponChangeAfterAttack(
        state,
        subject.reactorId,
        change,
        procedure.fills,
      );
      return changed === undefined
        ? { state, droppedObjects: [] }
        : { state: changed, droppedObjects: dropped };
    }),
    Match.exhaustive,
  );
}

/**
 * The fills a readied attack reads: every one but the landing position of
 * the weapon its release drops.
 */
export function readiedReleaseFills(
  subject: ReadiedReleaseSubject,
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  return subject.weaponChange === undefined
    ? fills
    : fillsWithoutWeaponChange(
        subject.reactorId,
        subject.weaponChange.change,
        fills,
      );
}
