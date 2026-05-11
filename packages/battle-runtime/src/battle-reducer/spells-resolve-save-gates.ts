// Save-gated spell resolution extracted from spells-resolve.ts.
// Owns save-gated damage, condition, and attack-roll-advantage procedures.

import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import {
  isTargetListSpellInvocation,
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleHoleId,
  type BattleResolutionResult,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleState,
  type SaveDamageResult,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import { extendSavingThrowOngoingFeatures } from "./attack-roll.ts";
import { concentrationSavingThrowHole } from "./damage-apply.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import {
  applyFailedSaveAttackRollAdvantageEffects,
  applyFailedSaveSpellActiveEffects,
  applyFailedSaveSpellConditionEffects,
  applySpellDamage,
  saveGateDamageResultForOutcome,
  spellDamageAmountForTarget,
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
  spellTargetHole,
  spellTargetIsLegal,
  spellTargetListHole,
  validateSpellDamageFill,
  validateSpellTargetList,
} from "./spells-holes-fills.ts";

import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { type SpellFillSet } from "./spells-resolve-fill-set.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
export function resolveSaveGateDamageSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const beforeSpend = resolveSaveGateDamageSpellAct(input);
  if (beforeSpend.tag !== "resolved") {
    return beforeSpend;
  }
  return {
    tag: "resolved",
    state: {
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    },
    snapshot: snapshotBattle({
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    }),
  };
}

