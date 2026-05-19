// Support-effect spell resolution extracted from spells-resolve.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// Covers healing, scalar buffs, roll modifiers, protection, damage reduction,
// and condition-immunity/temporary-hit-point procedures.

import { resetDeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleFill,
  type BattleResolutionResult,
  type BonusActionSpellBattleResolutionInput,
  type BattleTeleportDestination,
  type BattleTeleportDestinationFact,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { spellId, type CombatantId } from "../identity.ts";
import { applyHpHealing, breakBattleConcentration } from "./damage-apply.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { spellHealingAmount } from "./spell-effects.ts";
import {
  applyConditionRemovalProtectionSpellEffect,
  applyConditionImmunityAndTurnStartTemporaryHitPointsEffects,
  applyBlurAttackRollDefenseSpellEffect,
  applyCreatureTypeProtectionSpellEffect,
  applyDamageReductionSpellEffect,
  applyJumpMovementReplacementSpellEffect,
  applyRollModifierSpellEffect,
  applyScalarBuffSpellEffect,
  applyThaumaturgyBoomingVoiceSpellEffect,
  isThaumaturgyBoomingVoiceEffectForInvocation,
  spellDamageTypeChoiceHole,
  spellHealingRollHole,
  spellScalarBuffRollHole,
  spellTargetHole,
  spellTargetIsKnownWilling,
  spellTargetIsLegal,
  spellTargetListHole,
  spellTeleportDestinationHole,
  spellTeleportDestinationHoleId,
  thaumaturgyActiveOneMinuteEffectCountHole,
  validateSpellTargetList,
  validateScalarBuffTemporaryHitPointsFill,
  validateSpellHealingFill,
} from "./spells-holes-fills.ts";
import { THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS } from "./domain-constants.ts";
import {
  applyWardingBondSpellEffect,
  wardingBondCastFactsAreSatisfied,
} from "./warding-bond.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "./spells-resolve-resources.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";

import {
  conditionRemovalProtectionSpellTargetSelection,
  conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection,
  creatureTypeProtectionSpellTargetSelection,
  healingSpellTargetSelection,
  rollModifierSpellAffectedTargets,
  rollModifierSpellEffectSelection,
  rollModifierSpellTargetSelection,
  scalarBuffSpellTargetSelection,
} from "./spells-resolve-target-selection.ts";

import { type SpellFillSet } from "./spells-resolve-fill-set.ts";

export function resolvePreparedHealingSpellAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hit Point restoration spells use target fills and one healing roll.",
    );
  }
  const targetSelection = healingSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource:
        input.input.subject.tag === "bonusActionSpell"
          ? { kind: "bonusAction" }
          : { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (input.fillSet.healingRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellHealingRollHole(input.invocation),
    ]);
  }
  const healingValidation = validateSpellHealingFill(
    input.fillSet.healingRoll,
    input.invocation,
  );
  if (healingValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", healingValidation);
  }
  const healingAmount = spellHealingAmount(
    input.invocation,
    input.fillSet.healingRoll,
  );
  const healed = targetSelection.targetIds.reduce((state, targetId) => {
    const target = state.combatants.get(targetId);
    return target === undefined
      ? state
      : {
          ...state,
          combatants: new Map(state.combatants).set(
            targetId,
            applyHpHealing(target, healingAmount),
          ),
        };
  }, input.input.state);
  return spendSpellCastResources({
    state: healed,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

export function resolveMakeStableSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "makeStable" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Stable cantrips use one zero-Hit-Point target fill.",
    );
  }
  const targetHole = spellTargetHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a zero-Hit-Point non-dead combatant within the selected spell's supported range.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.fillSet.targetId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const target = input.input.state.combatants.get(input.fillSet.targetId);
  if (
    target === undefined ||
    target.zeroHpLifecycle.policy !== "usesDeathSavingThrows"
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a zero-Hit-Point non-dead combatant within the selected spell's supported range.",
    );
  }

  const nextTarget = {
    ...target,
    zeroHpLifecycle: {
      ...target.zeroHpLifecycle,
      deathSaves: { ...resetDeathSaveRuntimeState(), stable: true },
    },
  };
  const effected = {
    ...input.input.state,
    combatants: new Map(input.input.state.combatants).set(
      target.combatantId,
      nextTarget,
    ),
  };
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

export function resolveScalarBuffSpellAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Scalar buff spells use target fills and optional scalar dice roll.",
    );
  }
  const targetSelection = scalarBuffSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource:
        input.input.subject.tag === "bonusActionSpell"
          ? { kind: "bonusAction" }
          : { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (
    input.invocation.effect.kind === "temporaryHitPoints" &&
    input.fillSet.healingRoll == null
  ) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellScalarBuffRollHole(input.invocation),
    ]);
  }
  if (
    input.invocation.effect.kind === "temporaryHitPoints" &&
    input.fillSet.healingRoll !== undefined
  ) {
    const validation = validateScalarBuffTemporaryHitPointsFill(
      input.fillSet.healingRoll,
      input.invocation,
    );
    if (validation !== null) {
      return invalidResult(input.input.state, "invalidFill", validation);
    }
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyScalarBuffSpellEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
    input.fillSet.healingRoll,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveRollModifierSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Roll modifier spells use target, optional skill or ability, and optional Saving Throw fills.",
    );
  }

  const targetSelection = rollModifierSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const effectSelection = rollModifierSpellEffectSelection(input);
  if (effectSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      effectSelection.hole,
    ]);
  }
  if (effectSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      effectSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const affectedTargets = rollModifierSpellAffectedTargets(input);
  if (affectedTargets.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      affectedTargets.hole,
    ]);
  }
  if (affectedTargets.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      affectedTargets.message,
    );
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyRollModifierSpellEffect(
    concentrationBase,
    affectedTargets.targetIds,
    effectSelection.effect,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveWardingBondSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "wardingBond" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Warding Bond uses one willing target with paired worn rings and connection range facts.",
    );
  }

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
    ) ||
    !spellTargetIsKnownWilling(
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    ) ||
    !wardingBondCastFactsAreSatisfied({
      casterId: input.actorId,
      targetId: target.combatantId,
      invocation: input.invocation,
      facts: input.fillSet.targetSpatialFacts,
    })
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Warding Bond target must be another willing creature with paired worn platinum rings within 60 feet.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [target.combatantId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyWardingBondSpellEffect(
    input.input.state,
    input.actorId,
    target.combatantId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveThaumaturgyBoomingVoiceSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "thaumaturgyBoomingVoice" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetSpatialFacts.length > 0 ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy Booming Voice uses only the total active 1-minute effect count witness.",
    );
  }

  const activeCountFill = input.fillSet.thaumaturgyActiveOneMinuteEffectCount;
  if (activeCountFill === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      thaumaturgyActiveOneMinuteEffectCountHole(input.invocation),
    ]);
  }
  const activeCount = activeCountFill.value.activeOneMinuteEffectCount;
  if (!Number.isInteger(activeCount) || activeCount < 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy active 1-minute effect count must be a non-negative integer.",
    );
  }
  const actor = input.input.state.combatants.get(input.actorId);
  const existingBoomingVoiceEffectCount =
    actor?.activeEffects.filter((effect) =>
      isThaumaturgyBoomingVoiceEffectForInvocation(
        effect,
        input.actorId,
        input.invocation,
      ),
    ).length ?? 0;
  if (activeCount < existingBoomingVoiceEffectCount) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy active 1-minute effect count must include active Booming Voice effects tracked by battle runtime.",
    );
  }
  const activeCountAfterCast =
    activeCount - existingBoomingVoiceEffectCount + 1;
  if (activeCountAfterCast > THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Thaumaturgy can have at most three active 1-minute effects after this cast.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyThaumaturgyBoomingVoiceSpellEffect(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveBlurAttackRollDefenseSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "blurAttackRollDefense" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetSpatialFacts.length > 0 ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.spellDamageReductionRolls.length > 0 ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Blur uses no target, roll, damage, or selection fills.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyBlurAttackRollDefenseSpellEffect(
    concentrationBase,
    input.actorId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveCreatureTypeProtectionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "creatureTypeProtection" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Creature-type protection spells use one target fill.",
    );
  }

  const targetSelection = creatureTypeProtectionSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyCreatureTypeProtectionSpellEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveConditionRemovalProtectionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "conditionRemovalProtection" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Condition-removal protection spells use one target fill.",
    );
  }

  const targetSelection = conditionRemovalProtectionSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyConditionRemovalProtectionSpellEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveDamageReductionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "damageReduction" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spells use one target fill and one damage type choice.",
    );
  }

  const targetHole = spellTargetHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
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
  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  if (
    !input.invocation.damageTypeChoices.includes(
      input.fillSet.damageTypeChoice.value,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spell damage type must be one of the selected spell's choices.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.fillSet.targetId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyDamageReductionSpellEffect(
    concentrationBase,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.damageTypeChoice.value,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveJumpMovementReplacementSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "jumpMovementReplacement" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetId !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Jump uses a target-list fill only.",
    );
  }

  if (input.fillSet.targetList === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetListHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: input.fillSet.targetList.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyJumpMovementReplacementSpellEffect(
    input.input.state,
    input.actorId,
    input.fillSet.targetList.targetIds,
    input.invocation,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

export function resolveSelfTeleportSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "selfTeleport" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetId !== undefined ||
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.targetSpatialFacts.length > 0 ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Misty Step uses a teleport-destination fill only.",
    );
  }

  if (input.fillSet.teleportDestination === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTeleportDestinationHole(input.invocation, input.actorId),
    ]);
  }
  const destinationFill = input.fillSet.teleportDestination;
  const destination = destinationFill.value;
  const validation = validateSelfTeleportDestination(
    input.invocation,
    input.actorId,
    destinationFill,
    destination,
  );
  if (validation !== null) {
    return invalidResult(input.input.state, "invalidFill", validation);
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
        teleports: [
          {
            kind: "selfTeleport",
            actorId: input.actorId,
            sourceSpellId: spellId(input.invocation.spell.id),
            destination: selfTeleportOutcomeDestination(destination),
            spendsMovement: false,
            provokesOpportunityAttacks: false,
            transportsWornAndCarriedEquipment: true,
          },
        ],
      };
}

