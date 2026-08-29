import { optionalProperty } from "../optional-property.ts";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import { Match } from "effect";
import * as Result from "effect/Result";
import type { BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import { sameBattleSubject, type BattleSubject } from "../battle-subjects.ts";
import {
  characterSpellProcedure,
  type BattleSpellProcedureExecution,
} from "../character-execution-queries.ts";
import type {
  BattleFill,
  BattleInterruptCheckpoint,
  BattleResolutionInputForSubject,
  BattleResolutionResult,
  BattleState,
  SpellSlotInvocationResource,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import {
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollForDamageRoll,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import { damageRelationshipDecisionHole } from "./damage-relationship-decisions.ts";
import {
  maybeOpenInterruptWindow,
  openAfterDamageSequenceInterruptWindow,
} from "./interrupt-execution.ts";
import { currentInterruptCheckpoint } from "./battle-snapshot.ts";
import {
  afterDamageRetaliationReactionSpellMatchesTrigger,
  reactionSpellTargetFactsForAfterDamage,
  triggeredReactionSpellTurnResourceAvailable,
} from "./reaction-triggered-spells.ts";
import { invalidResult } from "./result-helpers.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
import { stateAfterSpellCastDeclared } from "./spell-cast-declaration.ts";
import { activeOngoingFeaturesPreventSpellInvocation } from "./spells-invocation-guards.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import { spellFillSet } from "./spells-resolve-fill-set.ts";
import {
  applySpellDamage,
  damageAmountByTypeAfterSaveDamageResult,
  saveGateDamageResultForOutcome,
  spellDamageByTypeForTarget,
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";
import { isTriggeredReactionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import {
  spellProcedureExecutionFor,
  type SpellProcedureExecutionRegistry,
} from "./spell-procedure-profiles/execution-registry.ts";
import {
  markSpellSlotExpendedThisTurn,
  spellHasAvailableSpend,
} from "./spell-turn-resources.ts";
import { needsHolesResult } from "./needs-holes-result.ts";

export function resolveCastTriggeredReactionSpellCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  > & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  },
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const frame = currentInterruptCheckpoint(input.state);
  const activeInterrupt = frame?.activeInterrupt;
  const reactor = input.state.combatants.get(input.subject.reactorId);
  const invocation =
    reactor?.origin.kind === "character"
      ? characterSpellProcedure(
          reactor.origin.execution,
          input.subject.procedureRef,
          reactor,
        )
      : undefined;
  if (
    (frame?.trigger !== "attackHit" &&
      frame?.trigger !== "spellCast" &&
      frame?.trigger !== "afterDamage" &&
      frame?.trigger !== "creatureFalls") ||
    activeInterrupt === undefined ||
    activeInterrupt.responderId !== input.subject.reactorId ||
    !sameBattleSubject(activeInterrupt.subject, input.subject)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell casting requires an active matching interrupt checkpoint.",
    );
  }
  /* v8 ignore next -- @preserve -- The interrupt choice admission already narrows this command to a supported triggered-reaction invocation. */
  if (
    reactor?.origin.kind !== "character" ||
    invocation === undefined ||
    !isTriggeredReactionSpellInvocation(invocation)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Triggered Reaction spell command requires a supported prepared Reaction spell.",
    );
  }
  if (!spellHasAvailableSpend(reactor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell no longer has its required runtime spell resource.",
    );
  }
  if (
    activeOngoingFeaturesPreventSpellInvocation(
      input.state,
      reactor,
      invocation,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Triggered Reaction spell is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (
    !triggeredReactionSpellTurnResourceAvailable(
      input.state,
      input.subject.reactorId,
      invocation,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }

  const spellCastReactionWindow = maybeOpenTriggeredReactionSpellCastInterrupt({
    state: input.state,
    subject: input.subject,
    frame,
    invocation,
    fills: input.fills,
    ...optionalProperty(
      "handledInterruptTrigger",
      input.handledInterruptTrigger,
    ),
  });
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (invocation.procedure === "saveGatedDamage") {
    /* v8 ignore next -- @preserve -- Triggered save-gated Reaction spells are admitted only from prepared spell-slot bindings. */
    if (!isPreparedSlottedSaveGatedDamageInvocation(invocation)) {
      return invalidResult(
        input.state,
        "unsupportedActOption",
        "Triggered Reaction spell command requires a prepared slotted Reaction spell.",
      );
    }
    const fillSet = spellFillSet(
      input.fills,
      invocation,
      input.subject.procedureRef,
      input.subject.actorId,
      input.state,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.state, "invalidFill", fillSet.message);
    }
    /* v8 ignore stop -- @preserve */
    return spellProcedureExecutionFor(
      executionRegistry,
      invocation.procedure,
    ).resolve({
      input: { ...input, frame },
      actorId: input.subject.reactorId,
      invocation,
      fillSet,
    });
  }
  return resolveDirectTriggeredReactionSpellCommand(
    {
      ...input,
      frame,
      invocation,
    },
    executionRegistry,
  );
}

type TriggeredReactionSpellExecution =
  | Extract<
      BattleSpellProcedureExecution,
      {
        readonly procedure:
          | "triggeredArmorDefense"
          | "fallingCreatureMitigationReaction"
          | "spellCastInterruptionReaction";
      }
    >
  | (Extract<
      BattleSpellProcedureExecution,
      { readonly procedure: "saveGatedDamage" }
    > & {
      readonly castingTime: { readonly kind: "reaction" };
    });

type DirectTriggeredReactionSpellExecution = Extract<
  TriggeredReactionSpellExecution,
  {
    readonly procedure:
      | "triggeredArmorDefense"
      | "fallingCreatureMitigationReaction"
      | "spellCastInterruptionReaction";
  }
>;

function maybeOpenTriggeredReactionSpellCastInterrupt(input: {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "castTriggeredReactionSpell";
    }
  >;
  readonly frame: BattleInterruptCheckpoint;
  readonly invocation: TriggeredReactionSpellExecution;
  readonly fills: readonly BattleFill[];
  readonly handledInterruptTrigger?: BattleInterruptTrigger;
}): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  if (input.handledInterruptTrigger === "spellCast") {
    return null;
  }
  const fillSet = spellFillSet(
    input.fills,
    input.invocation,
    input.subject.procedureRef,
    input.subject.actorId,
    input.state,
  );
  if (fillSet.tag === "invalid") {
    return null;
  }
  const targetIds = triggeredReactionSpellCastTargetIds({
    frame: input.frame,
    reactorId: input.subject.reactorId,
    invocation: input.invocation,
    fillSet,
  });
  return maybeOpenInterruptWindow(
    input.state,
    spellCastInterruptFrame({
      casterId: input.subject.reactorId,
      invocation: input.invocation,
      targetIds,
      reactionSpellTargetFacts: fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "reaction" },
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    }),
    input.handledInterruptTrigger,
  );
}

