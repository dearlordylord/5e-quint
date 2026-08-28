// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
// KERNEL-COVERAGE: runtime-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

import { optionalProperty } from "../optional-property.ts";
import { Match } from "effect";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { sameBattleSubject } from "../battle-subjects.ts";
import { interruptChoiceResponderId } from "../battle-state-execution.ts";
import type {
  AdmittedBattleResolutionInput,
  BattleAttackDamageEvent,
  BattleFill,
  BattleInterruptCheckpoint,
  BattleInterruptDecision,
  BattleInterruptFrame,
  BattleInterruptProcedureChoice,
  BattleInterruptProcedureModifierChoice,
  BattleInterruptProcedureSelection,
  BattleInterruptRouteOptions,
  BattleInterruptedProcedure,
  BattleReactionModifierChoice,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  attackDamageEventEntries,
  damageAmountByTypeEntriesAfterScalarReduction,
} from "./attack-damage-events.ts";
import { INTERRUPT_DECISION_HOLE_ID } from "./battle-runtime-protocol.ts";
import {
  currentInterruptCheckpoint,
  snapshotBattle,
  unofferedEligibleResponders,
} from "./battle-snapshot.ts";
import { combatantCanTakeReactions } from "./creature-state-execution.ts";
import {
  interruptCheckpointFrame,
  interruptChoices,
  spendReaction,
} from "./interrupt-execution.ts";
import { copyInterruptCheckpointIdentity } from "./interrupt-checkpoint-identity.ts";
import { interruptAttackExecutionSelectionsEqual } from "./movement-speed.ts";
import {
  reactionModifierReductionRoll,
  reactionRollOrDamageReductionChoices,
  spendReactionModifierResource,
} from "./reaction-modifiers.ts";
import { admitBattleResolutionInput } from "./resolution-admission.ts";
import { invalidResult } from "./result-helpers.ts";
import { releasePendingSpellSlotUseThisTurn } from "./spell-turn-resources.ts";
import { appendObjectOutcomeAccumulation } from "./object-outcome-accumulation.ts";

const admittedActiveInterruptProcedure = Symbol(
  "AdmittedActiveInterruptProcedure",
);

export type AdmittedActiveInterruptProcedure = {
  readonly input: AdmittedBattleResolutionInput;
  readonly interruptRouteOptions: Extract<
    BattleInterruptRouteOptions,
    { readonly replayingInterruptedProcedure: true }
  >;
  readonly [admittedActiveInterruptProcedure]: true;
};

type ResolveActiveInterruptSubject = (
  admitted: AdmittedActiveInterruptProcedure,
) => BattleResolutionResult;

type ResumeInterruptContinuation = (input: {
  readonly state: BattleState;
  readonly continuation: BattleInterruptedProcedure;
  readonly handledInterruptTrigger: BattleInterruptTrigger;
}) => BattleResolutionResult;

export class InterruptLifecycleExecution {
  private constructor(
    private readonly subjectResolver: ResolveActiveInterruptSubject,
    private readonly continuationResumer: ResumeInterruptContinuation,
  ) {}

  static fromResolvers(
    subjectResolver: ResolveActiveInterruptSubject,
    continuationResumer: ResumeInterruptContinuation,
  ): InterruptLifecycleExecution {
    return new InterruptLifecycleExecution(
      subjectResolver,
      continuationResumer,
    );
  }

  resolveSubject(
    admitted: AdmittedActiveInterruptProcedure,
  ): BattleResolutionResult {
    return this.subjectResolver(admitted);
  }

  resumeContinuation(input: {
    readonly state: BattleState;
    readonly continuation: BattleInterruptedProcedure;
    readonly handledInterruptTrigger: BattleInterruptTrigger;
  }): BattleResolutionResult {
    return this.continuationResumer(input);
  }
}

/** A checkpoint whose active procedure has already completed. */
export type InactiveBattleInterruptCheckpoint =
  BattleInterruptCheckpoint extends infer Checkpoint
    ? Checkpoint extends BattleInterruptCheckpoint
      ? Omit<Checkpoint, "activeInterrupt">
      : never
    : never;

export type BattleInterruptCheckpointReconciliation =
  | {
      readonly tag: "retained";
      readonly state: BattleState;
      readonly frame: InactiveBattleInterruptCheckpoint;
    }
  | {
      readonly tag: "closed";
      readonly result: BattleResolutionResult;
    }
  | {
      readonly tag: "notReconcilable";
      readonly reason:
        | "checkpointMissing"
        | "checkpointChanged"
        | "activeProcedurePending";
    };