function selfTeleportOutcomeDestination(
  destination: BattleTeleportDestinationFact,
): BattleTeleportDestination {
  return {
    kind: destination.kind,
    destinationId: destination.destinationId,
    distanceFeet: destination.distanceFeet,
  };
}

function validateSelfTeleportDestination(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "selfTeleport" }
  >,
  actorId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "teleportDestination" }>,
  destination: BattleTeleportDestinationFact,
): string | null {
  if (fill.holeId !== spellTeleportDestinationHoleId(invocation, actorId)) {
    return "Teleport destination must use the selected spell act destination hole.";
  }
  if (destination.actorId !== actorId) {
    return "Teleport destination table fact must match the caster.";
  }
  if (destination.spellId !== spellId(invocation.spell.id)) {
    return "Teleport destination table fact must match the spell.";
  }
  if (destination.distanceFeet <= 0) {
    return "Teleport destination must be more than 0 feet away.";
  }
  if (destination.distanceFeet > invocation.maxDistanceFeet) {
    return `${invocation.spell.name} destination must be within ${invocation.maxDistanceFeet} feet.`;
  }
  return null;
}

export function resolveConditionImmunityAndTurnStartTemporaryHitPointsSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Heroism uses target fills only.",
    );
  }
  const targetSelection =
    conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const effected = applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}