function triggeredReactionSpellCastTargetIds(input: {
  readonly frame: BattleInterruptCheckpoint;
  readonly reactorId: CombatantId;
  readonly invocation: TriggeredReactionSpellExecution;
  readonly fillSet: Extract<
    ReturnType<typeof spellFillSet>,
    { readonly tag: "ok" }
  >;
}): readonly CombatantId[] {
  if (input.invocation.procedure === "triggeredArmorDefense") {
    return [input.reactorId];
  }
  /* v8 ignore next -- @preserve -- The selected Reaction choice was discovered from a matching after-damage frame. */
  if (
    input.invocation.procedure === "saveGatedDamage" &&
    input.frame.trigger === "afterDamage"
  ) {
    return [input.frame.damageSourceId];
  }
  if (
    input.invocation.procedure === "fallingCreatureMitigationReaction" &&
    input.fillSet.targetList !== undefined
  ) {
    return input.fillSet.targetList.targetIds;
  }
  if (
    input.invocation.procedure === "spellCastInterruptionReaction" &&
    input.frame.trigger === "spellCast"
  ) {
    return [input.frame.casterId];
  }
  return [];
}

function isPreparedSlottedSaveGatedDamageInvocation(
  invocation: Extract<
    TriggeredReactionSpellExecution,
    { readonly procedure: "saveGatedDamage" }
  >,
): invocation is Extract<
  TriggeredReactionSpellExecution,
  { readonly procedure: "saveGatedDamage" }
> & {
  readonly access: { readonly tag: "prepared" };
  readonly resource: SpellSlotInvocationResource;
} {
  return (
    invocation.access.tag === "prepared" &&
    invocation.resource.tag === "spellSlot"
  );
}

