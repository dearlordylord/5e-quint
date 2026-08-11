import { Match } from "effect";
import type { DamageAmount } from "@dnd/shared/types";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { sameBattleSubject, type BattleSubject } from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import type {
  BattleAfterDamageEvent,
  BattleAttackDamageContinuationConcentrationFrame,
  BattleAttackDamageContinuationCunningStrikeFrame,
  BattleAttackDamageContinuationWithoutConcentration,
  BattleConcentrationSavingThrowHole,
  BattleCunningStrikeContinuationFill,
  BattleFill,
  BattleInterruptedProcedure,
  BattleInterruptFrame,
  BattleResolutionResult,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type {
  BattleAttackResolvers,
  BattleAttackRouteResolvers,
} from "./attack-resolvers.ts";
import { battleFillPrefixAccumulated } from "./battle-fill-equality.ts";
import { currentInterruptFrame, snapshotBattle } from "./battle-snapshot.ts";
import { applyBattleMovement } from "./battle-movement.ts";
import {
  attackDamageEventAmountForTarget,
  battleAttackHostParticipantId,
} from "./attack-damage-events.ts";
import {
  applyAttackDamageAmount,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowHoles,
} from "./damage-apply.ts";
import { resolveCunningStrikeAfterAttackDamage } from "./cunning-strike.ts";
import { d20TestNaturalOneRerollOutcomeIssue } from "./d20-test-natural-one-reroll.ts";
import {
  attackDamageContinuationConcentrationFrame,
  openAfterDamageSequenceInterruptWindow,
  openPrimaryAttackAfterDamageSequenceInterruptWindow,
} from "./interrupt-execution.ts";
import { resolveMoveAfterMovement } from "./movement-procedures.ts";
import { needsHolesResult } from "./needs-holes-result.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  ReplayContinuationExecution,
  resolveReplayContinuation,
  resolveReplayContinuationFromState,
} from "./replay-continuation.ts";
import { mergeObjectOutcomeResult } from "./object-outcome-accumulation.ts";