type InterruptDecisionFill = Extract<
  BattleFill,
  { readonly kind: "interruptDecision" }
>;

type InterruptLifecycleDecisionOutcome =
  | {
      readonly tag: "withoutInterruptRoute";
      readonly result: BattleResolutionResult;
    }
  | {
      readonly tag: "withInterruptRoute";
      readonly result: BattleResolutionResult;
    };

type ResolvedObjectOutcomeSource = Pick<
  Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
  "objectDamages" | "objectIgnitions"
>;

export function resolveInterruptLifecycleDecision(input: {
  readonly state: BattleState;
  readonly fill: InterruptDecisionFill;
  readonly execution: InterruptLifecycleExecution;
}): InterruptLifecycleDecisionOutcome {
  const frame = currentInterruptCheckpoint(input.state);
  if (frame === null) {
    return withoutInterruptRoute(
      invalidResult(
        input.state,
        "staleSubject",
        "No interrupt checkpoint is pending.",
      ),
    );
  }
  if (frame.activeInterrupt !== undefined) {
    return withoutInterruptRoute(
      invalidResult(
        input.state,
        "staleSubject",
        "The active interrupt procedure must be resolved before another interrupt decision.",
      ),
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fill.holeId !== INTERRUPT_DECISION_HOLE_ID) {
    return withoutInterruptRoute(
      invalidResult(
        input.state,
        "invalidFill",
        "Interrupt decision fill does not match the pending interrupt checkpoint.",
      ),
    );
  }
  /* v8 ignore stop -- @preserve */

  const responder = input.state.combatants.get(input.fill.value.responderId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    responder === undefined ||
    !unofferedEligibleResponders(frame).includes(input.fill.value.responderId)
  ) {
    return withoutInterruptRoute(
      invalidResult(
        input.state,
        "invalidFill",
        "Interrupt decision responder is not eligible for the pending interrupt checkpoint.",
      ),
    );
  }
  /* v8 ignore stop -- @preserve */

  if (input.fill.value.kind === "decline") {
    return withInterruptRoute(
      advanceInterruptCheckpointAfterResponder({
        state: input.state,
        frame,
        responderId: input.fill.value.responderId,
        execution: input.execution,
      }),
    );
  }

  const admittedChoice = admittedInterruptChoice(frame, input.fill.value);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (admittedChoice === null) {
    return withoutInterruptRoute(
      invalidResult(
        input.state,
        "invalidFill",
        "Interrupt choice is not admitted for the pending interrupt checkpoint.",
      ),
    );
  }
  /* v8 ignore stop -- @preserve */
  const choiceTurnResource = interruptChoiceTurnResource(admittedChoice.choice);
  if (
    choiceTurnResource === "reaction" &&
    !combatantCanTakeReactions(responder)
  ) {
    return withoutInterruptRoute(
      invalidResult(
        input.state,
        "staleSubject",
        "Selected responder cannot currently take a Reaction.",
      ),
    );
  }
  if (admittedChoice.tag === "modifier") {
    const currentChoice = reactionRollOrDamageReductionChoices(
      input.state,
      frame,
    ).find(
      (candidate): candidate is BattleInterruptProcedureModifierChoice =>
        candidate.kind === "reactionModifier" &&
        candidate.responderId === admittedChoice.choice.responderId &&
        candidate.modifier.procedureRef ===
          admittedChoice.choice.modifier.procedureRef &&
        candidate.modifier.kind === admittedChoice.choice.modifier.kind,
    );
    if (currentChoice === undefined) {
      return withoutInterruptRoute(
        invalidResult(
          input.state,
          "staleSubject",
          "The selected Reaction modifier is no longer bound to this responder.",
        ),
      );
    }
    return withInterruptRoute(
      resolveReactionRollOrDamageReduction({
        state: input.state,
        frame,
        choice: currentChoice,
        selection: admittedChoice.selection,
        execution: input.execution,
      }),
    );
  }

  const choice = admittedChoice.choice;

  const activeFrame: BattleInterruptCheckpoint = {
    ...frame,
    activeInterrupt: {
      responderId: input.fill.value.responderId,
      subject: choice.subject,
      fills: admittedChoice.selection.fills,
    },
  };
  copyInterruptCheckpointIdentity(frame, activeFrame);

  const stateWithActiveInterrupt: BattleState = {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack.slice(0, -1),
      interruptCheckpointFrame(activeFrame),
    ],
  };
  const activeState =
    choiceTurnResource === "none"
      ? stateWithActiveInterrupt
      : spendReaction(stateWithActiveInterrupt, input.fill.value.responderId);
  const admission = admitBattleResolutionInput({
    state: activeState,
    subject: choice.subject,
    fills: admittedChoice.selection.fills,
  });
  if (admission.tag === "staleCharacterProcedure") {
    return withInterruptRoute(
      invalidResult(
        activeState,
        "staleSubject",
        "The selected interrupt procedure is no longer bound to its responder.",
      ),
    );
  }
  const interruptResult = input.execution.resolveSubject({
    input: admission.input,
    interruptRouteOptions: { replayingInterruptedProcedure: true },
    [admittedActiveInterruptProcedure]: true,
  });
  return withInterruptRoute(
    completeResolvedActiveInterruptIfPending(interruptResult, input.execution),
  );
}

