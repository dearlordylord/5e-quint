// -*- mode: Bluespec; -*-

module battleRuntimeSpellBridgeExamples {
  // Sorcerous Burst damage-type variants used in the asserts below live in this
  // leaf; import it directly (Quint `.*` imports are not re-exported transitively).
  import battleRuntimeSorcerousBurstDamageChoice.* from "./battle-runtime-sorcerous-burst-damage-choice"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import spellDefinitionProfiles.* from "../shared-algebras/proofs/rule-core/spell-definition-profiles"
  import spellInvocationActionSlotCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-action-slot-core"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"
  import spellInvocationTargetCardinalityCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core"
  import spellAttackDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-attack-damage-projection-core"
  import spellSaveDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-save-damage-projection-core"
  import spellSaveConditionProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-save-condition-projection-core"
  import spellScalarBuffProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core"
  import spellDamageRiderProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-damage-rider-projection-core"
  import spellChainedAttackDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-chained-attack-damage-projection-core"
  import spellAttackBurstSaveDamageCore.* from "../shared-algebras/proofs/rule-core/spell-attack-burst-save-damage-core"
  import spellIndependentAttackSequenceCore.* from "../shared-algebras/proofs/rule-core/spell-independent-attack-sequence-core"
  import spellTurnHookCore.* from "../shared-algebras/proofs/rule-core/spell-turn-hook-core"
  import spellObjectHitPointDamageCore.* from "../shared-algebras/proofs/rule-core/spell-object-hit-point-damage-core"
  import spellSleepRepeatSaveLifecycleCore.* from "../shared-algebras/proofs/rule-core/spell-sleep-repeat-save-lifecycle-core"
  import spellProcedureProfiles.* from "../shared-algebras/proofs/rule-core/spell-procedure-profiles"
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"

  run test_direct_hit_point_restoration_profile_projection = {
    all {
      assert(battleRuntimeDirectHitPointRestorationUsesBonusAction(BattleRuntimeHealingWordRestoration)),
      assert(not(battleRuntimeDirectHitPointRestorationUsesBonusAction(BattleRuntimeCureWoundsRestoration))),
      assert(battleRuntimeDirectHitPointRestorationMaximumTargets(BattleRuntimeMassHealingWordRestoration, 3) == 6),
      assert(battleRuntimeDirectHitPointRestorationMaximumTargets(BattleRuntimeCureWoundsRestoration, 1) == 1),
      assert(battleRuntimeDirectHitPointRestorationHealing(5, 3) == 8),
    }
  }

  run test_spell_attack_damage_profile_projection = {
    all {
      assert(battleRuntimeSpellAttackDamageType(BattleRuntimeRayOfFrostSpellAttack) == ColdDamage),
      assert(battleRuntimeSpellAttackDamageType(BattleRuntimeShockingGraspSpellAttack) == LightningDamage),
      assert(battleRuntimeSpellAttackDamageType(BattleRuntimeFireBoltSpellAttack) == FireDamage),
      assert(battleRuntimeSpellAttackDamageHitEffects(BattleRuntimeRayOfFrostSpellAttack) == Set(BattleRuntimeRayOfFrostSpeedReductionHitEffect)),
      assert(battleRuntimeSpellAttackDamageHitEffects(BattleRuntimeChillTouchSpellAttack) == Set(BattleRuntimeChillTouchHitPointRegainPreventionHitEffect)),
      assert(battleRuntimeSpellAttackDamageHitEffects(BattleRuntimeGuidingBoltSpellAttack) == Set(BattleRuntimeGuidingBoltNextAttackAdvantageHitEffect)),
      assert(battleRuntimeSpellAttackDamageSupportsObjectTarget(BattleRuntimeStarryWispSpellAttack)),
      assert(battleRuntimeSpellAttackDamageSupportsObjectTarget(BattleRuntimeFireBoltSpellAttack)),
      assert(battleRuntimeSpellAttackDamageSupportsObjectTarget(BattleRuntimeProduceFlameHurlSpellAttack)),
      assert(not(battleRuntimeSpellAttackDamageSupportsObjectTarget(BattleRuntimeRayOfFrostSpellAttack))),
    }
  }

