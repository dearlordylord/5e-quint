// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route
// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE

import { spellActiveEffectExecutionRef } from "../effect-execution-ref.ts";
import { Match } from "effect";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  AdmittedBattleResolutionInput,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleObjectOutcomeAccumulation,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleStartTurnOccurrenceSequenceCheckpoint,
  BattleResolvedMovement,
  BattleState,
} from "../battle-state-execution.ts";
import {
  type BattleRuntimeCommand,
  type BattleSubject,
  sameBattleSubject,
} from "../battle-subjects.ts";
import type { BattleCompelledBehaviorOption } from "../active-effect/execution-vocabulary.ts";
import { CombatantId } from "../identity.ts";
import { MOVEMENT_HOLE_ID } from "./battle-runtime-protocol.ts";
import {
  currentInterruptCheckpoint,
  snapshotBattle,
} from "./battle-snapshot.ts";
import { battleSubjectActorId } from "./creature-state-execution.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { movementHole } from "./movement-holes.ts";
import {
  parseBattleMovement,
  resolveMovementEffectsAfterMovement,
} from "./movement-procedures.ts";
import {
  isEndTurnFillKind,
  resolveDelegatedEndTurnCommand,
} from "./turn-boundary-lifecycle.ts";
import {
  battleMovementBudgetForActor,
  combatantCanMoveInState,
  opportunityAttackThreatsForMovement,
} from "./movement-speed.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { applyExecuteCompelledGrovelProneToTarget } from "./spells-active-effects.ts";
import type { CompelledNextTurnBehaviorEffect } from "./compelled-behavior-discovery.ts";
import {
  canonicalHeldObjectIdsForActor,
  executeCompelledDropHeldObjectFactsHole,
  executeCompelledDropHeldObjectFactsHoleId,
  compelledNextTurnBehaviorEffectsForActor,
} from "./compelled-behavior-discovery.ts";

const COMMAND_FOLLOW_UP_BY_OPTION = {
  approach: "executeCompelledApproach",
  drop: "executeCompelledDrop",
  flee: "executeCompelledFlee",
  grovel: "executeCompelledGrovel",
  halt: null,
} as const satisfies Record<
  BattleCompelledBehaviorOption,
  BattleRuntimeCommand | null
>;

type CompelledBehaviorFollowUpCommand = Exclude<
  (typeof COMMAND_FOLLOW_UP_BY_OPTION)[BattleCompelledBehaviorOption],
  null
>;

type CompelledBehaviorFollowUpSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: CompelledBehaviorFollowUpCommand;
  }
>;

type CompelledBehaviorReplayRoute = {
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
  readonly replayParentPosition?: BattleStartTurnOccurrenceSequenceCheckpoint;
  readonly replayObjectOutcomes?: BattleObjectOutcomeAccumulation;
};

type CompelledBehaviorReplayParentPositionFields =
  | { readonly replayParentPosition?: never }
  | {
      readonly replayParentPosition: BattleStartTurnOccurrenceSequenceCheckpoint;
    };

function compelledBehaviorReplayParentPositionFields(
  replayParentPosition: BattleStartTurnOccurrenceSequenceCheckpoint | undefined,
): CompelledBehaviorReplayParentPositionFields {
  return replayParentPosition === undefined ? {} : { replayParentPosition };
}

export function isCompelledBehaviorFollowUpSubject(
  subject: BattleSubject,
): subject is CompelledBehaviorFollowUpSubject {
  return (
    subject.tag === "runtimeCommand" &&
    Object.values(COMMAND_FOLLOW_UP_BY_OPTION).some(
      (command) => command === subject.command,
    )
  );
}

