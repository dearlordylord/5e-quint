// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.THROWN_WEAPON_ATTACK
// SRD 5.2.1 "Thrown": the thrown weapon leaves its owner's hand. Once its attack
// roll is accepted, hit or miss, it rests on the ground at the table-supplied
// landing position, and the result that finishes the attack reports it.
import { Match } from "effect";
import type {
  BattleDroppedObjectOutcome,
  BattleDroppedObjectSource,
  BattleInterruptedProcedure,
  BattleInterruptFrame,
  BattleResolutionResult,
  BattleState,
  BattleTargetSpatialFact,
  BattleTerminalResolutionResult,
} from "../battle-state-execution.ts";
import type { SupportedAttackActionOption } from "../battle-action-options.ts";
import { type BattleSubject, sameBattleSubject } from "../battle-subjects.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import {
  battleGroundObjectPlacements,
  battleStateWithGroundObjects,
  battleStateWithoutGroundObject,
} from "./battle-object-lifecycle.ts";
import {
  battleGroundObjectState,
  battleObjectIsOnGround,
} from "./object-custody-queries.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { interruptedProcedureSubject } from "./subject-continuation-phase.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import {
  isThrownWeaponAttack,
  thrownWeaponLanding,
} from "./thrown-weapon-attack.ts";

/**
 * Puts a thrown weapon on the ground at its landing position after its attack
 * roll was accepted; withThrownWeaponDropsReported reports it. Any other
 * attack, or one prevented before its roll, keeps its weapon in hand.
 */
export function withThrownWeaponReleased(input: {
  readonly result: BattleTerminalResolutionResult;
  readonly attackerId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly facts: readonly BattleTargetSpatialFact[];
}): BattleTerminalResolutionResult {
  const { result } = input;
  if (result.tag !== "resolved") return result;
  const state = stateWithThrownWeaponReleased({
    state: result.state,
    attackerId: input.attackerId,
    attack: input.attack,
    facts: input.facts,
  });
  return state === result.state
    ? result
    : { ...result, state, snapshot: snapshotBattle(state) };
}

/**
 * The state after a thrown weapon's attack roll was accepted: the weapon rests
 * at its landing position. Any other attack leaves the state as it was.
 */
export function stateWithThrownWeaponReleased(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly facts: readonly BattleTargetSpatialFact[];
}): BattleState {
  const { attack } = input;
  if (!isThrownWeaponAttack(attack)) return input.state;
  const landing = thrownWeaponLanding(input.attackerId, attack, input.facts);
  /* v8 ignore start -- @preserve -- The target fill was refused without one scoped landing fact. */
  if (landing === undefined) {
    return input.state;
  }
  /* v8 ignore stop -- @preserve */
  const placed = battleStateWithGroundObjects(input.state, [
    {
      actorId: input.attackerId,
      objectId: attack.weaponObjectId,
      positionId: landing.positionId,
      source: { kind: "thrownWeaponAttack", procedureRef: attack.procedureRef },
    },
  ]);
  /* v8 ignore start -- @preserve -- An attack path throws its weapon once per resolution: at the accepted roll of a pending attack, or as an attack resolved in one step ends. */
  if (placed.tag === "conflict") {
    return input.state;
  }
  /* v8 ignore stop -- @preserve */
  return placed.state;
}

/**
 * The state after a pending attack's roll was accepted: a thrown weapon rests
 * at its landing position, and the subject's continuation records the throw so
 * that resuming the subject replays the roll with the weapon back in hand.
 */
export function stateWithThrownWeaponReleasedPendingContinuation(input: {
  readonly state: BattleState;
  readonly attackerId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly facts: readonly BattleTargetSpatialFact[];
  readonly subject: BattleSubject;
}): BattleState {
  const released = stateWithThrownWeaponReleased(input);
  if (released === input.state || !isThrownWeaponAttack(input.attack)) {
    return input.state;
  }
  const phase = released.subjectResolutionPhase;
  return {
    ...released,
    subjectResolutionPhase: {
      ...(phase.kind === "subjectContinuation" &&
      sameBattleSubject(phase.subject, input.subject)
        ? phase
        : { kind: "subjectContinuation", subject: input.subject }),
      acceptedThrownWeaponRelease: {
        actorId: input.attackerId,
        objectId: input.attack.weaponObjectId,
      },
    },
  };
}

/**
 * The state a resumed subject replays from: a weapon its accepted roll threw
 * is back in the thrower's hand, so the replayed roll throws it again. Any
 * other subject, or a weapon no longer where that throw left it, keeps the
 * state as it is.
 */
export function stateWithAcceptedThrowInHand(
  state: BattleState,
  subject: BattleSubject,
): BattleState {
  const phase = state.subjectResolutionPhase;
  if (
    phase.kind !== "subjectContinuation" ||
    phase.acceptedThrownWeaponRelease === undefined ||
    !sameBattleSubject(phase.subject, subject)
  ) {
    return state;
  }
  const { actorId, objectId } = phase.acceptedThrownWeaponRelease;
  const grounded = battleGroundObjectState(state, actorId, objectId);
  return grounded?.source.kind === "thrownWeaponAttack"
    ? battleStateWithoutGroundObject(state, actorId, objectId)
    : state;
}

/**
 * Reports on a resolved result every weapon a finished attack threw, however
 * the attack reached its end: directly, or through the interrupt windows and
 * saves that opened after the weapon left the hand. A thrown weapon on the
 * ground is reported once, by the result that finishes its attack: either it
 * landed during this resolution, or it landed earlier in an attack that was
 * still in flight on the interrupt stack and has now ended. An attack needs its
 * weapon in hand, so a thrown weapon on the ground while its own attack is in
 * flight was thrown by that attack. Only this public-result step reports
 * thrown weapons, once per resolution, so it appends to the drops the result
 * already reports.
 */
