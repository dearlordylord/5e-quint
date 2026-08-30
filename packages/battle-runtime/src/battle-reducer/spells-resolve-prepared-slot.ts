// Prepared-slot repeated-damage-allocation spell resolution extracted from spells-resolve.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty

import { optionalProperty } from "../optional-property.ts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import {
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleCreatureState,
  type BattleFill,
  type BattleHoleId,
  type BattleResolutionResult,
  type BattleSpellTargetAllocationSpatialFact,
  type BattleTargetSpatialFact,
  type BattleExecutableSpellInvocation,
} from "../battle-state-execution.ts";
import {
  maybeOpenInterruptWindow,
  openAfterDamageSequenceInterruptWindow,
} from "./interrupt-execution.ts";
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import {
  addDamageAmountForType,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  targetingSaveInterdictionCheck,
} from "./targeting-save-interdiction.ts";
import {
  applyPreparedSlotSpellDamage,
  repeatedDamageAllocationNegatedForTarget,
  spellDamageHole,
  spellTargetAllocationHole,
  validatePreparedSlotSpellDamageGroups,
  validateSpellDamageFill,
  validateSpellTargetAllocation,
} from "./spells-holes-fills.ts";

import { type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { spellFillSet } from "./spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
export function resolvePreparedSlotSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  return resolvePreparedSlotSpellAct({
    ...input,
    opensSpellCastReactionWindow: false,
    spendsCastResources: false,
    opensAfterDamageReactionWindow: false,
  });
}

