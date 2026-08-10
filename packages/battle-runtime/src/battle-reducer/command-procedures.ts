// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route
// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN

import { spellActiveEffectExecutionRef } from "../active-effect/execution-ref.ts";
import { Match } from "effect";
import type {
  AdmittedBattleResolutionInput,
  BattleDroppedObjectOutcome,
  BattleFill,
  BattleInterruptedProcedure,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleResolvedMovement,
  BattleState,
} from "../battle-state-execution.ts";
import {
  type BattleRuntimeCommand,
  type BattleSubject,
} from "../battle-subjects.ts";
import type { BattleCommandOption } from "../active-effect/execution-vocabulary.ts";
import { CombatantId } from "../identity.ts";
import { MOVEMENT_HOLE_ID } from "./battle-runtime-protocol.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { battleSubjectActorId } from "./creature-state-execution.ts";
import { maybeOpenInterruptWindow } from "./interrupt-execution.ts";
import { movementHole } from "./movement-holes.ts";
import {
  parseBattleMovement,
  resolveMovementEffectsAfterMovement,
} from "./movement-procedures.ts";
import {
  isEndTurnFillKind,
  resolveEndTurnCommand,
} from "./turn-boundary-lifecycle.ts";
import {
  battleMovementBudgetForActor,
  combatantCanMoveInState,
  opportunityAttackThreatsForMovement,
} from "./movement-speed.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { applyCommandGrovelProneToTarget } from "./spells-active-effects.ts";
import type { CommandPendingEffect } from "./command-procedure-discovery.ts";
import {
  canonicalHeldObjectIdsForActor,
  commandDropHeldObjectFactsHole,
  commandDropHeldObjectFactsHoleId,
  commandPendingEffectsForActor,
} from "./command-procedure-discovery.ts";

const COMMAND_FOLLOW_UP_BY_OPTION = {
  approach: "commandApproach",
  drop: "commandDrop",
  flee: "commandFlee",
  grovel: "commandGrovel",
  halt: null,
} as const satisfies Record<BattleCommandOption, BattleRuntimeCommand | null>;

type CommandFollowUpCommand = Exclude<
  (typeof COMMAND_FOLLOW_UP_BY_OPTION)[BattleCommandOption],
  null
>;

type CommandFollowUpSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: CommandFollowUpCommand;
  }
>;

export function isCommandFollowUpSubject(
  subject: BattleSubject,
): subject is CommandFollowUpSubject {
  return (
    subject.tag === "runtimeCommand" &&
    Object.values(COMMAND_FOLLOW_UP_BY_OPTION).some(
      (command) => command === subject.command,
    )
  );
}

export function resolveCommandFollowUp(
  input: AdmittedBattleResolutionInput & {
    readonly subject: CommandFollowUpSubject;
  },
): BattleResolutionResult {
  return Match.value(input.subject).pipe(
    Match.when({ command: "commandGrovel" }, (subject) =>
      resolveCommandGrovelCommand({ ...input, subject }),
    ),
    Match.when({ command: "commandDrop" }, (subject) =>
      resolveCommandDropCommand({ ...input, subject }),
    ),
    Match.when({ command: "commandApproach" }, (subject) =>
      resolveCommandApproachCommand({ ...input, subject }),
    ),
    Match.when({ command: "commandFlee" }, (subject) =>
      resolveCommandFleeCommand({ ...input, subject }),
    ),
    Match.exhaustive,
  );
}

export function pendingCommandObligationIssue(
  state: BattleState,
  subject: BattleSubject,
): string | null {
  const actorId = battleSubjectActorId(subject);
  const pendingEffects = commandPendingEffectsForActor(state, actorId).filter(
    (effect) => COMMAND_FOLLOW_UP_BY_OPTION[effect.option] !== null,
  );
  if (pendingEffects.length === 0) return null;
  if (!isCommandFollowUpSubject(subject)) {
    return "A pending Command effect must be resolved before other battle subjects.";
  }
  return pendingEffects.some(
    (effect) =>
      COMMAND_FOLLOW_UP_BY_OPTION[effect.option] === subject.command &&
      spellActiveEffectExecutionRef(effect) === subject.effectRef,
  )
    ? null
    : "A pending Command effect must be resolved before other battle subjects.";
}

type CommandMovementContinuation = Extract<
  BattleInterruptedProcedure,
  {
    readonly kind: "commandApproachMovement" | "commandFleeMovement";
  }
