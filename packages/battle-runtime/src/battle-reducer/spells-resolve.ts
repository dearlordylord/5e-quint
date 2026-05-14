// Spell resolution dispatch (Cluster L). Mechanical extraction from
// battle-reducer.ts. The largest cluster in the file: master spell-act
// resolvers (`resolveSpellAct`, `resolveAttackBurstSaveDamageSpellAct`,
// `resolveSpellRelease`, `resolvePreparedSlotSpellAct`, …),
// per-procedure resolver bodies (chained spells, healing, scalar buff,
// roll-modifier, creature-type protection, condition immunity, save-gate
// damage/condition/attack-roll-advantage), target-selection helpers, fill-set
// builders, and resource-spending helpers (`spendSpellCastResources`,
// `spellRequiresConcentration`, `startSpellEffectConcentration`).
//
// L sits at the top of the spell subsystem DAG. It consumes K (discovery),
// O (profiles), P (holes/fills), Q (spell-effects), M (damage-apply),
// N (damage-helpers), R (hole-helpers), S (movement-speed), T (attack-roll),
// U (attack-damage-apply), V (statblock), W (statblock-attacks), and G
// (creature-state). Calls into dispatcher-layer functions (`endTurn`,
// `snapshotBattle`, `discoverBattleActs`, etc.) round-trip through
// `../battle-reducer.ts` until Pass 19 merges the dispatcher.

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import { Either } from "effect";
import {
  activeOngoingFeaturesPreventSpellcasting,
  attackRollIsCriticalHit,
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleResolutionResult,
  type BonusActionDashSpellBattleResolutionInput,
  type BonusActionSpellBattleResolutionInput,
  type SpellMarkedDamageRider,
  type SupportedDamageSpellInvocation,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import { spellId, type CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeSelfAttackRollEffects,
  consumeHelpAttackForAttackRoll,
  objectTargetAttackNeedsSightFact,
  recordAttackRollOngoingFeatures,
  requiredSpellObjectTargetAttackRollMode,
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import {
  breakBattleConcentration,
  concentrationSavingThrowHole,
} from "./damage-apply.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSpellDamageReduction,
  damageAmountByTypeAfterTargetAdjustments,
  spellDamageReductionRollForTarget,
} from "./damage-helpers.ts";
import { needsHolesResult, revealHidden } from "./hole-helpers.ts";
import { applyDashToActor } from "./attack-resolution.ts";
import { invalidResult } from "./result-helpers.ts";
import { expendSpellSlot } from "./spell-effects.ts";
import {
  isReadiedSpellInvocation,
  spellInvocationCasterPrerequisiteIsMet,
  spellInvocationIsSpellcasting,
  spellRequiresVerbal,
} from "./spells-discovery.ts";
import {
  applyPersistentSpellActiveEffect,
  applySpellActiveEffects,
  applySpellLightEmitterEffects,
  applySpellDamage,
  spellObjectDamageOutcome,
  spellObjectTargetFact,
  spellObjectTargetSightFact,
  spellObjectTargetHole,
  spellAttackRollHole,
  spellDamageByTypeForTarget,
  spellDamageHole,
  spellDamageTypes,
  spellDamageTypeChoiceHole,
  spellObjectAttackRollHole,
  spellObjectIgnitionFact,
  spellTargetHole,
  spellTargetIsLegal,
  supportedSpellInvocationMatchesRef,
  validateSpellDamageFill,
} from "./spells-holes-fills.ts";
import {
  markSpellSlotExpendedThisTurn,
  spellActTurnResourceAvailable,
  spellAttackKindForRedirect,
  spellHasAvailableSpend,
  supportedSpellActs,
} from "./spells-profiles.ts";
import { representedMovementSpeedKinds } from "./movement-speed.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";

import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { resolveChainedSpellAttackDamageAct } from "./spells-resolve-chained.ts";
import { resolveSpellAttackBeamSequenceAct } from "./spells-resolve-beam-sequence.ts";
export { resolveAttackBurstSaveDamageSpellAct } from "./spells-resolve-attack-burst.ts";
export {
  applyChainedSpellDamage,
  chainedSpellDamageAmountForTarget,
  chainedSpellFillSet,
  chainedSpellLaterStepsAreEmpty,
  chainedSpellStepIndexForFill,
  damageRollHasDuplicateD8Face,
  emptyChainedSpellStepFills,
  resolveChainedSpellAttackDamageAct,
  resolveCompletedChainedSpell,
  validateChainedSpellDamageFill,
  validateChainedSpellFollowUpFills,
  type ChainedSpellFillSet,
  type ChainedSpellStepFills,
} from "./spells-resolve-chained.ts";
export { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
export {
  spellFillSet,
  spellFillSetSavingThrowTargeting,
  type SpellFillSet,
} from "./spells-resolve-fill-set.ts";
export { resolvePreparedSlotSpellAct } from "./spells-resolve-prepared-slot.ts";
export {
  spellRequiresConcentration,
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "./spells-resolve-resources.ts";
export {
  resolveCommandSpellAct,
  resolveGreaseGroundHazardSpellAct,
  resolveSaveGateAttackRollAdvantageSpellAct,
  resolveSaveGateConditionSpellAct,
  resolveSaveGateDamageSpellAct,
  resolveSleepTargetAdmissionSpellAct,
  validateSavingThrowOutcomes,
} from "./spells-resolve-save-gates.ts";
export {
  resolveConditionImmunityAndTurnStartTemporaryHitPointsSpellAct,
  resolveCreatureTypeProtectionSpellAct,
  resolveDamageReductionSpellAct,
  resolveJumpMovementReplacementSpellAct,
  resolvePreparedHealingSpellAct,
  resolveRollModifierSpellAct,
  resolveScalarBuffSpellAct,
} from "./spells-resolve-support-effects.ts";
export {
  conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection,
  creatureTypeProtectionSpellTargetSelection,
  healingSpellTargetSelection,
  rollModifierSpellAffectedTargets,
  rollModifierSpellSkillSelection,
  rollModifierSpellTargetSelection,
  scalarBuffSpellTargetSelection,
  type ConditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection,
  type CreatureTypeProtectionSpellTargetSelection,
  type HealingSpellTargetSelection,
  type RollModifierSpellAffectedTargets,
  type RollModifierSpellSkillSelection,
  type RollModifierSpellTargetSelection,
  type ScalarBuffSpellTargetSelection,
} from "./spells-resolve-target-selection.ts";

import {
  resolveConditionImmunityAndTurnStartTemporaryHitPointsSpellAct,
  resolveCreatureTypeProtectionSpellAct,
  resolveDamageReductionSpellAct,
  resolveJumpMovementReplacementSpellAct,
  resolvePreparedHealingSpellAct,
  resolveRollModifierSpellAct,
  resolveScalarBuffSpellAct,
} from "./spells-resolve-support-effects.ts";

import { resolvePreparedSlotSpellAct } from "./spells-resolve-prepared-slot.ts";

import { resolveAttackBurstSaveDamageSpellAct } from "./spells-resolve-attack-burst.ts";

import {
  resolveCommandSpellAct,
  resolveGreaseGroundHazardSpellAct,
  resolveSaveGateAttackRollAdvantageSpellAct,
  resolveSaveGateConditionSpellAct,
  resolveSaveGateDamageSpellAct,
  resolveSleepTargetAdmissionSpellAct,
} from "./spells-resolve-save-gates.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";

import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  resolveHeldLightSpellAct,
  resolveMarkedDamageRiderSpellAct,
  resolveObjectLightSpellAct,
  resolveReadySpellAct,
  resolveWeaponDamageRiderSpellAct,
} from "./spells-resolve-release.ts";
import { resolveSpellHostedWeaponAttackSpellAct } from "./spells-resolve-weapon-attack.ts";
export * from "./spells-resolve-release.ts";

type SpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellAttackDamage" }
>;

function isSupportedDamageSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SupportedDamageSpellInvocation {
  return (
    invocation.procedure === "heldLightHurl" ||
    invocation.procedure === "repeatedDamageAllocation" ||
    (invocation.procedure === "spellAttackDamage" &&
      invocation.damage.kind !== "sorcerousBurstDamageTypeChoice") ||
    invocation.procedure === "spellAttackBeamSequence" ||
    invocation.procedure === "saveGatedDamage" ||
    invocation.procedure === "attackBurstSaveDamage"
  );
}

function selectedSpellAttackDamageInvocation(
  invocation: SupportedSpellInvocation,
  damageTypeChoice:
    | Extract<SpellFillSet, { readonly tag: "ok" }>["damageTypeChoice"]
    | undefined,
):
  | { readonly tag: "ok"; readonly invocation: SupportedSpellInvocation }
  | {
      readonly tag: "needsHoles";
      readonly hole: ReturnType<typeof spellDamageTypeChoiceHole>;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  if (
    invocation.procedure !== "spellAttackDamage" ||
    invocation.damage.kind !== "sorcerousBurstDamageTypeChoice"
  ) {
    return { tag: "ok", invocation };
  }
  if (damageTypeChoice === undefined) {
    return { tag: "needsHoles", hole: spellDamageTypeChoiceHole(invocation) };
  }
  const selectedDamageType: DamageType = damageTypeChoice.value;
  if (!invocation.damage.damageTypeChoices.includes(selectedDamageType)) {
    return {
      tag: "invalid",
      message:
        "Spell attack damage type must be one of the selected spell's choices.",
    };
  }
  return {
    tag: "ok",
    invocation: {
      ...invocation,
      damage: {
        kind: "selectedSorcerousBurstDamage",
        expr: invocation.damage.expr,
        damageType: selectedDamageType,
        maxDieAdditionalDiceLimit: invocation.damage.maxDieAdditionalDiceLimit,
      },
    } satisfies SpellAttackDamageInvocation,
  };
}

export function resolveSpellAct(
  input: ActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find(
          (candidate) =>
            supportedSpellInvocationMatchesRef(candidate, subject.invocation) &&
            (candidate.procedure !== "spellHostedWeaponAttack" ||
              (subject.componentWeaponItemId !== undefined &&
                candidate.componentWeapon.itemId ===
                  subject.componentWeaponItemId)),
        )
      : undefined;
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Action-time spell act requires a supported prepared spell or cantrip.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act no longer has its required runtime spell resource.",
    );
  }
  if (!spellInvocationCasterPrerequisiteIsMet(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act requires its active caster spell effect.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (
    subject.mode.tag === "ready" &&
    (invocation.procedure === "directHitPointRestoration" ||
      invocation.procedure === "heldLightHurl" ||
      invocation.procedure === "objectLight" ||
      invocation.procedure === "spellHostedWeaponAttack" ||
      invocation.procedure === "damageReduction" ||
      invocation.procedure === "scalarBuff" ||
      invocation.procedure === "rollModifier" ||
      invocation.procedure === "creatureTypeProtection" ||
      invocation.procedure ===
        "conditionImmunityAndTurnStartTemporaryHitPoints" ||
      invocation.procedure === "afterHitDamage" ||
      invocation.procedure === "afterHitSaveGatedCondition" ||
      invocation.procedure === "afterHitTimedDamageAndSave" ||
      invocation.procedure === "saveGatedCondition" ||
      invocation.procedure === "saveGatedAttackRollAdvantage" ||
      invocation.procedure === "command" ||
      invocation.procedure === "spellAttackBeamSequence")
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "This spell procedure cannot be readied by this runtime lane.",
    );
  }
  if ("actionCost" in invocation && invocation.actionCost === "bonusAction") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Prepared Bonus Action spells must use the Bonus Action spell subject.",
    );
  }
  if (invocation.procedure === "shieldReaction") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Triggered Reaction spells must use the pending Reaction decision.",
    );
  }
  if (invocation.procedure === "featherFallMitigation") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Triggered Reaction spells must use the pending Reaction decision.",
    );
  }
  if (invocation.spell.mechanics.family === "triggered_reaction") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Triggered Reaction spells must use the pending Reaction decision.",
    );
  }
  if (
    !spellActTurnResourceAvailable(input.state.currentTurnResources, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }

  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, subject.actorId)
    : input.state;
  if (subject.mode.tag === "ready") {
    if (!isReadiedSpellInvocation(invocation)) {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "This spell procedure cannot be readied by this runtime lane.",
      );
    }
    return resolveReadySpellAct({ ...input, state: castingState }, invocation);
  }

  if (invocation.procedure === "chainedSpellAttackDamage") {
    return resolveChainedSpellAttackDamageAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
    });
  }

  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.procedure === "spellAttackBeamSequence") {
    return resolveSpellAttackBeamSequenceAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "attackBurstSaveDamage") {
    return resolveAttackBurstSaveDamageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "objectLight") {
    return resolveObjectLightSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    return resolveSpellHostedWeaponAttackSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "saveGatedDamage") {
    return resolveSaveGateDamageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "saveGatedCondition") {
    return resolveSaveGateConditionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "saveGatedAttackRollAdvantage") {
    return resolveSaveGateAttackRollAdvantageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "sleepTargetAdmission") {
    return resolveSleepTargetAdmissionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "greaseGroundHazard") {
    return resolveGreaseGroundHazardSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "command") {
    return resolveCommandSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return resolvePreparedSlotSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "directHitPointRestoration") {
    return resolvePreparedHealingSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "scalarBuff") {
    return resolveScalarBuffSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "rollModifier") {
    return resolveRollModifierSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "creatureTypeProtection") {
    return resolveCreatureTypeProtectionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "damageReduction") {
    return resolveDamageReductionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (
    invocation.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  ) {
    return resolveConditionImmunityAndTurnStartTemporaryHitPointsSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId !== undefined && fillSet.objectTarget !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must choose either one combatant or one object, not both.",
    );
  }
  const selectedInvocation = selectedSpellAttackDamageInvocation(
    invocation,
    fillSet.damageTypeChoice,
  );
  if (selectedInvocation.tag === "needsHoles") {
    return needsHolesResult(castingState, input.subject, [
      selectedInvocation.hole,
    ]);
  }
  if (selectedInvocation.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      selectedInvocation.message,
    );
  }
  const invocationForResolution = selectedInvocation.invocation;
  if (fillSet.targetId == null && fillSet.objectTarget === undefined) {
    return needsHolesResult(castingState, input.subject, [
      spellTargetHole(castingState, subject.actorId, invocationForResolution),
      ...((invocationForResolution.procedure === "heldLightHurl" ||
        invocationForResolution.procedure === "spellAttackDamage") &&
      invocationForResolution.targeting.kind === "singleCreatureOrObject"
        ? [spellObjectTargetHole(invocationForResolution)]
        : []),
    ]);
  }
  const objectTarget = fillSet.objectTarget;
  if (objectTarget !== undefined) {
    if (
      (invocationForResolution.procedure !== "heldLightHurl" &&
        invocationForResolution.procedure !== "spellAttackDamage") ||
      invocationForResolution.targeting.kind !== "singleCreatureOrObject"
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Object target fill does not match this spell act.",
      );
    }
    if (
      invocationForResolution.procedure === "spellAttackDamage" &&
      !isSupportedDamageSpellInvocation(invocationForResolution)
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Object-target spell attack damage requires a selected damage type.",
      );
    }
    return resolveSpellAttackDamageObjectTarget({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation: invocationForResolution,
      fillSet: { ...fillSet, objectTarget },
    });
  }
  if (fillSet.targetId == null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target fill did not select a target.",
    );
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      subject.actorId,
      target.combatantId,
      invocationForResolution,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }

  if (invocationForResolution.procedure === "persistentArmorEffect") {
    if (
      fillSet.attackRoll != null ||
      fillSet.damageRoll != null ||
      fillSet.concentrationSavingThrows.length > 0
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Persistent spell effects do not use attack or damage fills.",
      );
    }
    const effected = applyPersistentSpellActiveEffect(
      castingState,
      subject.actorId,
      target.combatantId,
      invocationForResolution,
    );
    return spendSpellCastResources({
      state: effected,
      actorId: subject.actorId,
      invocation: invocationForResolution,
      errorState: input.state,
      startConcentration: false,
    });
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    castingState,
    {
      trigger: "spellCast",
      casterId: subject.actorId,
      spellId: invocationForResolution.spell.id,
      targetIds: [target.combatantId],
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  let spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [];
  if (
    invocationForResolution.procedure === "spellAttackDamage" ||
    invocationForResolution.procedure === "heldLightHurl"
  ) {
    const requiredRollMode = requiredSpellAttackRollMode(
      castingState,
      subject.actorId,
      target.combatantId,
      invocationForResolution,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(castingState, input.subject, [
        spellAttackRollHole(
          castingState,
          subject.actorId,
          invocationForResolution,
          requiredRollMode,
        ),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const ordinaryHit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: castingState,
      subject: input.subject,
      attackerId: subject.actorId,
      targetId: target.combatantId,
      attackRoll: fillSet.attackRoll,
      ordinaryHit,
    });
    if (
      fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
      missToHitReplacement === null
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      );
    }
    const hit = ordinaryHit || missToHitReplacement !== null;
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    const attackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          castingState,
          subject.actorId,
          target.combatantId,
          null,
        ),
        subject.actorId,
        target.combatantId,
      ),
      subject.actorId,
      missToHitReplacement,
      {
        subject: input.subject,
        targetId: target.combatantId,
        attackRoll: fillSet.attackRoll,
      },
    );
    spellMarkedDamageRiders = hit
      ? activeMarkedDamageRiders(
          attackRolledState.combatants.get(subject.actorId),
          target.combatantId,
        )
      : [];
    if (hit && input.suppressedReactionTrigger !== "attackHit") {
      const reactionWindow = maybeOpenReactionWindow(
        attackRolledState,
        {
          trigger: "attackHit",
          attackerId: subject.actorId,
          targetId: target.combatantId,
          attackRoll: fillSet.attackRoll,
          attackKind: spellAttackKindForRedirect(
            invocationForResolution.attackKind,
          ),
          attackHitTriggerKind: "otherAttack",
          damageTypes: [
            ...new Set([
              ...spellDamageTypes(invocationForResolution),
              ...spellMarkedDamageRiders.map(
                (rider) => rider.damage.damageType,
              ),
            ]),
          ],
          continuation: {
            kind: "replay",
            subject: input.subject,
            fills: input.fills,
          },
        },
        input.suppressedReactionTrigger,
      );
      if (reactionWindow !== null) {
        return reactionWindow;
      }
    }
    if (hit && fillSet.damageRoll == null) {
      if (!isSupportedDamageSpellInvocation(invocationForResolution)) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Selected spell act does not use a damage roll.",
        );
      }
      return needsHolesResult(attackRolledState, input.subject, [
        spellDamageHole(
          invocationForResolution,
          critical,
          spellMarkedDamageRiders,
        ),
      ]);
    }
    if (
      !hit &&
      (fillSet.damageRoll != null || fillSet.damageDispositions.length > 0)
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return spendSpellCastResources({
        state: attackRolledState,
        actorId: subject.actorId,
        invocation: invocationForResolution,
        errorState: input.state,
      });
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (!isSupportedDamageSpellInvocation(invocationForResolution)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Selected spell act does not use a damage roll.",
    );
  }
  const damageInvocation = invocationForResolution;
  if (fillSet.damageRoll == null) {
    return needsHolesResult(castingState, input.subject, [
      spellDamageHole(damageInvocation),
    ]);
  }
  const spellAttackMissToHitReplacement =
    (invocationForResolution.procedure === "spellAttackDamage" ||
      invocationForResolution.procedure === "heldLightHurl") &&
    fillSet.attackRoll != null
      ? selectedAttackRollMissToHitReplacement({
          state: castingState,
          subject: input.subject,
          attackerId: subject.actorId,
          targetId: target.combatantId,
          attackRoll: fillSet.attackRoll,
          ordinaryHit: attackRollHits(
            fillSet.attackRoll,
            currentArmorClass(activeEffectArmorClass(target)),
          ),
        })
      : null;
  const spellResolutionState =
    (invocationForResolution.procedure === "spellAttackDamage" ||
      invocationForResolution.procedure === "heldLightHurl") &&
    fillSet.attackRoll != null
      ? recordAttackRollMissToHitReplacementUsed(
          consumeHelpAttackForAttackRoll(
            recordAttackRollOngoingFeatures(
              castingState,
              subject.actorId,
              target.combatantId,
              null,
            ),
            subject.actorId,
            target.combatantId,
          ),
          subject.actorId,
          spellAttackMissToHitReplacement,
          {
            subject: input.subject,
            targetId: target.combatantId,
            attackRoll: fillSet.attackRoll,
          },
        )
      : castingState;
  const critical =
    (invocationForResolution.procedure === "spellAttackDamage" ||
      invocationForResolution.procedure === "heldLightHurl") &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    damageInvocation,
    critical,
    spellMarkedDamageRiders,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const spellReductionRoll = spellDamageReductionRollForTarget(
    fillSet.spellDamageReductionRolls,
    target,
  );
  const spellReduction = applyAvailableSpellDamageReduction(
    target,
    spellDamageByTypeForTarget(
      target,
      damageInvocation,
      fillSet.damageRoll,
      "full",
      spellMarkedDamageRiders,
      critical,
    ),
    spellReductionRoll,
  );
  if (spellReduction.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(spellResolutionState, input.subject, [
      ...spellReduction.holes,
    ]);
  }
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
    spellReduction.target,
    spellReduction.damageByType,
  );
  const concentrationSave = concentrationSavingThrowHole(
    spellReduction.target,
    spellDamageAmount,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null) {
    if (concentrationFill === undefined) {
      return needsHolesResult(spellResolutionState, input.subject, [
        concentrationSave,
      ]);
    }
    if (fillSet.concentrationSavingThrows.length > 1) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage accepts one Concentration Saving Throw fill for the damaged target.",
      );
    }
  } else if (fillSet.concentrationSavingThrows.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: subject.actorId,
    target: spellReduction.target,
    damageAmount: spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(spellResolutionState, input.subject, [
      damageDispositionHole,
    ]);
  }
  const damaged = applySpellDamage(
    spellResolutionState,
    target.combatantId,
    damageInvocation,
    fillSet.damageRoll,
    critical,
    {
      concentrationSavingThrow: concentrationFill,
      damageDisposition: damageDispositionForTarget(
        damageDispositionHole === null ? [] : [damageDispositionHole],
        fillSet.damageDispositions,
        target.combatantId,
      ),
      spellMarkedDamageRiders,
      spellDamageReductionRoll: spellReductionRoll,
      damageSourceId: subject.actorId,
    },
  );
  const effected = applySpellActiveEffects(
    damaged,
    subject.actorId,
    target.combatantId,
    invocationForResolution,
  );
  const lit =
    invocationForResolution.procedure === "heldLightHurl" ||
    invocationForResolution.procedure === "spellAttackDamage"
      ? applySpellLightEmitterEffects(
          effected,
          subject.actorId,
          { kind: "combatant", combatantId: target.combatantId },
          invocationForResolution,
        )
      : effected;
  const spentResources = spendSpellCastResources({
    state: lit,
    actorId: subject.actorId,
    invocation: invocationForResolution,
    errorState: input.state,
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const nextState = spentResources.state;
  const afterDamageReactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: subject.actorId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(spellDamageAmount),
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: fillSet.targetSpatialFacts,
        damagedId: target.combatantId,
        damageSourceId: subject.actorId,
      }),
      continuation: {
        kind: "resolved",
        subject: input.subject,
      },
    },
    input.suppressedReactionTrigger,
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