export function resolvePreparedSlotSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly opensSpellCastReactionWindow?: boolean;
  readonly spendsCastResources?: boolean;
  readonly opensAfterDamageReactionWindow?: boolean;
}): BattleResolutionResult {
  const allocationHole = spellTargetAllocationHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Repeated-damage slot spells use spell target allocation fills, not a single-target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      `Spell does not use an attack roll.`,
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.targetAllocation === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      allocationHole,
    ]);
  }
  const targetAllocation = input.fillSet.targetAllocation;
  const allocationValidation = validateSpellTargetAllocation(
    input.input.state,
    input.actorId,
    input.invocation,
    targetAllocation.allocations,
    targetAllocation.spatialFacts,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (allocationValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      allocationValidation,
    );
  }
  /* v8 ignore stop -- @preserve */

  for (const allocation of targetAllocation.allocations) {
    const interdictionCheck = targetingSaveInterdictionCheck({
      state: input.input.state,
      triggeringProcedureRef: input.invocation.sourceProcedureRef,
      triggeringCombatantId: input.actorId,
      wardedCombatantId: allocation.targetId,
      triggeringTargetEventId: allocationHole.holeId,
      replacementTargetKind: "nonAttack",
      fills: input.input.fills,
    });
    if (interdictionCheck.tag === "notWarded") {
      continue;
    }
    if (interdictionCheck.tag === "saveSucceeded") {
      continue;
    }
    if (interdictionCheck.tag === "needsHoles") {
      return needsHolesResult(input.input.state, input.input.subject, [
        interdictionCheck.hole,
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (interdictionCheck.tag === "invalid") {
      return invalidResult(
        input.input.state,
        "invalidFill",
        interdictionCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    if (interdictionCheck.tag === "lost") {
      return input.spendsCastResources === false
        ? {
            tag: "resolved",
            state: input.input.state,
            snapshot: snapshotBattle(input.input.state),
          }
        : spendSpellCastResources({
            state: input.input.state,
            actorId: input.actorId,
            invocation: input.invocation,
            errorState: input.input.state,
          });
    }

    const replacementFacts = spellAllocationSpatialFacts(
      interdictionCheck.spatialFacts,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (replacementFacts === null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "attack-redirection ward replacement multi-projectile automatic-hit spell target must include allocation-compatible spell target facts.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const replacementTarget = input.input.state.combatants.get(
      interdictionCheck.targetId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (replacementTarget === undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "attack-redirection ward replacement multi-projectile automatic-hit spell target must be a combatant in this battle.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const originalAllocationFill = input.input.fills.find(
      (
        fill,
      ): fill is Extract<
        BattleFill,
        { readonly kind: "spellTargetAllocation" }
      > =>
        fill.kind === "spellTargetAllocation" &&
        fill.holeId === allocationHole.holeId,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (originalAllocationFill === undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "attack-redirection ward replacement requires the original multi-projectile automatic-hit spell allocation fill.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const allocationCounts = new Map<CombatantId, number>();
    for (const currentAllocation of targetAllocation.allocations) {
      const targetId =
        currentAllocation.targetId === allocation.targetId
          ? replacementTarget.combatantId
          : currentAllocation.targetId;
      allocationCounts.set(
        targetId,
        (allocationCounts.get(targetId) ?? 0) + currentAllocation.count,
      );
    }
    const allocations = Array.from(allocationCounts, ([targetId, count]) => ({
      targetId,
      count,
    }));
    const spatialFacts = [
      ...originalAllocationFill.spatialFacts.filter(
        (fact) =>
          fact.kind !== "spellTarget" || fact.targetId !== allocation.targetId,
      ),
      ...replacementFacts,
    ];
    const fills = input.input.fills
      .filter((fill) => fill.kind !== "targetingSaveInterdictionOutcome")
      .map(
        (fill): BattleFill =>
          fill === originalAllocationFill
            ? {
                ...fill,
                value: { allocations },
                spatialFacts,
              }
            : fill,
      );
    const fillSet = spellFillSet(
      fills,
      input.invocation,
      input.invocation.sourceProcedureRef,
      input.actorId,
      input.input.state,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.tag === "invalid") {
      return invalidResult(input.input.state, "invalidFill", fillSet.message);
    }
    /* v8 ignore stop -- @preserve */
    return resolvePreparedSlotSpellAct({
      ...input,
      input: { ...input.input, fills },
      fillSet,
    });
  }

  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      spellCastInterruptFrame({
        casterId: input.actorId,
        invocation: input.invocation,
        targetIds: targetAllocation.allocations.map(
          (allocation) => allocation.targetId,
        ),
        reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
        castingResource: { kind: "magicAction" },
        continuation: spellReplayContinuation(input.input),
      }),
      input.input.handledInterruptTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  if (input.fillSet.damageRoll == null) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageRoll = input.fillSet.damageRoll;
  const damageValidation =
    validateSpellDamageFill(damageRoll, input.invocation, false) ??
    validatePreparedSlotSpellDamageGroups(
      damageRoll,
      targetAllocation.allocations,
    );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  /* v8 ignore stop -- @preserve */

  const source = input.input.state.combatants.get(input.actorId);
  const expectedSourcePenaltyHoles = targetAllocation.allocations.flatMap(
    (allocation, allocationIndex) => {
      const target = input.input.state.combatants.get(allocation.targetId);
      /* v8 ignore start -- @preserve -- Validated allocation IDs come from the current combatant map; resolver state transitions replace combatant values without deleting keys. */
      if (target === undefined) {
        return [];
      }
      /* v8 ignore stop -- @preserve */
      const damageByType = repeatedDamageAllocationSpellDamageByType(
        target,
        input.invocation,
        damageRoll,
        allocationIndex,
        allocation.count,
      );
      const hole = sourceDamageRollPenaltyRollHoleForDamageRoll(
        source,
        damageByType,
        repeatedDamageAllocationSourceDamageRollHoleId(
          damageRoll.holeId,
          allocationIndex,
        ),
      );
      return hole === null ? [] : [hole];
    },
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHoles,
    ) !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const damageAmountByAllocationIndex = new Map<number, number>();
  for (const [
    allocationIndex,
    allocation,
  ] of targetAllocation.allocations.entries()) {
    const target = input.input.state.combatants.get(allocation.targetId);
    /* v8 ignore start -- @preserve -- Validated allocation IDs come from the current combatant map; resolver state transitions replace combatant values without deleting keys. */
    if (target === undefined) {
      continue;
    }
    /* v8 ignore stop -- @preserve */
    const damageByType = repeatedDamageAllocationSpellDamageByType(
      target,
      input.invocation,
      damageRoll,
      allocationIndex,
      allocation.count,
    );
    const sourcePenaltyDamageRollHoleId =
      repeatedDamageAllocationSourceDamageRollHoleId(
        damageRoll.holeId,
        allocationIndex,
      );
    const sourcePenalty = applyAvailableSourceDamageRollPenalty(
      source,
      damageByType,
      sourcePenaltyDamageRollHoleId,
      sourceDamageRollPenaltyRollForDamageRoll(
        input.fillSet.sourceDamageRollPenaltyRolls,
        source,
        damageByType,
        sourcePenaltyDamageRollHoleId,
      ),
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (sourcePenalty.tag === "invalid") {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (sourcePenalty.tag === "needsHoles") {
      return needsHolesResult(input.input.state, input.input.subject, [
        ...sourcePenalty.holes,
      ]);
    }
    damageAmountByAllocationIndex.set(
      allocationIndex,
      damageAmountByTypeAfterTargetAdjustments(
        input.input.state,
        target,
        sourcePenalty.damageByType,
      ),
    );
  }

  const allocationTargetDamageAmounts = targetAllocation.allocations.flatMap(
    (allocation, allocationIndex) => {
      const target = input.input.state.combatants.get(allocation.targetId);
      /* v8 ignore start -- @preserve -- Validated allocation IDs come from the current combatant map; resolver state transitions replace combatant values without deleting keys. */
      if (target === undefined) {
        return [];
      }
      /* v8 ignore stop -- @preserve */
      const damageAmount =
        damageAmountByAllocationIndex.get(allocationIndex) ?? 0;
      return [{ target, damageAmount }];
    },
  );
  const concentrationSaves = allocationTargetDamageAmounts.flatMap(
    ({ target, damageAmount }) => {
      return damageLifecycleConcentrationSavingThrowHoles({
        state: input.input.state,
        target,
        damageAmount,
      });
    },
  );
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      missingConcentrationSaves,
    );
  }
  const concentrationSaveIds = new Set<BattleHoleId>(
    concentrationSaves.map((concentrationSave) => concentrationSave.holeId),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const damageDispositionHoles = allocationTargetDamageAmounts.flatMap(
    ({ target, damageAmount }) => {
      const hole = zeroHitPointReplacementDispositionHole({
        damageSourceId: input.actorId,
        target,
        damageAmount,
      });
      return hole === null ? [] : [hole];
    },
  );
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: input.fillSet.damageDispositions,
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
  const missingDamageDispositionHoles = damageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
      undefined,
  );
  if (missingDamageDispositionHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingDamageDispositionHoles,
    ]);
  }
  const stagedConditionSaveChecks = targetAllocation.allocations.map(
    (allocation, allocationIndex) => {
      const target = input.input.state.combatants.get(allocation.targetId);
      /* v8 ignore start -- @preserve -- Validated allocation IDs come from the current combatant map; resolver state transitions replace combatant values without deleting keys. */
      if (target === undefined) {
        return { tag: "ok" as const, holes: [] };
      }
      /* v8 ignore stop -- @preserve */
      const damageAmount =
        damageAmountByAllocationIndex.get(allocationIndex) ?? 0;
      const holes =
        damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
          state: input.input.state,
          target,
          damageAmount,
        });
      return damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck(
        {
          state: input.input.state,
          target,
          damageAmount,
          fills: fillsMatchingHoleIds(
            input.fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
            holes,
          ),
        },
      );
    },
  );
  const invalidStagedConditionSaveCheck = stagedConditionSaveChecks.find(
    (check) => check.tag === "invalid",
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidStagedConditionSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidStagedConditionSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const missingStagedConditionSaveHoles = stagedConditionSaveChecks.flatMap(
    (check) => (check.tag === "needsHoles" ? [...check.holes] : []),
  );
  if (missingStagedConditionSaveHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingStagedConditionSaveHoles,
    ]);
  }
  const stagedConditionSaveHoleIds = new Set<BattleHoleId>(
    stagedConditionSaveChecks.flatMap((check) =>
      check.tag === "invalid" ? [] : check.holes.map((hole) => hole.holeId),
    ),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.saveGatedConditionWithRepeatDamageRepeatSaves.some(
      (fill) => !stagedConditionSaveHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "damage-triggered repeat-save condition damage repeat save fill must match a requested damaged target.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const relationshipCheck = damageRelationshipDecisionFillCheck({
    state: input.input.state,
    damageEventHoleId: damageRoll.holeId,
    damageSourceId: input.actorId,
    targets: targetAllocation.allocations.flatMap(
      (allocation, allocationIndex) => {
        const damageAmount =
          damageAmountByAllocationIndex.get(allocationIndex) ?? 0;
        return damageAmount <= 0
          ? []
          : [
              {
                targetId: allocation.targetId,
                damageAmount: toDamageAmount(damageAmount),
                damageDisposition: damageDispositionForTarget(
                  damageDispositionHoles,
                  input.fillSet.damageDispositions,
                  allocation.targetId,
                ),
              },
            ];
      },
    ),
    spatialFacts: input.fillSet.targetSpatialFacts,
    decisionsByRelationshipHole: input.fillSet.damageRelationshipDecisions,
  });
  if (relationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      relationshipCheck.holes,
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipCheck.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      relationshipCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellEffectState =
    input.spendsCastResources === false
      ? input.input.state
      : battleStateAfterTargetActionEarlyEndForActor(
          input.input.state,
          input.actorId,
        );
  const damaged = targetAllocation.allocations.reduce(
    (state, allocation, allocationIndex) => {
      const target = state.combatants.get(allocation.targetId);
      /* v8 ignore start -- @preserve -- Validated allocation IDs are unique current members; an earlier damage application can remove only its own zero-HP familiar, never a distinct later allocation target. */
      if (target === undefined) {
        return state;
      }
      /* v8 ignore stop -- @preserve */
      const damageAmount =
        damageAmountByAllocationIndex.get(allocationIndex) ?? 0;
      const concentrationSave = concentrationSavingThrowHole(
        target,
        damageAmount,
      );
      const concentrationLifecycleHoles =
        damageLifecycleConcentrationSavingThrowHoles({
          state,
          target,
          damageAmount,
        });
      const concentrationLifecycleFills = fillsMatchingHoleIds(
        input.fillSet.concentrationSavingThrows,
        concentrationLifecycleHoles,
      );
      const stagedConditionLifecycleHoles =
        damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
          state,
          target,
          damageAmount,
        });
      const stagedConditionLifecycleFills = fillsMatchingHoleIds(
        input.fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
        stagedConditionLifecycleHoles,
      );
      return applyPreparedSlotSpellDamage(
        state,
        allocation.targetId,
        damageAmount,
        {
          concentrationSavingThrow:
            concentrationSave === null
              ? undefined
              : concentrationSavingThrowFillFor(
                  concentrationLifecycleFills,
                  concentrationSave,
                ),
          linkedDefenseResistanceDamageShareConcentrationSavingThrows:
            concentrationLifecycleFills,
          damageDisposition: damageDispositionForTarget(
            damageDispositionHoles,
            input.fillSet.damageDispositions,
            allocation.targetId,
          ),
          saveGatedConditionWithRepeatDamageRepeatSaves:
            stagedConditionLifecycleFills,
          damageSourceId: input.actorId,
          spatialFacts: input.fillSet.targetSpatialFacts,
          ...optionalProperty(
            "relationshipDecisions",
            relationshipCheck.decisions,
          ),
        },
      );
    },
    spellEffectState,
  );
  if (input.spendsCastResources === false) {
    return {
      tag: "resolved",
      state: damaged,
      snapshot: snapshotBattle(damaged),
    };
  }

  const spent = spendSpellCastResources({
    state: damaged,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spent.tag === "invalid") {
    return spent;
  }
  const nextState = spent.state;
  if (input.opensAfterDamageReactionWindow !== false) {
    const afterDamageEvents = targetAllocation.allocations.flatMap(
      (allocation, allocationIndex): readonly BattleAfterDamageEvent[] => {
        const target = input.input.state.combatants.get(allocation.targetId);
        /* v8 ignore start -- @preserve -- Validated allocation IDs come from the current combatant map and the after-damage projection reads that unchanged map. */
        if (target === undefined) {
          return [];
        }
        /* v8 ignore stop -- @preserve */
        const damageAmount =
          damageAmountByAllocationIndex.get(allocationIndex) ?? 0;
        return [
          {
            damageSourceId: input.actorId,
            damagedId: allocation.targetId,
            damageAmount: toDamageAmount(damageAmount),
            reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
              facts: targetAllocation.spatialFacts,
              damagedId: allocation.targetId,
              damageSourceId: input.actorId,
            }),
          },
        ];
      },
    );
    const afterDamageReactionWindow = openAfterDamageSequenceInterruptWindow({
      state: nextState,
      subject: input.input.subject,
      events: afterDamageEvents,
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: [],
      handledInterruptTrigger: input.input.handledInterruptTrigger,
    });
    if (afterDamageReactionWindow.tag === "needsHoles") {
      return afterDamageReactionWindow;
    }
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function spellAllocationSpatialFacts(
  facts: readonly BattleTargetSpatialFact[],
): readonly BattleSpellTargetAllocationSpatialFact[] | null {
  const allocationFacts = facts.filter(
    (fact): fact is BattleSpellTargetAllocationSpatialFact =>
      fact.kind === "spellTarget" ||
      fact.kind === "reactionSpellDamagerVisibleWithinRange",
  );
  return allocationFacts.length === facts.length ? allocationFacts : null;
}

function repeatedDamageAllocationSourceDamageRollHoleId(
  damageRollHoleId: BattleHoleId,
  allocationIndex: number,
): BattleHoleId {
  return holeId(`${damageRollHoleId}:allocation:${allocationIndex}`);
}

function repeatedDamageAllocationSpellDamageByType(
  target: BattleCreatureState,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  allocationIndex: number,
  repeatedEffectCount: number,
): ReadonlyMap<DamageType, number> {
  if (repeatedDamageAllocationNegatedForTarget(target)) {
    return new Map();
  }
  const group = damageRoll.value[allocationIndex];
  /* v8 ignore start -- @preserve -- validatePreparedSlotSpellDamageGroups proves one dense dice group per validated allocation entry before this helper is called. */
  if (group === undefined) {
    return new Map();
  }
  /* v8 ignore stop -- @preserve */
  const diceTotal = group.results.reduce(
    (groupTotal, dieResult): number => groupTotal + Number(dieResult),
    0,
  );
  const flat = (invocation.damage.expr.flat ?? 0) * repeatedEffectCount;
  return addDamageAmountForType(
    new Map(),
    invocation.damage.damageType,
    diceTotal + flat,
  );
}