>;

export function isCommandMovementContinuation(
  continuation: BattleInterruptedProcedure,
): continuation is CommandMovementContinuation {
  return (
    continuation.kind === "commandApproachMovement" ||
    continuation.kind === "commandFleeMovement"
  );
}

export function resumeCommandMovementContinuation(
  state: BattleState,
  continuation: CommandMovementContinuation,
): BattleResolutionResult {
  return Match.value(continuation).pipe(
    Match.when({ kind: "commandApproachMovement" }, (approach) =>
      resolveCommandApproachAfterMovement({
        state,
        subject: approach.subject,
        movement: approach.movement,
        movedWithinFiveFeetOfCaster: approach.movedWithinFiveFeetOfCaster,
        endTurnFills: approach.endTurnFills,
      }),
    ),
    Match.when({ kind: "commandFleeMovement" }, (flee) =>
      resolveCommandFleeAfterMovement({
        state,
        subject: flee.subject,
        movement: flee.movement,
        endTurnFills: flee.endTurnFills,
      }),
    ),
    Match.exhaustive,
  );
}

function commandPendingEffectForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command:
        | "commandGrovel"
        | "commandDrop"
        | "commandApproach"
        | "commandFlee";
    }
  >,
  option: CommandPendingEffect["option"],
): CommandPendingEffect | null {
  return (
    commandPendingEffectsForActor(state, subject.actorId).find(
      (effect) =>
        effect.option === option &&
        spellActiveEffectExecutionRef(effect) === subject.effectRef,
    ) ?? null
  );
}

function stateWithoutCommandPendingEffect(
  state: BattleState,
  actorId: CombatantId,
  effect: CommandPendingEffect,
): BattleState {
  const target = state.combatants.get(actorId);
  /* v8 ignore start -- Command subjects are admitted from an actor present in the committed Battle state. */
  if (target === undefined) {
    return state;
  }
  /* v8 ignore stop */
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

function resolveCommandGrovelCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandGrovel";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "grovel",
  );
  /* v8 ignore start -- Malformed resolution request: discovery creates Command Grovel subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Grovel is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const unsupportedFill = input.fills.find(
    (fill) => !isEndTurnFillKind(fill.kind),
  );
  /* v8 ignore start -- Malformed fill set: the discovered Command Grovel subject exposes only the holes belonging to the delegated End Turn resolution. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Grovel only accepts End Turn fills.",
    );
  }
  /* v8 ignore stop */
  const proned = applyCommandGrovelProneToTarget(
    input.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveEndTurnCommand({
    state: proned,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.fills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}

function resolveCommandDropCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandDrop";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "drop",
  );
  /* v8 ignore start -- Malformed resolution request: discovery creates Command Drop subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Drop is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const heldObjectFactFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "heldObjectFacts" }> =>
      fill.kind === "heldObjectFacts",
  );
  /* v8 ignore start -- Malformed fill set: one Command Drop held-object-facts hole cannot be filled more than once. */
  if (heldObjectFactFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts were filled twice.",
    );
  }
  /* v8 ignore stop */
  const unsupportedFill = input.fills.find(
    (fill) => fill.kind !== "heldObjectFacts" && !isEndTurnFillKind(fill.kind),
  );
  /* v8 ignore start -- Malformed fill set: Command Drop exposes only its held-object-facts hole and the delegated End Turn holes. */
  if (unsupportedFill !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop only accepts held-object facts and End Turn fills.",
    );
  }
  /* v8 ignore stop */

  const canonicalObjectIds = canonicalHeldObjectIdsForActor(
    input.state,
    input.subject.actorId,
  );
  /* v8 ignore start -- Malformed fill set: a character actor's admitted loadout is the canonical held-object source, so an external held-object fill would contradict it. */
  if (canonicalObjectIds !== null && heldObjectFactFills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop uses canonical character loadout facts for this actor.",
    );
  }
  /* v8 ignore stop */
  const heldObjectFactFill = heldObjectFactFills[0];
  if (canonicalObjectIds === null && heldObjectFactFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      commandDropHeldObjectFactsHole(input.subject),
    ]);
  }
  /* v8 ignore start -- Malformed fill: the supplied held-object facts must answer the exact hole derived from this discovered Command Drop subject. */
  if (
    heldObjectFactFill !== undefined &&
    heldObjectFactFill.holeId !==
      commandDropHeldObjectFactsHoleId(input.subject)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts must use the selected Command Drop hole.",
    );
  }
  /* v8 ignore stop */
  const objectIds = canonicalObjectIds ?? heldObjectFactFill?.value.objectIds;
  /* v8 ignore start -- Internal protocol invariant: the preceding needsHoles return guarantees either canonical loadout facts or a supplied held-object fill. */
  if (objectIds === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop requires known held-object facts.",
    );
  }
  /* v8 ignore stop */
  const uniqueObjectIds = new Set(objectIds);
  /* v8 ignore start -- Malformed fill: held-object facts represent a set of object identities and therefore cannot repeat an identity. */
  if (uniqueObjectIds.size !== objectIds.length) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Drop held-object facts must not duplicate objects.",
    );
  }
  /* v8 ignore stop */

  const withoutPending = stateWithoutCommandPendingEffect(
    input.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveEndTurnCommand({
    state: withoutPending,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: input.fills.filter((fill) => fill.kind !== "heldObjectFacts"),
  });
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
  if (endTurnResult.tag === "needsHoles") {
    return { ...endTurnResult, state: input.state, subject: input.subject };
  }
  if (endTurnResult.tag === "invalid") {
    return endTurnResult;
  }
  return { ...endTurnResult, droppedObjects };
}

function resolveCommandApproachCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandApproach";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "approach",
  );
  /* v8 ignore start -- Malformed resolution request: discovery creates Command Approach subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Approach is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      /* v8 ignore start -- Malformed fill set: a Command Approach subject with no available movement exposes no fill holes, so callers cannot supply fills. */
      if (input.fills.length > 0) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Command Approach cannot apply fills when no movement is available.",
        );
      }
      /* v8 ignore stop */
      const withoutPending = stateWithoutCommandPendingEffect(
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
  /* v8 ignore start -- Malformed fill set: Command Approach exposes exactly one Movement hole. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach accepts one Movement fill.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0]!;
  /* v8 ignore start -- Malformed fill: the Movement value must answer the sole canonical Movement hole exposed for Command Approach. */
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Command Approach hole.",
    );
  }
  /* v8 ignore stop */
  const approachFact = movementFill.value.commandApproach;
  /* v8 ignore start -- Malformed fill: a Command Approach Movement value must carry the route/proximity facts required by that command. */
  if (approachFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Approach requires caller-supplied shortest/direct route and proximity facts.",
    );
  }
  /* v8 ignore stop */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      kind: "commandApproach",
    },
  );
  /* v8 ignore start -- Malformed fill: parseBattleMovement rejects routes that contradict the actor's admitted position, speed, or Command Approach constraints. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop */
  const extraFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "commandApproachMovement",
          subject: input.subject,
          movement: movement.movement,
          movedWithinFiveFeetOfCaster: approachFact.movedWithinFiveFeetOfCaster,
          endTurnFills: extraFills,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveCommandApproachAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    movedWithinFiveFeetOfCaster: approachFact.movedWithinFiveFeetOfCaster,
    endTurnFills: extraFills,
  });
}

function resolveCommandApproachAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "commandApproach" }
  >;
  readonly movement: BattleResolvedMovement;
  readonly movedWithinFiveFeetOfCaster: boolean;
  readonly endTurnFills: readonly BattleFill[];
}): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "approach",
  );
  /* v8 ignore start -- Malformed continuation: an interrupted Command Approach continuation retains the pending effect from the state that opened its interrupt window. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Approach is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: input.movement,
    extraFills: input.endTurnFills,
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  const withoutPending = stateWithoutCommandPendingEffect(
    movementEffects.state,
    input.subject.actorId,
    effect,
  );
  if (!input.movedWithinFiveFeetOfCaster) {
    /* v8 ignore start -- Malformed continuation fills: Command Approach delegates End Turn holes only when the admitted route reached within five feet of the caster. */
    if (movementEffects.remainingFills.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Command Approach did not end the turn, so End Turn fills do not apply.",
      );
    }
    /* v8 ignore stop */
    return {
      tag: "resolved",
      state: withoutPending,
      snapshot: snapshotBattle(withoutPending),
    };
  }
  const endTurnResult = resolveEndTurnCommand({
    state: withoutPending,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: movementEffects.remainingFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}

function resolveCommandFleeCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "commandFlee";
      }
    >
  >,
): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "flee",
  );
  /* v8 ignore start -- Malformed resolution request: discovery creates Command Flee subjects only from the pending effect retained in this same battle state. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Flee is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const movementFills = input.fills.filter(
    (fill): fill is Extract<BattleFill, { readonly kind: "movement" }> =>
      fill.kind === "movement",
  );
  if (movementFills.length === 0) {
    if (!combatantCanMoveInState(input.state, input.subject.actorId)) {
      const withoutPending = stateWithoutCommandPendingEffect(
        input.state,
        input.subject.actorId,
        effect,
      );
      const endTurnResult = resolveEndTurnCommand({
        state: withoutPending,
        subject: {
          tag: "runtimeCommand",
          actorId: input.subject.actorId,
          command: "endTurn",
        },
        fills: input.fills,
      });
      return endTurnResult.tag === "needsHoles"
        ? { ...endTurnResult, state: input.state, subject: input.subject }
        : endTurnResult;
    }
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  /* v8 ignore start -- Malformed fill set: Command Flee exposes exactly one Movement hole. */
  if (movementFills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee accepts one Movement fill.",
    );
  }
  /* v8 ignore stop */
  const movementFill = movementFills[0]!;
  /* v8 ignore start -- Malformed fill: the Movement value must answer the sole canonical Movement hole exposed for Command Flee. */
  if (movementFill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested Command Flee hole.",
    );
  }
  /* v8 ignore stop */
  const fleeFact = movementFill.value.commandFlee;
  /* v8 ignore start -- Malformed fill: a Command Flee Movement value must carry the fastest-available moving-away route facts required by that command. */
  if (fleeFact === undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee requires caller-supplied fastest-available moving-away route facts.",
    );
  }
  /* v8 ignore stop */
  const movementBudgetFeet = battleMovementBudgetForActor(
    input.state,
    input.subject.actorId,
    movementFill.value.speedKind,
  ).remainingFeet;
  /* v8 ignore start -- Malformed fill: Command Flee requires the route to consume the selected remaining Movement budget exactly. */
  if (movementFill.value.movementCostFeet !== movementBudgetFeet) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Command Flee must spend the selected remaining Movement budget.",
    );
  }
  /* v8 ignore stop */
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    movementFill,
    {
      kind: "commandFlee",
    },
  );
  /* v8 ignore start -- Malformed fill: parseBattleMovement rejects routes that contradict the actor's admitted position, speed, or Command Flee constraints. */
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  /* v8 ignore stop */
  const extraFills = input.fills.filter((fill) => fill.kind !== "movement");
  const threats = opportunityAttackThreatsForMovement(
    input.state,
    movement.movement,
  );
  if (threats.length > 0) {
    const reactionWindow = maybeOpenInterruptWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        threats,
        continuation: {
          kind: "commandFleeMovement",
          subject: input.subject,
          movement: movement.movement,
          endTurnFills: extraFills,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  return resolveCommandFleeAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: movement.movement,
    endTurnFills: extraFills,
  });
}

function resolveCommandFleeAfterMovement(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "commandFlee" }
  >;
  readonly movement: BattleResolvedMovement;
  readonly endTurnFills: readonly BattleFill[];
}): BattleResolutionResult {
  const effect = commandPendingEffectForSubject(
    input.state,
    input.subject,
    "flee",
  );
  /* v8 ignore start -- Malformed continuation: an interrupted Command Flee continuation retains the pending effect from the state that opened its interrupt window. */
  if (effect === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Command Flee is no longer pending for this actor.",
    );
  }
  /* v8 ignore stop */
  const movementEffects = resolveMovementEffectsAfterMovement({
    state: input.state,
    subject: input.subject,
    movement: input.movement,
    extraFills: input.endTurnFills,
  });
  if (movementEffects.tag !== "resolved") {
    return movementEffects;
  }
  const withoutPending = stateWithoutCommandPendingEffect(
    movementEffects.state,
    input.subject.actorId,
    effect,
  );
  const endTurnResult = resolveEndTurnCommand({
    state: withoutPending,
    subject: {
      tag: "runtimeCommand",
      actorId: input.subject.actorId,
      command: "endTurn",
    },
    fills: movementEffects.remainingFills,
  });
  return endTurnResult.tag === "needsHoles"
    ? { ...endTurnResult, state: input.state, subject: input.subject }
    : endTurnResult;
}
