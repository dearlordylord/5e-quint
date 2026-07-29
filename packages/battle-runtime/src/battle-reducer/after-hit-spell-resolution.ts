import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import type {
  BattleExecutableSpellInvocation,
  AttackSpellDamageAddition,
  BattleFill,
  BattleAttackHitReplayCheckpoint,
  BattleInterruptCheckpoint,
  BattleResolutionResult,
  BattleSpellCastReactionFact,
  BattleState,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
  maybeOpenPostCastReadySpellCastWindow,
  snapshotBattle,
} from "./dispatcher.ts";
import { interruptCheckpointFrame } from "./interrupt-execution.ts";
import { fillsBelongToSpellCastHoles } from "./fill-hole-protocol.ts";
import { invalidResult } from "./result-helpers.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";
import { appendAfterHitSpellDamage } from "./after-hit-spell-damage.ts";

type AfterHitSpellCastInterruptInput = {
  readonly input: {
    readonly state: BattleState;
    readonly subject: BattleSubject;
    readonly fills: readonly BattleFill[];
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  };
  readonly invocation: BattleExecutableSpellInvocation;
  readonly fillSet: {
    readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
  };
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
};

export function maybeOpenAfterHitSpellCastInterrupt(
  input: AfterHitSpellCastInterruptInput,
): BattleResolutionResult | null {
  return maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.casterId,
      invocation: input.invocation,
      targetIds: [input.targetId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
}

export function prepareAfterHitSlotSpellCast(
  input: AfterHitSpellCastInterruptInput,
):
  | { readonly tag: "prepared"; readonly state: BattleState }
  | BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!fillsBelongToSpellCastHoles(input.input.fills)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Attack-hit Bonus Action spell accepts only spell-cast Reaction trigger facts.",
    );
  }
  /* v8 ignore stop */
  const spellCastReactionWindow = maybeOpenAfterHitSpellCastInterrupt(input);
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.casterId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : { tag: "prepared", state: resourced.state };
}

export function completeAfterHitSpellCast(input: {
  readonly state: BattleState;
  readonly frame: BattleInterruptCheckpoint;
  readonly subject: BattleSubject;
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly targetId: CombatantId;
  readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
}): BattleResolutionResult {
  const nextState: BattleState = {
    ...input.state,
    interruptStack: [
      ...input.state.interruptStack.slice(0, -1),
      interruptCheckpointFrame(input.frame),
    ],
  };
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: nextState,
    subject: input.subject,
    casterId: input.casterId,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    spellProcedure: input.invocation.procedure,
    targetIds: [input.targetId],
    handledInterruptTrigger: input.handledInterruptTrigger,
  });
  return (
    readiedSpellCastReactionWindow ?? {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    }
  );
}

export function completeAfterHitSpellDamageCast(input: {
  readonly state: BattleState;
  readonly frame: BattleAttackHitReplayCheckpoint;
  readonly subject: BattleSubject;
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly targetId: CombatantId;
  readonly damageAddition: AttackSpellDamageAddition;
  readonly applyEffect?: ((state: BattleState) => BattleState) | undefined;
  readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
}): BattleResolutionResult {
  return completeAfterHitSpellCast({
    ...input,
    state: input.applyEffect?.(input.state) ?? input.state,
    frame: appendAfterHitSpellDamage(input.frame, input.damageAddition),
  });
}

export function resolveAfterHitSlotSpellDamageCast(
  input: AfterHitSpellCastInterruptInput & {
    readonly frame: BattleAttackHitReplayCheckpoint;
    readonly damageAddition: AttackSpellDamageAddition;
    readonly applyEffect?: ((state: BattleState) => BattleState) | undefined;
  },
): BattleResolutionResult {
  const preparation = prepareAfterHitSlotSpellCast(input);
  return preparation.tag === "prepared"
    ? completeAfterHitSpellDamageCast({
        ...input,
        state: preparation.state,
        subject: input.input.subject,
        handledInterruptTrigger: input.input.handledInterruptTrigger,
      })
    : preparation;
}