/**
 * Reconcile an inactive checkpoint after a nested procedure changed state.
 *
 * This intentionally computes choices directly from the post-procedure state;
 * unlike opening a checkpoint, reconciliation does not reserve a resource or
 * restart trigger admission. If no unoffered choice remains, the checkpoint
 * is closed through the same continuation path as an ordinary decline.
 */
export function reconcileInterruptCheckpointAfterStateChange(input: {
  readonly state: BattleState;
  readonly frame: InactiveBattleInterruptCheckpoint;
  readonly execution: InterruptLifecycleExecution;
}): BattleInterruptCheckpointReconciliation {
  const currentFrame = currentInterruptCheckpoint(input.state);
  if (currentFrame === null) {
    return { tag: "notReconcilable", reason: "checkpointMissing" };
  }
  if (currentFrame !== input.frame) {
    return { tag: "notReconcilable", reason: "checkpointChanged" };
  }
  if (currentFrame.activeInterrupt !== undefined) {
    return { tag: "notReconcilable", reason: "activeProcedurePending" };
  }

  const offeredResponders = new Set(input.frame.offeredResponders);
  const choices = interruptChoices(input.state, input.frame).filter(
    (choice) => !offeredResponders.has(interruptChoiceResponderId(choice)),
  );
  const eligibleResponders = [
    ...new Set(choices.map(interruptChoiceResponderId)),
  ];
  const reconciledFrame = reconciledInterruptCheckpoint(
    input.frame,
    choices,
    eligibleResponders,
    input.frame.offeredResponders,
  );
  if (choices.length === 0) {
    return {
      tag: "closed",
      result: closeInterruptCheckpoint({
        state: input.state,
        frame: reconciledFrame,
        execution: input.execution,
      }),
    };
  }
  const nextState: BattleState = {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack.slice(0, -1),
      interruptCheckpointFrame(reconciledFrame),
    ],
  };
  return { tag: "retained", state: nextState, frame: reconciledFrame };
}

function withoutInterruptRoute(
  result: BattleResolutionResult,
): InterruptLifecycleDecisionOutcome {
  return { tag: "withoutInterruptRoute", result };
}

function withInterruptRoute(
  result: BattleResolutionResult,
): InterruptLifecycleDecisionOutcome {
  return { tag: "withInterruptRoute", result };
}

