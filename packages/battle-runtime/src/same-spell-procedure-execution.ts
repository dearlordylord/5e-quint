import { Match } from "effect";
import type { SpellProcedureExecution } from "./procedure-execution/spell-procedure-execution.ts";
import {
  sameMagicalDarknessPointOriginExecution,
  sameMagicWeaponEnhancementExecution,
  sameMakeStableExecution,
  sameMarkedDamageRiderExecution,
  sameMirrorImageHitInterceptionExecution,
  sameMoonbeamExecution,
  sameObjectContactDamageExecution,
  sameObjectContactDamageRepeatExecution,
  sameObjectLightExecution,
  sameOngoingSpellEndExecution,
  samePersistentArmorEffectExecution,
  sameRepeatedDamageAllocationExecution,
  sameRollModifierExecution,
  sameSanctuaryTargetingInterdictionExecution,
  sameSaveGatedAttackRollAdvantageExecution,
  sameSaveGatedConditionExecution,
  sameScalarBuffExecution,
  sameSelfTransformationModeExecution,
  sameSleetStormAreaHazardExecution,
  sameSlowActivePenaltiesExecution,
  sameSpellAttackDamageExecution,
  sameSpellAttackSequenceExecution,
  sameSpikeGrowthMovementHazardExecution,
  sameSpiritualWeaponAttackProxyExecution,
  sameWebRestraintHazardExecution,
  sameWeaponAttackOverrideExecution,
  sameWeaponDamageRiderExecution,
} from "./spell-procedure-execution-equality-magical-darkness-web.ts";
import {
  sameAbilityD20TestRollModeSaveGateExecution,
  sameAfterHitDamageAndIlluminationExecution,
  sameAfterHitDamageExecution,
  sameAfterHitSaveGatedConditionExecution,
  sameAfterHitTimedDamageAndSaveExecution,
  sameAntimagicFieldOngoingSpellSuppressionExecution,
  sameChainedSpellAttackDamageExecution,
  sameChosenDamageResistanceExecution,
  sameCloudkillAreaHazardExecution,
  sameCommandExecution,
  sameConditionImmunityAndTurnStartTemporaryHitPointsExecution,
  sameConditionRemovalProtectionExecution,
  sameDamageReductionExecution,
  sameDancingLightsCombinedCastExecution,
  sameDancingLightsRepositionExecution,
  sameDancingLightsSeparateCastExecution,
  sameDirectHitPointRestorationExecution,
  sameDragonsBreathInitialExecution,
  sameHypnoticPatternExecution,
  sameInsectPlagueAreaHazardExecution,
} from "./spell-procedure-execution-equality-ability-insect-plague.ts";
import {
  sameSeeInvisibleObserverSightExecution,
  sameSelfTeleportExecution,
  sameShieldReactionExecution,
  sameSleepTargetAdmissionExecution,
  sameThaumaturgyBoomingVoiceExecution,
} from "./simple-spell-procedure-execution-equality.ts";
import {
  sameAttackBurstSaveDamageExecution,
  sameBlurAttackRollDefenseExecution,
} from "./spell-procedure-execution-equality-attack-blur.ts";
import {
  sameCounterspellExecution,
  sameCreatureSizeDecreaseExecution,
  sameCreatureSizeIncreaseExecution,
  sameCreatureTypeProtectionExecution,
} from "./spell-procedure-execution-equality-counterspell-size.ts";
import {
  sameHastePositiveExecution,
  sameHeldLightExecution,
} from "./spell-procedure-execution-equality-haste-light.ts";
import {
  sameDirectConditionExecution,
  sameDirectConditionRemovalExecution,
} from "./spell-procedure-execution-equality-direct-condition.ts";
import {
  sameExpeditiousRetreatDashExecution,
  sameFeatherFallMitigationExecution,
} from "./spell-procedure-execution-equality-retreat-feather-fall.ts";
import {
  sameFlamingSphereExecution,
  sameFogCloudObscurementExecution,
} from "./spell-procedure-execution-equality-sphere-fog.ts";
import {
  sameGreaseGroundHazardExecution,
  sameGustOfWindLineExecution,
} from "./spell-procedure-execution-equality-grease-gust.ts";
import {
  sameHeldLightHurlExecution,
  sameHideousLaughterExecution,
} from "./spell-procedure-execution-equality-held-hurl-laughter.ts";
import {
  sameJumpMovementReplacementExecution,
  sameLevitatedCreatureExecution,
} from "./spell-procedure-execution-equality-jump-levitate.ts";
import {
  sameSaveGatedConditionImmunityExecution,
  sameSaveGatedDamageExecution,
} from "./spell-procedure-execution-equality-save-immunity-damage.ts";
import {
  sameSpellCreatedHeldObjectAttackExecution,
  sameSpellCreatedHeldObjectExecution,
  sameSpellCreatedHeldObjectReEvokeExecution,
} from "./spell-procedure-execution-equality-created-object.ts";
import { sameSpellHostedWeaponAttackExecution } from "./spell-procedure-execution-equality-hosted-weapon.ts";
import {
  sameSpiritualWeaponRepeatAttackExecution,
  sameWardingBondExecution,
} from "./spell-procedure-execution-equality-spiritual-warding.ts";

