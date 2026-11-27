import { copyInterruptCheckpointIdentity } from "./interrupt-checkpoint-identity.ts";
import { Match } from "effect";
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE BATTLE.ATTACK.THROWN_WEAPON_ATTACK
import type {
  BattleAcceptedSubjectReplayEvidence,
  BattleInterruptCheckpoint,
  BattleInterruptedProcedure,
  BattleState,
} from "../battle-state-execution.ts";
import { sameBattleSubject, type BattleSubject } from "../battle-subjects.ts";
import { optionalProperty } from "../optional-property.ts";

type SubjectContinuationPhase = Extract<
  BattleState["subjectResolutionPhase"],
  { readonly kind: "subjectContinuation" }
>;

/** Preserve only metadata owned by this exact subject. */
export function subjectContinuationPhaseFor(
  state: BattleState,
  subject: BattleSubject,
): SubjectContinuationPhase {
  const fresh: SubjectContinuationPhase = {
    kind: "subjectContinuation",
    subject,
  };
  return Match.value(state.subjectResolutionPhase).pipe(
    Match.when({ kind: "subjectSelection" }, () => fresh),
    Match.when({ kind: "subjectContinuation" }, (phase) =>
      sameBattleSubject(phase.subject, subject) ? phase : fresh,
    ),
    Match.exhaustive,
  );
}

/** Project only the accepted roll and attack witnesses owned by a phase or checkpoint. */
export function acceptedSubjectReplayEvidence(
  source: BattleAcceptedSubjectReplayEvidence,
): BattleAcceptedSubjectReplayEvidence {
  return {
    ...optionalProperty(
      "acceptedHeroicInspirationRerolls",
      source.acceptedHeroicInspirationRerolls,
    ),
    ...optionalProperty(
      "acceptedFailedSavingThrowRerolls",
      source.acceptedFailedSavingThrowRerolls,
    ),
    ...optionalProperty(
      "acceptedAttackAmmunitionSpend",
      source.acceptedAttackAmmunitionSpend,
    ),
    ...optionalProperty(
      "acceptedThrownWeaponRelease",
      source.acceptedThrownWeaponRelease,
    ),
  };
}

/** Freeze the parent's accepted witnesses before a nested subject executes. */
export function checkpointWithAcceptedSubjectReplayEvidence<
  Checkpoint extends BattleInterruptCheckpoint,
>(state: BattleState, frame: Checkpoint): Checkpoint {
  const accepted = acceptedSubjectReplayEvidence(
    subjectContinuationPhaseFor(
      state,
      interruptedProcedureSubject(frame.continuation),
    ),
  );
  if (Object.keys(accepted).length === 0) return frame;
  const checkpoint = {
    ...frame,
    continuation: {
      ...frame.continuation,
      ...accepted,
    },
  };
  copyInterruptCheckpointIdentity(frame, checkpoint);
  return checkpoint;
}

/** Restore the owner's witnesses, never a nested subject's. */
export function stateForSubjectContinuation(
  state: BattleState,
  continuation: BattleInterruptedProcedure,
): BattleState {
  const {
    acceptedHeroicInspirationRerolls: _previousHeroicInspiration,
    acceptedFailedSavingThrowRerolls: _previousFailedSavingThrowRerolls,
    acceptedAttackAmmunitionSpend: _previousAmmunition,
    acceptedThrownWeaponRelease: _previousThrow,
    ...phase
  } = subjectContinuationPhaseFor(
    state,
    interruptedProcedureSubject(continuation),
  );
  return {
    ...state,
    subjectResolutionPhase: {
      ...phase,
      ...acceptedSubjectReplayEvidence(continuation),
    },
  };
}

/** The actual subject owns checkpoint metadata, including specialized damage continuations. */
export function interruptedProcedureSubject(
  procedure: BattleInterruptedProcedure,
): BattleSubject {
  return Match.value(procedure).pipe(
    Match.when({ kind: "attackDamage" }, (value) => value.participant),
    Match.whenOr(
      { kind: "replay" },
      { kind: "resolved" },
      { kind: "afterDamageSequence" },
      { kind: "afterDamageSequenceWithPrimaryAttackFollowUp" },
      { kind: "weaponMasteryCleave" },
      { kind: "huntersPreyHordeBreaker" },
      { kind: "movement" },
      { kind: "movementThenAfterDamageSequence" },
      (value) => value.subject,
    ),
    Match.exhaustive,
  );
}