export function resolveActiveInterruptProcedure(input: {
  readonly resolution: AdmittedBattleResolutionInput;
  readonly execution: InterruptLifecycleExecution;
}): BattleResolutionResult {
  const frame = currentInterruptCheckpoint(input.resolution.state);
  const activeInterrupt = frame?.activeInterrupt;
  if (
    activeInterrupt === undefined ||
    !sameBattleSubject(input.resolution.subject, activeInterrupt.subject)
  ) {
    return invalidResult(
      input.resolution.state,
      "staleSubject",
      "A pending interrupt checkpoint must be resolved before the interrupted procedure can continue.",
    );
  }
  // Fixed-target reaction attacks carry their exact target distance in the
  // interrupt selection. Preserve that support fact for each continuation;
  // replaying every selection fill would also replay unrelated choices that
  // the continuation may have already consumed.
  const continuationDistanceFills = activeInterrupt.fills.filter(
    (fill) =>
      fill.kind === "targetSpatialFacts" &&
      fill.spatialFacts.some((fact) => fact.kind === "attackTargetDistance"),
  );
  const continuationResolution = {
    ...input.resolution,
    fills: [...continuationDistanceFills, ...input.resolution.fills],
  };
  const interruptResult = input.execution.resolveSubject({
    input: continuationResolution,
    interruptRouteOptions: {
      replayingInterruptedProcedure: true,
      ...optionalProperty(
        "handledInterruptTrigger",
        activeInterrupt.handledInterruptTrigger,
      ),
      ...(activeInterrupt.pendingAttackDamageReductions === undefined
        ? {}
        : {
            pendingAttackDamageReductions:
              activeInterrupt.pendingAttackDamageReductions,
          }),
      ...(activeInterrupt.pendingAttackDamageAdditions === undefined
        ? {}
        : {
            pendingAttackDamageAdditions:
              activeInterrupt.pendingAttackDamageAdditions,
          }),
    },
    [admittedActiveInterruptProcedure]: true,
  });
  return completeResolvedActiveInterruptIfPending(
    interruptResult,
    input.execution,
  );
}

function resolveReactionRollOrDamageReduction(input: {
  readonly state: BattleState;
  readonly frame: BattleInterruptCheckpoint;
  readonly choice: BattleInterruptProcedureModifierChoice;
  readonly selection: Extract<
    BattleInterruptProcedureSelection,
    { readonly kind: "reactionRollOrDamageReduction" }
  >;
  readonly execution: InterruptLifecycleExecution;
}): BattleResolutionResult {
  const reactor = input.state.combatants.get(input.choice.responderId);
  const sourceProcedure =
    reactor?.origin.kind === "character"
      ? reactor.origin.execution.procedureBindings.find(
          (binding) =>
            binding.procedureRef === input.choice.modifier.procedureRef,
        )?.procedure
      : undefined;
  if (sourceProcedure?.kind !== "unitFeature") {
    return invalidResult(
      input.state,
      "staleSubject",
      "The selected Reaction modifier procedure is no longer bound to this responder.",
    );
  }
  const reductionRoll = reactionModifierReductionRoll(
    input.choice.modifier,
    input.selection.fills,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (reductionRoll.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", reductionRoll.message);
  }
  /* v8 ignore stop -- @preserve */
  const reduction = reductionRoll.value;
  /* v8 ignore start -- @preserve -- Malformed resolution input: these guards reject selections that contradict their admitted trigger-specific choice. */
  if (
    input.choice.modifier.kind === "attackDamageReduction" &&
    input.frame.trigger !== "attackHit"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage reductions must be chosen when the attack roll hits.",
    );
  }
  if (
    input.choice.modifier.kind === "attackDamageReduction" &&
    input.frame.trigger === "attackHit" &&
    (input.choice.responderId !== input.frame.targetId ||
      reactor?.origin.kind !== "character")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage reductions require the damaged character as the reactor.",
    );
  }
  if (
    input.choice.modifier.kind === "damageRollReduction" &&
    (input.frame.trigger !== "attackDamage" ||
      input.frame.continuation.damageInput.kind !== "rolledDamage")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Damage-roll reductions require unresolved rolled attack damage.",
    );
  }
  if (
    input.choice.modifier.kind === "fallDamageReduction" &&
    input.frame.trigger !== "creatureFalls"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Fall damage reductions must be chosen when the creature falls.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spent = spendReactionModifierResource(
    spendReaction(input.state, input.choice.responderId),
    input.choice.responderId,
    sourceProcedure.source,
    input.choice.modifier,
  );
  return advanceInterruptCheckpointAfterResponder({
    state: spent,
    frame: interruptCheckpointAfterReactionModifierCompletion(
      interruptCheckpointAfterModifier(
        input.frame,
        input.choice.responderId,
        input.choice.modifier,
        reduction,
      ),
      input.choice.modifier,
    ),
    responderId: input.choice.responderId,
    execution: input.execution,
  });
}

