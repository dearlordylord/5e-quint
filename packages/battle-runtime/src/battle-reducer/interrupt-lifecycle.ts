import { optionalProperty } from "../optional-property.ts";
import { Match } from "effect";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { sameBattleSubject } from "../battle-subjects.ts";
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
  spendReaction,
} from "./interrupt-execution.ts";
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
        candidate.kind === "reactionRollOrDamageReduction" &&
        candidate.reactorId === admittedChoice.choice.reactorId &&
        candidate.choice.procedureRef ===
          admittedChoice.choice.choice.procedureRef &&
        candidate.choice.kind === admittedChoice.choice.choice.kind,
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
  const interruptResult = input.execution.resolveSubject({
    input: input.resolution,
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
  const reactor = input.state.combatants.get(input.choice.reactorId);
  const sourceProcedure =
    reactor?.origin.kind === "character"
      ? reactor.origin.execution.procedureBindings.find(
          (binding) =>
            binding.procedureRef === input.choice.choice.procedureRef,
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
    input.choice.choice,
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
    input.choice.choice.kind === "attackDamageReduction" &&
    input.frame.trigger !== "attackHit"
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage reductions must be chosen when the attack roll hits.",
    );
  }
  if (
    input.choice.choice.kind === "attackDamageReduction" &&
    input.frame.trigger === "attackHit" &&
    (input.choice.reactorId !== input.frame.targetId ||
      reactor?.origin.kind !== "character")
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage reductions require the damaged character as the reactor.",
    );
  }
  if (
    input.choice.choice.kind === "damageRollReduction" &&
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
    input.choice.choice.kind === "fallDamageReduction" &&
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
    spendReaction(input.state, input.choice.reactorId),
    input.choice.reactorId,
    sourceProcedure.source,
    input.choice.choice,
  );
  return advanceInterruptCheckpointAfterResponder({
    state: spent,
    frame: interruptCheckpointAfterReactionModifierCompletion(
      interruptCheckpointAfterModifier(
        input.frame,
        input.choice.reactorId,
        input.choice.choice,
        reduction,
      ),
      input.choice.choice,
    ),
    responderId: input.choice.reactorId,
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
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const closedState: BattleState = {
    ...input.state,
    interruptStack: interruptStackAfterInterruptCheckpointClosure(
      stackWithoutCurrent,
      completedFrame,
    ),
  };
  const continuedState = stateForContinuingInterruptCheckpoint(
    recordHandledInterruptTriggerForActiveInterrupt(
      closedState,
      input.frame.trigger,
    ),
    completedFrame,
  );
  return completeResolvedActiveInterruptIfPending(
    input.execution.resumeContinuation({
      state: continuedState,
      continuation: completedFrame.continuation,
      handledInterruptTrigger: completedFrame.trigger,
    }),
    input.execution,
  );
}

function completeResolvedActiveInterruptIfPending(
  result: BattleResolutionResult,
  execution: InterruptLifecycleExecution,
): BattleResolutionResult {
  if (result.tag !== "resolved") {
    return result;
  }
  return currentInterruptCheckpoint(result.state)?.activeInterrupt === undefined
    ? result
    : completeActiveInterruptProcedure(result.state, execution, result);
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
  return {
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
    return {
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
  }
  if (
    frame.trigger === "attackHit" &&
    choice.kind === "attackDamageReduction" &&
    frame.continuation.kind === "replay" &&
    frame.continuation.glyphStoredSpellReleaseReplay === undefined
  ) {
    return {
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
    return {
      ...frame,
      continuation: { ...frame.continuation, damageInput: nextDamageEvent },
    };
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
      readonly choice: Exclude<
        BattleInterruptProcedureChoice,
        BattleInterruptProcedureModifierChoice
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
      candidate.kind === decision.choice.kind &&
      candidate.reactorId === decision.responderId &&
      sameInterruptProcedureChoice(candidate, decision.choice),
  );
  if (choice === undefined) {
    return null;
  }
  if (
    choice.kind === "reactionRollOrDamageReduction" &&
    decision.choice.kind === "reactionRollOrDamageReduction"
  ) {
    return { tag: "modifier", choice, selection: decision.choice };
  }
  if (
    choice.kind !== "reactionRollOrDamageReduction" &&
    decision.choice.kind !== "reactionRollOrDamageReduction"
  ) {
    return { tag: "procedure", choice, selection: decision.choice };
  }
  return null;
}

type BattleInterruptChoiceTurnResource = "none" | "reaction";

function interruptChoiceTurnResource(
  choice: BattleInterruptProcedureChoice,
): BattleInterruptChoiceTurnResource {
  return Match.value(choice.kind).pipe(
    Match.when("releaseReadiedSpell", () => "reaction" as const),
    Match.when("releaseReadiedMovement", () => "reaction" as const),
    Match.when("releaseReadiedAction", () => "reaction" as const),
    Match.when("releaseReadiedAttack", () => "reaction" as const),
    Match.when("castTriggeredReactionSpell", () => "reaction" as const),
    Match.when("castAttackHitBonusActionSpell", () => "none" as const),
    Match.when("opportunityAttack", () => "reaction" as const),
    Match.when("retaliationAttack", () => "reaction" as const),
    Match.when("reactionRollOrDamageReduction", () => "reaction" as const),
    Match.exhaustive,
  );
}

function sameInterruptProcedureChoice(
  choice: BattleInterruptProcedureChoice,
  decisionChoice: BattleInterruptProcedureSelection,
): boolean {
  return Match.value(decisionChoice).pipe(
    Match.when(
      { kind: "reactionRollOrDamageReduction" },
      (decision) =>
        choice.kind === "reactionRollOrDamageReduction" &&
        choice.choice.procedureRef === decision.procedureRef &&
        choice.choice.kind === decision.modifierKind,
    ),
    Match.when(
      { kind: "releaseReadiedSpell" },
      (decision) =>
        choice.kind === "releaseReadiedSpell" &&
        choice.readiedSpellCasterId === decision.readiedSpellCasterId &&
        choice.subject.tag === "runtimeCommand" &&
        choice.subject.command === "releaseReadiedSpell" &&
        choice.subject.procedureRef === decision.procedureRef,
    ),
    Match.when(
      { kind: "releaseReadiedMovement" },
      (decision) =>
        choice.kind === "releaseReadiedMovement" &&
        choice.readiedMovementActorId === decision.readiedMovementActorId,
    ),
    Match.when(
      { kind: "releaseReadiedAction" },
      (decision) =>
        choice.kind === "releaseReadiedAction" &&
        choice.reactorId === decision.reactorId,
    ),
    Match.when(
      { kind: "releaseReadiedAttack" },
      (decision) =>
        choice.kind === "releaseReadiedAttack" &&
        choice.reactorId === decision.reactorId &&
        choice.subject.command === "releaseReadiedAttack" &&
        choice.subject.targetId === decision.targetId &&
        choice.subject.procedureRef === decision.procedureRef,
    ),
    Match.when(
      { kind: "castTriggeredReactionSpell" },
      (decision) =>
        choice.kind === "castTriggeredReactionSpell" &&
        choice.subject.procedureRef === decision.procedureRef,
    ),
    Match.when(
      { kind: "castAttackHitBonusActionSpell" },
      (decision) =>
        choice.kind === "castAttackHitBonusActionSpell" &&
        choice.subject.procedureRef === decision.procedureRef,
    ),
    Match.when(
      { kind: "opportunityAttack" },
      (decision) =>
        choice.kind === "opportunityAttack" &&
        choice.reactorId === decision.reactorId &&
        choice.subject.command === "opportunityAttack" &&
        interruptAttackExecutionSelectionsEqual(
          choice.subject,
          decision.selection,
        ),
    ),
    Match.when(
      { kind: "retaliationAttack" },
      (decision) =>
        choice.kind === "retaliationAttack" &&
        choice.reactorId === decision.reactorId &&
        choice.subject.command === "retaliationAttack" &&
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
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, -1),
      interruptCheckpointFrame({
        ...frame,
        activeInterrupt: {
          ...frame.activeInterrupt,
          handledInterruptTrigger,
        },
      }),
    ],
  };
}