export function resolveSaveGateDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (
    input.invocation.targeting.kind !== "singleCombatant" &&
    input.invocation.targeting.kind !== "targetList" &&
    input.fillSet.targetId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (input.invocation.targeting.kind === "singleCombatant") {
    if (input.fillSet.targetId === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const target = input.input.state.combatants.get(input.fillSet.targetId);
    if (
      target === undefined ||
      !spellTargetIsLegal(
        input.input.state,
        input.actorId,
        target.combatantId,
        input.invocation,
        input.fillSet.targetSpatialFacts,
      )
    ) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Spell target must be a combatant within the selected spell's supported range.",
      );
    }
  }
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells do not use an attack roll.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;

  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.targetList?.targetIds,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveDamageResultByTargetId = new Map(
    savingThrowOutcomes.outcomes.map((outcome) => [
      outcome.targetId,
      saveGateDamageResultForOutcome(
        input.input.state,
        outcome.targetId,
        input.invocation,
        outcome.succeeded,
      ),
    ]),
  );
  const saveDamageResultForTarget = (targetId: CombatantId): SaveDamageResult =>
    saveDamageResultByTargetId.get(targetId) ?? "none";
  const damageTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    saveDamageResultForTarget(outcome.targetId) === "none"
      ? []
      : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  if (damageTargets.length === 0) {
    if (
      input.fillSet.damageRoll !== undefined ||
      input.fillSet.damageDispositions.length > 0
    ) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate spell damage can only be filled when at least one target takes damage.",
      );
    }
    const effected = applyFailedSaveSpellActiveEffects(
      input.input.state,
      input.actorId,
      failedTargets,
      input.invocation,
    );
    return spendSpellCastResources({
      state: extendSavingThrowOngoingFeatures(
        effected,
        input.actorId,
        selectedTargetIds,
      ),
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
    });
  }

  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageRoll = input.fillSet.damageRoll;
  const damageValidation = validateSpellDamageFill(
    damageRoll,
    input.invocation,
    false,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }

  const concentrationSaves = damageTargets.flatMap((targetId) => {
    const target = input.input.state.combatants.get(targetId);
    if (target === undefined) {
      return [];
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    const hole = concentrationSavingThrowHole(target, damageAmount);
    return hole === null ? [] : [hole];
  });
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
  const concentrationSaveByTargetId = new Map(
    concentrationSaves.map((concentrationSave) => [
      concentrationSave.combatantId,
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ),
    ]),
  );
  const damageDispositionHoles = damageTargets.flatMap((targetId) => {
    const target = input.input.state.combatants.get(targetId);
    if (target === undefined) {
      return [];
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    const hole = zeroHitPointReplacementDispositionHole({
      damageSourceId: input.actorId,
      target,
      damageAmount,
    });
    return hole === null ? [] : [hole];
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: input.fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
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
  const damaged = damageTargets.reduce(
    (state, targetId) =>
      applySpellDamage(
        state,
        targetId,
        input.invocation,
        damageRoll,
        false,
        concentrationSaveByTargetId.get(targetId),
        saveDamageResultForTarget(targetId),
        damageDispositionForTarget(
          damageDispositionHoles,
          input.fillSet.damageDispositions,
          targetId,
        ),
      ),
    input.input.state,
  );
  const effected = applyFailedSaveSpellActiveEffects(
    damaged,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const extended = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  const spentResources = spendSpellCastResources({
    state: extended,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const nextState = spentResources.state;
  const afterDamageReactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: input.actorId,
      damagedId: damageTargets[0]!,
      damageAmount: toDamageAmount(
        spellDamageAmountForTarget(
          input.input.state.combatants.get(damageTargets[0]!)!,
          input.invocation,
          damageRoll,
          saveDamageResultForTarget(damageTargets[0]!),
        ),
      ),
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: input.fillSet.targetSpatialFacts,
        damagedId: damageTargets[0]!,
        damageSourceId: input.actorId,
      }),
      continuation: {
        kind: "resolved",
        subject: input.input.subject,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSaveGateConditionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (
    input.invocation.targeting.kind !== "singleCombatant" &&
    input.fillSet.targetId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (input.invocation.targeting.kind === "singleCombatant") {
    if (input.fillSet.targetId === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const target = input.input.state.combatants.get(input.fillSet.targetId);
    if (
      target === undefined ||
      !spellTargetIsLegal(
        input.input.state,
        input.actorId,
        target.combatantId,
        input.invocation,
        input.fillSet.targetSpatialFacts,
      )
    ) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Spell target must be a combatant within the selected spell's supported range.",
      );
    }
  }
  if (input.invocation.targeting.kind === "targetList") {
    if (!isTargetListSpellInvocation(input.invocation)) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate condition spell target-list shape is unsupported.",
      );
    }
    if (input.fillSet.targetId !== undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Multi-target save-gate condition spells require a target list.",
      );
    }
    if (input.fillSet.targetList === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetListHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const targetListValidation = validateSpellTargetList(
      input.input.state,
      input.actorId,
      input.invocation,
      input.fillSet.targetList.targetIds,
      input.fillSet.targetList.spatialFacts,
    );
    if (targetListValidation !== null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        targetListValidation,
      );
    }
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition spells do not use attack or damage fills.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.targetList?.targetIds,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyFailedSaveSpellConditionEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSaveGateAttackRollAdvantageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedAttackRollAdvantage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate attack-roll advantage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate attack-roll advantage spells do not use attack or damage fills.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyFailedSaveAttackRollAdvantageEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function validateSavingThrowOutcomes(
  value: BattleSpellSavingThrowOutcomeValue,
  hole: BattleSpellSavingThrowOutcomeHole,
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId | undefined,
  targetListIds?: readonly CombatantId[],
): string | null {
  const outcomes = value.outcomes;
  if (hole.spell.procedure === "rollModifier") {
    if (outcomes.length === 0) {
      return "Save-gated roll modifier spell must include at least one target Saving Throw outcome.";
    }
    if ("area" in value) {
      return "Save-gated roll modifier spell outcomes must not include area facts.";
    }
    const seenTargets = new Set<CombatantId>();
    for (const outcome of outcomes) {
      if (!state.combatants.has(outcome.targetId)) {
        return "Save-gated roll modifier spell target must be a combatant in this battle.";
      }
      if (seenTargets.has(outcome.targetId)) {
        return "Save-gated roll modifier spell Saving Throw outcomes must not duplicate targets.";
      }
      seenTargets.add(outcome.targetId);
    }
    return outcomes.length <= hole.spell.targeting.maxTargets
      ? null
      : "Save-gated roll modifier spell Saving Throw outcomes exceed the selected spell's target count.";
  }
  const targeting = spellSavingThrowTargeting(hole.spell);
  if (targeting.kind === "singleCombatant") {
    if (outcomes.length === 0) {
      return "Save-gate spell must include at least one affected target Saving Throw outcome.";
    }
    if ("area" in value) {
      return "Single-target save-gate spell outcomes must not include area facts.";
    }
    if (targetId === undefined) {
      return "Single-target save-gate spell requires one target before Saving Throw outcomes.";
    }
    if (outcomes.length !== 1 || outcomes[0]?.targetId !== targetId) {
      return "Single-target save-gate spell Saving Throw outcome must match the selected target.";
    }
    return state.combatants.has(targetId)
      ? null
      : "Save-gate spell target must be a combatant in this battle.";
  }
  if (targeting.kind === "targetList") {
    if ("area" in value) {
      return "Target-list save-gate spell outcomes must not include area facts.";
    }
    if (targetListIds === undefined) {
      return "Target-list save-gate spell requires target choices before Saving Throw outcomes.";
    }
    if (outcomes.length === 0) {
      return "Target-list save-gate spell must include at least one target Saving Throw outcome.";
    }
    if (
      targetListIds.length < targeting.minTargets ||
      targetListIds.length > targeting.maxTargets
    ) {
      return "Target-list save-gate spell target count is outside the selected spell's target count.";
    }
    if (outcomes.length !== targetListIds.length) {
      return "Target-list save-gate spell Saving Throw outcomes exceed the selected spell's target count.";
    }
    const selectedTargets = new Set(targetListIds);
    const seenTargets = new Set<CombatantId>();
    for (const outcome of outcomes) {
      if (!selectedTargets.has(outcome.targetId)) {
        return "Target-list save-gate spell Saving Throw outcomes must match the selected targets.";
      }
      if (!state.combatants.has(outcome.targetId)) {
        return "Target-list save-gate spell target must be a combatant in this battle.";
      }
      if (seenTargets.has(outcome.targetId)) {
        return "Target-list save-gate spell Saving Throw outcomes must not duplicate targets.";
      }
      seenTargets.add(outcome.targetId);
    }
    return null;
  }
  if (!("area" in value)) {
    return `Save-gate spell Saving Throw outcomes require area facts for ${targeting.kind}.`;
  }
  if (!state.combatants.has(value.area.originAnchorId)) {
    return "Save-gate spell area origin anchor must be a combatant in this battle.";
  }
  if (
    targeting.kind === "selfOriginCone" &&
    value.area.originAnchorId !== actorId
  ) {
    return "Self-origin Cone save-gate spell area must originate from the caster.";
  }
  if (
    targeting.kind === "primaryTargetOriginEmanation" &&
    value.area.originAnchorId !== targetId
  ) {
    return "Ice Knife burst area must originate from the primary target.";
  }
  const affectedTargets = new Set(value.area.affectedTargetIds);
  if (affectedTargets.size !== value.area.affectedTargetIds.length) {
    return "Save-gate spell area affected targets must not duplicate targets.";
  }
  if (
    targeting.kind === "primaryTargetOriginEmanation" &&
    targetId !== undefined &&
    !affectedTargets.has(targetId)
  ) {
    return "Ice Knife burst area must include the primary target.";
  }
  if (
    targeting.kind === "pointOriginCubeExcludingCaster" &&
    affectedTargets.has(actorId)
  ) {
    return "Entangle area affected targets must exclude the caster.";
  }
  for (const targetId of affectedTargets) {
    if (!state.combatants.has(targetId)) {
      return "Save-gate spell area affected target must be a combatant in this battle.";
    }
  }
  const seenTargets = new Set<CombatantId>();
  for (const outcome of outcomes) {
    const targetId = outcome.targetId;
    if (!affectedTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must match the table-supplied area affected targets.";
    }
    if (seenTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must not duplicate targets.";
    }
    seenTargets.add(targetId);
  }
  if (seenTargets.size !== affectedTargets.size) {
    return "Save-gate spell Saving Throw outcomes must cover every table-supplied area affected target.";
  }
  return null;
}