export function sameSpellProcedureExecution(
  left: SpellProcedureExecution,
  right: SpellProcedureExecution,
): boolean {
  return Match.value(left).pipe(
    Match.discriminatorsExhaustive("procedure")({
      abilityD20TestRollModeSaveGate: (value) =>
        right.procedure === value.procedure &&
        sameAbilityD20TestRollModeSaveGateExecution(value, right),
      afterHitDamage: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitDamageExecution(value, right),
      afterHitDamageAndIllumination: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitDamageAndIlluminationExecution(value, right),
      afterHitSaveGatedCondition: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitSaveGatedConditionExecution(value, right),
      afterHitTimedDamageAndSave: (value) =>
        right.procedure === value.procedure &&
        sameAfterHitTimedDamageAndSaveExecution(value, right),
      antimagicFieldOngoingSpellSuppression: (value) =>
        right.procedure === value.procedure &&
        sameAntimagicFieldOngoingSpellSuppressionExecution(value, right),
      attackBurstSaveDamage: (value) =>
        right.procedure === value.procedure &&
        sameAttackBurstSaveDamageExecution(value, right),
      blurAttackRollDefense: (value) =>
        right.procedure === value.procedure &&
        sameBlurAttackRollDefenseExecution(value, right),
      chainedSpellAttackDamage: (value) =>
        right.procedure === value.procedure &&
        sameChainedSpellAttackDamageExecution(value, right),
      chosenDamageResistance: (value) =>
        right.procedure === value.procedure &&
        sameChosenDamageResistanceExecution(value, right),
      cloudkillAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameCloudkillAreaHazardExecution(value, right),
      command: (value) =>
        right.procedure === value.procedure &&
        sameCommandExecution(value, right),
      conditionImmunityAndTurnStartTemporaryHitPoints: (value) =>
        right.procedure === value.procedure &&
        sameConditionImmunityAndTurnStartTemporaryHitPointsExecution(
          value,
          right,
        ),
      conditionRemovalProtection: (value) =>
        right.procedure === value.procedure &&
        sameConditionRemovalProtectionExecution(value, right),
      counterspell: (value) =>
        right.procedure === value.procedure &&
        sameCounterspellExecution(value, right),
      creatureSizeDecrease: (value) =>
        right.procedure === value.procedure &&
        sameCreatureSizeDecreaseExecution(value, right),
      creatureSizeIncrease: (value) =>
        right.procedure === value.procedure &&
        sameCreatureSizeIncreaseExecution(value, right),
      creatureTypeProtection: (value) =>
        right.procedure === value.procedure &&
        sameCreatureTypeProtectionExecution(value, right),
      damageReduction: (value) =>
        right.procedure === value.procedure &&
        sameDamageReductionExecution(value, right),
      dancingLightsCombinedCast: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsCombinedCastExecution(value, right),
      dancingLightsReposition: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsRepositionExecution(value, right),
      dancingLightsSeparateCast: (value) =>
        right.procedure === value.procedure &&
        sameDancingLightsSeparateCastExecution(value, right),
      directCondition: (value) =>
        right.procedure === value.procedure &&
        sameDirectConditionExecution(value, right),
      directConditionRemoval: (value) =>
        right.procedure === value.procedure &&
        sameDirectConditionRemovalExecution(value, right),
      directHitPointRestoration: (value) =>
        right.procedure === value.procedure &&
        sameDirectHitPointRestorationExecution(value, right),
      dragonsBreathInitial: (value) =>
        right.procedure === value.procedure &&
        sameDragonsBreathInitialExecution(value, right),
      expeditiousRetreatDash: (value) =>
        right.procedure === value.procedure &&
        sameExpeditiousRetreatDashExecution(value, right),
      featherFallMitigation: (value) =>
        right.procedure === value.procedure &&
        sameFeatherFallMitigationExecution(value, right),
      flamingSphere: (value) =>
        right.procedure === value.procedure &&
        sameFlamingSphereExecution(value, right),
      fogCloudObscurement: (value) =>
        right.procedure === value.procedure &&
        sameFogCloudObscurementExecution(value, right),
      greaseGroundHazard: (value) =>
        right.procedure === value.procedure &&
        sameGreaseGroundHazardExecution(value, right),
      gustOfWindLine: (value) =>
        right.procedure === value.procedure &&
        sameGustOfWindLineExecution(value, right),
      hastePositive: (value) =>
        right.procedure === value.procedure &&
        sameHastePositiveExecution(value, right),
      heldLight: (value) =>
        right.procedure === value.procedure &&
        sameHeldLightExecution(value, right),
      heldLightHurl: (value) =>
        right.procedure === value.procedure &&
        sameHeldLightHurlExecution(value, right),
      hideousLaughter: (value) =>
        right.procedure === value.procedure &&
        sameHideousLaughterExecution(value, right),
      hypnoticPattern: (value) =>
        right.procedure === value.procedure &&
        sameHypnoticPatternExecution(value, right),
      insectPlagueAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameInsectPlagueAreaHazardExecution(value, right),
      jumpMovementReplacement: (value) =>
        right.procedure === value.procedure &&
        sameJumpMovementReplacementExecution(value, right),
      levitatedCreature: (value) =>
        right.procedure === value.procedure &&
        sameLevitatedCreatureExecution(value, right),
      magicalDarknessPointOrigin: (value) =>
        right.procedure === value.procedure &&
        sameMagicalDarknessPointOriginExecution(value, right),
      magicWeaponEnhancement: (value) =>
        right.procedure === value.procedure &&
        sameMagicWeaponEnhancementExecution(value, right),
      makeStable: (value) =>
        right.procedure === value.procedure &&
        sameMakeStableExecution(value, right),
      markedDamageRider: (value) =>
        right.procedure === value.procedure &&
        sameMarkedDamageRiderExecution(value, right),
      mirrorImageHitInterception: (value) =>
        right.procedure === value.procedure &&
        sameMirrorImageHitInterceptionExecution(value, right),
      moonbeam: (value) =>
        right.procedure === value.procedure &&
        sameMoonbeamExecution(value, right),
      objectContactDamage: (value) =>
        right.procedure === value.procedure &&
        sameObjectContactDamageExecution(value, right),
      objectContactDamageRepeat: (value) =>
        right.procedure === value.procedure &&
        sameObjectContactDamageRepeatExecution(value, right),
      objectLight: (value) =>
        right.procedure === value.procedure &&
        sameObjectLightExecution(value, right),
      ongoingSpellEnd: (value) =>
        right.procedure === value.procedure &&
        sameOngoingSpellEndExecution(value, right),
      persistentArmorEffect: (value) =>
        right.procedure === value.procedure &&
        samePersistentArmorEffectExecution(value, right),
      repeatedDamageAllocation: (value) =>
        right.procedure === value.procedure &&
        sameRepeatedDamageAllocationExecution(value, right),
      rollModifier: (value) =>
        right.procedure === value.procedure &&
        sameRollModifierExecution(value, right),
      sanctuaryTargetingInterdiction: (value) =>
        right.procedure === value.procedure &&
        sameSanctuaryTargetingInterdictionExecution(value, right),
      saveGatedAttackRollAdvantage: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedAttackRollAdvantageExecution(value, right),
      saveGatedCondition: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedConditionExecution(value, right),
      saveGatedConditionImmunity: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedConditionImmunityExecution(value, right),
      saveGatedDamage: (value) =>
        right.procedure === value.procedure &&
        sameSaveGatedDamageExecution(value, right),
      scalarBuff: (value) =>
        right.procedure === value.procedure &&
        sameScalarBuffExecution(value, right),
      seeInvisibleObserverSight: (value) =>
        right.procedure === value.procedure &&
        sameSeeInvisibleObserverSightExecution(value, right),
      selfTeleport: (value) =>
        right.procedure === value.procedure &&
        sameSelfTeleportExecution(value, right),
      selfTransformationMode: (value) =>
        right.procedure === value.procedure &&
        sameSelfTransformationModeExecution(value, right),
      shieldReaction: (value) =>
        right.procedure === value.procedure &&
        sameShieldReactionExecution(value, right),
      sleepTargetAdmission: (value) =>
        right.procedure === value.procedure &&
        sameSleepTargetAdmissionExecution(value, right),
      sleetStormAreaHazard: (value) =>
        right.procedure === value.procedure &&
        sameSleetStormAreaHazardExecution(value, right),
      slowActivePenalties: (value) =>
        right.procedure === value.procedure &&
        sameSlowActivePenaltiesExecution(value, right),
      spellAttackDamage: (value) =>
        right.procedure === value.procedure &&
        sameSpellAttackDamageExecution(value, right),
      spellAttackSequence: (value) =>
        right.procedure === value.procedure &&
        sameSpellAttackSequenceExecution(value, right),
      spellCreatedHeldObject: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectExecution(value, right),
      spellCreatedHeldObjectAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectAttackExecution(value, right),
      spellCreatedHeldObjectReEvoke: (value) =>
        right.procedure === value.procedure &&
        sameSpellCreatedHeldObjectReEvokeExecution(value, right),
      spellHostedWeaponAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpellHostedWeaponAttackExecution(value, right),
      spikeGrowthMovementHazard: (value) =>
        right.procedure === value.procedure &&
        sameSpikeGrowthMovementHazardExecution(value, right),
      spiritualWeaponAttackProxy: (value) =>
        right.procedure === value.procedure &&
        sameSpiritualWeaponAttackProxyExecution(value, right),
      spiritualWeaponRepeatAttack: (value) =>
        right.procedure === value.procedure &&
        sameSpiritualWeaponRepeatAttackExecution(value, right),
      thaumaturgyBoomingVoice: (value) =>
        right.procedure === value.procedure &&
        sameThaumaturgyBoomingVoiceExecution(value, right),
      wardingBond: (value) =>
        right.procedure === value.procedure &&
        sameWardingBondExecution(value, right),
      weaponAttackOverride: (value) =>
        right.procedure === value.procedure &&
        sameWeaponAttackOverrideExecution(value, right),
      weaponDamageRider: (value) =>
        right.procedure === value.procedure &&
        sameWeaponDamageRiderExecution(value, right),
      webRestraintHazard: (value) =>
        right.procedure === value.procedure &&
        sameWebRestraintHazardExecution(value, right),
    }),
  );
}