function resolveSpellAttackDamageObjectTarget(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation:
    | Extract<SupportedSpellInvocation, { readonly procedure: "heldLightHurl" }>
    | Extract<
        SupportedDamageSpellInvocation,
        { readonly procedure: "spellAttackDamage" }
      >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }> & {
    readonly objectTarget: NonNullable<
      Extract<SpellFillSet, { readonly tag: "ok" }>["objectTarget"]
    >;
  };
}): BattleResolutionResult {
  const objectFact = spellObjectTargetFact(
    input.fillSet.objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof input.fillSet.objectTarget.spatialFacts)[number],
        { readonly kind: "spellObjectTarget" }
      > => fact.kind === "spellObjectTarget",
    ),
    input.actorId,
    input.fillSet.objectTarget.objectId,
    input.invocation,
  );
  if (objectFact === null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied range and object Armor Class fact.",
    );
  }
  const sightFact = spellObjectTargetSightFact(
    input.fillSet.objectTarget.spatialFacts.filter(
      (
        fact,
      ): fact is Extract<
        (typeof input.fillSet.objectTarget.spatialFacts)[number],
        { readonly kind: "spellObjectTargetSight" }
      > => fact.kind === "spellObjectTargetSight",
    ),
    input.actorId,
    input.fillSet.objectTarget.objectId,
    input.invocation,
  );
  if (
    sightFact === null &&
    objectTargetAttackNeedsSightFact(
      input.input.state,
      input.fillSet.objectTarget.objectId,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied object sight fact.",
    );
  }
  const ignitionFact =
    input.invocation.procedure === "spellAttackDamage" &&
    input.invocation.objectHitEffect.kind === "igniteFlammableUnattended"
      ? spellObjectIgnitionFact(
          input.fillSet.objectTarget.spatialFacts.filter(
            (
              fact,
            ): fact is Extract<
              (typeof input.fillSet.objectTarget.spatialFacts)[number],
              { readonly kind: "spellObjectIgnition" }
            > => fact.kind === "spellObjectIgnition",
          ),
          input.actorId,
          input.fillSet.objectTarget.objectId,
          input.invocation,
        )
      : null;
  if (
    input.invocation.procedure === "spellAttackDamage" &&
    input.invocation.objectHitEffect.kind === "igniteFlammableUnattended" &&
    ignitionFact === null
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell object target must include a matching table-supplied object ignition fact.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [],
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

  const requiredRollMode = requiredSpellObjectTargetAttackRollMode(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.objectTarget.objectId,
    sightFact?.attackerCanSeeObject,
  );
  if (input.fillSet.attackRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellObjectAttackRollHole(input.invocation, requiredRollMode),
    ]);
  }
  if (!attackRollResultIsValid(input.fillSet.attackRoll)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  if (!attackRollModeMatches(input.fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll mode does not match the current attack-roll rule.",
    );
  }
  if (
    input.fillSet.attackRoll.activatedOngoingFeatureUnitId !== undefined ||
    input.fillSet.attackRoll.missToHitReplacementUnitId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell attacks do not use combatant attack-roll feature selections.",
    );
  }

  const hit = attackRollHits(input.fillSet.attackRoll, objectFact.armorClass);
  const critical = attackRollIsCriticalHit(input.fillSet.attackRoll);
  const attackRolledState = consumeSelfAttackRollEffects(
    {
      ...input.input.state,
      currentTurnResources: {
        ...input.input.state.currentTurnResources,
        attackRollMadeThisTurn: true,
      },
    },
    input.actorId,
  );
  if (
    !hit &&
    (input.fillSet.damageRoll != null ||
      input.fillSet.damageDispositions.length > 0)
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return spendSpellCastResources({
      state: attackRolledState,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
    });
  }
  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      spellDamageHole(input.invocation, critical),
    ]);
  }
  const damageValidation = validateSpellDamageFill(
    input.fillSet.damageRoll,
    input.invocation,
    critical,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }
  if (
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Object-target spell damage does not use combatant damage, Concentration, or spell-reduction fills.",
    );
  }

  const lit = applySpellLightEmitterEffects(
    attackRolledState,
    input.actorId,
    { kind: "object", objectId: input.fillSet.objectTarget.objectId },
    input.invocation,
  );
  const spentResources = spendSpellCastResources({
    state: lit,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const objectDamage = spellObjectDamageOutcome({
    objectId: input.fillSet.objectTarget.objectId,
    invocation: input.invocation,
    damageRoll: input.fillSet.damageRoll,
    critical,
    disposition: objectFact.damageDisposition,
  });
  const objectIgnitions =
    ignitionFact?.disposition.kind === "flammableUnattended"
      ? [
          {
            kind: "startsBurning" as const,
            objectId: input.fillSet.objectTarget.objectId,
            sourceCombatantId: input.actorId,
            sourceSpellId: spellId(input.invocation.spell.id),
          },
        ]
      : [];

  return {
    tag: "resolved",
    state: spentResources.state,
    snapshot: snapshotBattle(spentResources.state),
    objectDamages: [objectDamage],
    ...(objectIgnitions.length === 0 ? {} : { objectIgnitions }),
  };
}

export function resolveBonusActionSpellAct(
  input: BonusActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find((candidate) =>
          supportedSpellInvocationMatchesRef(candidate, subject.invocation),
        )
      : undefined;
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action spell act requires a supported Bonus Action spell.",
    );
  }
  if (invocation.procedure === "heldLight") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "scalarBuff") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "weaponDamageRider") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "markedDamageRider") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "jumpMovementReplacement") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (
    invocation.procedure !== "directHitPointRestoration" ||
    invocation.actionCost !== "bonusAction"
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Bonus Action spell subject requires a supported Bonus Action spell act.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act no longer has its required runtime spell resource.",
    );
  }
  if (
    !spellActTurnResourceAvailable(input.state.currentTurnResources, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  if (
    spellInvocationIsSpellcasting(invocation) &&
    activeOngoingFeaturesPreventSpellcasting(actor)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }

  const castingState =
    spellInvocationIsSpellcasting(invocation) &&
    spellRequiresVerbal(invocation.spell)
      ? revealHidden(input.state, subject.actorId)
      : input.state;
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.procedure === "heldLight") {
    return resolveHeldLightSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "scalarBuff") {
    return resolveScalarBuffSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "weaponDamageRider") {
    return resolveWeaponDamageRiderSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "markedDamageRider") {
    return resolveMarkedDamageRiderSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return resolveJumpMovementReplacementSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  return resolvePreparedHealingSpellAct({
    input: { ...input, state: castingState },
    actorId: subject.actorId,
    invocation,
    fillSet,
  });
}

export function resolveBonusActionDashSpellAct(
  input: BonusActionDashSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find(
          (
            candidate,
          ): candidate is Extract<
            SupportedSpellInvocation,
            { readonly procedure: "expeditiousRetreatDash" }
          > =>
            candidate.procedure === "expeditiousRetreatDash" &&
            supportedSpellInvocationMatchesRef(candidate, subject.invocation),
        )
      : undefined;
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action Dash spell act requires a supported Expeditious Retreat spell.",
    );
  }
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Expeditious Retreat accepts no fills.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Expeditious Retreat no longer has its required runtime spell resource.",
    );
  }
  if (
    !spellActTurnResourceAvailable(input.state.currentTurnResources, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  if (!representedMovementSpeedKinds(actor).includes(subject.speedKind)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Expeditious Retreat Dash speed kind is not represented for this combatant.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Expeditious Retreat is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }

  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, subject.actorId)
    : input.state;
  const spellCastReactionWindow = maybeOpenReactionWindow(
    castingState,
    {
      trigger: "spellCast",
      casterId: subject.actorId,
      spellId: invocation.spell.id,
      targetIds: [subject.actorId],
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const spent = spendActivationResource(castingState.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Expeditious Retreat Bonus Action is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const afterPriorConcentration = breakBattleConcentration(
    castingState,
    subject.actorId,
  );
  const slotted = expendSpellSlot(
    afterPriorConcentration,
    subject.actorId,
    invocation.resource.slotLevel,
  );
  const effectHost = slotted.combatants.get(subject.actorId);
  if (effectHost === undefined) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Expeditious Retreat caster is not in this battle.",
    );
  }
  const effectedActor = {
    ...effectHost,
    concentration: {
      sourceSpellId: invocation.spell.id,
      effectKind: "spellEffect" as const,
    },
    activeEffects: [...effectHost.activeEffects, invocation.activeEffect],
  };
  const effected = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
    combatants: new Map(slotted.combatants).set(subject.actorId, effectedActor),
  };
  const dashed = applyDashToActor(
    effected,
    effectedActor,
    subject.speedKind,
    effected.currentTurnResources,
  );
  return {
    tag: "resolved",
    state: dashed,
    snapshot: snapshotBattle(dashed),
  };
}