export function withThrownWeaponDropsReported(input: {
  readonly stateBefore: BattleState;
  readonly result: BattleResolutionResult;
}): BattleResolutionResult {
  const { result } = input;
  if (result.tag !== "resolved") return result;
  const drops = thrownWeaponDropsFinishedBy(input.stateBefore, result.state);
  return drops.length === 0
    ? result
    : {
        ...result,
        droppedObjects: [...(result.droppedObjects ?? []), ...drops],
      };
}

/** The thrown weapons on the ground whose attack ended between two states. */
function thrownWeaponDropsFinishedBy(
  stateBefore: BattleState,
  state: BattleState,
): readonly BattleDroppedObjectOutcome[] {
  return battleGroundObjectPlacements(state).flatMap(
    ({ actorId, objectId, source }): readonly BattleDroppedObjectOutcome[] =>
      source.kind === "thrownWeaponAttack" &&
      thrownWeaponAttackFinished({
        stateBefore,
        state,
        actorId,
        objectId,
        source,
      })
        ? [{ kind: "objectDropped", actorId, objectId, source }]
        : [],
  );
}

/**
 * Whether a thrown weapon's attack ended between two states: the weapon landed
 * in between, or its attack was in flight before, and it isn't any longer.
 */
function thrownWeaponAttackFinished(input: {
  readonly stateBefore: BattleState;
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly source: ThrownWeaponDropSource;
}): boolean {
  const landedNow = !battleObjectIsOnGround(
    input.stateBefore,
    input.actorId,
    input.objectId,
  );
  // The resolved result ends its subject, so only a frame still on the stack
  // keeps the attack in flight after it, whatever its continuation recorded.
  return (
    (landedNow ||
      subjectContinuationRecordsThrow({
        ...input,
        state: input.stateBefore,
      }) ||
      thrownWeaponAttackIsInterrupted({
        ...input,
        state: input.stateBefore,
      })) &&
    !thrownWeaponAttackIsInterrupted(input)
  );
}

/** Whether the pending subject's continuation records the weapon's throw. */
function subjectContinuationRecordsThrow(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
}): boolean {
  const phase = input.state.subjectResolutionPhase;
  return (
    phase.kind === "subjectContinuation" &&
    phase.acceptedThrownWeaponRelease?.actorId === input.actorId &&
    phase.acceptedThrownWeaponRelease.objectId === input.objectId
  );
}

/**
 * Whether the attack that threw a weapon waits on an interrupt: a frame on the
 * interrupt stack resumes a subject by the thrower that made that attack.
 */
function thrownWeaponAttackIsInterrupted(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly objectId: BattleObjectId;
  readonly source: ThrownWeaponDropSource;
}): boolean {
  return input.state.interruptStack.some((frame) => {
    const procedure = interruptFrameProcedure(frame);
    if (procedure === undefined) return false;
    const subject = interruptedProcedureSubject(procedure);
    return (
      subjectNamesAttack(subject, input.actorId, input.source.procedureRef) ||
      subjectHostsWeaponAttack(
        input.state,
        subject,
        input.actorId,
        input.objectId,
      )
    );
  });
}

/**
 * A spell subject hosts a weapon attack when its caster is the thrower and
 * the spell makes its attack with that weapon, as a spell-hosted weapon
 * attack does with its component weapon.
 */
function subjectHostsWeaponAttack(
  state: BattleState,
  subject: BattleSubject,
  attackerId: CombatantId,
  objectId: BattleObjectId,
): boolean {
  if (!("actorId" in subject) || subject.actorId !== attackerId) return false;
  const invocation = spellInvocationForRouteSubject(state, subject);
  return (
    invocation?.procedure === "spellHostedWeaponAttack" &&
    invocation.componentWeaponObjectId === objectId
  );
}

/** The procedure an interrupt frame resumes, if it resumes one. */
function interruptFrameProcedure(
  frame: BattleInterruptFrame,
): BattleInterruptedProcedure | undefined {
  return Match.value(frame).pipe(
    Match.discriminatorsExhaustive("kind")({
      interruptCheckpoint: ({ frame: checkpoint }) => checkpoint.continuation,
      grantedFlightEndFallCleanup: resumesNoProcedure,
      fallDamageLandingMitigation: resumesNoProcedure,
      replayContinuation: resumedContinuation,
      attackDamageContinuationConcentration: resumedContinuation,
      attackDamageContinuationRepeatSave: resumedContinuation,
      attackDamageContinuationCunningStrike: resumedContinuation,
    }),
  );
}

function resumedContinuation(frame: {
  readonly continuation: BattleInterruptedProcedure;
}): BattleInterruptedProcedure {
  return frame.continuation;
}

/** A fall-cleanup frame finishes a fall, not an interrupted procedure. */
function resumesNoProcedure(): undefined {
  return undefined;
}

/**
 * A subject names an attack when its attacker made it with that attack's
 * procedure: the actor, or the reactor of a reaction attack.
 */
function subjectNamesAttack(
  subject: BattleSubject,
  attackerId: CombatantId,
  procedureRef: ThrownWeaponDropSource["procedureRef"],
): boolean {
  const subjectAttackerId =
    "reactorId" in subject ? subject.reactorId : subject.actorId;
  return (
    subjectAttackerId === attackerId &&
    "procedureRef" in subject &&
    subject.procedureRef === procedureRef
  );
}

type ThrownWeaponDropSource = Extract<
  BattleDroppedObjectSource,
  { readonly kind: "thrownWeaponAttack" }
>;
