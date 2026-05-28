// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-antimagic-field-ongoing-spell-suppression
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
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
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE

import {
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import { Either } from "effect";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  activeOngoingFeaturesPreventSpellcasting,
  attackRollIsCriticalHit,
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleCreatureState,
  type BattleFill,
  type BattleResolutionResult,
  type BattleSpellCastingTimeResource,
  type BattleState,
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
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
} from "./damage-apply.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSpellDamageReduction,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  spellDamageReductionRollForTarget,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import { needsHolesResult, revealHidden } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { mirrorImageHitInterceptionCheck } from "./mirror-image-hit-interception.ts";
import { damageReductionProfile } from "./spell-procedure-profiles/damage-reduction.ts";
import { abilityD20TestRollModeSaveGateProfile } from "./spell-procedure-profiles/ability-d20-test-roll-mode-save-gate.ts";
import { blurAttackRollDefenseProfile } from "./spell-procedure-profiles/blur-attack-roll-defense.ts";
import { commandProfile } from "./spell-procedure-profiles/command.ts";
import { conditionImmunityAndTurnStartTemporaryHitPointsProfile } from "./spell-procedure-profiles/condition-immunity-turn-start-temporary-hit-points.ts";
import { conditionRemovalProtectionProfile } from "./spell-procedure-profiles/condition-removal-protection.ts";
import { creatureSizeChangeProfile } from "./spell-procedure-profiles/creature-size-change.ts";
import { creatureTypeProtectionProfile } from "./spell-procedure-profiles/creature-type-protection.ts";
import { directConditionProfile } from "./spell-procedure-profiles/direct-condition.ts";
import { directConditionRemovalProfile } from "./spell-procedure-profiles/direct-condition-removal.ts";
import { directHitPointRestorationProfile } from "./spell-procedure-profiles/direct-hit-point-restoration.ts";
import { dragonsBreathInitialProfile } from "./spell-procedure-profiles/dragons-breath-initial.ts";
import { heldLightProfile } from "./spell-procedure-profiles/held-light.ts";
import { hideousLaughterProfile } from "./spell-procedure-profiles/hideous-laughter.ts";
import { jumpMovementReplacementProfile } from "./spell-procedure-profiles/jump-movement-replacement.ts";
import { levitatedCreatureProfile } from "./spell-procedure-profiles/levitated-creature.ts";
import { makeStableProfile } from "./spell-procedure-profiles/make-stable.ts";
import { magicWeaponEnhancementProfile } from "./spell-procedure-profiles/magic-weapon-enhancement.ts";
import { markedDamageRiderProfile } from "./spell-procedure-profiles/marked-damage-rider.ts";
import { persistentArmorEffectProfile } from "./spell-procedure-profiles/persistent-armor-effect.ts";
import { rollModifierProfile } from "./spell-procedure-profiles/roll-modifier.ts";
import { sanctuaryTargetingInterdictionProfile } from "./spell-procedure-profiles/sanctuary-targeting-interdiction.ts";
import { saveGatedAttackRollAdvantageProfile } from "./spell-procedure-profiles/save-gated-attack-roll-advantage.ts";
import { saveGatedConditionImmunityProfile } from "./spell-procedure-profiles/save-gated-condition-immunity.ts";
import { saveGatedConditionProfile } from "./spell-procedure-profiles/save-gated-condition.ts";
import { saveGatedDamageProfile } from "./spell-procedure-profiles/save-gated-damage.ts";
import { seeInvisibleObserverSightProfile } from "./spell-procedure-profiles/see-invisible-observer-sight.ts";
import { selfTransformationModeProfile } from "./spell-procedure-profiles/self-transformation-mode.ts";
import { selfTeleportProfile } from "./spell-procedure-profiles/self-teleport.ts";
import { sleepTargetAdmissionProfile } from "./spell-procedure-profiles/sleep-target-admission.ts";
import { spellAttackDamageProfile } from "./spell-procedure-profiles/spell-attack-damage.ts";
import { spellAttackSequenceProfile } from "./spell-procedure-profiles/spell-attack-sequence.ts";
import { spellHostedWeaponAttackProfile } from "./spell-procedure-profiles/spell-hosted-weapon-attack.ts";
import { thaumaturgyBoomingVoiceProfile } from "./spell-procedure-profiles/thaumaturgy-booming-voice.ts";
import { wardingBondProfile } from "./spell-procedure-profiles/warding-bond.ts";
import { weaponDamageRiderProfile } from "./spell-procedure-profiles/weapon-damage-rider.ts";
import { expeditiousRetreatDashProfile } from "./spell-procedure-profiles/expeditious-retreat-dash.ts";
import { greaseGroundHazardProfile } from "./spell-procedure-profiles/grease-ground-hazard.ts";
import {
  applySpiritualWeaponAttackProxyEffect,
  repositionSpiritualWeaponAttackProxyEffect,
} from "./spells-active-effects.ts";
import {
  isReadiedSpellInvocation,
  spellInvocationCasterPrerequisiteIsMet,
  spellRequiresVerbal,
} from "./spells-discovery.ts";
import {
  endHeldLightSpellEffect,
  applySpellActiveEffects,
  applySpellLightEmitterEffects,
  applySpellDamage,
  spellObjectDamageByType,
  spellObjectDamageOutcomeFromDamageByType,
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
  spellActTurnResourceAvailable,
  spellHasAvailableSpend,
  spellInvocationIsSpellcasting,
} from "./spell-turn-resources.ts";
import {
  spellAttackKindForRedirect,
  supportedSpellActs,
} from "./spells-profiles.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";
import {
  spiritualWeaponForcePositionHole,
  spiritualWeaponForcePositionInvalidReason,
} from "./spells-targeting.ts";
import {
  antimagicFieldOngoingSpellEffectRefForActiveEffect,
  ongoingSpellEffectSuppressedByAntimagicField,
} from "./antimagic-field-suppression.ts";

