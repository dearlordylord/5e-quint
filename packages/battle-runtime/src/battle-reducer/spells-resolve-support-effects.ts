// Support-effect spell resolution extracted from spells-resolve.ts.
// Covers healing, scalar buffs, roll modifiers, protection, damage reduction,
// and condition-immunity/temporary-hit-point procedures.

import { resetDeathSaveRuntimeState } from "@dnd/shared-algebras/death-saves-algebra";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleResolutionResult,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { applyHpHealing, breakBattleConcentration } from "./damage-apply.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { spellHealingAmount } from "./spell-effects.ts";
import {
  applyConditionImmunityAndTurnStartTemporaryHitPointsEffects,
  applyCreatureTypeProtectionSpellEffect,
  applyDamageReductionSpellEffect,
  applyJumpMovementReplacementSpellEffect,
  applyRollModifierSpellEffect,
  applyScalarBuffSpellEffect,
  spellDamageTypeChoiceHole,
  spellHealingRollHole,
  spellScalarBuffRollHole,
  spellTargetHole,
  spellTargetIsLegal,
  spellTargetListHole,
  validateSpellTargetList,
  validateScalarBuffTemporaryHitPointsFill,
  validateSpellHealingFill,
} from "./spells-holes-fills.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "./spells-resolve-resources.ts";

import {
  conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection,
  creatureTypeProtectionSpellTargetSelection,
  healingSpellTargetSelection,
  rollModifierSpellAffectedTargets,
  rollModifierSpellSkillSelection,
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
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
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
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [input.fillSet.targetId],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
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
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
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
      "Roll modifier spells use target, optional skill, and optional Saving Throw fills.",
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

  const skillSelection = rollModifierSpellSkillSelection(input);
  if (skillSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      skillSelection.hole,
    ]);
  }
  if (skillSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      skillSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
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
    input.actorId,
    affectedTargets.targetIds,
    input.invocation,
    skillSelection.skill,
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
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
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
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [input.fillSet.targetId],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
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
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: input.fillSet.targetList.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
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
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
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
