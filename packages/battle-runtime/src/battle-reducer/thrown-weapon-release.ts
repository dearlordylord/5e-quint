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
import type { BattleSubject } from "../battle-subjects.ts";
import type { BattleObjectId, CombatantId } from "../identity.ts";
import { battleStateWithGroundObjects } from "./battle-object-lifecycle.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { interruptedProcedureSubject } from "./interrupt-execution.ts";
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
  /* v8 ignore start -- @preserve -- A held weapon can't already be on the ground: the attack option needs it in hand. */
  if (placed.tag === "conflict") {
    return input.state;
  }
  /* v8 ignore stop -- @preserve */
  return placed.state;
}

/**
 * Reports on a resolved result every weapon a finished attack threw, however
 * the attack reached its end: directly, or through the interrupt windows and
 * saves that opened after the weapon left the hand. A thrown weapon on the
 * ground is reported once, by the result that finishes its attack: either it
 * landed during this resolution, or it landed earlier in an attack that was
 * still in flight on the interrupt stack and has now ended. An attack needs its
 * weapon in hand, so a thrown weapon on the ground while its own attack is in
 * flight was thrown by that attack.
 */
export function withThrownWeaponDropsReported(input: {
  readonly stateBefore: BattleState;
  readonly result: BattleResolutionResult;
}): BattleResolutionResult {
  const { result } = input;
  if (result.tag !== "resolved") return result;
  const reported = result.droppedObjects ?? [];
  const drops = thrownWeaponDropsFinishedBy(
    input.stateBefore,
    result.state,
  ).filter(
    (drop) =>
      !reported.some(
        ({ actorId, objectId }) =>
          actorId === drop.actorId && objectId === drop.objectId,
      ),
  );
  return drops.length === 0
    ? result
    : { ...result, droppedObjects: [...reported, ...drops] };
}

/** The thrown weapons on the ground whose attack ended between two states. */
function thrownWeaponDropsFinishedBy(
  stateBefore: BattleState,
  state: BattleState,
): readonly BattleDroppedObjectOutcome[] {
  return [...state.groundObjects].flatMap(([actorId, objects]) =>
    [...objects].flatMap(
      ([objectId, { source }]): readonly BattleDroppedObjectOutcome[] =>
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
    ),
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
  const landedNow =
    input.stateBefore.groundObjects.get(input.actorId)?.has(input.objectId) !==
    true;
  return (
    (landedNow ||
      thrownWeaponAttackIsInFlight(
        input.stateBefore,
        input.actorId,
        input.source,
      )) &&
    !thrownWeaponAttackIsInFlight(input.state, input.actorId, input.source)
  );
}

/**
 * Whether the attack that threw a weapon is still in flight: a frame on the
 * interrupt stack resumes a subject by the thrower naming that attack.
 */
function thrownWeaponAttackIsInFlight(
  state: BattleState,
  attackerId: CombatantId,
  source: ThrownWeaponDropSource,
): boolean {
  return state.interruptStack.some((frame) => {
    const procedure = interruptFrameProcedure(frame);
    return (
      procedure !== undefined &&
      subjectNamesAttack(
        interruptedProcedureSubject(procedure),
        attackerId,
        source.procedureRef,
      )
    );
  });
}

function interruptFrameProcedure(
  frame: BattleInterruptFrame,
): BattleInterruptedProcedure | undefined {
  return Match.value(frame).pipe(
    Match.discriminatorsExhaustive("kind")({
      interruptCheckpoint: ({ frame: checkpoint }) => checkpoint.continuation,
      grantedFlightEndFallCleanup: () => undefined,
      fallDamageLandingMitigation: () => undefined,
      replayContinuation: ({ continuation }) => continuation,
      attackDamageContinuationConcentration: ({ continuation }) => continuation,
      attackDamageContinuationRepeatSave: ({ continuation }) => continuation,
      attackDamageContinuationCunningStrike: ({ continuation }) => continuation,
    }),
  );
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