function advanceInterruptCheckpointAfterResponder(input: {
  readonly state: BattleState;
  readonly frame: BattleInterruptCheckpoint;
  readonly responderId: CombatantId;
  readonly execution: InterruptLifecycleExecution;
  readonly objectOutcomes?: ResolvedObjectOutcomeSource;
}): BattleResolutionResult {
  const completedFrame: BattleInterruptCheckpoint =
    input.frame.trigger === "attackDamage"
      ? (() => {
          const { activeInterrupt: _completedInterrupt, ...inactiveFrame } =
            input.frame;
          return {
            ...inactiveFrame,
            offeredResponders: [
              ...input.frame.offeredResponders,
              input.responderId,
            ],
          };
        })()
      : (() => {
          const { activeInterrupt: _completedInterrupt, ...inactiveFrame } =
            input.frame;
          const continuation = appendObjectOutcomesToContinuation(
            inactiveFrame.continuation,
            input.objectOutcomes,
          );
          return {
            ...inactiveFrame,
            continuation,
            offeredResponders: [
              ...input.frame.offeredResponders,
              input.responderId,
            ],
          };
        })();
  copyInterruptCheckpointIdentity(input.frame, completedFrame);
  const remainingResponders = unofferedEligibleResponders(completedFrame);
  const stackWithoutCurrent = input.state.interruptStack.slice(0, -1);
  if (remainingResponders.length !== 0) {
    const nextState: BattleState = {
      ...input.state,
      interruptStack: [
        ...stackWithoutCurrent,
        interruptCheckpointFrame(completedFrame),
      ],
    };
    return completeResolvedActiveInterruptIfPending(
      {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      },
      input.execution,
    );
  }

  return closeInterruptCheckpoint({
    state: input.state,
    frame: completedFrame,
    execution: input.execution,
  });
}

function completeResolvedActiveInterruptIfPending(
  result: BattleResolutionResult,
  execution: InterruptLifecycleExecution,
  closedFrame?: BattleInterruptCheckpoint,
): BattleResolutionResult {
  if (result.tag !== "resolved") {
    return result;
  }
  const frame = currentInterruptCheckpoint(result.state);
  if (frame === null) return result;
  if (frame.activeInterrupt !== undefined) {
    return completeActiveInterruptProcedure(result.state, execution, result);
  }
  if (closedFrame !== undefined && frame === closedFrame) return result;
  if (!isInactiveInterruptCheckpoint(frame)) return result;
  const reconciliation = reconcileInterruptCheckpointAfterStateChange({
    state: result.state,
    frame,
    execution,
  });
  return Match.value(reconciliation).pipe(
    Match.when({ tag: "retained" }, ({ state }) => ({
      ...result,
      state,
      snapshot: snapshotBattle(state),
    })),
    Match.when({ tag: "closed" }, ({ result: closedResult }) => closedResult),
    Match.when({ tag: "notReconcilable" }, () => result),
    Match.exhaustive,
  );
}

export function isInactiveInterruptCheckpoint(
  frame: BattleInterruptCheckpoint,
): frame is InactiveBattleInterruptCheckpoint {
  return frame.activeInterrupt === undefined;
}

function closeInterruptCheckpoint(input: {
  readonly state: BattleState;
  readonly frame: BattleInterruptCheckpoint;
  readonly execution: InterruptLifecycleExecution;
}): BattleResolutionResult {
  const stackWithoutCurrent = input.state.interruptStack.slice(0, -1);
  const closedState: BattleState = {
    ...input.state,
    interruptStack: interruptStackAfterInterruptCheckpointClosure(
      stackWithoutCurrent,
      input.frame,
    ),
  };
  const continuedState = stateForContinuingInterruptCheckpoint(
    recordHandledInterruptTriggerForActiveInterrupt(
      closedState,
      input.frame.trigger,
    ),
    input.frame,
  );
  const resumed = input.execution.resumeContinuation({
    state: continuedState,
    continuation: input.frame.continuation,
    handledInterruptTrigger: input.frame.trigger,
  });
  return completeResolvedActiveInterruptIfPending(
    resumed,
    input.execution,
    input.frame,
  );
}