export function resumeInterruptedProcedure(
  state: BattleState,
  continuation: Exclude<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >,
  handledInterruptTrigger: BattleInterruptTrigger,
  attackResolvers: BattleAttackResolvers,
): BattleResolutionResult {
  if (continuation.kind === "resolved") {
    return mergeObjectOutcomeResult(
      {
        tag: "resolved",
        state,
        snapshot: snapshotBattle(state),
      },
      continuation.objectOutcomes,
    );
  }
  if (continuation.kind === "afterDamageSequence") {
    return openAfterDamageSequenceInterruptWindow({
      state,
      subject: continuation.subject,
      events: continuation.events,
      objectDamages: continuation.objectDamages,
      objectIgnitions: continuation.objectIgnitions,
      droppedObjects: continuation.droppedObjects,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
    });
  }
  if (continuation.kind === "afterDamageSequenceWithPrimaryAttackFollowUp") {
    return openPrimaryAttackAfterDamageSequenceInterruptWindow({
      state,
      subject: continuation.subject,
      firstTargetId: continuation.firstTargetId,
      attack: continuation.attack,
      fills: continuation.fills,
      events: continuation.events,
      objectDamages: continuation.objectDamages,
      objectIgnitions: continuation.objectIgnitions,
      droppedObjects: continuation.droppedObjects,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
      attackResolvers,
    });
  }
  if (continuation.kind === "weaponMasteryCleave") {
    return attackResolvers.resolveWeaponMasteryCleaveContinuation({
      state,
      subject: continuation.subject,
      firstTargetId: continuation.firstTargetId,
      attack: continuation.attack,
      fills: continuation.fills,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
    });
  }
  if (continuation.kind === "huntersPreyHordeBreaker") {
    return attackResolvers.resolveHuntersPreyHordeBreakerContinuation({
      state,
      subject: continuation.subject,
      firstTargetId: continuation.firstTargetId,
      attack: continuation.attack,
      fills: continuation.fills,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
    });
  }
  if (continuation.kind === "movement") {
    return resolveMoveAfterMovement({
      state,
      subject: continuation.subject,
      movement: continuation.movement,
      remainingFills: [],
    });
  }
  if (continuation.kind === "movementThenAfterDamageSequence") {
    return openAfterDamageSequenceInterruptWindow({
      state: applyBattleMovement(state, continuation.movement),
      subject: continuation.subject,
      events: continuation.events,
      objectDamages: continuation.objectDamages,
      objectIgnitions: continuation.objectIgnitions,
      droppedObjects: continuation.droppedObjects,
      handledInterruptTrigger:
        handledInterruptTrigger === "afterDamage"
          ? undefined
          : handledInterruptTrigger,
    });
  }
  if (continuation.kind === "attackDamage") {
    const damageAmount = attackDamageContinuationAmount(state, continuation);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageAmount === null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        state,
        "invalidFill",
        "Attack damage target is no longer available.",
      );
    }
    /* v8 ignore stop */
    const concentrationPending = attackDamageContinuationConcentrationHole(
      state,
      continuation,
    );
    if (concentrationPending !== null) {
      const pendingState = {
        ...state,
        interruptStack: [
          ...state.interruptStack,
          attackDamageContinuationConcentrationFrame(
            continuation,
            handledInterruptTrigger,
          ),
        ],
      };
      return needsHolesResult(pendingState, continuation.participant, [
        concentrationPending,
      ]);
    }
    const continuationConcentrationSavingThrows =
      attackDamageContinuationConcentrationFills(continuation);
    const damagedState = applyAttackDamageAmount({
      state,
      attackerId: attackDamageInterruptionParticipantId(continuation),
      targetId: continuation.target.combatantId,
      damageAmount,
      deathFailuresAtZeroHp: attackDamageDeathFailuresAtZeroHp(continuation),
      damageDisposition: continuation.continuation.damageDisposition,
      attackDamageRiders: continuation.continuation.attackDamageRiders,
      weaponDamageDiceRollChoice:
        continuation.continuation.weaponDamageDiceRollChoice,
      concentrationSavingThrow: attackDamageContinuationTargetConcentrationFill(
        state,
        continuation,
      ),
      wardingBondDamageShareConcentrationSavingThrows:
        continuationConcentrationSavingThrows,
      spatialFacts: attackDamageContinuationTargetSpatialFacts(continuation),
      relationshipDecisions: continuation.continuation.relationshipDecisions,
    });
    const afterDamageEvent = {
      damageSourceId: attackDamageInterruptionParticipantId(continuation),
      damagedId: continuation.target.combatantId,
      damageAmount,
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: attackDamageContinuationTargetSpatialFacts(continuation),
        damagedId: continuation.target.combatantId,
        damageSourceId: attackDamageInterruptionParticipantId(continuation),
      }),
    } satisfies BattleAfterDamageEvent;
    return resolveAttackDamageContinuationCunningStrike({
      state: damagedState,
      frame: {
        kind: "attackDamageContinuationCunningStrike",
        continuation,
        afterDamageEvent,
        handledInterruptTrigger,
      },
      subject: continuation.participant,
      fills: attackDamageContinuationCunningStrikePrefixFills(continuation),
      attackResolvers,
    });
  }

  continuation satisfies never;
  throw new Error("Unhandled interrupted procedure variant.");
}

export class InterruptContinuationExecution {
  private constructor(
    private readonly replayExecution: ReplayContinuationExecution,
    private readonly attackResolvers: BattleAttackRouteResolvers,
  ) {}

  static fromExecution(
    replayExecution: ReplayContinuationExecution,
    attackResolvers: BattleAttackRouteResolvers,
  ): InterruptContinuationExecution {
    return new InterruptContinuationExecution(replayExecution, attackResolvers);
  }

  execute(input: {
    readonly state: BattleState;
    readonly continuation: BattleInterruptedProcedure;
    readonly handledInterruptTrigger: BattleInterruptTrigger;
  }): BattleResolutionResult {
    return input.continuation.kind === "replay"
      ? resolveReplayContinuationFromState({
          state: input.state,
          continuation: input.continuation,
          handledInterruptTrigger: input.handledInterruptTrigger,
          fills: input.continuation.fills,
          execution: this.replayExecution,
        })
      : resumeInterruptedProcedure(
          input.state,
          input.continuation,
          input.handledInterruptTrigger,
          this.attackResolvers,
        );
  }

  resolveActiveReplay(input: {
    readonly state: BattleState;
    readonly subject: BattleSubject;
    readonly fills: readonly BattleFill[];
  }): BattleResolutionResult {
    return resolveReplayContinuation({
      ...input,
      execution: this.replayExecution,
    });
  }