const byDirectTriggeredReactionProcedure = Match.discriminator("procedure");

function resolveDirectTriggeredReactionSpellCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  > & {
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
    readonly frame: BattleInterruptCheckpoint;
    readonly invocation: DirectTriggeredReactionSpellExecution;
  },
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleResolutionResult {
  const fillSet = spellFillSet(
    input.fills,
    input.invocation,
    input.subject.procedureRef,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  const { invocation, ...resolutionInput } = input;
  return Match.value(invocation).pipe(
    byDirectTriggeredReactionProcedure(
      "spellCastInterruptionReaction",
      (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          "spellCastInterruptionReaction",
        ).resolve({
          input: resolutionInput,
          actorId: input.subject.reactorId,
          invocation,
          fillSet,
        }),
    ),
    byDirectTriggeredReactionProcedure(
      "fallingCreatureMitigationReaction",
      (invocation) =>
        spellProcedureExecutionFor(
          executionRegistry,
          "fallingCreatureMitigationReaction",
        ).resolve({
          input: resolutionInput,
          actorId: input.subject.reactorId,
          invocation,
          fillSet,
        }),
    ),
    byDirectTriggeredReactionProcedure("triggeredArmorDefense", (invocation) =>
      spellProcedureExecutionFor(
        executionRegistry,
        "triggeredArmorDefense",
      ).resolve({
        input: resolutionInput,
        actorId: input.subject.reactorId,
        invocation,
        fillSet,
      }),
    ),
    Match.exhaustive,
  );
}

export function resolveTriggeredReactionSaveGatedDamage(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "castTriggeredReactionSpell";
      }
    >
  > & {
    readonly frame: BattleInterruptCheckpoint;
    readonly invocation: Extract<
      TriggeredReactionSpellExecution,
      { readonly procedure: "saveGatedDamage" }
    > & {
      readonly access: { readonly tag: "prepared" };
      readonly resource: SpellSlotInvocationResource;
    };
  },
  fillSet: Extract<ReturnType<typeof spellFillSet>, { readonly tag: "ok" }>,
): BattleResolutionResult {
  if (
    input.frame.trigger !== "afterDamage" ||
    input.frame.damagedId !== input.subject.reactorId ||
    !afterDamageRetaliationReactionSpellMatchesTrigger(
      input.invocation,
      input.frame,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "after-damage reaction save requires a matching after-damage Reaction trigger.",
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    fillSet.targetId !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackRoll !== undefined
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "after-damage reaction save targets the creature from the after-damage trigger.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.state,
    input.subject.reactorId,
    input.invocation,
  );
  if (fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.state, input.subject, [savingThrowHole]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    fillSet.savingThrowOutcomes,
    input.invocation,
    input.state,
    input.subject.reactorId,
    input.frame.damageSourceId,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", savingThrowValidation);
  }
  /* v8 ignore stop -- @preserve */
  const savingThrowOutcome = fillSet.savingThrowOutcomes.outcomes[0];
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowOutcome === undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "after-damage reaction save requires the damaging creature's Saving Throw outcome.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const saveDamageResult = saveGateDamageResultForOutcome(
    input.state,
    input.frame.damageSourceId,
    input.invocation,
    savingThrowOutcome.succeeded,
  );
  if (fillSet.damageRoll === undefined) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    input.invocation,
    false,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop -- @preserve */
  const target = input.state.combatants.get(input.frame.damageSourceId);
  /* v8 ignore start -- @preserve -- The public interrupt dispatcher proves every checkpoint actor is still present before admitting this reaction command. */
  if (target === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "after-damage reaction save target is no longer in the battle.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    input.invocation,
    fillSet.damageRoll,
    "full",
  );
  const damageSource = input.state.combatants.get(input.subject.reactorId);
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      spellDamageByType,
      fillSet.damageRoll.holeId,
    );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    fillSet.sourceDamageRollPenaltyRolls,
    damageSource,
    spellDamageByType,
    fillSet.damageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    damageSource,
    spellDamageByType,
    fillSet.damageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sourcePenalty.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      ...sourcePenalty.holes,
    ]);
  }
  const damageAmount = damageAmountByTypeAfterTargetAdjustments(
    input.state,
    target,
    damageAmountByTypeAfterSaveDamageResult(
      sourcePenalty.damageByType,
      saveDamageResult,
    ),
  );
  const concentrationSave = concentrationSavingThrowHole(target, damageAmount);
  const concentrationLifecycleHoles =
    damageLifecycleConcentrationSavingThrowHoles({
      state: input.state,
      target,
      damageAmount,
    });
  const concentrationLifecycleFills = fillsMatchingHoleIds(
    fillSet.concentrationSavingThrows,
    concentrationLifecycleHoles,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationLifecycleFills.find(
          (fill) => fill.holeId === concentrationSave.holeId,
        );
  const concentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: input.state,
      target,
      damageAmount,
      fills: fillSet.concentrationSavingThrows,
    });
  if (concentrationSaveCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      ...concentrationSaveCheck.holes,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (concentrationSaveCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.subject.reactorId,
    target,
    damageAmount,
  });
  const damageDispositionHoles =
    damageDispositionHole === null ? [] : [damageDispositionHole];
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: fillSet.damageDispositions,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(input.state, input.subject, [
      damageDispositionHole,
    ]);
  }
  const saveGatedConditionWithRepeatSaveCheck =
    damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck({
      state: input.state,
      target,
      damageAmount,
      fills: fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
    });
  if (saveGatedConditionWithRepeatSaveCheck.tag === "needsHoles") {
    return needsHolesResult(input.state, input.subject, [
      ...saveGatedConditionWithRepeatSaveCheck.holes,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (saveGatedConditionWithRepeatSaveCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.state,
      "invalidFill",
      saveGatedConditionWithRepeatSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const saveGatedConditionWithRepeatLifecycleFills = fillsMatchingHoleIds(
    fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
    saveGatedConditionWithRepeatSaveCheck.holes,
  );
  const damageDisposition = damageDispositionForTarget(
    damageDispositionHoles,
    fillSet.damageDispositions,
    input.frame.damageSourceId,
  );
  const relationshipCheck = fillSet.damageRelationshipDecisions.check(
    fillSet.damageRoll.holeId,
    damageAmount <= 0
      ? null
      : damageRelationshipDecisionHole({
          state: input.state,
          damageEventHoleId: fillSet.damageRoll.holeId,
          damageSourceId: input.subject.reactorId,
          targets: [
            {
              targetId: input.frame.damageSourceId,
              damageAmount: toDamageAmount(damageAmount),
              damageDisposition,
            },
          ],
          spatialFacts: fillSet.targetSpatialFacts,
        }),
  );
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      input.state,
      input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.state, "invalidFill", relationshipCheck.message);
  }
  /* v8 ignore stop -- @preserve */
  const castingState = stateAfterSpellCastDeclared({
    state: input.state,
    casterId: input.subject.reactorId,
    invocation: input.invocation,
  });
  const damaged = applySpellDamage(
    castingState,
    input.frame.damageSourceId,
    input.invocation,
    fillSet.damageRoll,
    false,
    {
      concentrationSavingThrow: concentrationFill,
      linkedDefenseResistanceDamageShareConcentrationSavingThrows:
        concentrationLifecycleFills,
      saveDamageResult,
      damageDisposition,
      sourceDamageRollPenaltyRoll,
      saveGatedConditionWithRepeatDamageRepeatSaves:
        saveGatedConditionWithRepeatLifecycleFills,
      damageSourceId: input.subject.reactorId,
      spatialFacts: fillSet.targetSpatialFacts,
      ...optionalProperty("relationshipDecisions", relationshipCheck.decisions),
    },
  );
  const slotted = expendSpellSlot(
    damaged,
    input.subject.reactorId,
    input.invocation.resource.slotLevel,
  );
  const nextTurnResources = markSpellSlotExpendedThisTurn(
    slotted.currentTurnResources,
    input.subject.reactorId,
  );
  if (Result.isFailure(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.success,
  };
  return openAfterDamageSequenceInterruptWindow({
    state: nextState,
    subject: input.subject,
    events: [
      {
        damageSourceId: input.subject.reactorId,
        damagedId: input.frame.damageSourceId,
        damageAmount: toDamageAmount(damageAmount),
        reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
          facts: input.frame.reactionSpellTargetFacts,
          damagedId: input.frame.damageSourceId,
          damageSourceId: input.subject.reactorId,
        }),
      },
    ],
    objectDamages: [],
    objectIgnitions: [],
    droppedObjects: [],
    handledInterruptTrigger: undefined,
  });
}
