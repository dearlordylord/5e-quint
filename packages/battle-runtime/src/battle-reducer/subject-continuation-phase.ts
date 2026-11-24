import { copyInterruptCheckpointIdentity } from "./interrupt-checkpoint-identity.ts";
import { Match } from "effect";
// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.HEROIC_INSPIRATION_REROLL BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
import type {
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

/** Freeze the parent's accepted spend before a nested subject can execute. */
export function checkpointWithAcceptedHeroicInspiration<
  Checkpoint extends BattleInterruptCheckpoint,
>(state: BattleState, frame: Checkpoint): Checkpoint {
  const accepted = subjectContinuationPhaseFor(
    state,
    interruptedProcedureSubject(frame.continuation),
  ).acceptedHeroicInspirationReroll;
  if (accepted === undefined) return frame;
  const checkpoint = {
    ...frame,
    continuation: {
      ...frame.continuation,
      acceptedHeroicInspirationReroll: accepted,
    },
  };
  copyInterruptCheckpointIdentity(frame, checkpoint);
  return checkpoint;
}

/** Restore acceptance from the owning continuation, never from a child's phase. */
export function stateForSubjectContinuation(
  state: BattleState,
  continuation: BattleInterruptedProcedure,
): BattleState {
  const { acceptedHeroicInspirationReroll: _previousSpend, ...phase } =
    subjectContinuationPhaseFor(
      state,
      interruptedProcedureSubject(continuation),
    );
  return {
    ...state,
    subjectResolutionPhase: {
      ...phase,
      ...optionalProperty(
        "acceptedHeroicInspirationReroll",
        continuation.acceptedHeroicInspirationReroll,
      ),
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