  resolveAttackDamageConcentration(
    input: Omit<
      Parameters<typeof resolveAttackDamageContinuationConcentration>[0],
      "attackResolvers"
    >,
  ): BattleResolutionResult {
    return resolveAttackDamageContinuationConcentration({
      ...input,
      attackResolvers: this.attackResolvers,
    });
  }

  resolveAttackDamageCunningStrike(
    input: Omit<
      Parameters<typeof resolveAttackDamageContinuationCunningStrike>[0],
      "attackResolvers"
    >,
  ): BattleResolutionResult {
    return resolveAttackDamageContinuationCunningStrike({
      ...input,
      attackResolvers: this.attackResolvers,
    });
  }
}

type ActiveInterruptContinuationResolution =
  | {
      readonly tag: "notActiveContinuation";
      readonly frame: Exclude<
        BattleInterruptFrame,
        | { readonly kind: "attackDamageContinuationConcentration" }
        | { readonly kind: "attackDamageContinuationCunningStrike" }
        | { readonly kind: "replayContinuation" }
      >;
    }
  | {
      readonly tag: "resolved";
      readonly result: BattleResolutionResult;
    };

const byInterruptFrameKind = Match.discriminator("kind");
const byAttackDamageContinuationKind = Match.discriminator("kind");

export function resolveActiveInterruptContinuation(input: {
  readonly state: BattleState;
  readonly frame: BattleInterruptFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly execution: InterruptContinuationExecution;
}): ActiveInterruptContinuationResolution {
  return Match.value(input.frame).pipe(
    byInterruptFrameKind("attackDamageContinuationConcentration", (frame) => {
      if (!sameBattleSubject(input.subject, frame.continuation.participant)) {
        return activeContinuationResult(
          invalidResult(
            input.state,
            "staleSubject",
            "Attack damage Concentration save must be resolved before other battle subjects.",
          ),
        );
      }
      return activeContinuationResult(
        input.execution.resolveAttackDamageConcentration({
          state: input.state,
          frame,
          subject: input.subject,
          fills: input.fills,
        }),
      );
    }),
    byInterruptFrameKind("attackDamageContinuationCunningStrike", (frame) => {
      /* v8 ignore start -- Defensive stale-subject rejection: legal continuation discovery exposes only the stored Cunning Strike participant while this frame is active. */
      if (!sameBattleSubject(input.subject, frame.continuation.participant)) {
        /* v8 ignore next -- Malformed resolution input: this branch rejects a subject that contradicts the admitted active continuation frame. */
        return activeContinuationResult(
          invalidResult(
            input.state,
            "staleSubject",
            "Cunning Strike after-damage effect must be resolved before other battle subjects.",
          ),
        );
      }
      /* v8 ignore stop */
      return activeContinuationResult(
        input.execution.resolveAttackDamageCunningStrike({
          state: input.state,
          frame,
          subject: input.subject,
          fills: input.fills,
        }),
      );
    }),
    byInterruptFrameKind("replayContinuation", () =>
      activeContinuationResult(
        input.execution.resolveActiveReplay({
          state: input.state,
          subject: input.subject,
          fills: input.fills,
        }),
      ),
    ),
    byInterruptFrameKind("interruptCheckpoint", (frame) =>
      notActiveContinuation(frame),
    ),
    byInterruptFrameKind("flySpeedGrantEndFallCleanup", (frame) =>
      notActiveContinuation(frame),
    ),
    byInterruptFrameKind("fallDamageLandingMitigation", (frame) =>
      notActiveContinuation(frame),
    ),
    Match.exhaustive,
  );
}

function activeContinuationResult(
  result: BattleResolutionResult,
): ActiveInterruptContinuationResolution {
  return { tag: "resolved", result };
}

function notActiveContinuation(
  frame: Extract<
    BattleInterruptFrame,
    {
      readonly kind:
        | "interruptCheckpoint"
        | "flySpeedGrantEndFallCleanup"
        | "fallDamageLandingMitigation";
    }
  >,
): ActiveInterruptContinuationResolution {
  return { tag: "notActiveContinuation", frame };
}

export function resolveInterruptContinuation(input: {
  readonly state: BattleState;
  readonly continuation: BattleInterruptedProcedure;
  readonly handledInterruptTrigger: BattleInterruptTrigger;
  readonly execution: InterruptContinuationExecution;
}): BattleResolutionResult {
  return input.execution.execute(input);
}

