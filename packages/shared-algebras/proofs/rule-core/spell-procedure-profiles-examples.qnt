// -*- mode: Bluespec; -*-

module spellProcedureProfilesExamples {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"
  import spellInvocationActionSlotCore.* from "./spell-invocation-action-slot-core"
  import spellInvocationTargetCardinalityCore.* from "./spell-invocation-target-cardinality-core"
  import spellDamageProjectionCore.* from "./spell-damage-projection-core"
  import spellDirectDamageProjectionCore.* from "./spell-direct-damage-projection-core"
  import spellAttackDamageProjectionCore.* from "./spell-attack-damage-projection-core"
  import spellSaveDamageProjectionCore.* from "./spell-save-damage-projection-core"
  import spellSaveConditionProjectionCore.* from "./spell-save-condition-projection-core"
  import spellScalarBuffProjectionCore.* from "./spell-scalar-buff-projection-core"
  import spellDamageRiderProjectionCore.* from "./spell-damage-rider-projection-core"
  import spellChainedAttackDamageProjectionCore.* from "./spell-chained-attack-damage-projection-core"
  import spellAttackBurstSaveDamageCore.* from "./spell-attack-burst-save-damage-core"
  import spellIndependentAttackSequenceCore.* from "./spell-independent-attack-sequence-core"
  import spellTurnHookCore.* from "./spell-turn-hook-core"
  import spellObjectHitPointDamageCore.* from "./spell-object-hit-point-damage-core"
  import spellHitPointRestorationCore.* from "./spell-hit-point-restoration-core"
  import spellSleepRepeatSaveLifecycleCore.* from "./spell-sleep-repeat-save-lifecycle-core"
  import spellDefensiveEffectCore.* from "./spell-defensive-effect-core"
  import spellReadiedSpellResponseCore.* from "./spell-readied-spell-response-core"
  import spellProcedureProfiles.* from "./spell-procedure-profiles"

  run test_magic_missile_profile_spends_slot_and_allocates_darts = {
    val higherSlotState = initialSpellcastingProcedureState.with(
      "slotLedger",
      initialSpellSlotLedger.with("slotLevel", 2)
    )
    val invocationFacts = {
      hasSpellAccess: true,
      selectedSlotLevel: 2,
      targetCount: 4,
      targetsAreValid: true,
      repeatedEffectCount: magicMissileDartCount(2),
    }
    val invocation = resolveRepeatedDamageAllocationInvocation(higherSlotState, invocationFacts)
    val damage = resolveMagicMissileDamage({
      slotLevel: 2,
      allocatedDarts: 4,
      dartDamageRoll: 5,
    })
    val directDamageFacts = magicMissileDirectDamageFacts({
      slotLevel: 2,
      allocatedDarts: 4,
      dartDamageRoll: 5,
    })
    all {
      assert(invocation.admitted),
      assert(legalRepeatedDamageAllocationInvocationFacts(invocationFacts)),
      assert(not(legalRepeatedDamageAllocationInvocationFacts(invocationFacts.with("targetCount", 5)))),
      assert(magicMissileSlotLevelLegal(2)),
      assert(not(magicMissileSlotLevelLegal(0))),
      assert(magicMissileDartCount(2) == 4),
      assert(directDamageFacts.damageType == ForceDamage),
      assert(directDamageFacts.minimumInstanceCount == 1),
      assert(directDamageFacts.maximumInstanceCount == 4),
      assert(directDamageFacts.minimumDamagePerInstance == 2),
      assert(directDamageFacts.maximumDamagePerInstance == 5),
      assert(legalMagicMissileDirectDamageFacts({
        slotLevel: 2,
        allocatedDarts: 4,
        dartDamageRoll: 5,
      })),
      assert(not(legalMagicMissileDirectDamageFacts({
        slotLevel: 2,
        allocatedDarts: 5,
        dartDamageRoll: 5,
      }))),
      assert(not(legalMagicMissileDirectDamageFacts({
        slotLevel: 2,
        allocatedDarts: 4,
        dartDamageRoll: 6,
      }))),
      assert(invocation.slotExpended),
      assert(invocation.state.slotLedger.slotsRemaining == 1),
      assert(invocation.state.slotSpellCastThisTurn),
      assert(damage.damageAmount == 20),
      assert(damage.damageType == ForceDamage),
    }
  }