  run test_save_gated_profile_projection = {
    val animalTargets = battleRuntimeSaveGatedConditionTargeting(BattleRuntimeAnimalFriendshipSaveCondition)
    val blindnessTargets = battleRuntimeSaveGatedConditionTargeting(BattleRuntimeBlindnessDeafnessSaveCondition)
    val holdPersonTargets = battleRuntimeSaveGatedConditionTargeting(BattleRuntimeHoldPersonSaveCondition)
    all {
      assert(battleRuntimeSaveGatedDamageTargeting(BattleRuntimeSacredFlameSaveDamage) == BattleRuntimeSingleSaveTarget),
      assert(battleRuntimeSaveGatedDamageTargeting(BattleRuntimeBurningHandsSaveDamage) == BattleRuntimeAreaSaveTargets),
      assert(battleRuntimeSaveGatedDamageTargeting(BattleRuntimeFireballSaveDamage) == BattleRuntimeAreaSaveTargets),
      assert(battleRuntimeSaveGatedDamageTargeting(BattleRuntimeLightningBoltSaveDamage) == BattleRuntimeAreaSaveTargets),
      assert(battleRuntimeSaveGatedDamageTargeting(BattleRuntimeMindSpikeSaveDamage) == BattleRuntimeSingleSaveTarget),
      assert(battleRuntimeSaveGatedDamageSuccess(BattleRuntimeInflictWoundsSaveDamage) == BattleRuntimeHalfDamageOnSaveSuccess),
      assert(battleRuntimeSaveGatedDamageSuccess(BattleRuntimeFireballSaveDamage) == BattleRuntimeHalfDamageOnSaveSuccess),
      assert(battleRuntimeSaveGatedDamageSuccess(BattleRuntimeLightningBoltSaveDamage) == BattleRuntimeHalfDamageOnSaveSuccess),
      assert(battleRuntimeSaveGatedDamageSuccess(BattleRuntimeThunderwaveSaveDamage) == BattleRuntimeHalfDamageOnSaveSuccess),
      assert(battleRuntimeSaveGatedDamageSuccess(BattleRuntimeDissonantWhispersSaveDamage) == BattleRuntimeHalfDamageOnSaveSuccess),
      assert(battleRuntimeSaveGatedDamageSuccess(BattleRuntimeHellishRebukeSaveDamage) == BattleRuntimeHalfDamageOnSaveSuccess),
      assert(battleRuntimeSaveGatedDamageSuccess(BattleRuntimeMindSpikeSaveDamage) == BattleRuntimeHalfDamageOnSaveSuccess),
      assert(battleRuntimeSaveGatedDamageType(BattleRuntimeViciousMockerySaveDamage) == PsychicDamage),
      assert(battleRuntimeSaveGatedDamageType(BattleRuntimeFireballSaveDamage) == FireDamage),
      assert(battleRuntimeSaveGatedDamageType(BattleRuntimeLightningBoltSaveDamage) == LightningDamage),
      assert(battleRuntimeSaveGatedDamageType(BattleRuntimeThunderwaveSaveDamage) == ThunderDamage),
      assert(battleRuntimeSaveGatedDamageType(BattleRuntimeDissonantWhispersSaveDamage) == PsychicDamage),
      assert(battleRuntimeSaveGatedDamageType(BattleRuntimeHellishRebukeSaveDamage) == FireDamage),
      assert(battleRuntimeSaveGatedDamageType(BattleRuntimeMindSpikeSaveDamage) == PsychicDamage),
      assert(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeBurningHandsSaveDamage)),
      assert(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeFireballSaveDamage)),
      assert(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeLightningBoltSaveDamage)),
      assert(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeThunderwaveSaveDamage)),
      assert(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeDissonantWhispersSaveDamage)),
      assert(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeHellishRebukeSaveDamage)),
      assert(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeMindSpikeSaveDamage)),
      assert(not(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeAcidSplashSaveDamage))),
      assert(battleRuntimeSaveGatedDamageRequiresConcentration(BattleRuntimeMindSpikeSaveDamage)),
      assert(not(battleRuntimeSaveGatedDamageRequiresConcentration(BattleRuntimeInflictWoundsSaveDamage))),
      assert(battleRuntimeSaveGatedDamageFailedSaveEffects(BattleRuntimeThunderwaveSaveDamage) == Set(BattleRuntimeThunderwavePush10FeetEffect)),
      assert(battleRuntimeSaveGatedDamageFailedSaveEffects(BattleRuntimeDissonantWhispersSaveDamage) == Set(BattleRuntimeDissonantWhispersForcedReactionMovementEffect)),
      assert(battleRuntimeSaveGatedDamageFailedSaveEffects(BattleRuntimeFireballSaveDamage) == Set()),
      assert(battleRuntimeSaveGatedDamageFailedSaveEffects(BattleRuntimeHellishRebukeSaveDamage) == Set()),
      assert(battleRuntimeSaveGatedDamageFailedSaveEffects(BattleRuntimeMindSpikeSaveDamage) == Set()),
      assert(battleRuntimeSaveGatedDamageFailedSaveEffects(BattleRuntimeViciousMockerySaveDamage) == Set(BattleRuntimeViciousMockeryNextAttackDisadvantageEffect)),
      assert(battleRuntimeSaveGatedConditionTargeting(BattleRuntimeColorSpraySaveCondition) == BattleRuntimeAreaSaveTargets),
      assert(battleRuntimeSaveGatedConditionSavingThrowAbility(BattleRuntimeColorSpraySaveCondition) == BattleRuntimeConstitutionSavingThrow),
      assert(battleRuntimeSaveGatedConditionSavingThrowAbility(BattleRuntimeEntangleSaveCondition) == BattleRuntimeStrengthSavingThrow),
      assert(battleRuntimeSaveGatedConditionSavingThrowAbility(BattleRuntimeBlindnessDeafnessSaveCondition) == BattleRuntimeConstitutionSavingThrow),
      assert(battleRuntimeSaveGatedConditionSavingThrowAbility(BattleRuntimeHoldPersonSaveCondition) == BattleRuntimeWisdomSavingThrow),
      assert(battleRuntimeSaveGatedTargetMaxTargets(animalTargets, 2) == 2),
      assert(battleRuntimeSaveGatedTargetMaxTargets(blindnessTargets, 2) == 1),
      assert(battleRuntimeSaveGatedTargetMaxTargets(blindnessTargets, 3) == 2),
      assert(battleRuntimeSaveGatedTargetMaxTargets(holdPersonTargets, 2) == 1),
      assert(battleRuntimeSaveGatedTargetMaxTargets(holdPersonTargets, 3) == 2),
      assert(battleRuntimeSaveGatedConditionFailedSaveEffects(BattleRuntimeEntangleSaveCondition) == Set(BattleRuntimeEntangleRestrainedEffect)),
      assert(battleRuntimeSaveGatedConditionFailedSaveEffects(BattleRuntimeBlindnessDeafnessSaveCondition) == Set(
        BattleRuntimeBlindnessDeafnessBlindedEffect({ durationTicks: 10 }),
        BattleRuntimeBlindnessDeafnessDeafenedEffect({ durationTicks: 10 })
      )),
      assert(battleRuntimeSaveGatedConditionFailedSaveEffects(BattleRuntimeHoldPersonSaveCondition) == Set(BattleRuntimeHoldPersonParalyzedEffect({ durationTicks: 10 }))),
      assert(battleRuntimeSaveGatedConditionFailedSaveEffects(BattleRuntimeFaerieFireSaveAttackRollAdvantage) == Set(BattleRuntimeFaerieFireOutlineEffect)),
      assert(battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(BattleRuntimeAnimalFriendshipSaveCondition, true, false)),
      assert(not(battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(BattleRuntimeAnimalFriendshipSaveCondition, false, true))),
      assert(battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(BattleRuntimeHoldPersonSaveCondition, false, true)),
      assert(not(battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(BattleRuntimeHoldPersonSaveCondition, true, false))),
      assert(battleRuntimeSaveGatedConditionSavingThrowHasAdvantage(BattleRuntimeCharmPersonSaveCondition, true)),
    }
  }

  run test_scalar_buff_profile_projection = {
    all {
      assert(battleRuntimeScalarBuffUsesBonusAction(BattleRuntimeShieldOfFaithScalarBuff)),
      assert(battleRuntimeScalarBuffUsesBonusAction(BattleRuntimeBarkskinScalarBuff)),
      assert(not(battleRuntimeScalarBuffUsesBonusAction(BattleRuntimeLongstriderScalarBuff))),
      assert(not(battleRuntimeScalarBuffUsesBonusAction(BattleRuntimeSpiderClimbScalarBuff))),
      assert(not(battleRuntimeScalarBuffUsesBonusAction(BattleRuntimeFlyScalarBuff))),
      assert(battleRuntimeScalarBuffMaximumTargets(BattleRuntimeLongstriderScalarBuff, 3) == 3),
      assert(battleRuntimeScalarBuffMaximumTargets(BattleRuntimeSpiderClimbScalarBuff, 3) == 2),
      assert(battleRuntimeScalarBuffMaximumTargets(BattleRuntimeFlyScalarBuff, 4) == 2),
      assert(battleRuntimeScalarBuffTemporaryHitPoints(BattleRuntimeFalseLifeScalarBuff, 3, 4) == 18),
      assert(battleRuntimeScalarBuffEffects(BattleRuntimeHeroismScalarBuff, 3, 1) == Set(BattleRuntimeHeroismFrightenedImmunityEffect, BattleRuntimeHeroismTurnStartTemporaryHitPointsEffect({ amount: 3 }))),
      assert(battleRuntimeScalarBuffEffects(BattleRuntimeBarkskinScalarBuff, 3, 2) == Set(BattleRuntimeBarkskinArmorClassFloorEffect)),
      assert(battleRuntimeScalarBuffEffects(BattleRuntimeSpiderClimbScalarBuff, 3, 1) == Set(BattleRuntimeSpiderClimbClimbSpeedGrantEffect)),
      assert(battleRuntimeScalarBuffEffects(BattleRuntimeFlyScalarBuff, 3, 1) == Set(BattleRuntimeFlySpeedHoverGrantEffect)),
      assert(battleRuntimeScalarBuffEffects(BattleRuntimeAidScalarBuff, 3, 3) == Set(BattleRuntimeAidHitPointMaximumIncreaseEffect({ amount: 10 }))),
      assert(battleRuntimeScalarBuffRequiresConcentration(BattleRuntimeSpiderClimbScalarBuff)),
      assert(battleRuntimeScalarBuffRequiresConcentration(BattleRuntimeFlyScalarBuff)),
      assert(battleRuntimeScalarBuffRequiresConcentration(BattleRuntimeHeroismScalarBuff)),
      assert(not(battleRuntimeScalarBuffRequiresConcentration(BattleRuntimeBarkskinScalarBuff))),
    }
  }

  run test_damage_rider_profile_projection = {
    all {
      assert(battleRuntimeDamageRiderUsesBonusAction(BattleRuntimeDivineFavorWeaponDamageRider)),
      assert(battleRuntimeDamageRiderUsesBonusAction(BattleRuntimeDivineSmiteAfterHitDamage)),
      assert(battleRuntimeDamageRiderRequiresConcentration(BattleRuntimeHuntersMarkMarkedDamageRider)),
      assert(battleRuntimeDamageRiderRequiresConcentration(BattleRuntimeEnsnaringStrikeAfterHitCondition)),
      assert(battleRuntimeDamageRiderRequiresConcentration(BattleRuntimeShiningSmiteAfterHitDamageIllumination)),
      assert(not(battleRuntimeDamageRiderRequiresConcentration(BattleRuntimeDivineFavorWeaponDamageRider))),
      assert(battleRuntimeDivineFavorDamageType == RadiantDamage),
      assert(battleRuntimeDivineFavorDurationTicks == 10),
      assert(battleRuntimeDivineSmiteDamageDice(1, false) == 2),
      assert(battleRuntimeDivineSmiteDamageDice(1, true) == 3),
      assert(battleRuntimeDivineSmiteDamageDice(3, true) == 5),
      assert(battleRuntimeHuntersMarkDamageType == ForceDamage),
      assert(battleRuntimeHuntersMarkRangeFeet == 90),
      assert(battleRuntimeEnsnaringStrikeDamageType == PiercingDamage),
      assert(battleRuntimeEnsnaringStrikeDamageDice(3) == 3),
      assert(battleRuntimeEnsnaringStrikeTargetHasSaveAdvantage(true)),
      assert(battleRuntimeSearingSmiteDamageType == FireDamage),
      assert(battleRuntimeSearingSmiteDamageDice(3) == 3),
      assert(battleRuntimeSearingSmiteDurationTicks == 10),
      assert(battleRuntimeShiningSmiteDamageType == RadiantDamage),
      assert(battleRuntimeShiningSmiteDamageDice(1) == 0),
      assert(battleRuntimeShiningSmiteDamageDice(3) == 3),
      assert(battleRuntimeShiningSmiteBrightLightRadiusFeet == 5),
      assert(battleRuntimeShiningSmiteDurationTicks == 10),
    }
  }

  run test_chained_spell_attack_damage_profile_projection = {
    val duplicateFaces = {
      face1: 2,
      face2: 1,
      face3: 0,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    all {
      assert(battleRuntimeChainedSpellAttackDamageChoices(BattleRuntimeChromaticOrbChainedSpellAttack).contains(BattleRuntimeChainedSpellAttackLightningDamage)),
      assert(battleRuntimeChainedSpellAttackDamageType(BattleRuntimeChainedSpellAttackThunderDamage) == ThunderDamage),
      assert(battleRuntimeChainedSpellAttackDamageBaseSpellLevel(BattleRuntimeChromaticOrbChainedSpellAttack) == 1),
      assert(battleRuntimeChainedSpellAttackDamageDieSize(BattleRuntimeChromaticOrbChainedSpellAttack) == 8),
      assert(battleRuntimeChainedSpellAttackDamageDice(BattleRuntimeChromaticOrbChainedSpellAttack, 3) == 5),
      assert(battleRuntimeD8FaceCountsMatchRolledDice(BattleRuntimeChromaticOrbChainedSpellAttack, 1, false, duplicateFaces)),
      assert(battleRuntimeDamageRollHasDuplicateD8Face(duplicateFaces)),
      assert(battleRuntimeChainedSpellAttackDamageCanLeap(BattleRuntimeChromaticOrbChainedSpellAttack, 1, 0, false, duplicateFaces)),
      assert(not(battleRuntimeChainedSpellAttackDamageCanLeap(BattleRuntimeChromaticOrbChainedSpellAttack, 1, 1, false, duplicateFaces))),
    }
  }

  run test_attack_burst_save_damage_profile_projection = {
    all {
      assert(battleRuntimeAttackBurstSaveDamageRequiresSlot(BattleRuntimeIceKnifeAttackBurstSaveDamage)),
      assert(battleRuntimeAttackBurstSaveDamageAttackType(BattleRuntimeIceKnifeAttackBurstSaveDamage) == PiercingDamage),
      assert(battleRuntimeAttackBurstSaveDamageBurstType(BattleRuntimeIceKnifeAttackBurstSaveDamage) == ColdDamage),
      assert(battleRuntimeAttackBurstSaveDamageBurstDice(BattleRuntimeIceKnifeAttackBurstSaveDamage, 3) == 4),
      assert(battleRuntimeAttackBurstSaveDamageBurstAmount(BattleRuntimeIceKnifeAttackBurstSaveDamage, 6, false) == 6),
      assert(battleRuntimeAttackBurstSaveDamageBurstAmount(BattleRuntimeIceKnifeAttackBurstSaveDamage, 6, true) == 0),
    }
  }

  run test_spell_attack_sequence_projection = {
    all {
      assert(battleRuntimeSpellAttackSequenceDamageType(BattleRuntimeEldritchBlastBeamSequence) == ForceDamage),
      assert(battleRuntimeSpellAttackSequenceDamageType(BattleRuntimeScorchingRaySequence) == FireDamage),
      assert(battleRuntimeSpellAttackSequenceSupportsObjectTargets(BattleRuntimeEldritchBlastBeamSequence)),
      assert(battleRuntimeSpellAttackSequenceSupportsObjectTargets(BattleRuntimeScorchingRaySequence)),
      assert(battleRuntimeSpellAttackSequenceAttackCount(BattleRuntimeEldritchBlastBeamSequence, 1) == 1),
      assert(battleRuntimeSpellAttackSequenceAttackCount(BattleRuntimeEldritchBlastBeamSequence, 5) == 2),
      assert(battleRuntimeSpellAttackSequenceAttackCount(BattleRuntimeEldritchBlastBeamSequence, 11) == 3),
      assert(battleRuntimeSpellAttackSequenceAttackCount(BattleRuntimeEldritchBlastBeamSequence, 17) == 4),
      assert(battleRuntimeSpellAttackSequenceAttackCount(BattleRuntimeScorchingRaySequence, 1) == 0),
      assert(battleRuntimeSpellAttackSequenceAttackCount(BattleRuntimeScorchingRaySequence, 2) == 3),
      assert(battleRuntimeSpellAttackSequenceAttackCount(BattleRuntimeScorchingRaySequence, 3) == 4),
      assert(battleRuntimeSpellAttackSequenceAttackCount(BattleRuntimeScorchingRaySequence, 5) == 6),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeEldritchBlastBeamSequence, false, 2, 0, 0, 0, 0) == BattleRuntimeSpellAttackSequenceUnavailable),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeEldritchBlastBeamSequence, true, 2, 0, 0, 0, 0) == BattleRuntimeSpellAttackSequenceNeedsTargets),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeEldritchBlastBeamSequence, true, 2, 2, 1, 0, 0) == BattleRuntimeSpellAttackSequenceNeedsAttackRoll),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeEldritchBlastBeamSequence, true, 2, 2, 2, 2, 1) == BattleRuntimeSpellAttackSequenceNeedsDamageRoll),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeEldritchBlastBeamSequence, true, 2, 2, 2, 1, 1) == BattleRuntimeSpellAttackSequenceComplete),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeScorchingRaySequence, true, 3, 0, 0, 0, 0) == BattleRuntimeSpellAttackSequenceNeedsTargets),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeScorchingRaySequence, true, 3, 3, 2, 0, 0) == BattleRuntimeSpellAttackSequenceNeedsAttackRoll),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeScorchingRaySequence, true, 3, 3, 3, 2, 1) == BattleRuntimeSpellAttackSequenceNeedsDamageRoll),
      assert(battleRuntimeSpellAttackSequenceNextStep(BattleRuntimeScorchingRaySequence, true, 3, 3, 3, 1, 1) == BattleRuntimeSpellAttackSequenceComplete),
    }
  }

  run test_sorcerous_burst_projection = {
    all {
      assert(battleRuntimeSorcerousBurstDamageTypeChoices.contains(BattleRuntimeSorcerousBurstAcidDamage)),
      assert(battleRuntimeSorcerousBurstDamageTypeChoices.contains(BattleRuntimeSorcerousBurstPsychicDamage)),
      assert(battleRuntimeSorcerousBurstDamageTypeChoices.contains(BattleRuntimeSorcerousBurstThunderDamage)),
      assert(battleRuntimeSorcerousBurstDamageType(BattleRuntimeSorcerousBurstPsychicDamage) == PsychicDamage),
      assert(battleRuntimeSorcerousBurstBaseDamageDice(1) == 1),
      assert(battleRuntimeSorcerousBurstBaseDamageDice(5) == 2),
      assert(battleRuntimeSorcerousBurstBaseDamageDice(11) == 3),
      assert(battleRuntimeSorcerousBurstBaseDamageDice(17) == 4),
      assert(battleRuntimeSorcerousBurstMaximumAdditionalDice(3) == 3),
      assert(battleRuntimeSorcerousBurstMaximumAdditionalDice(-1) == 0),
      assert(not(battleRuntimeSorcerousBurstCanRollAdditionalD8(0, 3, 0))),
      assert(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, 3, 0)),
      assert(not(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, 3, 1))),
      assert(battleRuntimeSorcerousBurstCanRollAdditionalD8(2, 3, 1)),
      assert(not(battleRuntimeSorcerousBurstCanRollAdditionalD8(4, 3, 3))),
      assert(not(battleRuntimeSorcerousBurstCanRollAdditionalD8(1, -1, 0))),
    }
  }

  run test_sleep_repeat_save_lifecycle_projection = {
    val pending = battleRuntimeSleepInitialSaveLifecycle(false, true)
    val saved = battleRuntimeSleepRepeatSaveLifecycleAfterSave(pending, true, false)
    val unconscious = battleRuntimeSleepRepeatSaveLifecycleAfterSave(pending, false, false)
    all {
      assert(battleRuntimeSleepSavingThrowAutomaticallySucceeds(true, false)),
      assert(battleRuntimeSleepSavingThrowAutomaticallySucceeds(false, true)),
      assert(not(battleRuntimeSleepSavingThrowAutomaticallySucceeds(false, false))),
      assert(battleRuntimeSleepInitialSaveLifecycle(true, true) == BattleRuntimeNoSleepRepeatSaveLifecycle),
      assert(pending == BattleRuntimePendingSleepRepeatSaveLifecycle({ hadIncapacitated: true })),
      assert(saved == BattleRuntimeNoSleepRepeatSaveLifecycle),
      assert(unconscious == BattleRuntimeUnconsciousSleepRepeatSaveLifecycle({
        hadIncapacitated: true,
        hadUnconscious: false,
      })),
      assert(battleRuntimeSleepEffectEndsOnDamage),
      assert(battleRuntimeSleepEffectEndsOnAdjacentShakeAwakeAction),
    }
  }

  run test_object_hit_point_damage_projection = {
    val damaged = battleRuntimeObjectHitPointDamageResult(FireDamage, 6, 5, 0)
    val thresholdBlocked = battleRuntimeObjectHitPointDamageResult(FireDamage, 6, 10, 10)
    val thresholdMet = battleRuntimeObjectHitPointDamageResult(FireDamage, 10, 10, 10)
    val poisonImmune = battleRuntimeObjectHitPointDamageResult(PoisonDamage, 6, 5, 0)
    val psychicImmune = battleRuntimeObjectHitPointDamageResult(PsychicDamage, 6, 5, 0)
    all {
      assert(damaged.effectiveDamage == 6),
      assert(damaged.priorHitPoints == 5),
      assert(damaged.nextHitPoints == 0),
      assert(damaged.destroyed),
      assert(thresholdBlocked.effectiveDamage == 0),
      assert(thresholdBlocked.nextHitPoints == 10),
      assert(not(thresholdBlocked.destroyed)),
      assert(thresholdMet.effectiveDamage == 10),
      assert(thresholdMet.nextHitPoints == 0),
      assert(thresholdMet.destroyed),
      assert(poisonImmune.effectiveDamage == 0),
      assert(poisonImmune.nextHitPoints == 5),
      assert(not(poisonImmune.destroyed)),
      assert(psychicImmune.effectiveDamage == 0),
      assert(psychicImmune.nextHitPoints == 5),
      assert(not(psychicImmune.destroyed)),
    }
  }

  run test_spell_turn_hook_projection = {
    all {
      assert(battleRuntimeTurnStartTemporaryHitPoints(2, 5) == 5),
      assert(battleRuntimeTurnStartTemporaryHitPoints(7, 5) == 7),
      assert(not(battleRuntimeOncePerTurnSpellEffectUsedAtTurnStart)),
      assert(battleRuntimeOneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn),
      assert(battleRuntimeTimedSpellEffectDurationAfterRoundTick(2) == 1),
      assert(battleRuntimeTimedSpellEffectDurationAfterRoundTick(1) == 0),
      assert(battleRuntimeTimedSpellEffectRemainsActive(1)),
      assert(not(battleRuntimeTimedSpellEffectRemainsActive(0))),
    }
  }
}