function reconciledInterruptCheckpoint(
  frame: InactiveBattleInterruptCheckpoint,
  choices: readonly BattleInterruptProcedureChoice[],
  eligibleResponders: readonly CombatantId[],
  offeredResponders: readonly CombatantId[],
): InactiveBattleInterruptCheckpoint {
  const dynamic = {
    choices,
    eligibleResponders,
    offeredResponders,
  } satisfies Pick<
    BattleInterruptCheckpoint,
    "choices" | "eligibleResponders" | "offeredResponders"
  >;
  const reconciledFrame = Match.value(frame).pipe(
    Match.when({ trigger: "attackHit" }, (triggerFrame) => ({
      ...triggerFrame,
      ...dynamic,
    })),
    Match.when({ trigger: "attackDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...dynamic,
    })),
    Match.when({ trigger: "spellCast" }, (triggerFrame) => ({
      ...triggerFrame,
      ...dynamic,
    })),
    Match.when({ trigger: "saveFailed" }, (triggerFrame) => ({
      ...triggerFrame,
      ...dynamic,
    })),
    Match.when({ trigger: "afterDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...dynamic,
    })),
    Match.when({ trigger: "creatureFalls" }, (triggerFrame) => ({
      ...triggerFrame,
      ...dynamic,
    })),
    Match.when({ trigger: "opportunityAttack" }, (triggerFrame) => ({
      ...triggerFrame,
      ...dynamic,
    })),
    Match.when({ trigger: "reportedReadyTrigger" }, (triggerFrame) => ({
      ...triggerFrame,
      ...dynamic,
    })),
    Match.exhaustive,
  );
  copyInterruptCheckpointIdentity(frame, reconciledFrame);
  return reconciledFrame;
}

function appendObjectOutcomesToContinuation(
  continuation: BattleInterruptedProcedure,
  source: ResolvedObjectOutcomeSource | undefined,
): BattleInterruptedProcedure {
  if (source === undefined) {
    return continuation;
  }
  if (continuation.kind === "replay" || continuation.kind === "resolved") {
    const objectOutcomes = appendObjectOutcomeAccumulation(
      continuation.objectOutcomes,
      source,
    );
    return objectOutcomes === undefined
      ? continuation
      : { ...continuation, objectOutcomes };
  }
  if (
    continuation.kind === "afterDamageSequence" ||
    continuation.kind === "afterDamageSequenceWithPrimaryAttackFollowUp" ||
    continuation.kind === "movementThenAfterDamageSequence"
  ) {
    return {
      ...continuation,
      objectDamages: [
        ...continuation.objectDamages,
        ...(source.objectDamages ?? []),
      ],
      objectIgnitions: [
        ...continuation.objectIgnitions,
        ...(source.objectIgnitions ?? []),
      ],
    };
  }
  // Readied spells are not offered for attack-damage, movement, or command
  // continuations, so those variants have no legal object outcome payload to
  // carry here.
  return continuation;
}

function completeActiveInterruptProcedure(
  state: BattleState,
  execution: InterruptLifecycleExecution,
  objectOutcomes?: ResolvedObjectOutcomeSource,
): BattleResolutionResult {
  const frame = currentInterruptCheckpoint(state);
  const activeInterrupt = frame?.activeInterrupt;
  if (frame === null || activeInterrupt === undefined) {
    return invalidResult(
      state,
      "staleSubject",
      "No active interrupt procedure is pending completion.",
    );
  }
  return advanceInterruptCheckpointAfterResponder({
    state,
    frame,
    responderId: activeInterrupt.responderId,
    execution,
    ...optionalProperty("objectOutcomes", objectOutcomes),
  });
}

function stateForContinuingInterruptCheckpoint(
  state: BattleState,
  frame: BattleInterruptCheckpoint,
): BattleState {
  return frame.trigger === "spellCast" &&
    frame.paymentCommitment.kind === "pendingCasterSpellSlot"
    ? {
        ...state,
        currentTurnResources: releasePendingSpellSlotUseThisTurn(
          state.currentTurnResources,
          frame.casterId,
        ),
      }
    : state;
}

function interruptCheckpointAfterReactionModifierCompletion(
  frame: BattleInterruptCheckpoint,
  choice: BattleReactionModifierChoice,
): BattleInterruptCheckpoint {
  if (
    frame.trigger !== "creatureFalls" ||
    choice.kind !== "fallDamageReduction"
  ) {
    return frame;
  }
  const completedFrame: BattleInterruptCheckpoint = {
    ...frame,
    landingMitigations: [
      ...frame.landingMitigations,
      {
        kind: "fallDamageLandingMitigation",
        targetId: frame.fallingCreatureId,
        reductionAmount: choice.reduction.amount,
      },
    ],
  };
  copyInterruptCheckpointIdentity(frame, completedFrame);
  return completedFrame;
}