  run test_cantrip_profile_spends_magic_action_without_slot = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: RayOfFrostSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      assert(invocation.admitted),
      assert(not(invocation.slotExpended)),
      assert(invocation.state.slotLedger == initialSpellSlotLedger),
      assert(not(invocation.state.slotSpellCastThisTurn)),
      assert(invocation.state.turn.actionQuota == ActionSpent),
    }
  }

  run test_readied_spell_response_admits_action_time_spell_profile = {
    val held = holdReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        profile: CureWoundsSpellProfile,
        hasSpellAccess: true,
        selectedSlotLevel: 1,
        targetCount: 1,
        targetsAreValid: true,
      },
      true,
      true
    )
    val offered = offerReadiedSpellReaction(held.readiedSpell)
    val release = releaseReadiedSpellReaction(offered)
    all {
      assert(held.held),
      assert(held.slotExpended),
      assert(held.spellcasting.slotLedger.slotsRemaining == 1),
      assert(held.spellcasting.turn.actionQuota == ActionSpent),
      assert(held.readiedSpell.heldEffect == HeldReadiedSpellEffect({ profile: CureWoundsSpellProfile })),
      assert(release.released == ReleasedReadiedSpell({ profile: CureWoundsSpellProfile })),
      assert(release.readiedSpell.heldEffect == NoReadiedSpellHeldEffect),
      assert(release.readiedSpell.reaction.concentration.reactor == NoConcentration),
      assert(release.readiedSpell.reaction.reactor.turn.reactionAvailable == false),
    }
  }

  run test_readied_spell_response_rejects_bonus_action_spell_profile = {
    val held = holdReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        profile: HealingWordSpellProfile,
        hasSpellAccess: true,
        selectedSlotLevel: 1,
        targetCount: 1,
        targetsAreValid: true,
      },
      true,
      true
    )
    all {
      assert(not(held.held)),
      assert(not(held.slotExpended)),
      assert(held.spellcasting == initialSpellcastingProcedureState),
      assert(held.readiedSpell == initialReadiedSpellProcedureState),
    }
  }

  run test_spell_attack_damage_profiles_project_damage_and_hit_effects = {
    all {
      assert(spellAttackDamageProfileDamageType(RayOfFrostSpellAttackProfile) == ColdDamage),
      assert(spellAttackDamageProfileDamageType(PoisonSpraySpellAttackProfile) == PoisonDamage),
      assert(spellAttackDamageProfileDamageType(ChillTouchSpellAttackProfile) == NecroticDamage),
      assert(spellAttackDamageProfileDamageType(StarryWispSpellAttackProfile) == RadiantDamage),
      assert(spellAttackDamageProfileDamageType(FireBoltSpellAttackProfile) == FireDamage),
      assert(spellAttackDamageProfileDamageType(ShockingGraspSpellAttackProfile) == LightningDamage),
      assert(spellAttackDamageProfileDamageType(GuidingBoltSpellAttackProfile) == RadiantDamage),
      assert(spellAttackDamageProfileDamageType(RayOfSicknessSpellAttackProfile) == PoisonDamage),
      assert(spellAttackDamageProfileDamageType(ProduceFlameHurlSpellAttackProfile) == FireDamage),
      assert(spellAttackDamageProfileHitEffects(RayOfFrostSpellAttackProfile) == Set(RayOfFrostSpeedReductionHitEffect)),
      assert(spellAttackDamageProfileHitEffects(ChillTouchSpellAttackProfile) == Set(ChillTouchHitPointRegainPreventionHitEffect)),
      assert(spellAttackDamageProfileHitEffects(ShockingGraspSpellAttackProfile) == Set(ShockingGraspOpportunityAttackDeniedHitEffect)),
      assert(spellAttackDamageProfileHitEffects(GuidingBoltSpellAttackProfile) == Set(GuidingBoltNextAttackAdvantageHitEffect)),
      assert(spellAttackDamageProfileHitEffects(RayOfSicknessSpellAttackProfile) == Set(RayOfSicknessPoisonedHitEffect)),
      assert(spellAttackDamageProfileHitEffects(StarryWispSpellAttackProfile) == Set(StarryWispInvisibleBenefitDeniedHitEffect)),
      assert(spellAttackDamageProfileSupportsObjectTarget(ChillTouchSpellAttackProfile)),
      assert(spellAttackDamageProfileSupportsObjectTarget(StarryWispSpellAttackProfile)),
      assert(spellAttackDamageProfileSupportsObjectTarget(FireBoltSpellAttackProfile)),
      assert(spellAttackDamageProfileSupportsObjectTarget(ProduceFlameHurlSpellAttackProfile)),
      assert(not(spellAttackDamageProfileSupportsObjectTarget(RayOfFrostSpellAttackProfile))),
    }
  }

  run test_save_gated_spell_profiles_project_damage_targeting_and_effects = {
    val colorSprayTargets = spellSaveGatedConditionTargeting(ColorSpraySaveConditionProfile)
    val entangleTargets = spellSaveGatedConditionTargeting(EntangleSaveConditionProfile)
    val animalTargets = spellSaveGatedConditionTargeting(AnimalFriendshipSaveConditionProfile)
    val charmTargets = spellSaveGatedConditionTargeting(CharmPersonSaveConditionProfile)
    val blindnessTargets = spellSaveGatedConditionTargeting(BlindnessDeafnessSaveConditionProfile)
    val holdPersonTargets = spellSaveGatedConditionTargeting(HoldPersonSaveConditionProfile)
    val faerieFireTargets = spellSaveGatedConditionTargeting(FaerieFireSaveAttackRollAdvantageProfile)
    all {
      assert(spellSaveGatedDamageTargeting(SacredFlameSaveDamageProfile) == SpellSingleSaveTarget),
      assert(spellSaveGatedDamageTargeting(AcidSplashSaveDamageProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedDamageTargeting(BurningHandsSaveDamageProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedDamageTargeting(FireballSaveDamageProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedDamageTargeting(LightningBoltSaveDamageProfile) == SpellAreaSaveTargets),
      assert(spellSaveGatedDamageTargeting(MindSpikeSaveDamageProfile) == SpellSingleSaveTarget),
      assert(spellSaveGatedDamageSuccess(AcidSplashSaveDamageProfile) == SpellNoDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(SacredFlameSaveDamageProfile) == SpellNoDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(InflictWoundsSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(FireballSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(LightningBoltSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(ViciousMockerySaveDamageProfile) == SpellNoDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(ThunderwaveSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(DissonantWhispersSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(HellishRebukeSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageSuccess(MindSpikeSaveDamageProfile) == SpellHalfDamageOnSaveSuccess),
      assert(spellSaveGatedDamageType(AcidSplashSaveDamageProfile) == AcidDamage),
      assert(spellSaveGatedDamageType(SacredFlameSaveDamageProfile) == RadiantDamage),
      assert(spellSaveGatedDamageType(ViciousMockerySaveDamageProfile) == PsychicDamage),
      assert(spellSaveGatedDamageType(FireballSaveDamageProfile) == FireDamage),
      assert(spellSaveGatedDamageType(LightningBoltSaveDamageProfile) == LightningDamage),
      assert(spellSaveGatedDamageType(ThunderwaveSaveDamageProfile) == ThunderDamage),
      assert(spellSaveGatedDamageType(DissonantWhispersSaveDamageProfile) == PsychicDamage),
      assert(spellSaveGatedDamageType(HellishRebukeSaveDamageProfile) == FireDamage),
      assert(spellSaveGatedDamageType(MindSpikeSaveDamageProfile) == PsychicDamage),
      assert(spellSaveGatedDamageRequiresSlot(BurningHandsSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(FireballSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(LightningBoltSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(ThunderwaveSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(DissonantWhispersSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(HellishRebukeSaveDamageProfile)),
      assert(spellSaveGatedDamageRequiresSlot(MindSpikeSaveDamageProfile)),
      assert(not(spellSaveGatedDamageRequiresSlot(AcidSplashSaveDamageProfile))),
      assert(spellSaveGatedDamageRequiresConcentration(MindSpikeSaveDamageProfile)),
      assert(not(spellSaveGatedDamageRequiresConcentration(InflictWoundsSaveDamageProfile))),
      assert(spellSaveGatedDamageFailedSaveEffects(ThunderwaveSaveDamageProfile) == Set(ThunderwavePush10FeetEffect)),
      assert(spellSaveGatedDamageFailedSaveEffects(DissonantWhispersSaveDamageProfile) == Set(DissonantWhispersForcedReactionMovementEffect)),
      assert(spellSaveGatedDamageFailedSaveEffects(FireballSaveDamageProfile) == Set()),
      assert(spellSaveGatedDamageFailedSaveEffects(HellishRebukeSaveDamageProfile) == Set()),
      assert(spellSaveGatedDamageFailedSaveEffects(MindSpikeSaveDamageProfile) == Set()),
      assert(spellSaveGatedDamageFailedSaveEffects(ViciousMockerySaveDamageProfile) == Set(ViciousMockeryNextAttackDisadvantageEffect)),
      assert(colorSprayTargets == SpellAreaSaveTargets),
      assert(entangleTargets == SpellAreaSaveTargets),
      assert(faerieFireTargets == SpellAreaSaveTargets),
      assert(spellSaveGatedConditionSavingThrowAbility(ColorSpraySaveConditionProfile) == SpellConstitutionSavingThrow),
      assert(spellSaveGatedConditionSavingThrowAbility(EntangleSaveConditionProfile) == SpellStrengthSavingThrow),
      assert(spellSaveGatedConditionSavingThrowAbility(AnimalFriendshipSaveConditionProfile) == SpellWisdomSavingThrow),
      assert(spellSaveGatedConditionSavingThrowAbility(CharmPersonSaveConditionProfile) == SpellWisdomSavingThrow),
      assert(spellSaveGatedConditionSavingThrowAbility(BlindnessDeafnessSaveConditionProfile) == SpellConstitutionSavingThrow),
      assert(spellSaveGatedConditionSavingThrowAbility(HoldPersonSaveConditionProfile) == SpellWisdomSavingThrow),
      assert(spellSaveGatedConditionSavingThrowAbility(FaerieFireSaveAttackRollAdvantageProfile) == SpellDexteritySavingThrow),
      assert(spellSaveGatedTargetMaxTargets(colorSprayTargets, 1) == 1),
      assert(spellSaveGatedTargetMaxTargets(entangleTargets, 1) == 1),
      assert(spellSaveGatedTargetMaxTargets(animalTargets, 1) == 1),
      assert(spellSaveGatedTargetMaxTargets(animalTargets, 2) == 2),
      assert(spellSaveGatedTargetMaxTargets(charmTargets, 1) == 1),
      assert(spellSaveGatedTargetMaxTargets(charmTargets, 2) == 2),
      assert(spellSaveGatedTargetMaxTargets(blindnessTargets, 2) == 1),
      assert(spellSaveGatedTargetMaxTargets(blindnessTargets, 3) == 2),
      assert(spellSaveGatedTargetMaxTargets(holdPersonTargets, 2) == 1),
      assert(spellSaveGatedTargetMaxTargets(holdPersonTargets, 3) == 2),
      assert(spellSaveGatedTargetMaxTargets(faerieFireTargets, 1) == 1),
      assert(spellSaveGatedConditionFailedSaveEffects(ColorSpraySaveConditionProfile) == Set(ColorSprayBlindedEffect)),
      assert(spellSaveGatedConditionFailedSaveEffects(EntangleSaveConditionProfile) == Set(EntangleRestrainedEffect)),
      assert(spellSaveGatedConditionFailedSaveEffects(AnimalFriendshipSaveConditionProfile) == Set(AnimalFriendshipCharmedEffect({ durationTicks: 24 * 60 }))),
      assert(spellSaveGatedConditionFailedSaveEffects(CharmPersonSaveConditionProfile) == Set(CharmPersonCharmedEffect({ durationTicks: 10 * 60 }))),
      assert(spellSaveGatedConditionFailedSaveEffects(BlindnessDeafnessSaveConditionProfile) == Set(
        BlindnessDeafnessBlindedEffect({ durationTicks: 10 }),
        BlindnessDeafnessDeafenedEffect({ durationTicks: 10 })
      )),
      assert(spellSaveGatedConditionFailedSaveEffects(HoldPersonSaveConditionProfile) == Set(HoldPersonParalyzedEffect({ durationTicks: 10 }))),
      assert(spellSaveGatedConditionFailedSaveEffects(FaerieFireSaveAttackRollAdvantageProfile) == Set(FaerieFireOutlineEffect)),
      assert(spellSaveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveConditionProfile, true, false)),
      assert(not(spellSaveGatedConditionTargetCreatureTypeIsLegal(AnimalFriendshipSaveConditionProfile, false, true))),
      assert(spellSaveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveConditionProfile, false, true)),
      assert(not(spellSaveGatedConditionTargetCreatureTypeIsLegal(CharmPersonSaveConditionProfile, true, false))),
      assert(spellSaveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveConditionProfile, false, true)),
      assert(not(spellSaveGatedConditionTargetCreatureTypeIsLegal(HoldPersonSaveConditionProfile, true, false))),
      assert(spellSaveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveConditionProfile, true)),
      assert(not(spellSaveGatedConditionSavingThrowHasAdvantage(CharmPersonSaveConditionProfile, false))),
      assert(not(spellSaveGatedConditionSavingThrowHasAdvantage(AnimalFriendshipSaveConditionProfile, true))),
      assert(not(spellSaveGatedConditionSavingThrowHasAdvantage(FaerieFireSaveAttackRollAdvantageProfile, true))),
    }
  }

  run test_scalar_buff_profiles_project_action_targets_effects_and_temporary_hit_points = {
    all {
      assert(scalarBuffSpellAction(ShieldOfFaithScalarBuffProfile) == BonusActionSpellInvocation),
      assert(scalarBuffSpellAction(BarkskinScalarBuffProfile) == BonusActionSpellInvocation),
      assert(scalarBuffSpellAction(LongstriderScalarBuffProfile) == ActionTimeSpellInvocation),
      assert(scalarBuffSpellAction(SpiderClimbScalarBuffProfile) == ActionTimeSpellInvocation),
      assert(scalarBuffSpellAction(FlyScalarBuffProfile) == ActionTimeSpellInvocation),
      assert(scalarBuffMaximumTargets(LongstriderScalarBuffProfile, 3) == 3),
      assert(scalarBuffMaximumTargets(SpiderClimbScalarBuffProfile, 3) == 2),
      assert(scalarBuffMaximumTargets(FlyScalarBuffProfile, 4) == 2),
      assert(scalarBuffMaximumTargets(HeroismScalarBuffProfile, 3) == 3),
      assert(scalarBuffMaximumTargets(AidScalarBuffProfile, 3) == 3),
      assert(scalarBuffMaximumTargets(BarkskinScalarBuffProfile, 3) == 1),
      assert(scalarBuffMaximumTargets(FalseLifeScalarBuffProfile, 3) == 1),
      assert(scalarBuffTemporaryHitPoints(FalseLifeScalarBuffProfile, 1, 4) == 8),
      assert(scalarBuffTemporaryHitPoints(FalseLifeScalarBuffProfile, 3, 4) == 18),
      assert(scalarBuffEffects(LongstriderScalarBuffProfile, 3, 1) == Set(LongstriderSpeedIncreaseEffect)),
      assert(scalarBuffEffects(ShieldOfFaithScalarBuffProfile, 3, 1) == Set(ShieldOfFaithArmorClassBonusEffect)),
      assert(scalarBuffEffects(SpiderClimbScalarBuffProfile, 3, 1) == Set(SpiderClimbClimbSpeedGrantEffect)),
      assert(scalarBuffEffects(FlyScalarBuffProfile, 3, 1) == Set(FlySpeedHoverGrantEffect)),
      assert(scalarBuffEffects(BarkskinScalarBuffProfile, 3, 2) == Set(BarkskinArmorClassFloorEffect)),
      assert(scalarBuffEffects(HeroismScalarBuffProfile, 3, 1) == Set(HeroismFrightenedImmunityEffect, HeroismTurnStartTemporaryHitPointsEffect({ amount: 3 }))),
      assert(scalarBuffEffects(AidScalarBuffProfile, 3, 3) == Set(AidHitPointMaximumIncreaseEffect({ amount: 10 }))),
      assert(scalarBuffRequiresConcentration(ShieldOfFaithScalarBuffProfile)),
      assert(scalarBuffRequiresConcentration(SpiderClimbScalarBuffProfile)),
      assert(scalarBuffRequiresConcentration(FlyScalarBuffProfile)),
      assert(scalarBuffRequiresConcentration(HeroismScalarBuffProfile)),
      assert(not(scalarBuffRequiresConcentration(BarkskinScalarBuffProfile))),
      assert(not(scalarBuffRequiresConcentration(LongstriderScalarBuffProfile))),
    }
  }

  run test_damage_rider_spell_profiles_project_damage_dice_duration_and_concentration = {
    all {
      assert(damageRiderSpellAction(DivineFavorWeaponDamageRiderProfile) == BonusActionSpellInvocation),
      assert(damageRiderSpellAction(DivineSmiteAfterHitDamageProfile) == BonusActionSpellInvocation),
      assert(damageRiderRequiresConcentration(HuntersMarkMarkedDamageRiderProfile)),
      assert(damageRiderRequiresConcentration(EnsnaringStrikeAfterHitConditionProfile)),
      assert(damageRiderRequiresConcentration(ShiningSmiteAfterHitDamageIlluminationProfile)),
      assert(not(damageRiderRequiresConcentration(DivineFavorWeaponDamageRiderProfile))),
      assert(divineFavorDamageType == RadiantDamage),
      assert(divineFavorDurationTicks == 10),
      assert(divineSmiteDamageType == RadiantDamage),
      assert(divineSmiteDamageDice(1, false) == 2),
      assert(divineSmiteDamageDice(1, true) == 3),
      assert(divineSmiteDamageDice(3, true) == 5),
      assert(huntersMarkDamageType == ForceDamage),
      assert(huntersMarkRangeFeet == 90),
      assert(ensnaringStrikeDamageType == PiercingDamage),
      assert(ensnaringStrikeDamageDice(3) == 3),
      assert(ensnaringStrikeTargetHasSaveAdvantage(true)),
      assert(not(ensnaringStrikeTargetHasSaveAdvantage(false))),
      assert(searingSmiteDamageType == FireDamage),
      assert(searingSmiteDamageDice(3) == 3),
      assert(searingSmiteDurationTicks == 10),
      assert(shiningSmiteDamageType == RadiantDamage),
      assert(shiningSmiteDamageDice(1) == 0),
      assert(shiningSmiteDamageDice(3) == 3),
      assert(shiningSmiteBrightLightRadiusFeet == 5),
      assert(shiningSmiteDurationTicks == 10),
    }
  }

  run test_chained_spell_attack_damage_profile_projects_chromatic_orb_math = {
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
    val noDuplicateFaces = {
      face1: 1,
      face2: 1,
      face3: 1,
      face4: 0,
      face5: 0,
      face6: 0,
      face7: 0,
      face8: 0,
    }
    all {
      assert(chainedSpellAttackDamageChoices(ChromaticOrbChainedSpellAttackProfile).contains(ChainedSpellAttackLightningDamage)),
      assert(chainedSpellAttackDamageType(ChainedSpellAttackThunderDamage) == ThunderDamage),
      assert(chainedSpellAttackDamageBaseSpellLevel(ChromaticOrbChainedSpellAttackProfile) == 1),
      assert(chainedSpellAttackDamageDieSize(ChromaticOrbChainedSpellAttackProfile) == 8),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttackProfile, 1) == 3),
      assert(chainedSpellAttackDamageDice(ChromaticOrbChainedSpellAttackProfile, 3) == 5),
      assert(chainedSpellAttackD8FaceCountsMatchRolledDice(ChromaticOrbChainedSpellAttackProfile, 1, false, duplicateFaces)),
      assert(chainedSpellAttackDamageRollHasDuplicateD8Face(duplicateFaces)),
      assert(not(chainedSpellAttackDamageRollHasDuplicateD8Face(noDuplicateFaces))),
      assert(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttackProfile, 1, 0, false, duplicateFaces)),
      assert(not(chainedSpellAttackDamageCanLeap(ChromaticOrbChainedSpellAttackProfile, 1, 1, false, duplicateFaces))),
    }
  }

  run test_attack_burst_save_damage_profile_projects_ice_knife_facts = {
    all {
      assert(attackBurstSaveDamageRequiresSlot(IceKnifeAttackBurstSaveDamageProfile)),
      assert(attackBurstSaveDamageAttackType(IceKnifeAttackBurstSaveDamageProfile) == PiercingDamage),
      assert(attackBurstSaveDamageBurstType(IceKnifeAttackBurstSaveDamageProfile) == ColdDamage),
      assert(attackBurstSaveDamageBurstDice(IceKnifeAttackBurstSaveDamageProfile, 1) == 2),
      assert(attackBurstSaveDamageBurstDice(IceKnifeAttackBurstSaveDamageProfile, 3) == 4),
      assert(attackBurstSaveDamageBurstSuccessPolicy(IceKnifeAttackBurstSaveDamageProfile) == SpellNoDamageOnSuccessfulSave),
      assert(attackBurstSaveDamageProfileBurstAmount(IceKnifeAttackBurstSaveDamageProfile, 6, false) == 6),
      assert(attackBurstSaveDamageProfileBurstAmount(IceKnifeAttackBurstSaveDamageProfile, 6, true) == 0),
    }
  }

  run test_spell_attack_sequence_projects_supported_spell_facts = {
    all {
      assert(spellAttackSequenceDamageType(EldritchBlastBeamSequenceProfile) == ForceDamage),
      assert(spellAttackSequenceDamageType(ScorchingRaySequenceProfile) == FireDamage),
      assert(spellAttackSequenceSupportsObjectTargets(EldritchBlastBeamSequenceProfile)),
      assert(spellAttackSequenceSupportsObjectTargets(ScorchingRaySequenceProfile)),
      assert(spellAttackSequenceAttackCount(EldritchBlastBeamSequenceProfile, 1) == 1),
      assert(spellAttackSequenceAttackCount(EldritchBlastBeamSequenceProfile, 5) == 2),
      assert(spellAttackSequenceAttackCount(EldritchBlastBeamSequenceProfile, 11) == 3),
      assert(spellAttackSequenceAttackCount(EldritchBlastBeamSequenceProfile, 17) == 4),
      assert(spellAttackSequenceAttackCount(ScorchingRaySequenceProfile, 1) == 0),
      assert(spellAttackSequenceAttackCount(ScorchingRaySequenceProfile, 2) == 3),
      assert(spellAttackSequenceAttackCount(ScorchingRaySequenceProfile, 3) == 4),
      assert(spellAttackSequenceAttackCount(ScorchingRaySequenceProfile, 5) == 6),
      assert(spellAttackSequenceStep(EldritchBlastBeamSequenceProfile, false, 2, 0, 0, 0, 0) == SpellAttackSequenceUnavailable),
      assert(spellAttackSequenceStep(EldritchBlastBeamSequenceProfile, true, 2, 0, 0, 0, 0) == SpellAttackSequenceNeedsTargets),
      assert(spellAttackSequenceStep(EldritchBlastBeamSequenceProfile, true, 2, 2, 1, 0, 0) == SpellAttackSequenceNeedsAttackRoll),
      assert(spellAttackSequenceStep(EldritchBlastBeamSequenceProfile, true, 2, 2, 2, 2, 1) == SpellAttackSequenceNeedsDamageRoll),
      assert(spellAttackSequenceStep(EldritchBlastBeamSequenceProfile, true, 2, 2, 2, 1, 1) == SpellAttackSequenceComplete),
      assert(spellAttackSequenceStep(ScorchingRaySequenceProfile, true, 3, 0, 0, 0, 0) == SpellAttackSequenceNeedsTargets),
      assert(spellAttackSequenceStep(ScorchingRaySequenceProfile, true, 3, 3, 2, 0, 0) == SpellAttackSequenceNeedsAttackRoll),
      assert(spellAttackSequenceStep(ScorchingRaySequenceProfile, true, 3, 3, 3, 2, 1) == SpellAttackSequenceNeedsDamageRoll),
      assert(spellAttackSequenceStep(ScorchingRaySequenceProfile, true, 3, 3, 3, 1, 1) == SpellAttackSequenceComplete),
    }
  }

  run test_sleep_repeat_save_lifecycle_projects_pending_and_unconscious = {
    val pending = sleepInitialSaveLifecycle(false, true)
    val saved = sleepRepeatSaveLifecycle(pending, true, false)
    val unconscious = sleepRepeatSaveLifecycle(pending, false, false)
    all {
      assert(sleepSavingThrowAutomaticallySucceeds(true, false)),
      assert(sleepSavingThrowAutomaticallySucceeds(false, true)),
      assert(not(sleepSavingThrowAutomaticallySucceeds(false, false))),
      assert(sleepInitialSaveLifecycle(true, true) == NoSleepRepeatSaveLifecycle),
      assert(pending == PendingSleepRepeatSaveLifecycle({ hadIncapacitated: true })),
      assert(saved == NoSleepRepeatSaveLifecycle),
      assert(unconscious == UnconsciousSleepRepeatSaveLifecycle({
        hadIncapacitated: true,
        hadUnconscious: false,
      })),
      assert(sleepEffectEndsOnDamage),
      assert(sleepEffectEndsOnAdjacentShakeAwakeAction),
    }
  }

  run test_object_hit_point_damage_projects_threshold_and_destruction = {
    val destroyed = objectHitPointDamageResult({
      rolledDamage: 6,
      priorHitPoints: 5,
      damageThreshold: ObjectWithoutDamageThreshold,
    })
    val thresholdBlocked = objectHitPointDamageResult({
      rolledDamage: 6,
      priorHitPoints: 10,
      damageThreshold: ObjectWithDamageThreshold({ amount: 10 }),
    })
    val thresholdMet = objectHitPointDamageResult({
      rolledDamage: 10,
      priorHitPoints: 10,
      damageThreshold: ObjectWithDamageThreshold({ amount: 10 }),
    })
    all {
      assert(destroyed.effectiveDamage == 6),
      assert(destroyed.priorHitPoints == 5),
      assert(destroyed.nextHitPoints == 0),
      assert(destroyed.destroyed),
      assert(thresholdBlocked.effectiveDamage == 0),
      assert(thresholdBlocked.nextHitPoints == 10),
      assert(not(thresholdBlocked.destroyed)),
      assert(thresholdMet.effectiveDamage == 10),
      assert(thresholdMet.nextHitPoints == 0),
      assert(thresholdMet.destroyed),
    }
  }

  run test_spell_turn_hook_semantics_project_temporary_hit_points_and_duration = {
    all {
      assert(turnStartTemporaryHitPoints(2, 5) == 5),
      assert(turnStartTemporaryHitPoints(7, 5) == 7),
      assert(not(oncePerTurnSpellEffectUsedAtTurnStart)),
      assert(oneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn),
      assert(timedSpellEffectDurationAfterRoundTick(2) == 1),
      assert(timedSpellEffectDurationAfterRoundTick(1) == 0),
      assert(timedSpellEffectRemainsActive(1)),
      assert(not(timedSpellEffectRemainsActive(0))),
    }
  }

  run test_invalid_spell_targets_still_spend_resources_without_target_effect = {
    val facts = {
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: false,
      repeatedEffectCount: magicMissileDartCount(1),
    }
    val invocation = resolveRepeatedDamageAllocationInvocation(initialSpellcastingProcedureState, facts)
    all {
      assert(invocation.admitted),
      assert(invocation.slotExpended),
      assert(not(repeatedDamageAllocationInvocationCanAffectTargets(invocation, facts))),
    }
  }

  run test_second_slot_spell_in_same_turn_is_rejected = {
    val first = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: MageArmorSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    val second = resolveRepeatedDamageAllocationInvocation(first.state.with(
      "turn",
      first.state.turn.with("actionQuota", ActionAvailable)
    ), {
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
      repeatedEffectCount: magicMissileDartCount(1),
    })
    all {
      assert(first.admitted),
      assert(not(second.admitted)),
      assert(second.state == first.state.with("turn", first.state.turn.with("actionQuota", ActionAvailable))),
    }
  }

  run test_ray_of_frost_hit_deals_cold_damage_and_reduces_speed = {
    val result = resolveRayOfFrostEffect({
      attackRoll: {
        naturalD20: 12,
        total: 17,
        armorClass: 15,
        criticalThreshold: 20,
      },
      baseDamageDice: 1,
      rolledDamageDiceCount: 1,
      damageRoll: 6,
    })
    all {
      assert(result.damageAmount == 6),
      assert(result.damageType == ColdDamage),
      assert(result.effect == RayOfFrostSpeedReductionEffect),
    }
  }

  run test_ray_of_frost_critical_hit_requires_doubled_damage_dice = {
    val criticalResult = resolveRayOfFrostEffect({
      attackRoll: {
        naturalD20: 20,
        total: 1,
        armorClass: 30,
        criticalThreshold: 20,
      },
      baseDamageDice: 1,
      rolledDamageDiceCount: 2,
      damageRoll: 12,
    })
    val ordinaryDiceOnCritical = resolveRayOfFrostEffect({
      attackRoll: {
        naturalD20: 20,
        total: 1,
        armorClass: 30,
        criticalThreshold: 20,
      },
      baseDamageDice: 1,
      rolledDamageDiceCount: 1,
      damageRoll: 6,
    })
    all {
      assert(criticalResult.damageAmount == 12),
      assert(criticalResult.effect == RayOfFrostSpeedReductionEffect),
      assert(ordinaryDiceOnCritical.damageAmount == 0),
      assert(ordinaryDiceOnCritical.effect == NoSpellEffect),
    }
  }

  run test_ray_of_frost_rejects_damage_dice_above_cantrip_cap = {
    val result = resolveRayOfFrostEffect({
      attackRoll: {
        naturalD20: 12,
        total: 17,
        armorClass: 15,
        criticalThreshold: 20,
      },
      baseDamageDice: rayOfFrostMaximumBaseDamageDice + 1,
      rolledDamageDiceCount: rayOfFrostMaximumBaseDamageDice + 1,
      damageRoll: 5,
    })
    all {
      assert(result.damageAmount == 0),
      assert(result.damageType == ColdDamage),
      assert(result.effect == NoSpellEffect),
    }
  }

  run test_acid_splash_failed_dexterity_save_deals_acid_damage = {
    val result = resolveAcidSplashEffect({
      savingThrowFailed: true,
      damageRoll: 4,
    })
    all {
      assert(result.damageAmount == 4),
      assert(result.damageType == AcidDamage),
    }
  }

  run test_acid_splash_accepts_caller_supplied_area_target_count = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: AcidSplashSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 0,
      targetCount: 5,
      targetsAreValid: true,
    })
    all {
      assert(invocation.admitted),
      assert(not(invocation.slotExpended)),
    }
  }

  run test_direct_hit_point_restoration_spends_action_cost_and_recovers_hit_points = {
    val invocation = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: CureWoundsSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    val healing = resolveDirectHitPointRestorationEffect(
      {
        kind: PlayerCharacter,
        hitPoints: 0,
        hitPointMaximum: 12,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: true,
      },
      { successes: 1, failures: 1, stable: false, hpRegained: false },
      NoPositiveHitPointUnconsciousRecovery,
      {
        profile: CureWoundsHitPointRestorationProfile,
        slotLevel: 1,
        healingDiceRoll: 5,
        spellcastingAbilityModifier: 3,
      }
    )
    all {
      assert(invocation.admitted),
      assert(invocation.state.turn.actionQuota == ActionSpent),
      assert(healing.vitals.hitPoints == 8),
      assert(not(healing.vitals.unconscious)),
      assert(healing.deathSavingThrows == resetDeathSavingThrowLifecycle),
    }
  }

  run test_mass_cure_wounds_area_hit_point_restoration_facts = {
    val invocation = resolveSpellInvocation({
      turn: initialSpellcastingProcedureState.turn,
      slotLedger: { slotLevel: 5, slotsRemaining: 1 },
      slotSpellCastThisTurn: false,
    }, {
      profile: MassCureWoundsSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 5,
      targetCount: 6,
      targetsAreValid: true,
    })
    val healing = resolveDirectHitPointRestorationEffect(
      {
        kind: PlayerCharacter,
        hitPoints: 4,
        hitPointMaximum: 20,
        temporaryHitPoints: 0,
        dead: false,
        unconscious: false,
      },
      resetDeathSavingThrowLifecycle,
      NoPositiveHitPointUnconsciousRecovery,
      {
        profile: MassCureWoundsHitPointRestorationProfile,
        slotLevel: 5,
        healingDiceRoll: 25,
        spellcastingAbilityModifier: 3,
      }
    )
    all {
      assert(invocation.admitted),
      assert(invocation.state.turn.actionQuota == ActionSpent),
      assert(invocation.state.slotLedger.slotsRemaining == 0),
      assert(hitPointRestorationAreaProfile(MassCureWoundsHitPointRestorationProfile) == MassCureWoundsPointOriginSphereArea),
      assert(hitPointRestorationAreaProfile(CureWoundsHitPointRestorationProfile) == NoHitPointRestorationAreaProfile),
      assert(massCureWoundsPointOriginSphereRadiusFeet == 30),
      assert(healing.hitPointsRegained == 16),
      assert(healing.vitals.hitPoints == 20),
    }
  }

  run test_mage_armor_creates_persistent_effect_and_donning_armor_ends_it = {
    val facts = {
      willingTarget: true,
      targetWearingArmor: false,
      dexterityModifier: 2,
    }
    val result = resolveMageArmorDefensiveEffect(facts)
    all {
      assert(mageArmorTargetAdmitted(facts)),
      assert(mageArmorDexterityModifierInBounds(2)),
      assert(mageArmorBaseArmorClass(2) == 15),
      assert(result == MageArmorActiveDefensiveEffect({ baseArmorClass: 15 })),
      assert(mageArmorDefensiveEffectBaseArmorClass(result) == 15),
      assert(endMageArmorDefensiveEffectIfTargetDonsArmor(result, true) == NoMageArmorDefensiveEffect),
      assert(resolveMageArmorDefensiveEffect(facts.with("targetWearingArmor", true)) == NoMageArmorDefensiveEffect),
      assert(resolveMageArmorDefensiveEffect(facts.with("willingTarget", false)) == NoMageArmorDefensiveEffect),
      assert(resolveMageArmorDefensiveEffect(facts.with("dexterityModifier", 11)) == NoMageArmorDefensiveEffect),
    }
  }

  run test_readied_spell_response_holds_energy_then_releases_with_reaction = {
    val held = holdReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        profile: RayOfFrostSpellProfile,
        hasSpellAccess: true,
        selectedSlotLevel: 0,
        targetCount: 1,
        targetsAreValid: true,
      },
      true,
      true
    )
    val offered = offerReadiedSpellReaction(held.readiedSpell)
    val released = releaseReadiedSpellReaction(offered)
    all {
      assert(held.held),
      assert(not(held.slotExpended)),
      assert(held.spellcasting.turn.actionQuota == ActionSpent),
      assert(isHeldReadiedSpellEffect(held.readiedSpell.heldEffect)),
      assert(held.readiedSpell.reaction.concentration.reactor == Concentrating),
      assert(reactionWindowIsKind(offered.reaction.reactionWindow, ReadiedSpellReactionWindow)),
      assert(not(released.readiedSpell.reaction.reactor.turn.reactionAvailable)),
      assert(released.readiedSpell.reaction.concentration.reactor == NoConcentration),
      assert(released.readiedSpell.heldEffect == NoReadiedSpellHeldEffect),
      assert(released.readiedSpell.reaction.reactionWindow == NoReactionWindow),
      assert(released.released == ReleasedReadiedSpell({ profile: RayOfFrostSpellProfile })),
    }
  }

  run test_readied_spell_response_dissipates_if_concentration_breaks = {
    val held = holdRepeatedDamageAllocationReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        hasSpellAccess: true,
        selectedSlotLevel: 1,
        targetCount: 1,
        targetsAreValid: true,
        repeatedEffectCount: magicMissileDartCount(1),
      },
      true,
      true
    )
    val broken = held.readiedSpell.with(
      "reaction",
      held.readiedSpell.reaction.with(
        "concentration",
        endConcentration(held.readiedSpell.reaction.concentration, Reactor)
      )
    )
    val offered = offerReadiedSpellReaction(broken)
    val releaseResult = releaseReadiedSpellReaction(offered)
    all {
      assert(held.slotExpended),
      assert(held.spellcasting.slotLedger.slotsRemaining == 1),
      assert(isHeldReadiedSpellEffect(held.readiedSpell.heldEffect)),
      assert(broken.reaction.concentration.reactor == NoConcentration),
      assert(offered.heldEffect == NoReadiedSpellHeldEffect),
      assert(offered.reaction.reactionWindow == NoReactionWindow),
      assert(releaseResult.readiedSpell == offered),
      assert(releaseResult.released == NoReadiedSpellRelease),
    }
  }
}