function resolveAttackDamageContinuationCunningStrike(input: {
  readonly state: BattleState;
  readonly frame: BattleAttackDamageContinuationCunningStrikeFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly attackResolvers: BattleAttackResolvers;
}): BattleResolutionResult {
  const continuation = input.frame.continuation;
  if (continuation.continuation.cunningStrike === undefined) {
    return openAttackDamageAfterDamageSequence({
      state: input.state,
      frame: input.frame,
      attackResolvers: input.attackResolvers,
    });
  }
  const stateWithoutCurrentFrame =
    currentInterruptFrame(input.state)?.kind ===
    "attackDamageContinuationCunningStrike"
      ? {
          ...input.state,
          interruptStack: input.state.interruptStack.slice(0, -1),
        }
      : input.state;
  const nextFill = attackDamageContinuationCunningStrikeFill(
    input.frame,
    input.fills,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (nextFill.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", nextFill.message);
  }
  /* v8 ignore stop */
  const cunningStrike = {
    ...continuation.continuation.cunningStrike,
    fills:
      nextFill.value === undefined
        ? continuation.continuation.cunningStrike.fills
        : [...continuation.continuation.cunningStrike.fills, nextFill.value],
  };
  const fillSet = attackDamageContinuationCunningStrikeFillSet(
    cunningStrike.fills,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop */
  const resolved = resolveCunningStrikeAfterAttackDamage({
    state: stateWithoutCurrentFrame,
    selected: cunningStrike.selected,
    savingThrow: fillSet.savingThrow,
    movement: fillSet.movement,
    toolPossession: fillSet.toolPossession,
    endTurnCover: fillSet.endTurnCover,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (resolved.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", resolved.message);
  }
  /* v8 ignore stop */
  if (resolved.tag === "needsHoles") {
    const pendingFrame: BattleAttackDamageContinuationCunningStrikeFrame = {
      ...input.frame,
      continuation: {
        ...continuation,
        continuation: {
          ...continuation.continuation,
          cunningStrike,
        },
      },
    };
    const pendingState = {
      ...stateWithoutCurrentFrame,
      interruptStack: [
        ...stateWithoutCurrentFrame.interruptStack,
        pendingFrame,
      ],
    };
    return needsHolesResult(pendingState, input.subject, resolved.holes);
  }
  return openAttackDamageAfterDamageSequence({
    state: resolved.state,
    frame: input.frame,
    attackResolvers: input.attackResolvers,
  });
}

function openAttackDamageAfterDamageSequence(input: {
  readonly state: BattleState;
  readonly frame: BattleAttackDamageContinuationCunningStrikeFrame;
  readonly attackResolvers: BattleAttackResolvers;
}): BattleResolutionResult {
  const continuation = input.frame.continuation;
  const common = {
    state: input.state,
    subject: continuation.participant,
    events: [input.frame.afterDamageEvent],
    objectDamages: [],
    objectIgnitions: [],
    droppedObjects: [],
    handledInterruptTrigger: input.frame.handledInterruptTrigger,
  } as const;
  return Match.value(continuation.continuation).pipe(
    byAttackDamageContinuationKind("primaryAttackDamage", (primary) =>
      openPrimaryAttackAfterDamageSequenceInterruptWindow({
        ...common,
        firstTargetId: continuation.target.combatantId,
        attack: primary.attack,
        fills: primary.fills,
        attackResolvers: input.attackResolvers,
      }),
    ),
    byAttackDamageContinuationKind("damageOnly", () =>
      openAfterDamageSequenceInterruptWindow(common),
    ),
    Match.exhaustive,
  );
}

function attackDamageContinuationTargetSpatialFacts(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): readonly BattleTargetSpatialFact[] {
  return continuation.target.spatialFacts;
}

function attackDamageInterruptionParticipantId(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): CombatantId {
  return battleAttackHostParticipantId(continuation.participant);
}

function attackDamageDeathFailuresAtZeroHp(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): 1 | 2 {
  return Match.value(continuation.criticalConsequence.kind).pipe(
    Match.when("ordinaryHit", (): 1 => 1),
    Match.when("criticalHit", (): 2 => 2),
    Match.exhaustive,
  );
}

function attackDamageContinuationAmount(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): DamageAmount | null {
  const target = state.combatants.get(continuation.target.combatantId);
  return target === undefined
    ? null
    : attackDamageEventAmountForTarget(state, target, continuation.damageInput);
}

function attackDamageContinuationConcentrationHole(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): BattleConcentrationSavingThrowHole | null {
  const target = state.combatants.get(continuation.target.combatantId);
  if (target === undefined) {
    return null;
  }
  const damageAmount = Number(
    attackDamageEventAmountForTarget(state, target, continuation.damageInput),
  );
  const fills = attackDamageContinuationConcentrationFills(continuation);
  return (
    damageLifecycleConcentrationSavingThrowHoles({
      state,
      target,
      damageAmount,
    }).find((hole) => !fills.some((fill) => fill.holeId === hole.holeId)) ??
    null
  );
}

function attackDamageContinuationTargetConcentrationFill(
  state: BattleState,
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
):
  | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
  | undefined {
  const target = state.combatants.get(continuation.target.combatantId);
  if (target === undefined) {
    return undefined;
  }
  const hole = concentrationSavingThrowHole(
    target,
    Number(
      attackDamageEventAmountForTarget(state, target, continuation.damageInput),
    ),
  );
  return hole === null
    ? undefined
    : attackDamageContinuationConcentrationFills(continuation).find(
        (fill) => fill.holeId === hole.holeId,
      );
}

function attackDamageContinuationConcentrationFills(
  continuation: Extract<
    BattleInterruptedProcedure,
    { readonly kind: "attackDamage" }
  >,
): readonly Extract<
  BattleFill,
  { readonly kind: "concentrationSavingThrow" }
>[] {
  return continuation.continuation.concentrationSavingThrows;
}

function resolveAttackDamageContinuationConcentration(input: {
  readonly state: BattleState;
  readonly frame: BattleAttackDamageContinuationConcentrationFrame;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
  readonly attackResolvers: BattleAttackRouteResolvers;
}): BattleResolutionResult {
  const concentrationSave = attackDamageContinuationConcentrationHole(
    input.state,
    input.frame.continuation,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSave === null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw is no longer available for the damaged target.",
    );
  }
  /* v8 ignore stop */
  const concentrationFill = attackDamageContinuationConcentrationFill(
    input.frame.continuation,
    input.fills,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFill.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", concentrationFill.message);
  }
  /* v8 ignore stop */
  if (concentrationFill.value === undefined) {
    return needsHolesResult(input.state, input.subject, [concentrationSave]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationFill.value.holeId !== concentrationSave.holeId) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill does not match the damaged target.",
    );
  }
  /* v8 ignore stop */
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollOutcomeIssue({
    actor: input.state.combatants.get(concentrationSave.combatantId),
    rollMode: concentrationSave.rollMode,
    rolledD20s: concentrationFill.value.value.rolledD20s,
    originalNaturalD20:
      concentrationFill.value.value.naturalD20 === undefined
        ? undefined
        : Number(concentrationFill.value.value.naturalD20),
    decision: concentrationFill.value.value.d20TestNaturalOneReroll,
    withoutRoll: concentrationFill.value.value.withoutRoll,
    succeeded: concentrationFill.value.value.succeeded,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop */
  const stateWithoutFrame = {
    ...input.state,
    interruptStack: input.state.interruptStack.slice(0, -1),
  };
  return resumeInterruptedProcedure(
    stateWithoutFrame,
    {
      ...input.frame.continuation,
      continuation: {
        ...input.frame.continuation.continuation,
        concentrationSavingThrows: [
          ...attackDamageContinuationConcentrationFills(
            input.frame.continuation,
          ),
          concentrationFill.value,
        ],
      },
    },
    input.frame.handledInterruptTrigger,
    input.attackResolvers,
  );
}

function attackDamageContinuationConcentrationFill(
  continuation: BattleAttackDamageContinuationWithoutConcentration,
  fills: readonly BattleFill[],
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const prefix = attackDamageContinuationConcentrationFills(continuation);
  const submitted = fills.filter(
    (
      fill,
    ): fill is Extract<
      BattleFill,
      { readonly kind: "concentrationSavingThrow" }
    > => fill.kind === "concentrationSavingThrow",
  );
  const accumulated = battleFillPrefixAccumulated(prefix, submitted);
  const remaining = accumulated ? submitted.slice(prefix.length) : submitted;
  if (remaining.length === 0) {
    /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
    return { tag: "ok", value: undefined };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    remaining.length !== 1 ||
    remaining[0]?.kind !== "concentrationSavingThrow"
  ) {
    /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
    return {
      tag: "invalid",
      message:
        "Attack damage Concentration continuation accepts the pending Concentration Saving Throw after the original attack fills.",
    };
  }
  /* v8 ignore stop */
  return { tag: "ok", value: remaining[0] };
}

function attackDamageContinuationCunningStrikeFill(
  frame: BattleAttackDamageContinuationCunningStrikeFrame,
  fills: readonly BattleFill[],
):
  | {
      readonly tag: "ok";
      readonly value: BattleCunningStrikeContinuationFill | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  const prefix = frame.continuation.continuation.cunningStrike?.fills ?? [];
  const submitted = fills.filter(isCunningStrikeContinuationFill);
  const accumulated = battleFillPrefixAccumulated(prefix, submitted);
  const remaining = accumulated ? submitted.slice(prefix.length) : submitted;
  if (remaining.length === 0) {
    /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
    return { tag: "ok", value: undefined };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    remaining.length !== 1 ||
    !isCunningStrikeContinuationFill(remaining[0]!)
  ) {
    /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
    return {
      tag: "invalid",
      message:
        "Cunning Strike continuation accepts one requested Cunning Strike after-damage fill after the original attack fills.",
    };
  }
  /* v8 ignore stop */
  return { tag: "ok", value: remaining[0] };
}

function attackDamageContinuationCunningStrikePrefixFills(
  continuation: BattleAttackDamageContinuationWithoutConcentration,
): readonly BattleFill[] {
  return [
    ...attackDamageContinuationConcentrationFills(continuation),
    ...(continuation.continuation.cunningStrike?.fills ?? []),
  ];
}

function isCunningStrikeContinuationFill(
  fill: BattleFill,
): fill is BattleCunningStrikeContinuationFill {
  return (
    fill.kind === "savingThrowOutcome" ||
    fill.kind === "movement" ||
    fill.kind === "toolPossessionFacts" ||
    fill.kind === "cunningStrikeEndTurnCoverFacts"
  );
}

function attackDamageContinuationCunningStrikeFillSet(
  fills: readonly BattleCunningStrikeContinuationFill[],
):
  | {
      readonly tag: "ok";
      readonly savingThrow:
        | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
        | undefined;
      readonly movement:
        | Extract<BattleFill, { readonly kind: "movement" }>
        | undefined;
      readonly toolPossession:
        | Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>
        | undefined;
      readonly endTurnCover:
        | Extract<
            BattleFill,
            { readonly kind: "cunningStrikeEndTurnCoverFacts" }
          >
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let savingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let movement: Extract<BattleFill, { readonly kind: "movement" }> | undefined;
  let toolPossession:
    | Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>
    | undefined;
  let endTurnCover:
    | Extract<BattleFill, { readonly kind: "cunningStrikeEndTurnCoverFacts" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "savingThrowOutcome") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (savingThrow !== undefined) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return {
          tag: "invalid",
          message: "Cunning Strike Saving Throw was filled twice.",
        };
      }
      /* v8 ignore stop */
      savingThrow = fill;
      continue;
    }
    if (fill.kind === "movement") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (movement !== undefined) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return {
          tag: "invalid",
          message: "Cunning Strike movement was filled twice.",
        };
      }
      /* v8 ignore stop */
      movement = fill;
      continue;
    }
    if (fill.kind === "cunningStrikeEndTurnCoverFacts") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (endTurnCover !== undefined) {
        /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
        return {
          tag: "invalid",
          message: "Cunning Strike end-turn cover facts were filled twice.",
        };
      }
      /* v8 ignore stop */
      endTurnCover = fill;
      continue;
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (toolPossession !== undefined) {
      /* v8 ignore next -- Malformed continuation fill set: this parser rejects a duplicate fill or one that does not belong to the admitted interrupt or reroll holes. */
      return {
        tag: "invalid",
        message: "Cunning Strike tool-possession facts were filled twice.",
      };
    }
    /* v8 ignore stop */
    toolPossession = fill;
  }
  return { tag: "ok", savingThrow, movement, toolPossession, endTurnCover };
}