function interruptStackAfterInterruptCheckpointClosure(
  stackWithoutCurrent: readonly BattleInterruptFrame[],
  frame: BattleInterruptCheckpoint,
): readonly BattleInterruptFrame[] {
  return frame.trigger !== "creatureFalls" ||
    frame.landingMitigations.length === 0
    ? stackWithoutCurrent
    : [...stackWithoutCurrent, ...frame.landingMitigations];
}

function interruptCheckpointAfterModifier(
  frame: BattleInterruptCheckpoint,
  reactorId: CombatantId,
  choice: BattleReactionModifierChoice,
  reduction: number,
): BattleInterruptCheckpoint {
  if (frame.trigger === "attackHit" && choice.kind === "attackRollReduction") {
    const modifiedFrame: BattleInterruptCheckpoint = {
      ...frame,
      attackRoll: {
        ...frame.attackRoll,
        total: frame.attackRoll.total - reduction,
      },
      continuation:
        frame.continuation.kind === "replay"
          ? {
              ...frame.continuation,
              fills: reactionModifiedAttackRollFills(
                frame.continuation.fills,
                frame.attackRoll.total - reduction,
              ),
            }
          : frame.continuation,
    };
    copyInterruptCheckpointIdentity(frame, modifiedFrame);
    return modifiedFrame;
  }
  if (
    frame.trigger === "attackHit" &&
    choice.kind === "attackDamageReduction" &&
    frame.continuation.kind === "replay" &&
    frame.continuation.glyphStoredSpellReleaseReplay === undefined
  ) {
    const modifiedFrame: BattleInterruptCheckpoint = {
      ...frame,
      continuation: {
        ...frame.continuation,
        attackDamageReductions: [
          ...(frame.continuation.attackDamageReductions ?? []),
          {
            reactorId,
            procedureRef: choice.procedureRef,
            reduction: choice.reduction,
            reductionAmount: reduction,
            ...optionalProperty(
              "zeroDamageRedirect",
              choice.zeroDamageRedirect,
            ),
          },
        ],
      },
    };
    copyInterruptCheckpointIdentity(frame, modifiedFrame);
    return modifiedFrame;
  }
  if (
    frame.trigger === "attackDamage" &&
    choice.kind === "damageRollReduction"
  ) {
    const nextDamageEntries = damageAmountByTypeEntriesAfterScalarReduction(
      attackDamageEventEntries(frame.continuation.damageInput),
      choice.reduction.kind,
      reduction,
    );
    // `damageRollReduction` is admitted only for an unresolved rolled-damage
    // event by reactionRollOrDamageReductionChoiceForProfile and the matching
    // lifecycle guard above. The aggregate event branch is therefore not a
    // reachable runtime state here.
    const nextDamageEvent = {
      kind: "rolledDamage" as const,
      damageRollByType: nextDamageEntries,
    } satisfies BattleAttackDamageEvent;
    const modifiedFrame: BattleInterruptCheckpoint = {
      ...frame,
      continuation: { ...frame.continuation, damageInput: nextDamageEvent },
    };
    copyInterruptCheckpointIdentity(frame, modifiedFrame);
    return modifiedFrame;
  }
  return frame;
}

function reactionModifiedAttackRollFills(
  fills: readonly BattleFill[],
  total: number,
): readonly BattleFill[] {
  return fills.flatMap<BattleFill>((fill) => {
    if (fill.kind === "attackRoll") {
      return [{ ...fill, value: { ...fill.value, total } }];
    }
    return fill.kind === "rolledDice" ||
      fill.kind === "concentrationSavingThrow"
      ? []
      : [fill];
  });
}

type AdmittedInterruptChoice =
  | {
      readonly tag: "modifier";
      readonly choice: BattleInterruptProcedureModifierChoice;
      readonly selection: Extract<
        BattleInterruptProcedureSelection,
        { readonly kind: "reactionRollOrDamageReduction" }
      >;
    }
  | {
      readonly tag: "procedure";
      readonly choice: Extract<
        BattleInterruptProcedureChoice,
        { readonly kind: "nestedProcedure" }
      >;
      readonly selection: Exclude<
        BattleInterruptProcedureSelection,
        { readonly kind: "reactionRollOrDamageReduction" }
      >;
    };