export function resolveCompelledBehaviorFollowUp(
  input: AdmittedBattleResolutionInput & {
    readonly subject: CompelledBehaviorFollowUpSubject;
  } & CompelledBehaviorReplayRoute,
): BattleResolutionResult {
  if (input.replayParentPosition !== undefined) {
    return resolveDelegatedEndTurnCommand(input, {
      state: input.state,
      subject: {
        tag: "runtimeCommand",
        actorId: input.subject.actorId,
        command: "endTurn",
      },
      fills: input.fills.filter((fill) => isEndTurnFillKind(fill.kind)),
    });
  }
  return Match.value(input.subject).pipe(
    Match.when({ command: "executeCompelledGrovel" }, (subject) =>
      resolveExecuteCompelledGrovelCommand({ ...input, subject }),
    ),
    Match.when({ command: "executeCompelledDrop" }, (subject) =>
      resolveExecuteCompelledDropCommand({ ...input, subject }),
    ),
    Match.when({ command: "executeCompelledApproach" }, (subject) =>
      resolveCompelledApproachCommand({ ...input, subject }),
    ),
    Match.when({ command: "executeCompelledFlee" }, (subject) =>
      resolveCompelledFleeCommand({ ...input, subject }),
    ),
    Match.exhaustive,
  );
}

export function pendingCompelledBehaviorObligationIssue(
  state: BattleState,
  subject: BattleSubject,
): string | null {
  const activeInterruptSubject =
    currentInterruptCheckpoint(state)?.activeInterrupt?.subject;
  if (
    activeInterruptSubject !== undefined &&
    sameBattleSubject(subject, activeInterruptSubject)
  ) {
    return null;
  }
  const actorId = battleSubjectActorId(subject);
  const pendingEffects = compelledNextTurnBehaviorEffectsForActor(
    state,
    actorId,
  ).filter((effect) => COMMAND_FOLLOW_UP_BY_OPTION[effect.option] !== null);
  if (pendingEffects.length === 0) return null;
  if (!isCompelledBehaviorFollowUpSubject(subject)) {
    return "A pending compelled behavior effect must be resolved before other battle subjects.";
  }
  return pendingEffects.some(
    (effect) =>
      COMMAND_FOLLOW_UP_BY_OPTION[effect.option] === subject.command &&
      spellActiveEffectExecutionRef(effect) === subject.effectRef,
  )
    ? null
    : "A pending compelled behavior effect must be resolved before other battle subjects.";
}

function compelledNextTurnBehaviorEffectForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "executeCompelledGrovel"
        | "executeCompelledDrop"
        | "executeCompelledApproach"
        | "executeCompelledFlee";
    }
  >,
  option: CompelledNextTurnBehaviorEffect["option"],
): CompelledNextTurnBehaviorEffect | null {
  return (
    compelledNextTurnBehaviorEffectsForActor(state, subject.actorId).find(
      (effect) =>
        effect.option === option &&
        spellActiveEffectExecutionRef(effect) === subject.effectRef,
    ) ?? null
  );
}

function stateWithoutCompelledNextTurnBehaviorEffect(
  state: BattleState,
  actorId: CombatantId,
  effect: CompelledNextTurnBehaviorEffect,
): BattleState {
  const target = state.combatants.get(actorId);
  /* v8 ignore start -- @preserve -- compelled behavior subjects are admitted from an actor present in the committed Battle state. */
  if (target === undefined) {
    return state;
  }
  /* v8 ignore stop -- @preserve */
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...target,
      activeEffects: target.activeEffects.filter(
        (candidate) => candidate !== effect,
      ),
    }),
  };
}

export function resolveCompelledHaltEndTurn(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
    >
  > &
    CompelledBehaviorReplayRoute,
): BattleResolutionResult {
  return resolveDelegatedEndTurnCommand(input, input);
}

function resolveExecuteCompelledGrovelCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "executeCompelledGrovel";
      }
    >
  > &
    CompelledBehaviorReplayRoute,
): BattleResolutionResult {
  const effect = compelledNextTurnBehaviorEffectForSubject(
    input.state,
    input.subject,
    "grovel",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution request: discovery creates compelled grovel behavior subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "compelled grovel behavior is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const unsupportedFill = input.fills.find(
    (fill) => !isEndTurnFillKind(fill.kind),
  );
  /* v8 ignore start -- @preserve -- Malformed fill set: the discovered compelled grovel behavior subject exposes only the holes belonging to the delegated End Turn resolution. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled grovel behavior only accepts End Turn fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const proned = applyExecuteCompelledGrovelProneToTarget(
    input.state,
    input.subject.actorId,
    effect,
  );
  return resolveDelegatedEndTurnCommand(input, {
    state: proned,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.fills,
  });
}

function resolveExecuteCompelledDropCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "executeCompelledDrop";
      }
    >
  > &
    CompelledBehaviorReplayRoute,
): BattleResolutionResult {
  const effect = compelledNextTurnBehaviorEffectForSubject(
    input.state,
    input.subject,
    "drop",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution request: discovery creates compelled drop behavior subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "compelled drop behavior is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const heldObjectFactFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "heldObjectFacts" }> =>
      fill.kind === "heldObjectFacts",
  );
  /* v8 ignore start -- @preserve -- Malformed fill set: one compelled drop behavior held-object-facts hole cannot be filled more than once. */
  if (heldObjectFactFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled drop behavior held-object facts were filled twice.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const unsupportedFill = input.fills.find(
    (fill) => fill.kind !== "heldObjectFacts" && !isEndTurnFillKind(fill.kind),
  );
  /* v8 ignore start -- @preserve -- Malformed fill set: compelled drop behavior exposes only its held-object-facts hole and the delegated End Turn holes. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled drop behavior only accepts held-object facts and End Turn fills.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const canonicalObjectIds = canonicalHeldObjectIdsForActor(
    input.state,
    input.subject.actorId,
  );
  /* v8 ignore start -- @preserve -- Malformed fill set: a character actor's admitted loadout is the canonical held-object source, so an external held-object fill would contradict it. */
  if (canonicalObjectIds !== null && heldObjectFactFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled drop behavior uses canonical character loadout facts for this actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const heldObjectFactFill = heldObjectFactFills[0];
  if (canonicalObjectIds === null && heldObjectFactFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      executeCompelledDropHeldObjectFactsHole(input.subject),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed fill: the supplied held-object facts must answer the exact hole derived from this discovered compelled drop behavior subject. */
  if (
    heldObjectFactFill !== undefined &&
    heldObjectFactFill.holeId !==
      executeCompelledDropHeldObjectFactsHoleId(input.subject)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled drop behavior held-object facts must use the selected compelled drop behavior hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const objectIds = canonicalObjectIds ?? heldObjectFactFill?.value.objectIds;
  /* v8 ignore start -- @preserve -- Internal protocol invariant: the preceding needsHoles return guarantees either canonical loadout facts or a supplied held-object fill. */
  if (objectIds === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled drop behavior requires known held-object facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const uniqueObjectIds = new Set(objectIds);
  /* v8 ignore start -- @preserve -- Malformed fill: held-object facts represent a set of object identities and therefore cannot repeat an identity. */
  if (uniqueObjectIds.size !== objectIds.length) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled drop behavior held-object facts must not duplicate objects.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const droppedObjects: readonly BattleDroppedObjectOutcome[] = objectIds.map(
    (objectId) => ({
      kind: "objectDropped",
      actorId: input.subject.actorId,
      objectId,
      source: {
        kind: "spell",
        sourceCombatantId: effect.sourceCombatantId,
        sourceProcedureRef: effect.sourceProcedureRef,
      },
    }),
  );
  const replayObjectOutcomes: BattleObjectOutcomeAccumulation = {
    droppedObjects,
  };

  const withoutPending = stateWithoutCompelledNextTurnBehaviorEffect(
    input.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveDelegatedEndTurnCommand(
    {
      ...input,
      replayObjectOutcomes,
    },
    {
      state: withoutPending,
      subject: {
        tag: "runtimeCommand",
        actorId: input.subject.actorId,
        command: "endTurn",
      },
      fills: input.fills.filter((fill) => fill.kind !== "heldObjectFacts"),
    },
  );
  return Match.value(endTurnResult).pipe(
    Match.when({ tag: "needsHoles" }, (result) => result),
    Match.when({ tag: "invalid" }, (result) => result),
    Match.when({ tag: "resolved" }, (result) =>
      droppedObjects.length === 0 ? { ...result, droppedObjects } : result,
    ),
    Match.exhaustive,
  );
}

function resolveCompelledApproachCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "executeCompelledApproach";
      }
    >
  > &
    CompelledBehaviorReplayRoute,
): BattleResolutionResult {
  const effect = compelledNextTurnBehaviorEffectForSubject(
    input.state,
    input.subject,
    "approach",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution request: discovery creates compelled approach behavior subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "compelled approach behavior is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      /* v8 ignore start -- @preserve -- Malformed fill set: a compelled approach behavior subject with no available movement exposes no fill holes, so callers cannot supply fills. */
      if (input.fills.length > 0) {
        return invalidResult(
          input.state,
          "invalidFill",
          "compelled approach behavior cannot apply fills when no movement is available.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const withoutPending = stateWithoutCompelledNextTurnBehaviorEffect(
        input.state,
        input.subject.actorId,
        effect,
      );
      return {
        tag: "resolved",
        state: withoutPending,
        snapshot: snapshotBattle(withoutPending),
      };
    }
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed fill set: compelled approach behavior exposes exactly one Movement hole. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled approach behavior accepts one Movement fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementFill = movementFills[0]!;
  /* v8 ignore start -- @preserve -- Malformed fill: the Movement value must answer the sole canonical Movement hole exposed for compelled approach behavior. */
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested compelled approach behavior hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const approachFact = movementFill.value.compelledApproach;
  /* v8 ignore start -- @preserve -- Malformed fill: a compelled approach behavior Movement value must carry the route/proximity facts required by that command. */
  if (approachFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled approach behavior requires caller-supplied shortest/direct route and proximity facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      kind: "compelledApproach",
    },
  );
  /* v8 ignore start -- @preserve -- Malformed fill: parseBattleMovement rejects routes that contradict the actor's admitted position, speed, or compelled approach behavior constraints. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop -- @preserve */
  const extraFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (
    threats.length > 0 &&
    input.handledInterruptTrigger !== "opportunityAttack"
  ) {
    const reactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveCompelledApproachAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    movedWithinFiveFeetOfSource: approachFact.movedWithinFiveFeetOfSource,
    parentFills: input.fills,
    endTurnFills: extraFills,
    ...compelledBehaviorReplayParentPositionFields(input.replayParentPosition),
  });
}

function resolveCompelledApproachAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "executeCompelledApproach";
    }
  >;
  readonly movement: BattleResolvedMovement;
  readonly movedWithinFiveFeetOfSource: boolean;
  readonly parentFills: readonly BattleFill[];
  readonly endTurnFills: readonly BattleFill[];
  readonly replayParentPosition?: BattleStartTurnOccurrenceSequenceCheckpoint;
}): BattleResolutionResult {
  const effect = compelledNextTurnBehaviorEffectForSubject(
    input.state,
    input.subject,
    "approach",
  );
  /* v8 ignore start -- @preserve -- Malformed continuation: an interrupted compelled approach behavior continuation retains the pending effect from the state that opened its interrupt window. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "compelled approach behavior is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: input.movement,
    extraFills: input.endTurnFills,
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  const withoutPending = stateWithoutCompelledNextTurnBehaviorEffect(
    movementEffects.state,
    input.subject.actorId,
    effect,
  );
  if (!input.movedWithinFiveFeetOfSource) {
    /* v8 ignore start -- @preserve -- Malformed continuation fills: compelled approach behavior delegates End Turn holes only when the admitted route reached within five feet of the caster. */
    if (movementEffects.remainingFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "compelled approach behavior did not end the turn, so End Turn fills do not apply.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return {
      tag: "resolved",
      state: withoutPending,
      snapshot: snapshotBattle(withoutPending),
    };
  }
  return resolveDelegatedEndTurnCommand(
    {
      state: input.state,
      subject: input.subject,
      fills: input.parentFills,
      ...compelledBehaviorReplayParentPositionFields(
        input.replayParentPosition,
      ),
    },
    {
      state: withoutPending,
      subject: {
        tag: "runtimeCommand",
        actorId: input.subject.actorId,
        command: "endTurn",
      },
      fills: movementEffects.remainingFills,
    },
  );
}

function resolveCompelledFleeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "executeCompelledFlee";
      }
    >
  > &
    CompelledBehaviorReplayRoute,
): BattleResolutionResult {
  const effect = compelledNextTurnBehaviorEffectForSubject(
    input.state,
    input.subject,
    "flee",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution request: discovery creates compelled flee behavior subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "compelled flee behavior is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      const withoutPending = stateWithoutCompelledNextTurnBehaviorEffect(
        input.state,
        input.subject.actorId,
        effect,
      );
      return resolveDelegatedEndTurnCommand(input, {
        state: withoutPending,
        subject: {
          tag: "runtimeCommand",
          actorId: input.subject.actorId,
          command: "endTurn",
        },
        fills: input.fills,
      });
    }
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed fill set: compelled flee behavior exposes exactly one Movement hole. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled flee behavior accepts one Movement fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementFill = movementFills[0]!;
  /* v8 ignore start -- @preserve -- Malformed fill: the Movement value must answer the sole canonical Movement hole exposed for compelled flee behavior. */
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested compelled flee behavior hole.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const fleeFact = movementFill.value.compelledFlee;
  /* v8 ignore start -- @preserve -- Malformed fill: a compelled flee behavior Movement value must carry the fastest-available moving-away route facts required by that command. */
  if (fleeFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled flee behavior requires caller-supplied fastest-available moving-away route facts.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementBudgetFeet = battleMovementBudgetForActor(
    input.state,
    input.subject.actorId,
    movementFill.value.speedKind,
  ).remainingFeet;
  /* v8 ignore start -- @preserve -- Malformed fill: compelled flee behavior requires the route to consume the selected remaining Movement budget exactly. */
  if (movementFill.value.movementCostFeet !== movementBudgetFeet) {
    return invalidResult(
      input.state,
      "invalidFill",
      "compelled flee behavior must spend the selected remaining Movement budget.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      kind: "compelledFlee",
    },
  );
  /* v8 ignore start -- @preserve -- Malformed fill: parseBattleMovement rejects routes that contradict the actor's admitted position, speed, or compelled flee behavior constraints. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop -- @preserve */
  const extraFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (
    threats.length > 0 &&
    input.handledInterruptTrigger !== "opportunityAttack"
  ) {
    const reactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveCompelledFleeAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    parentFills: input.fills,
    endTurnFills: extraFills,
    ...compelledBehaviorReplayParentPositionFields(input.replayParentPosition),
  });
}

function resolveCompelledFleeAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "executeCompelledFlee" }
  >;
  readonly movement: BattleResolvedMovement;
  readonly parentFills: readonly BattleFill[];
  readonly endTurnFills: readonly BattleFill[];
  readonly replayParentPosition?: BattleStartTurnOccurrenceSequenceCheckpoint;
}): BattleResolutionResult {
  const effect = compelledNextTurnBehaviorEffectForSubject(
    input.state,
    input.subject,
    "flee",
  );
  /* v8 ignore start -- @preserve -- Malformed continuation: an interrupted compelled flee behavior continuation retains the pending effect from the state that opened its interrupt window. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "compelled flee behavior is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: input.movement,
    extraFills: input.endTurnFills,
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  const withoutPending = stateWithoutCompelledNextTurnBehaviorEffect(
    movementEffects.state,
    input.subject.actorId,
    effect,
  );
  return resolveDelegatedEndTurnCommand(
    {
      state: input.state,
      subject: input.subject,
      fills: input.parentFills,
      ...compelledBehaviorReplayParentPositionFields(
        input.replayParentPosition,
      ),
    },
    {
      state: withoutPending,
      subject: {
        tag: "runtimeCommand",
        actorId: input.subject.actorId,
        command: "endTurn",
      },
      fills: movementEffects.remainingFills,
    },
  );
}