import {
  admitSpellMetamagicApplications,
  metamagicActionCostOverride,
} from "./metamagic.ts";
import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { resolveChainedSpellAttackDamageAct } from "./spells-resolve-chained.ts";
import {
  resolveFlamingSphereSpellAct,
  resolveFogCloudObscurementSpellAct,
  resolveAntimagicFieldOngoingSpellSuppressionAct,
  resolveGustOfWindLineSpellAct,
  resolveMagicalDarknessPointOriginSpellAct,
  resolveMoonbeamSpellAct,
  resolveSpikeGrowthMovementHazardSpellAct,
  resolveWebRestraintHazardSpellAct,
} from "./spells-resolve-area-effects.ts";
import {
  resolveObjectContactDamageRepeatSpellAct,
  resolveObjectContactDamageSpellAct,
} from "./spells-resolve-object-contact-damage.ts";
import { resolveOngoingSpellEndSpellAct } from "./spells-ongoing-spell-ending.ts";
export {
  resolveFlamingSphereSpellAct,
  resolveFogCloudObscurementSpellAct,
  resolveAntimagicFieldOngoingSpellSuppressionAct,
  resolveGustOfWindLineSpellAct,
  resolveMagicalDarknessPointOriginSpellAct,
  resolveMoonbeamSpellAct,
  resolveSpikeGrowthMovementHazardSpellAct,
  resolveWebRestraintHazardSpellAct,
} from "./spells-resolve-area-effects.ts";
export {
  resolveObjectContactDamageRepeatSpellAct,
  resolveObjectContactDamageSpellAct,
} from "./spells-resolve-object-contact-damage.ts";
export { resolveOngoingSpellEndSpellAct } from "./spells-ongoing-spell-ending.ts";
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
  resolveAbilityD20TestRollModeSaveGateSpellAct,
  resolveGreaseGroundHazardSpellAct,
  resolveHideousLaughterSpellAct,
  resolveSaveGateAttackRollAdvantageSpellAct,
  resolveSaveGateConditionSpellAct,
  resolveSaveGateConditionImmunitySpellAct,
  resolveSaveGateDamageSpellAct,
  resolveSleepTargetAdmissionSpellAct,
  validateSavingThrowOutcomes,
} from "./spells-resolve-save-gates.ts";
export { resolveMirrorImageHitInterceptionSpellAct } from "./spells-resolve-support-effects.ts";
export {
  healingSpellTargetSelection,
  rollModifierSpellAffectedTargets,
  rollModifierSpellEffectSelection,
  rollModifierSpellTargetSelection,
  scalarBuffSpellTargetSelection,
  type HealingSpellTargetSelection,
  type RollModifierSpellAffectedTargets,
  type RollModifierSpellEffectSelection,
  type RollModifierSpellTargetSelection,
  type ScalarBuffSpellTargetSelection,
} from "./spells-resolve-target-selection.ts";

import { resolveMirrorImageHitInterceptionSpellAct } from "./spells-resolve-support-effects.ts";

import { resolvePreparedSlotSpellAct } from "./spells-resolve-prepared-slot.ts";

import { resolveAttackBurstSaveDamageSpellAct } from "./spells-resolve-attack-burst.ts";

import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import {
  battleStateAfterTargetActionEarlyEndForActor,
  sanctuaryTargetingInterdictionCheck,
} from "./sanctuary-targeting-interdiction.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";

import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  resolveDancingLightsCastSpellAct,
  resolveDancingLightsRepositionSpellAct,
  resolveSpellCreatedHeldObjectReEvokeSpellAct,
  resolveSpellCreatedHeldObjectSpellAct,
  resolveReadySpellAct,
} from "./spells-resolve-release.ts";
import { objectLightProfile } from "./spell-procedure-profiles/object-light.ts";
import type { SpellProcedureProfileResolveInput } from "./spell-procedure-profiles/profile.ts";
import { scalarBuffProfile } from "./spell-procedure-profiles/scalar-buff.ts";
import { weaponAttackOverrideProfile } from "./spell-procedure-profiles/weapon-attack-override.ts";
import { clearPendingAttackRollMissToHitReplacementSelection } from "./statblock-attacks.ts";
export * from "./spells-resolve-release.ts";

type SpellAttackDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellAttackDamage" }
>;

type ResolveSpellActInternalOptions = {
  readonly allowBonusActionInvocation?: boolean;
  readonly useSharedDamageResolverForSpellAttackDamage?: true;
};

function isSupportedDamageSpellInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SupportedDamageSpellInvocation {
  return (
    invocation.procedure === "heldLightHurl" ||
    invocation.procedure === "spellCreatedHeldObjectAttack" ||
    invocation.procedure === "objectContactDamage" ||
    invocation.procedure === "objectContactDamageRepeat" ||
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack" ||
    invocation.procedure === "repeatedDamageAllocation" ||
    (invocation.procedure === "spellAttackDamage" &&
      invocation.damage.kind !== "sorcerousBurstDamageTypeChoice") ||
    invocation.procedure === "spellAttackSequence" ||
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

function spellAttackPostMirrorImageFillsArePresent(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.damageRoll !== undefined ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined
  );
}

export function resolveSpellAct(
  input: ActionSpellBattleResolutionInput,
): BattleResolutionResult {
  return resolveSpellActInternal(input);
}

export function resolveSpellAttackDamageAct(
  input: SpellProcedureProfileResolveInput<
    SpellAttackDamageInvocation,
    ActionSpellBattleResolutionInput
  >,
): BattleResolutionResult {
  return resolveSpellActInternal(input.input, {
    useSharedDamageResolverForSpellAttackDamage: true,
  });
}

function resolveSpellActInternal(
  input: ActionSpellBattleResolutionInput,
  options: ResolveSpellActInternalOptions = {},
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  let invocation =
    actor?.origin.kind === "character"
      ? supportedActionSpellInvocationForSubject(actor, input.state, subject)
      : undefined;
  if (
    actor?.origin.kind === "character" &&
    invocation == null &&
    options.allowBonusActionInvocation === true &&
    invocationRefHasAntimagicSuppressedRepeatResolverGuard(
      subject.invocation.procedure,
    )
  ) {
    invocation = supportedActionSpellInvocationForSubject(
      actor,
      stateForAntimagicSuppressedRepeatLookup(input.state),
      subject,
    );
  }
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Action-time spell act requires a supported prepared spell or cantrip.",
    );
  }
  const metamagicAdmission = admitSpellMetamagicApplications({
    state: input.state,
    actor,
    actorId: subject.actorId,
    invocation,
    subject,
  });
  if (metamagicAdmission.tag !== "ok") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      metamagicAdmission.message,
    );
  }
  const replayingSpiritualWeaponAttackHit =
    input.suppressedReactionTrigger === "attackHit" &&
    (invocation.procedure === "spiritualWeaponAttackProxy" ||
      invocation.procedure === "spiritualWeaponRepeatAttack");
  const spiritualWeaponCommitAlreadyApplied =
    spiritualWeaponResolutionCommitAlreadyApplied({
      state: input.state,
      actorId: subject.actorId,
      invocation,
      fills: input.fills,
    });
  if (
    !replayingSpiritualWeaponAttackHit &&
    !spiritualWeaponCommitAlreadyApplied &&
    !spellHasAvailableSpend(actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act no longer has its required runtime spell resource.",
    );
  }
  if (
    !(
      input.replayingInterruptedProcedure === true &&
      invocation.procedure === "heldLightHurl"
    ) &&
    !spiritualWeaponCommitAlreadyApplied &&
    !spellInvocationCasterPrerequisiteIsMet(actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act requires its active caster spell effect.",
    );
  }
  if (
    !spiritualWeaponCommitAlreadyApplied &&
    spellInvocationIsSpellcasting(invocation) &&
    activeOngoingFeaturesPreventSpellcasting(actor)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if (
    invocation.procedure === "spiritualWeaponRepeatAttack" &&
    ongoingSpellEffectSuppressedByAntimagicField(
      input.state,
      antimagicFieldOngoingSpellEffectRefForActiveEffect(
        invocation.activeEffect,
      ),
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Spiritual Weapon repeat attack is suppressed by Antimagic Field.",
    );
  }
  if (
    subject.mode.tag === "ready" &&
    (invocation.procedure === "directHitPointRestoration" ||
      invocation.procedure === "heldLightHurl" ||
      invocation.procedure === "objectLight" ||
      invocation.procedure === "ongoingSpellEnd" ||
      invocation.procedure === "spellHostedWeaponAttack" ||
      invocation.procedure === "weaponAttackOverride" ||
      invocation.procedure === "damageReduction" ||
      invocation.procedure === "scalarBuff" ||
      invocation.procedure === "rollModifier" ||
      invocation.procedure === "creatureSizeIncrease" ||
      invocation.procedure === "creatureSizeDecrease" ||
      invocation.procedure === "levitatedCreature" ||
      invocation.procedure === "wardingBond" ||
      invocation.procedure === "thaumaturgyBoomingVoice" ||
      invocation.procedure === "creatureTypeProtection" ||
      invocation.procedure === "blurAttackRollDefense" ||
      invocation.procedure === "seeInvisibleObserverSight" ||
      invocation.procedure === "mirrorImageHitInterception" ||
      invocation.procedure ===
        "conditionImmunityAndTurnStartTemporaryHitPoints" ||
      invocation.procedure === "afterHitDamage" ||
      invocation.procedure === "afterHitSaveGatedCondition" ||
      invocation.procedure === "afterHitTimedDamageAndSave" ||
      invocation.procedure === "afterHitDamageAndIllumination" ||
      invocation.procedure === "saveGatedCondition" ||
      invocation.procedure === "saveGatedConditionImmunity" ||
      invocation.procedure === "saveGatedAttackRollAdvantage" ||
      invocation.procedure === "hideousLaughter" ||
      invocation.procedure === "command" ||
      invocation.procedure === "fogCloudObscurement" ||
      invocation.procedure === "magicalDarknessPointOrigin" ||
      invocation.procedure === "antimagicFieldOngoingSpellSuppression" ||
      invocation.procedure === "webRestraintHazard" ||
      invocation.procedure === "gustOfWindLine" ||
      invocation.procedure === "flamingSphere" ||
      invocation.procedure === "moonbeam" ||
      invocation.procedure === "objectContactDamage" ||
      invocation.procedure === "objectContactDamageRepeat" ||
      invocation.procedure === "spellCreatedHeldObject" ||
      invocation.procedure === "spellCreatedHeldObjectAttack" ||
      invocation.procedure === "spellCreatedHeldObjectReEvoke" ||
      invocation.procedure === "sanctuaryTargetingInterdiction" ||
      invocation.procedure === "dragonsBreathInitial" ||
      invocation.procedure === "directConditionRemoval" ||
      invocation.procedure === "directCondition" ||
      invocation.procedure === "spellAttackSequence")
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "This spell procedure cannot be readied by this runtime lane.",
    );
  }
  if (
    "actionCost" in invocation &&
    invocation.actionCost === "bonusAction" &&
    options.allowBonusActionInvocation !== true &&
    !(
      input.replayingInterruptedProcedure === true &&
      replayingSpiritualWeaponAttackHit
    )
  ) {
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
    !replayingSpiritualWeaponAttackHit &&
    !spiritualWeaponCommitAlreadyApplied &&
    !spellActTurnResourceAvailable(
      input.state.currentTurnResources,
      input.subject.actorId,
      invocation,
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }

  const castingState =
    spellInvocationIsSpellcasting(invocation) &&
    spellRequiresVerbal(invocation.spell)
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
  if (
    invocation.procedure === "spellCreatedHeldObjectAttack" &&
    fillSet.reactionSpellTargetFacts.length > 0
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell-created held object attacks are not spell casts and do not accept spell-cast Reaction facts.",
    );
  }
  if (invocation.procedure === "spellAttackSequence") {
    return spellAttackSequenceProfile.resolve({
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
    return objectLightProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "ongoingSpellEnd") {
    return resolveOngoingSpellEndSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (
    invocation.procedure === "dancingLightsSeparateCast" ||
    invocation.procedure === "dancingLightsCombinedCast"
  ) {
    return resolveDancingLightsCastSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    return spellHostedWeaponAttackProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "saveGatedDamage") {
    return saveGatedDamageProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "saveGatedCondition") {
    return saveGatedConditionProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "saveGatedConditionImmunity") {
    return saveGatedConditionImmunityProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "saveGatedAttackRollAdvantage") {
    return saveGatedAttackRollAdvantageProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "abilityD20TestRollModeSaveGate") {
    return abilityD20TestRollModeSaveGateProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "sleepTargetAdmission") {
    return sleepTargetAdmissionProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "hideousLaughter") {
    return hideousLaughterProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "greaseGroundHazard") {
    return greaseGroundHazardProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "fogCloudObscurement") {
    return resolveFogCloudObscurementSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "magicalDarknessPointOrigin") {
    return resolveMagicalDarknessPointOriginSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "antimagicFieldOngoingSpellSuppression") {
    return resolveAntimagicFieldOngoingSpellSuppressionAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "webRestraintHazard") {
    return resolveWebRestraintHazardSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "gustOfWindLine") {
    return resolveGustOfWindLineSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "flamingSphere") {
    return resolveFlamingSphereSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "spikeGrowthMovementHazard") {
    return resolveSpikeGrowthMovementHazardSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "moonbeam") {
    return resolveMoonbeamSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "objectContactDamage") {
    return resolveObjectContactDamageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "command") {
    return commandProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
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
    return directHitPointRestorationProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "scalarBuff") {
    return scalarBuffProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "selfTransformationMode") {
    return selfTransformationModeProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "rollModifier") {
    return rollModifierProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (
    invocation.procedure === "creatureSizeIncrease" ||
    invocation.procedure === "creatureSizeDecrease"
  ) {
    return creatureSizeChangeProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "levitatedCreature") {
    return levitatedCreatureProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "wardingBond") {
    return wardingBondProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "thaumaturgyBoomingVoice") {
    return thaumaturgyBoomingVoiceProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "creatureTypeProtection") {
    return creatureTypeProtectionProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "blurAttackRollDefense") {
    return blurAttackRollDefenseProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "seeInvisibleObserverSight") {
    return seeInvisibleObserverSightProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "persistentArmorEffect") {
    return persistentArmorEffectProfile.resolve({
      input: { ...input, castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "mirrorImageHitInterception") {
    return resolveMirrorImageHitInterceptionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "conditionRemovalProtection") {
    return conditionRemovalProtectionProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "damageReduction") {
    return damageReductionProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "makeStable") {
    return makeStableProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (
    invocation.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  ) {
    return conditionImmunityAndTurnStartTemporaryHitPointsProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "directCondition") {
    return directConditionProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (
    invocation.procedure === "spellAttackDamage" &&
    options.useSharedDamageResolverForSpellAttackDamage !== true
  ) {
    return spellAttackDamageProfile.resolve({
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
  if (
    (invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
      invocationForResolution.procedure === "spiritualWeaponRepeatAttack") &&
    fillSet.spiritualWeaponForcePosition === undefined
  ) {
    return needsHolesResult(castingState, input.subject, [
      spiritualWeaponForcePositionHole(invocationForResolution),
    ]);
  }
  const spiritualWeaponForcePosition =
    invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
    invocationForResolution.procedure === "spiritualWeaponRepeatAttack"
      ? fillSet.spiritualWeaponForcePosition
      : undefined;
  const spiritualWeaponForcePositionError =
    spiritualWeaponForcePosition === undefined ||
    (invocationForResolution.procedure !== "spiritualWeaponAttackProxy" &&
      invocationForResolution.procedure !== "spiritualWeaponRepeatAttack")
      ? null
      : spiritualWeaponForcePositionInvalidReason(
          spiritualWeaponForcePosition,
          invocationForResolution,
        );
  if (spiritualWeaponForcePositionError !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      spiritualWeaponForcePositionError,
    );
  }
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
      spiritualWeaponForcePosition === undefined
        ? {}
        : {
            spiritualWeaponForcePositionId:
              spiritualWeaponForcePosition.positionId,
          },
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  if (
    spiritualWeaponForcePosition !== undefined &&
    !fillSet.targetSpatialFacts.some(
      (fact) =>
        fact.kind === "spiritualWeaponTargetWithinForceReach" &&
        fact.casterId === subject.actorId &&
        fact.targetId === target.combatantId &&
        fact.spellId === invocationForResolution.spell.id &&
        fact.forcePositionId === spiritualWeaponForcePosition.positionId,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spiritual Weapon target adjacency must match the selected force position.",
    );
  }

  if (isSupportedDamageSpellInvocation(invocationForResolution)) {
    const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
      state: castingState,
      triggeringCombatantId: subject.actorId,
      wardedCombatantId: target.combatantId,
      triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
      fills: input.fills,
    });
    if (sanctuaryCheck.tag === "needsHoles") {
      return needsHolesResult(castingState, input.subject, [
        sanctuaryCheck.hole,
      ]);
    }
    if (sanctuaryCheck.tag === "invalid") {
      return invalidResult(input.state, "invalidFill", sanctuaryCheck.message);
    }
    if (sanctuaryCheck.tag === "lost") {
      return spendSpellActResolutionResources({
        state: stateAfterResolvedHeldLightHurl(
          castingState,
          subject.actorId,
          invocationForResolution,
        ),
        actorId: subject.actorId,
        invocation: invocationForResolution,
        errorState: input.state,
        ...(spiritualWeaponForcePosition === undefined
          ? {}
          : { spiritualWeaponForcePosition }),
      });
    }
    if (sanctuaryCheck.tag === "newTarget") {
      const replacementTarget = input.state.combatants.get(
        sanctuaryCheck.targetId,
      );
      if (
        replacementTarget === undefined ||
        !spellTargetIsLegal(
          input.state,
          subject.actorId,
          replacementTarget.combatantId,
          invocationForResolution,
          sanctuaryCheck.spatialFacts,
          spiritualWeaponForcePosition === undefined
            ? {}
            : {
                spiritualWeaponForcePositionId:
                  spiritualWeaponForcePosition.positionId,
              },
        )
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Sanctuary replacement spell target must be legal for the selected spell.",
        );
      }
      const originalTargetFill = input.fills.find(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
          fill.kind === "targetChoice" && fill.value === target.combatantId,
      );
      if (originalTargetFill === undefined) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Sanctuary replacement requires the original spell target fill.",
        );
      }
      return resolveSpellAct({
        ...input,
        fills: [
          ...input.fills
            .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
            .map((fill) =>
              fill === originalTargetFill
                ? {
                    ...fill,
                    value: replacementTarget.combatantId,
                    spatialFacts: sanctuaryCheck.spatialFacts,
                  }
                : fill,
            ),
        ],
      });
    }
  }

  const spellCastReactionWindow = spellInvocationIsSpellcasting(
    invocationForResolution,
  )
    ? maybeOpenReactionWindow(
        castingState,
        spellCastReactionFrame({
          casterId: subject.actorId,
          invocation: invocationForResolution,
          targetIds: [target.combatantId],
          reactionSpellTargetFacts: fillSet.reactionSpellTargetFacts,
          castingResource: spellCastingTimeResourceForInvocation(
            invocationForResolution,
          ),
          continuation: {
            kind: "replay",
            subject: input.subject,
            fills: input.fills,
          },
        }),
        input.suppressedReactionTrigger,
      )
    : null;
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  let spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [];
  if (
    invocationForResolution.procedure === "spellAttackDamage" ||
    invocationForResolution.procedure === "heldLightHurl" ||
    invocationForResolution.procedure === "spellCreatedHeldObjectAttack" ||
    invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
    invocationForResolution.procedure === "spiritualWeaponRepeatAttack"
  ) {
    const requiredRollMode = requiredSpellAttackRollMode(
      castingState,
      subject.actorId,
      target.combatantId,
      invocationForResolution,
      fillSet.targetSpatialFacts,
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
    const attackRollState = stateAfterSpellAttackRollMadeForInvocation(
      castingState,
      subject.actorId,
      invocationForResolution,
    );
    const attackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          attackRollState,
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
    const attackRolledStateAfterHurl = stateAfterResolvedHeldLightHurl(
      attackRolledState,
      subject.actorId,
      invocationForResolution,
    );
    const attackRolledStateWithSpiritualWeaponCast = hit
      ? stateAfterSpiritualWeaponCastProxyCreatedBeforeImmediateAttack({
          state: attackRolledStateAfterHurl,
          actorId: subject.actorId,
          invocation: invocationForResolution,
          errorState: input.state,
          ...(spiritualWeaponForcePosition === undefined
            ? {}
            : { spiritualWeaponForcePosition }),
        })
      : {
          tag: "resolved" as const,
          state: attackRolledStateAfterHurl,
          snapshot: snapshotBattle(attackRolledStateAfterHurl),
        };
    if (attackRolledStateWithSpiritualWeaponCast.tag !== "resolved") {
      return attackRolledStateWithSpiritualWeaponCast;
    }
    const attackRolledStateBeforeHitContinuations =
      attackRolledStateWithSpiritualWeaponCast.state;
    if (!hit && fillSet.mirrorImageDuplicateRoll !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Mirror Image duplicate roll is only valid after an attack-roll hit.",
      );
    }
    if (hit) {
      const mirrorImageAttacker =
        attackRolledStateBeforeHitContinuations.combatants.get(subject.actorId);
      if (mirrorImageAttacker === undefined) {
        return invalidResult(
          input.state,
          "missingCombatant",
          "Spell attack actor is no longer in this battle.",
        );
      }
      const mirrorImageCheck = mirrorImageHitInterceptionCheck({
        state: attackRolledStateBeforeHitContinuations,
        attacker: mirrorImageAttacker,
        target:
          attackRolledStateBeforeHitContinuations.combatants.get(
            target.combatantId,
          ) ?? target,
        targetSpatialFacts: fillSet.targetSpatialFacts,
        triggeringAttackRollHoleId: ATTACK_ROLL_HOLE_ID,
        fill: fillSet.mirrorImageDuplicateRoll,
      });
      if (mirrorImageCheck.tag === "needsHoles") {
        return needsHolesResult(
          attackRolledStateBeforeHitContinuations,
          input.subject,
          [mirrorImageCheck.hole],
        );
      }
      if (mirrorImageCheck.tag === "invalid") {
        return invalidResult(
          input.state,
          "invalidFill",
          mirrorImageCheck.message,
        );
      }
      if (mirrorImageCheck.tag === "hitDuplicate") {
        if (spellAttackPostMirrorImageFillsArePresent(fillSet)) {
          return invalidResult(
            input.state,
            "invalidFill",
            "Spell attack damage and after-hit fills are not valid when Mirror Image redirects the hit to a duplicate.",
          );
        }
        if (
          invocationForResolution.procedure === "spiritualWeaponAttackProxy"
        ) {
          return {
            tag: "resolved",
            state: mirrorImageCheck.state,
            snapshot: snapshotBattle(mirrorImageCheck.state),
          };
        }
        return spendSpellActResolutionResources({
          state: mirrorImageCheck.state,
          actorId: subject.actorId,
          invocation: invocationForResolution,
          errorState: input.state,
          ...(spiritualWeaponForcePosition === undefined
            ? {}
            : { spiritualWeaponForcePosition }),
        });
      }
    }
    spellMarkedDamageRiders = hit
      ? activeMarkedDamageRiders(
          attackRolledStateBeforeHitContinuations.combatants.get(
            subject.actorId,
          ),
          target.combatantId,
        )
      : [];
    if (hit && input.suppressedReactionTrigger !== "attackHit") {
      const reactionWindow = maybeOpenReactionWindow(
        attackRolledStateBeforeHitContinuations,
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
      return needsHolesResult(
        attackRolledStateBeforeHitContinuations,
        input.subject,
        [
          spellDamageHole(
            invocationForResolution,
            critical,
            spellMarkedDamageRiders,
          ),
        ],
      );
    }
    if (
      !hit &&
      (fillSet.damageRoll != null ||
        fillSet.damageDispositions.length > 0 ||
        fillSet.sourceDamageRollPenaltyRolls.length > 0)
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return spendSpellActResolutionResources({
        state: attackRolledStateAfterHurl,
        actorId: subject.actorId,
        invocation: invocationForResolution,
        errorState: input.state,
        ...(spiritualWeaponForcePosition === undefined
          ? {}
          : { spiritualWeaponForcePosition }),
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
    if (fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    return needsHolesResult(castingState, input.subject, [
      spellDamageHole(damageInvocation),
    ]);
  }
  const spellAttackMissToHitReplacement =
    (invocationForResolution.procedure === "spellAttackDamage" ||
      invocationForResolution.procedure === "heldLightHurl" ||
      invocationForResolution.procedure === "spellCreatedHeldObjectAttack" ||
      invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
      invocationForResolution.procedure === "spiritualWeaponRepeatAttack") &&
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
      invocationForResolution.procedure === "heldLightHurl" ||
      invocationForResolution.procedure === "spellCreatedHeldObjectAttack" ||
      invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
      invocationForResolution.procedure === "spiritualWeaponRepeatAttack") &&
    fillSet.attackRoll != null
      ? recordAttackRollMissToHitReplacementUsed(
          consumeHelpAttackForAttackRoll(
            recordAttackRollOngoingFeatures(
              stateAfterSpellAttackRollMadeForInvocation(
                castingState,
                subject.actorId,
                invocationForResolution,
              ),
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
  const spellDamageBaseStateResult =
    stateAfterSpiritualWeaponCastProxyCreatedBeforeImmediateAttack({
      state: spellResolutionState,
      actorId: subject.actorId,
      invocation: invocationForResolution,
      errorState: input.state,
      ...(spiritualWeaponForcePosition === undefined
        ? {}
        : { spiritualWeaponForcePosition }),
    });
  if (spellDamageBaseStateResult.tag !== "resolved") {
    return spellDamageBaseStateResult;
  }
  const spellDamageBaseState = spellDamageBaseStateResult.state;
  const targetBeforeDamage =
    spellDamageBaseState.combatants.get(target.combatantId) ?? target;
  const critical =
    (invocationForResolution.procedure === "spellAttackDamage" ||
      invocationForResolution.procedure === "heldLightHurl" ||
      invocationForResolution.procedure === "spellCreatedHeldObjectAttack" ||
      invocationForResolution.procedure === "spiritualWeaponAttackProxy" ||
      invocationForResolution.procedure === "spiritualWeaponRepeatAttack") &&
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
  const spellDamageByType = spellDamageByTypeForTarget(
    target,
    damageInvocation,
    fillSet.damageRoll,
    "full",
    spellMarkedDamageRiders,
    critical,
  );
  const damageSource = spellDamageBaseState.combatants.get(subject.actorId);
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      damageSource,
      spellDamageByType,
      fillSet.damageRoll.holeId,
    );
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
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
  if (sourcePenalty.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      ...sourcePenalty.holes,
    ]);
  }
  const spellReduction = applyAvailableSpellDamageReduction(
    targetBeforeDamage,
    sourcePenalty.damageByType,
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
    return needsHolesResult(spellDamageBaseState, input.subject, [
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
  const concentrationSaveCheck =
    damageLifecycleConcentrationSavingThrowFillCheck({
      state: spellDamageBaseState,
      target: spellReduction.target,
      damageAmount: spellDamageAmount,
      fills: fillSet.concentrationSavingThrows,
    });
  if (concentrationSaveCheck.tag === "needsHoles") {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      ...concentrationSaveCheck.holes,
    ]);
  }
  if (concentrationSaveCheck.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      concentrationSaveCheck.message,
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
    return needsHolesResult(spellDamageBaseState, input.subject, [
      damageDispositionHole,
    ]);
  }
  const hideousLaughterSaveCheck =
    damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: spellDamageBaseState,
      target: spellReduction.target,
      damageAmount: spellDamageAmount,
      fills: fillSet.hideousLaughterDamageRepeatSaves,
    });
  if (hideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(spellDamageBaseState, input.subject, [
      ...hideousLaughterSaveCheck.holes,
    ]);
  }
  if (hideousLaughterSaveCheck.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      hideousLaughterSaveCheck.message,
    );
  }
  const damaged = applySpellDamage(
    spellDamageBaseState,
    target.combatantId,
    damageInvocation,
    fillSet.damageRoll,
    critical,
    {
      concentrationSavingThrow: concentrationFill,
      wardingBondDamageShareConcentrationSavingThrows:
        fillSet.concentrationSavingThrows,
      damageDisposition: damageDispositionForTarget(
        damageDispositionHole === null ? [] : [damageDispositionHole],
        fillSet.damageDispositions,
        target.combatantId,
      ),
      spellMarkedDamageRiders,
      sourceDamageRollPenaltyRoll,
      spellDamageReductionRoll: spellReductionRoll,
      hideousLaughterDamageRepeatSaves:
        fillSet.hideousLaughterDamageRepeatSaves,
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
  const stateAfterDamageAndHurl = stateAfterResolvedHeldLightHurl(
    lit,
    subject.actorId,
    invocationForResolution,
  );
  const spentResources =
    invocationForResolution.procedure === "spiritualWeaponAttackProxy"
      ? {
          tag: "resolved" as const,
          state: stateAfterDamageAndHurl,
          snapshot: snapshotBattle(stateAfterDamageAndHurl),
        }
      : spendSpellActResolutionResources({
          state: stateAfterDamageAndHurl,
          actorId: subject.actorId,
          invocation: invocationForResolution,
          errorState: input.state,
          ...(spiritualWeaponForcePosition === undefined
            ? {}
            : { spiritualWeaponForcePosition }),
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

function stateAfterResolvedHeldLightHurl(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleState {
  return invocation.procedure === "heldLightHurl"
    ? endHeldLightSpellEffect(state, actorId, invocation)
    : state;
}

function spellCastingTimeResourceForInvocation(
  invocation: SupportedSpellInvocation,
): BattleSpellCastingTimeResource {
  return "actionCost" in invocation
    ? { kind: invocation.actionCost }
    : { kind: "magicAction" };
}

function stateAfterSpellAttackRollMadeForInvocation(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleState {
  return invocation.procedure === "spellCreatedHeldObjectAttack"
    ? revealHidden(state, actorId)
    : state;
}

function stateAfterSpiritualWeaponCastProxyCreatedBeforeImmediateAttack(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly errorState: BattleState;
  readonly spiritualWeaponForcePosition?: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.invocation.procedure !== "spiritualWeaponAttackProxy") {
    return {
      tag: "resolved",
      state: input.state,
      snapshot: snapshotBattle(input.state),
    };
  }
  return spendSpellActResolutionResources(input);
}

function spiritualWeaponProxyEffectMatches(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation:
    | Extract<
        SupportedSpellInvocation,
        { readonly procedure: "spiritualWeaponAttackProxy" }
      >
    | Extract<
        SupportedSpellInvocation,
        { readonly procedure: "spiritualWeaponRepeatAttack" }
      >;
  readonly forcePositionId: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"]["positionId"];
}): boolean {
  const actor = input.state.combatants.get(input.actorId);
  return (
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "spiritualWeapon" &&
        effect.sourceSpellId === input.invocation.spell.id &&
        effect.sourceCombatantId === input.actorId &&
        effect.forcePositionId === input.forcePositionId,
    ) === true
  );
}

function spiritualWeaponCastCommitAlreadyApplied(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spiritualWeaponAttackProxy" }
  >;
  readonly forcePositionId: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"]["positionId"];
}): boolean {
  const actor = input.state.combatants.get(input.actorId);
  return (
    input.state.currentTurnResources.currentHasBonusAction === false &&
    input.state.currentTurnResources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "committed" && use.combatantId === input.actorId,
    ) &&
    actor?.concentration?.effectKind === "spellEffect" &&
    actor.concentration.sourceSpellId === input.invocation.spell.id &&
    spiritualWeaponProxyEffectMatches(input)
  );
}

function spiritualWeaponRepeatCommitAlreadyApplied(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spiritualWeaponRepeatAttack" }
  >;
  readonly forcePositionId: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"]["positionId"];
}): boolean {
  return (
    input.state.currentTurnResources.currentHasBonusAction === false &&
    spiritualWeaponProxyEffectMatches(input)
  );
}

function spiritualWeaponResolutionCommitAlreadyApplied(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly fills: readonly BattleFill[];
}): boolean {
  if (
    input.invocation.procedure !== "spiritualWeaponAttackProxy" &&
    input.invocation.procedure !== "spiritualWeaponRepeatAttack"
  ) {
    return false;
  }
  const fillSet = spellFillSet(input.fills, input.invocation);
  if (
    fillSet.tag !== "ok" ||
    fillSet.spiritualWeaponForcePosition === undefined
  ) {
    return false;
  }
  if (input.invocation.procedure === "spiritualWeaponAttackProxy") {
    return spiritualWeaponCastCommitAlreadyApplied({
      state: input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      forcePositionId: fillSet.spiritualWeaponForcePosition.positionId,
    });
  }
  return spiritualWeaponRepeatCommitAlreadyApplied({
    state: input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    forcePositionId: fillSet.spiritualWeaponForcePosition.positionId,
  });
}

function spiritualWeaponRepeatIsLaterTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spiritualWeaponRepeatAttack" }
  >;
}): boolean {
  return (
    input.actorId !== input.invocation.activeEffect.startedOn.actorId ||
    input.state.initiative.round !==
      input.invocation.activeEffect.startedOn.round
  );
}

function spendSpellActResolutionResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly errorState: BattleState;
  readonly spiritualWeaponForcePosition?: Extract<
    BattleFill,
    { readonly kind: "spiritualWeaponForcePosition" }
  >["value"];
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.invocation.procedure === "spiritualWeaponAttackProxy") {
    if (
      input.spiritualWeaponForcePosition === undefined ||
      input.spiritualWeaponForcePosition.mode !== "cast"
    ) {
      return invalidResult(
        input.errorState,
        "invalidFill",
        "Spiritual Weapon cast requires a table-supplied force position.",
      );
    }
    if (
      spiritualWeaponCastCommitAlreadyApplied({
        state: input.state,
        actorId: input.actorId,
        invocation: input.invocation,
        forcePositionId: input.spiritualWeaponForcePosition.positionId,
      })
    ) {
      return {
        tag: "resolved",
        state: input.state,
        snapshot: snapshotBattle(input.state),
      };
    }
    const spent = spendSpellCastResources({
      state: input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.errorState,
    });
    if (spent.tag !== "resolved") {
      return spent;
    }
    const nextState = applySpiritualWeaponAttackProxyEffect({
      state: spent.state,
      actorId: input.actorId,
      forcePositionId: input.spiritualWeaponForcePosition.positionId,
      invocation: input.invocation,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  if (input.invocation.procedure === "spiritualWeaponRepeatAttack") {
    if (
      !spiritualWeaponRepeatIsLaterTurn({
        state: input.state,
        actorId: input.actorId,
        invocation: input.invocation,
      })
    ) {
      return invalidResult(
        input.errorState,
        "staleSubject",
        "Spiritual Weapon repeat attack is only available on later turns.",
      );
    }
    if (
      ongoingSpellEffectSuppressedByAntimagicField(
        input.state,
        antimagicFieldOngoingSpellEffectRefForActiveEffect(
          input.invocation.activeEffect,
        ),
      )
    ) {
      return invalidResult(
        input.errorState,
        "staleSubject",
        "Spiritual Weapon repeat attack is suppressed by Antimagic Field.",
      );
    }
    if (
      input.spiritualWeaponForcePosition === undefined ||
      input.spiritualWeaponForcePosition.mode !== "reposition"
    ) {
      return invalidResult(
        input.errorState,
        "invalidFill",
        "Spiritual Weapon repeat attack requires a table-supplied reposition.",
      );
    }
    if (
      spiritualWeaponRepeatCommitAlreadyApplied({
        state: input.state,
        actorId: input.actorId,
        invocation: input.invocation,
        forcePositionId: input.spiritualWeaponForcePosition.positionId,
      })
    ) {
      return {
        tag: "resolved",
        state: input.state,
        snapshot: snapshotBattle(input.state),
      };
    }
    const spellAttackState = battleStateAfterTargetActionEarlyEndForActor(
      input.state,
      input.actorId,
    );
    const spent = spendActivationResource(
      spellAttackState.currentTurnResources,
      { kind: "bonusAction" },
    );
    if (Either.isLeft(spent)) {
      return invalidResult(
        input.errorState,
        "staleSubject",
        "Bonus Action spell is no longer available for the current actor.",
      );
    }
    const repositioned = repositionSpiritualWeaponAttackProxyEffect({
      state: {
        ...spellAttackState,
        currentTurnResources:
          clearPendingAttackRollMissToHitReplacementSelection(
            spent.right,
            input.actorId,
          ),
      },
      invocation: input.invocation,
      forcePositionId: input.spiritualWeaponForcePosition.positionId,
    });
    return {
      tag: "resolved",
      state: repositioned,
      snapshot: snapshotBattle(repositioned),
    };
  }
  if (input.invocation.procedure !== "spellCreatedHeldObjectAttack") {
    return spendSpellCastResources(input);
  }
  const spellAttackState = battleStateAfterTargetActionEarlyEndForActor(
    input.state,
    input.actorId,
  );
  const spent = spendAction(spellAttackState.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const nextState = {
    ...spellAttackState,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      spent.right,
      input.actorId,
    ),
  };
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
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [],
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
      input.fillSet.damageDispositions.length > 0 ||
      input.fillSet.sourceDamageRollPenaltyRolls.length > 0)
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return spendSpellCastResources({
      state: stateAfterResolvedHeldLightHurl(
        attackRolledState,
        input.actorId,
        input.invocation,
      ),
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
    });
  }
  if (input.fillSet.damageRoll == null) {
    if (input.fillSet.sourceDamageRollPenaltyRolls.length > 0) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
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
  const objectDamageByType = spellObjectDamageByType(
    input.invocation,
    input.fillSet.damageRoll,
    critical,
  );
  const objectDamageSource = attackRolledState.combatants.get(input.actorId);
  const expectedSourcePenaltyHole =
    sourceDamageRollPenaltyRollHoleForDamageRoll(
      objectDamageSource,
      objectDamageByType,
      input.fillSet.damageRoll.holeId,
    );
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHole === null ? [] : [expectedSourcePenaltyHole],
    ) !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  const sourceDamageRollPenaltyRoll = sourceDamageRollPenaltyRollForDamageRoll(
    input.fillSet.sourceDamageRollPenaltyRolls,
    objectDamageSource,
    objectDamageByType,
    input.fillSet.damageRoll.holeId,
  );
  const sourcePenalty = applyAvailableSourceDamageRollPenalty(
    objectDamageSource,
    objectDamageByType,
    input.fillSet.damageRoll.holeId,
    sourceDamageRollPenaltyRoll,
  );
  if (sourcePenalty.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  if (sourcePenalty.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.input.subject, [
      ...sourcePenalty.holes,
    ]);
  }

  const lit = applySpellLightEmitterEffects(
    attackRolledState,
    input.actorId,
    { kind: "object", objectId: input.fillSet.objectTarget.objectId },
    input.invocation,
  );
  const spentResources = spendSpellCastResources({
    state: stateAfterResolvedHeldLightHurl(
      lit,
      input.actorId,
      input.invocation,
    ),
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const objectDamage = spellObjectDamageOutcomeFromDamageByType({
    objectId: input.fillSet.objectTarget.objectId,
    damageType: input.invocation.damage.damageType,
    damageByType: sourcePenalty.damageByType,
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
  let invocation =
    actor?.origin.kind === "character"
      ? supportedBonusActionSpellInvocationForSubject(
          actor,
          input.state,
          subject,
        )
      : undefined;
  if (actor?.origin.kind === "character" && invocation == null) {
    invocation = antimagicSuppressedInvocationForStaleSubject(
      actor,
      input.state,
      subject,
    );
  }
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action spell act requires a supported Bonus Action spell.",
    );
  }
  const metamagicAdmission = admitSpellMetamagicApplications({
    state: input.state,
    actor,
    actorId: subject.actorId,
    invocation,
    subject,
  });
  if (metamagicAdmission.tag !== "ok") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      metamagicAdmission.message,
    );
  }
  const actionCostOverride = metamagicActionCostOverride(
    metamagicAdmission.applications,
  );
  if (invocation.procedure === "heldLight") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "dancingLightsReposition") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "objectContactDamageRepeat") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack"
  ) {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (
    invocation.procedure === "spellCreatedHeldObject" ||
    invocation.procedure === "spellCreatedHeldObjectReEvoke"
  ) {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "scalarBuff") {
    if (
      invocation.actionCost !== "bonusAction" &&
      actionCostOverride !== "bonusAction"
    ) {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (
    invocation.procedure === "weaponDamageRider" ||
    invocation.procedure === "weaponAttackOverride" ||
    invocation.procedure === "magicWeaponEnhancement"
  ) {
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
  } else if (invocation.procedure === "dragonsBreathInitial") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "selfTeleport") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "sanctuaryTargetingInterdiction") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "directConditionRemoval") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "directHitPointRestoration") {
    if (
      invocation.actionCost !== "bonusAction" &&
      actionCostOverride !== "bonusAction"
    ) {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Bonus Action spell subject requires a supported Bonus Action spell act.",
    );
  }
  const spiritualWeaponCommitAlreadyApplied =
    spiritualWeaponResolutionCommitAlreadyApplied({
      state: input.state,
      actorId: subject.actorId,
      invocation,
      fills: input.fills,
    });
  if (
    !spiritualWeaponCommitAlreadyApplied &&
    !spellHasAvailableSpend(actor, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act no longer has its required runtime spell resource.",
    );
  }
  if (
    !spiritualWeaponCommitAlreadyApplied &&
    !spellActTurnResourceAvailable(
      input.state.currentTurnResources,
      input.subject.actorId,
      invocation,
      actionCostOverride === undefined ? undefined : { actionCostOverride },
    )
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  if (
    !spiritualWeaponCommitAlreadyApplied &&
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
    return heldLightProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "spellCreatedHeldObject") {
    return resolveSpellCreatedHeldObjectSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "spellCreatedHeldObjectReEvoke") {
    return resolveSpellCreatedHeldObjectReEvokeSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "dancingLightsReposition") {
    return resolveDancingLightsRepositionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "objectContactDamageRepeat") {
    return resolveObjectContactDamageRepeatSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (
    invocation.procedure === "spiritualWeaponAttackProxy" ||
    invocation.procedure === "spiritualWeaponRepeatAttack"
  ) {
    return resolveBonusActionSpellAttackProxyAct({
      ...input,
      state: castingState,
    });
  }
  if (invocation.procedure === "scalarBuff") {
    return scalarBuffProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
      ...(actionCostOverride === undefined ? {} : { actionCostOverride }),
      metamagicApplications: metamagicAdmission.applications,
    });
  }
  if (invocation.procedure === "weaponDamageRider") {
    return weaponDamageRiderProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "magicWeaponEnhancement") {
    return magicWeaponEnhancementProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "weaponAttackOverride") {
    return weaponAttackOverrideProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "markedDamageRider") {
    return markedDamageRiderProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "jumpMovementReplacement") {
    return jumpMovementReplacementProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "dragonsBreathInitial") {
    return dragonsBreathInitialProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "selfTeleport") {
    return selfTeleportProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "sanctuaryTargetingInterdiction") {
    return sanctuaryTargetingInterdictionProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "directConditionRemoval") {
    return directConditionRemovalProfile.resolve({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  return directHitPointRestorationProfile.resolve({
    input: { ...input, state: castingState },
    actorId: subject.actorId,
    invocation,
    fillSet,
    metamagicApplications: metamagicAdmission.applications,
    ...(actionCostOverride === undefined ? {} : { actionCostOverride }),
  });
}

function resolveBonusActionSpellAttackProxyAct(
  input: BonusActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const result = resolveSpellActInternal(
    {
      ...input,
      subject: {
        ...input.subject,
        tag: "actionSpell",
      },
    },
    { allowBonusActionInvocation: true },
  );
  return result.tag === "needsHoles"
    ? {
        ...result,
        subject: input.subject,
      }
    : result;
}

function supportedActionSpellInvocationForSubject(
  actor: BattleCreatureState,
  state: BattleState,
  subject: ActionSpellBattleResolutionInput["subject"],
): SupportedSpellInvocation | undefined {
  return supportedSpellActs(actor, state).find(
    (candidate) =>
      supportedSpellInvocationMatchesRef(candidate, subject.invocation) &&
      (candidate.procedure !== "spellHostedWeaponAttack" ||
        (subject.componentWeaponItemId !== undefined &&
          candidate.componentWeapon.itemId === subject.componentWeaponItemId)),
  );
}

function supportedBonusActionSpellInvocationForSubject(
  actor: BattleCreatureState,
  state: BattleState,
  subject: BonusActionSpellBattleResolutionInput["subject"],
): SupportedSpellInvocation | undefined {
  return supportedSpellActs(actor, state).find(
    (candidate) =>
      supportedSpellInvocationMatchesRef(candidate, subject.invocation) &&
      (candidate.procedure !== "weaponAttackOverride" ||
        (subject.componentWeaponItemId !== undefined &&
          candidate.attachedWeapon.itemId === subject.componentWeaponItemId)),
  );
}

function antimagicSuppressedInvocationForStaleSubject(
  actor: BattleCreatureState,
  state: BattleState,
  subject: BonusActionSpellBattleResolutionInput["subject"],
): SupportedSpellInvocation | undefined {
  if (
    !invocationRefHasAntimagicSuppressedRepeatResolverGuard(
      subject.invocation.procedure,
    )
  ) {
    return undefined;
  }
  return supportedBonusActionSpellInvocationForSubject(
    actor,
    stateForAntimagicSuppressedRepeatLookup(state),
    subject,
  );
}

function stateForAntimagicSuppressedRepeatLookup(
  state: BattleState,
): BattleState {
  return {
    ...state,
    combatants: new Map(
      [...state.combatants].map(([combatantId, combatant]) => [
        combatantId,
        {
          ...combatant,
          activeEffects: combatant.activeEffects.filter(
            (effect) => effect.kind !== "antimagicFieldOngoingSpellSuppression",
          ),
        },
      ]),
    ),
  };
}

function invocationRefHasAntimagicSuppressedRepeatResolverGuard(
  procedure: ActionSpellBattleResolutionInput["subject"]["invocation"]["procedure"],
): boolean {
  return (
    procedure === "objectContactDamageRepeat" ||
    procedure === "spiritualWeaponRepeatAttack"
  );
}

export function resolveBonusActionDashSpellAct(
  input: BonusActionDashSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor, input.state).find(
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
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  return expeditiousRetreatDashProfile.resolve({
    input,
    actorId: subject.actorId,
    invocation,
    fillSet,
  });
}