function admittedInterruptChoice(
  frame: BattleInterruptCheckpoint,
  decision: Extract<BattleInterruptDecision, { readonly kind: "resolve" }>,
): AdmittedInterruptChoice | null {
  const choice = frame.choices.find(
    (candidate) =>
      interruptChoiceResponderId(candidate) === decision.responderId &&
      sameInterruptProcedureChoice(
        candidate,
        decision.responderId,
        decision.choice,
      ),
  );
  if (choice === undefined) {
    return null;
  }
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: (nestedChoice) =>
        decision.choice.kind === "reactionRollOrDamageReduction"
          ? null
          : {
              tag: "procedure" as const,
              choice: nestedChoice,
              selection: decision.choice,
            },
      reactionModifier: (modifierChoice) =>
        decision.choice.kind !== "reactionRollOrDamageReduction"
          ? null
          : {
              tag: "modifier" as const,
              choice: modifierChoice,
              selection: decision.choice,
            },
    }),
  );
}

type BattleInterruptChoiceTurnResource = "none" | "reaction";

function interruptChoiceTurnResource(
  choice: BattleInterruptProcedureChoice,
): BattleInterruptChoiceTurnResource {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: ({ subject }) =>
        subject.command === "castAttackHitBonusActionSpell"
          ? ("none" as const)
          : ("reaction" as const),
      reactionModifier: () => "reaction" as const,
    }),
  );
}

function sameInterruptProcedureChoice(
  choice: BattleInterruptProcedureChoice,
  responderId: CombatantId,
  decisionChoice: BattleInterruptProcedureSelection,
): boolean {
  return Match.value(decisionChoice).pipe(
    Match.when(
      { kind: "reactionRollOrDamageReduction" },
      (decision) =>
        choice.kind === "reactionModifier" &&
        choice.responderId === responderId &&
        choice.modifier.procedureRef === decision.procedureRef &&
        choice.modifier.kind === decision.modifierKind,
    ),
    Match.when(
      { kind: "releaseReadiedSpell" },
      (decision) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "releaseReadiedSpell" &&
        choice.subject.readiedSpellCasterId === responderId &&
        choice.subject.procedureRef === decision.procedureRef,
    ),
    Match.when(
      { kind: "releaseReadiedMovement" },
      () =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "releaseReadiedMovement" &&
        choice.subject.readiedMovementActorId === responderId,
    ),
    Match.when(
      { kind: "releaseReadiedAction" },
      () =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "releaseReadiedAction" &&
        choice.subject.reactorId === responderId,
    ),
    Match.when(
      { kind: "releaseReadiedAttack" },
      (decision) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "releaseReadiedAttack" &&
        choice.subject.reactorId === responderId &&
        choice.subject.targetId === decision.targetId &&
        choice.subject.procedureRef === decision.procedureRef,
    ),
    Match.when(
      { kind: "castTriggeredReactionSpell" },
      (decision) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "castTriggeredReactionSpell" &&
        choice.subject.reactorId === responderId &&
        choice.subject.procedureRef === decision.procedureRef,
    ),
    Match.when(
      { kind: "castAttackHitBonusActionSpell" },
      (decision) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "castAttackHitBonusActionSpell" &&
        choice.subject.casterId === responderId &&
        choice.subject.procedureRef === decision.procedureRef,
    ),
    Match.when(
      { kind: "opportunityAttack" },
      (decision) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "opportunityAttack" &&
        choice.subject.reactorId === responderId &&
        interruptAttackExecutionSelectionsEqual(
          choice.subject,
          decision.selection,
        ),
    ),
    Match.when(
      { kind: "retaliationAttack" },
      (decision) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "retaliationAttack" &&
        choice.subject.reactorId === responderId &&
        interruptAttackExecutionSelectionsEqual(
          choice.subject,
          decision.selection,
        ),
    ),
    Match.exhaustive,
  );
}

function recordHandledInterruptTriggerForActiveInterrupt(
  state: BattleState,
  handledInterruptTrigger: BattleInterruptTrigger,
): BattleState {
  const frame = currentInterruptCheckpoint(state);
  if (frame?.activeInterrupt === undefined) {
    return state;
  }
  const handledFrame: BattleInterruptCheckpoint = {
    ...frame,
    activeInterrupt: {
      ...frame.activeInterrupt,
      handledInterruptTrigger,
    },
  };
  copyInterruptCheckpointIdentity(frame, handledFrame);
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, -1),
      interruptCheckpointFrame(handledFrame),
    ],
  };
}
