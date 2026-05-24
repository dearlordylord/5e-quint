// -*- mode: Bluespec; -*-

module battleRuntimeSpellBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import spellDefinitionProfiles.* from "../shared-algebras/proofs/rule-core/spell-definition-profiles"
  import spellInvocationActionSlotCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-action-slot-core"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"
  import spellInvocationTargetCardinalityCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core"
  import spellAttackDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-attack-damage-projection-core"
  import spellSaveDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-save-damage-projection-core"
  import spellSaveConditionProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-save-condition-projection-core"
  import spellScalarBuffProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-scalar-buff-projection-core"
  import spellProcedureProfiles.* from "../shared-algebras/proofs/rule-core/spell-procedure-profiles"

  type BattleRuntimeDirectHitPointRestorationProfile =
    | BattleRuntimeHealingWordRestoration
    | BattleRuntimeCureWoundsRestoration
    | BattleRuntimeMassHealingWordRestoration

  type BattleRuntimeSpellAttackDamageProfile =
    | BattleRuntimeRayOfFrostSpellAttack
    | BattleRuntimePoisonSpraySpellAttack
    | BattleRuntimeChillTouchSpellAttack
    | BattleRuntimeStarryWispSpellAttack
    | BattleRuntimeFireBoltSpellAttack
    | BattleRuntimeShockingGraspSpellAttack
    | BattleRuntimeGuidingBoltSpellAttack
    | BattleRuntimeRayOfSicknessSpellAttack
    | BattleRuntimeProduceFlameHurlSpellAttack

  type BattleRuntimeSpellAttackDamageHitEffect =
    | BattleRuntimeRayOfFrostSpeedReductionHitEffect
    | BattleRuntimeChillTouchHitPointRegainPreventionHitEffect
    | BattleRuntimeStarryWispInvisibleBenefitDeniedHitEffect
    | BattleRuntimeShockingGraspOpportunityAttackDeniedHitEffect
    | BattleRuntimeGuidingBoltNextAttackAdvantageHitEffect
    | BattleRuntimeRayOfSicknessPoisonedHitEffect

  type BattleRuntimeSaveGatedDamageProfile =
    | BattleRuntimeAcidSplashSaveDamage
    | BattleRuntimeSacredFlameSaveDamage
    | BattleRuntimeInflictWoundsSaveDamage
    | BattleRuntimeBurningHandsSaveDamage
    | BattleRuntimeFireballSaveDamage
    | BattleRuntimeLightningBoltSaveDamage
    | BattleRuntimeViciousMockerySaveDamage
    | BattleRuntimeThunderwaveSaveDamage
    | BattleRuntimeDissonantWhispersSaveDamage
    | BattleRuntimeHellishRebukeSaveDamage
    | BattleRuntimeMindSpikeSaveDamage

  type BattleRuntimeSaveGatedConditionProfile =
    | BattleRuntimeColorSpraySaveCondition
    | BattleRuntimeEntangleSaveCondition
    | BattleRuntimeAnimalFriendshipSaveCondition
    | BattleRuntimeCharmPersonSaveCondition
    | BattleRuntimeBlindnessDeafnessSaveCondition
    | BattleRuntimeHoldPersonSaveCondition
    | BattleRuntimeFaerieFireSaveAttackRollAdvantage

  type BattleRuntimeSaveGatedTargeting =
    | BattleRuntimeSingleSaveTarget
    | BattleRuntimeAreaSaveTargets
    | BattleRuntimeTargetListSaveTargets({
        minTargets: int,
        baseSlotLevel: int,
        baseTargets: int,
        additionalTargetsPerSlotLevel: int,
      })

  type BattleRuntimeSaveGatedDamageSuccess =
    | BattleRuntimeNoDamageOnSaveSuccess
    | BattleRuntimeHalfDamageOnSaveSuccess

  type BattleRuntimeSavingThrowAbility =
    | BattleRuntimeStrengthSavingThrow
    | BattleRuntimeDexteritySavingThrow
    | BattleRuntimeConstitutionSavingThrow
    | BattleRuntimeWisdomSavingThrow

  type BattleRuntimeSaveGatedFailedEffect =
    | BattleRuntimeViciousMockeryNextAttackDisadvantageEffect
    | BattleRuntimeThunderwavePush10FeetEffect
    | BattleRuntimeDissonantWhispersForcedReactionMovementEffect
    | BattleRuntimeColorSprayBlindedEffect
    | BattleRuntimeEntangleRestrainedEffect
    | BattleRuntimeAnimalFriendshipCharmedEffect({ durationTicks: int })
    | BattleRuntimeCharmPersonCharmedEffect({ durationTicks: int })
    | BattleRuntimeBlindnessDeafnessBlindedEffect({ durationTicks: int })
    | BattleRuntimeBlindnessDeafnessDeafenedEffect({ durationTicks: int })
    | BattleRuntimeHoldPersonParalyzedEffect({ durationTicks: int })
    | BattleRuntimeFaerieFireOutlineEffect

  type BattleRuntimeScalarBuffProfile =
    | BattleRuntimeFalseLifeScalarBuff
    | BattleRuntimeLongstriderScalarBuff
    | BattleRuntimeShieldOfFaithScalarBuff
    | BattleRuntimeSpiderClimbScalarBuff
    | BattleRuntimeFlyScalarBuff
    | BattleRuntimeBarkskinScalarBuff
    | BattleRuntimeHeroismScalarBuff
    | BattleRuntimeAidScalarBuff

  type BattleRuntimeScalarBuffEffect =
    | BattleRuntimeLongstriderSpeedIncreaseEffect
    | BattleRuntimeShieldOfFaithArmorClassBonusEffect
    | BattleRuntimeSpiderClimbClimbSpeedGrantEffect
    | BattleRuntimeFlySpeedHoverGrantEffect
    | BattleRuntimeBarkskinArmorClassFloorEffect
    | BattleRuntimeHeroismFrightenedImmunityEffect
    | BattleRuntimeHeroismTurnStartTemporaryHitPointsEffect({ amount: int })
    | BattleRuntimeAidHitPointMaximumIncreaseEffect({ amount: int })

  type BattleRuntimeDamageRiderSpellProfile =
    | BattleRuntimeDivineFavorWeaponDamageRider
    | BattleRuntimeDivineSmiteAfterHitDamage
    | BattleRuntimeHuntersMarkMarkedDamageRider
    | BattleRuntimeEnsnaringStrikeAfterHitCondition
    | BattleRuntimeSearingSmiteAfterHitTimedDamage
    | BattleRuntimeShiningSmiteAfterHitDamageIllumination

  type BattleRuntimeChainedSpellAttackDamageProfile =
    | BattleRuntimeChromaticOrbChainedSpellAttack

  type BattleRuntimeChainedSpellAttackDamageTypeChoice =
    | BattleRuntimeChainedSpellAttackAcidDamage
    | BattleRuntimeChainedSpellAttackColdDamage
    | BattleRuntimeChainedSpellAttackFireDamage
    | BattleRuntimeChainedSpellAttackLightningDamage
    | BattleRuntimeChainedSpellAttackPoisonDamage
    | BattleRuntimeChainedSpellAttackThunderDamage

  type BattleRuntimeAttackBurstSaveDamageProfile =
    | BattleRuntimeIceKnifeAttackBurstSaveDamage

  type BattleRuntimeSpellAttackSequenceProfile =
    | BattleRuntimeEldritchBlastBeamSequence
    | BattleRuntimeScorchingRaySequence

  type BattleRuntimeSpellAttackSequenceStep =
    | BattleRuntimeSpellAttackSequenceUnavailable
    | BattleRuntimeSpellAttackSequenceNeedsTargets
    | BattleRuntimeSpellAttackSequenceNeedsAttackRoll
    | BattleRuntimeSpellAttackSequenceNeedsDamageRoll
    | BattleRuntimeSpellAttackSequenceComplete

  type BattleRuntimeSorcerousBurstDamageTypeChoice =
    | BattleRuntimeSorcerousBurstAcidDamage
    | BattleRuntimeSorcerousBurstColdDamage
    | BattleRuntimeSorcerousBurstFireDamage
    | BattleRuntimeSorcerousBurstLightningDamage
    | BattleRuntimeSorcerousBurstPoisonDamage
    | BattleRuntimeSorcerousBurstPsychicDamage
    | BattleRuntimeSorcerousBurstThunderDamage

  type BattleRuntimeSleepRepeatSaveLifecycle =
    | BattleRuntimeNoSleepRepeatSaveLifecycle
    | BattleRuntimePendingSleepRepeatSaveLifecycle({ hadIncapacitated: bool })
    | BattleRuntimeUnconsciousSleepRepeatSaveLifecycle({
        hadIncapacitated: bool,
        hadUnconscious: bool,
      })

  type BattleRuntimeObjectHitPointDamageResult = {
    effectiveDamage: int,
    priorHitPoints: int,
    nextHitPoints: int,
    destroyed: bool,
  }

  pure def battleRuntimeDirectHitPointRestorationSpellProfile(
    profile: BattleRuntimeDirectHitPointRestorationProfile
  ): SpellDefinitionProfile =
    match profile {
      | BattleRuntimeHealingWordRestoration => HealingWordSpellProfile
      | BattleRuntimeCureWoundsRestoration => CureWoundsSpellProfile
      | BattleRuntimeMassHealingWordRestoration => MassHealingWordSpellProfile
    }

  pure def battleRuntimeDirectHitPointRestorationUsesBonusAction(
    profile: BattleRuntimeDirectHitPointRestorationProfile
  ): bool =
    spellProfileAction(battleRuntimeDirectHitPointRestorationSpellProfile(profile)) == BonusActionSpellInvocation

  pure def battleRuntimeDirectHitPointRestorationMaximumTargets(
    profile: BattleRuntimeDirectHitPointRestorationProfile,
    slotLevel: int
  ): int =
    if (legalSpellInvocationTargetCount(battleRuntimeDirectHitPointRestorationSpellProfile(profile), slotLevel, 6)) 6 else 1

  pure def battleRuntimeDirectHitPointRestorationHealing(
    healingRoll: int,
    spellcastingAbilityModifier: int
  ): int =
    healingRoll + spellcastingAbilityModifier

  pure def battleRuntimeSpellAttackDamageProfile(
    profile: BattleRuntimeSpellAttackDamageProfile
  ): SpellAttackDamageProfile =
    match profile {
      | BattleRuntimeRayOfFrostSpellAttack => RayOfFrostSpellAttackProfile
      | BattleRuntimePoisonSpraySpellAttack => PoisonSpraySpellAttackProfile
      | BattleRuntimeChillTouchSpellAttack => ChillTouchSpellAttackProfile
      | BattleRuntimeStarryWispSpellAttack => StarryWispSpellAttackProfile
      | BattleRuntimeFireBoltSpellAttack => FireBoltSpellAttackProfile
      | BattleRuntimeShockingGraspSpellAttack => ShockingGraspSpellAttackProfile
      | BattleRuntimeGuidingBoltSpellAttack => GuidingBoltSpellAttackProfile
      | BattleRuntimeRayOfSicknessSpellAttack => RayOfSicknessSpellAttackProfile
      | BattleRuntimeProduceFlameHurlSpellAttack => ProduceFlameHurlSpellAttackProfile
    }

  pure def battleRuntimeSpellAttackDamageType(
    profile: BattleRuntimeSpellAttackDamageProfile
  ): RuleDamageType =
    spellAttackDamageProfileDamageType(battleRuntimeSpellAttackDamageProfile(profile))

  pure def battleRuntimeSpellAttackDamageHitEffect(
    effect: SpellAttackDamageHitEffect
  ): BattleRuntimeSpellAttackDamageHitEffect =
    match effect {
      | RayOfFrostSpeedReductionHitEffect => BattleRuntimeRayOfFrostSpeedReductionHitEffect
      | ChillTouchHitPointRegainPreventionHitEffect => BattleRuntimeChillTouchHitPointRegainPreventionHitEffect
      | StarryWispInvisibleBenefitDeniedHitEffect => BattleRuntimeStarryWispInvisibleBenefitDeniedHitEffect
      | ShockingGraspOpportunityAttackDeniedHitEffect => BattleRuntimeShockingGraspOpportunityAttackDeniedHitEffect
      | GuidingBoltNextAttackAdvantageHitEffect => BattleRuntimeGuidingBoltNextAttackAdvantageHitEffect
      | RayOfSicknessPoisonedHitEffect => BattleRuntimeRayOfSicknessPoisonedHitEffect
    }

  pure def battleRuntimeSpellAttackDamageHitEffects(
    profile: BattleRuntimeSpellAttackDamageProfile
  ): Set[BattleRuntimeSpellAttackDamageHitEffect] =
    spellAttackDamageProfileHitEffects(battleRuntimeSpellAttackDamageProfile(profile))
      .map(battleRuntimeSpellAttackDamageHitEffect)

  pure def battleRuntimeSpellAttackDamageSupportsObjectTarget(
    profile: BattleRuntimeSpellAttackDamageProfile
  ): bool =
    spellAttackDamageProfileSupportsObjectTarget(battleRuntimeSpellAttackDamageProfile(profile))

  pure def battleRuntimeSaveGatedDamageProfile(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): SpellSaveGatedDamageProfile =
    match profile {
      | BattleRuntimeAcidSplashSaveDamage => AcidSplashSaveDamageProfile
      | BattleRuntimeSacredFlameSaveDamage => SacredFlameSaveDamageProfile
      | BattleRuntimeInflictWoundsSaveDamage => InflictWoundsSaveDamageProfile
      | BattleRuntimeBurningHandsSaveDamage => BurningHandsSaveDamageProfile
      | BattleRuntimeFireballSaveDamage => FireballSaveDamageProfile
      | BattleRuntimeLightningBoltSaveDamage => LightningBoltSaveDamageProfile
      | BattleRuntimeViciousMockerySaveDamage => ViciousMockerySaveDamageProfile
      | BattleRuntimeThunderwaveSaveDamage => ThunderwaveSaveDamageProfile
      | BattleRuntimeDissonantWhispersSaveDamage => DissonantWhispersSaveDamageProfile
      | BattleRuntimeHellishRebukeSaveDamage => HellishRebukeSaveDamageProfile
      | BattleRuntimeMindSpikeSaveDamage => MindSpikeSaveDamageProfile
    }

  pure def battleRuntimeSaveGatedConditionProfile(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): SpellSaveGatedConditionProfile =
    match profile {
      | BattleRuntimeColorSpraySaveCondition => ColorSpraySaveConditionProfile
      | BattleRuntimeEntangleSaveCondition => EntangleSaveConditionProfile
      | BattleRuntimeAnimalFriendshipSaveCondition => AnimalFriendshipSaveConditionProfile
      | BattleRuntimeCharmPersonSaveCondition => CharmPersonSaveConditionProfile
      | BattleRuntimeBlindnessDeafnessSaveCondition => BlindnessDeafnessSaveConditionProfile
      | BattleRuntimeHoldPersonSaveCondition => HoldPersonSaveConditionProfile
      | BattleRuntimeFaerieFireSaveAttackRollAdvantage => FaerieFireSaveAttackRollAdvantageProfile
    }

  pure def battleRuntimeSaveGatedTargeting(
    targeting: SpellSaveGatedTargeting
  ): BattleRuntimeSaveGatedTargeting =
    match targeting {
      | SpellSingleSaveTarget => BattleRuntimeSingleSaveTarget
      | SpellAreaSaveTargets => BattleRuntimeAreaSaveTargets
      | SpellTargetListSaveTargets(data) => BattleRuntimeTargetListSaveTargets(data)
    }

  pure def battleRuntimeSaveGatedDamageTargeting(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): BattleRuntimeSaveGatedTargeting =
    battleRuntimeSaveGatedTargeting(
      spellSaveGatedDamageTargeting(battleRuntimeSaveGatedDamageProfile(profile))
    )

  pure def battleRuntimeSaveGatedConditionTargeting(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): BattleRuntimeSaveGatedTargeting =
    battleRuntimeSaveGatedTargeting(
      spellSaveGatedConditionTargeting(battleRuntimeSaveGatedConditionProfile(profile))
    )

  pure def battleRuntimeSavingThrowAbility(ability: SpellSavingThrowAbility): BattleRuntimeSavingThrowAbility =
    match ability {
      | SpellStrengthSavingThrow => BattleRuntimeStrengthSavingThrow
      | SpellDexteritySavingThrow => BattleRuntimeDexteritySavingThrow
      | SpellConstitutionSavingThrow => BattleRuntimeConstitutionSavingThrow
      | SpellWisdomSavingThrow => BattleRuntimeWisdomSavingThrow
    }

  pure def battleRuntimeSaveGatedConditionSavingThrowAbility(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): BattleRuntimeSavingThrowAbility =
    battleRuntimeSavingThrowAbility(
      spellSaveGatedConditionSavingThrowAbility(battleRuntimeSaveGatedConditionProfile(profile))
    )

  pure def battleRuntimeSaveGatedTargetMaxTargets(
    targeting: BattleRuntimeSaveGatedTargeting,
    slotLevel: int
  ): int =
    match targeting {
      | BattleRuntimeSingleSaveTarget => 1
      | BattleRuntimeAreaSaveTargets => 1
      | BattleRuntimeTargetListSaveTargets(data) =>
        spellSaveGatedTargetMaxTargets(SpellTargetListSaveTargets(data), slotLevel)
    }

  pure def battleRuntimeSaveGatedDamageSuccess(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): BattleRuntimeSaveGatedDamageSuccess =
    match spellSaveGatedDamageSuccess(battleRuntimeSaveGatedDamageProfile(profile)) {
      | SpellNoDamageOnSaveSuccess => BattleRuntimeNoDamageOnSaveSuccess
      | SpellHalfDamageOnSaveSuccess => BattleRuntimeHalfDamageOnSaveSuccess
    }

  pure def battleRuntimeSaveGatedDamageType(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): RuleDamageType =
    spellSaveGatedDamageType(battleRuntimeSaveGatedDamageProfile(profile))

  pure def battleRuntimeSaveGatedDamageRequiresSlot(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): bool =
    spellSaveGatedDamageRequiresSlot(battleRuntimeSaveGatedDamageProfile(profile))

  pure def battleRuntimeSaveGatedDamageRequiresConcentration(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): bool =
    spellSaveGatedDamageRequiresConcentration(battleRuntimeSaveGatedDamageProfile(profile))

  pure def battleRuntimeSaveGatedDamageFailedEffect(
    effect: SpellSaveGatedDamageFailedEffect
  ): BattleRuntimeSaveGatedFailedEffect =
    match effect {
      | ViciousMockeryNextAttackDisadvantageEffect => BattleRuntimeViciousMockeryNextAttackDisadvantageEffect
      | ThunderwavePush10FeetEffect => BattleRuntimeThunderwavePush10FeetEffect
      | DissonantWhispersForcedReactionMovementEffect => BattleRuntimeDissonantWhispersForcedReactionMovementEffect
    }

  pure def battleRuntimeSaveGatedConditionFailedEffect(
    effect: SpellSaveGatedConditionFailedEffect
  ): BattleRuntimeSaveGatedFailedEffect =
    match effect {
      | ColorSprayBlindedEffect => BattleRuntimeColorSprayBlindedEffect
      | EntangleRestrainedEffect => BattleRuntimeEntangleRestrainedEffect
      | AnimalFriendshipCharmedEffect(data) => BattleRuntimeAnimalFriendshipCharmedEffect({ durationTicks: data.durationTicks })
      | CharmPersonCharmedEffect(data) => BattleRuntimeCharmPersonCharmedEffect({ durationTicks: data.durationTicks })
      | BlindnessDeafnessBlindedEffect(data) => BattleRuntimeBlindnessDeafnessBlindedEffect({ durationTicks: data.durationTicks })
      | BlindnessDeafnessDeafenedEffect(data) => BattleRuntimeBlindnessDeafnessDeafenedEffect({ durationTicks: data.durationTicks })
      | HoldPersonParalyzedEffect(data) => BattleRuntimeHoldPersonParalyzedEffect({ durationTicks: data.durationTicks })
      | FaerieFireOutlineEffect => BattleRuntimeFaerieFireOutlineEffect
    }

  pure def battleRuntimeSaveGatedDamageFailedSaveEffects(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): Set[BattleRuntimeSaveGatedFailedEffect] =
    spellSaveGatedDamageFailedSaveEffects(battleRuntimeSaveGatedDamageProfile(profile))
      .map(battleRuntimeSaveGatedDamageFailedEffect)

  pure def battleRuntimeSaveGatedConditionFailedSaveEffects(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): Set[BattleRuntimeSaveGatedFailedEffect] =
    spellSaveGatedConditionFailedSaveEffects(battleRuntimeSaveGatedConditionProfile(profile))
      .map(battleRuntimeSaveGatedConditionFailedEffect)

  pure def battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(
    profile: BattleRuntimeSaveGatedConditionProfile,
    targetIsBeast: bool,
    targetIsHumanoid: bool
  ): bool =
    spellSaveGatedConditionTargetCreatureTypeIsLegal(
      battleRuntimeSaveGatedConditionProfile(profile),
      targetIsBeast,
      targetIsHumanoid,
    )

  pure def battleRuntimeSaveGatedConditionSavingThrowHasAdvantage(
    profile: BattleRuntimeSaveGatedConditionProfile,
    targetIsHostile: bool
  ): bool =
    spellSaveGatedConditionSavingThrowHasAdvantage(
      battleRuntimeSaveGatedConditionProfile(profile),
      targetIsHostile,
    )

  pure def battleRuntimeScalarBuffProfile(
    profile: BattleRuntimeScalarBuffProfile
  ): ScalarBuffSpellProfile =
    match profile {
      | BattleRuntimeFalseLifeScalarBuff => FalseLifeScalarBuffProfile
      | BattleRuntimeLongstriderScalarBuff => LongstriderScalarBuffProfile
      | BattleRuntimeShieldOfFaithScalarBuff => ShieldOfFaithScalarBuffProfile
      | BattleRuntimeSpiderClimbScalarBuff => SpiderClimbScalarBuffProfile
      | BattleRuntimeFlyScalarBuff => FlyScalarBuffProfile
      | BattleRuntimeBarkskinScalarBuff => BarkskinScalarBuffProfile
      | BattleRuntimeHeroismScalarBuff => HeroismScalarBuffProfile
      | BattleRuntimeAidScalarBuff => AidScalarBuffProfile
    }

  pure def battleRuntimeScalarBuffUsesBonusAction(profile: BattleRuntimeScalarBuffProfile): bool =
    scalarBuffSpellAction(battleRuntimeScalarBuffProfile(profile)) == BonusActionSpellInvocation

  pure def battleRuntimeScalarBuffMaximumTargets(profile: BattleRuntimeScalarBuffProfile, slotLevel: int): int =
    scalarBuffMaximumTargets(battleRuntimeScalarBuffProfile(profile), slotLevel)

  pure def battleRuntimeScalarBuffTemporaryHitPoints(
    profile: BattleRuntimeScalarBuffProfile,
    slotLevel: int,
    rolledDice: int
  ): int =
    scalarBuffTemporaryHitPoints(battleRuntimeScalarBuffProfile(profile), slotLevel, rolledDice)

  pure def battleRuntimeScalarBuffEffect(effect: ScalarBuffEffect): BattleRuntimeScalarBuffEffect =
    match effect {
      | LongstriderSpeedIncreaseEffect => BattleRuntimeLongstriderSpeedIncreaseEffect
      | ShieldOfFaithArmorClassBonusEffect => BattleRuntimeShieldOfFaithArmorClassBonusEffect
      | SpiderClimbClimbSpeedGrantEffect => BattleRuntimeSpiderClimbClimbSpeedGrantEffect
      | FlySpeedHoverGrantEffect => BattleRuntimeFlySpeedHoverGrantEffect
      | BarkskinArmorClassFloorEffect => BattleRuntimeBarkskinArmorClassFloorEffect
      | HeroismFrightenedImmunityEffect => BattleRuntimeHeroismFrightenedImmunityEffect
      | HeroismTurnStartTemporaryHitPointsEffect(data) => BattleRuntimeHeroismTurnStartTemporaryHitPointsEffect(data)
      | AidHitPointMaximumIncreaseEffect(data) => BattleRuntimeAidHitPointMaximumIncreaseEffect(data)
    }

  pure def battleRuntimeScalarBuffEffects(
    profile: BattleRuntimeScalarBuffProfile,
    spellcastingAbilityModifier: int,
    slotLevel: int,
  ): Set[BattleRuntimeScalarBuffEffect] =
    scalarBuffEffects(battleRuntimeScalarBuffProfile(profile), spellcastingAbilityModifier, slotLevel)
      .map(battleRuntimeScalarBuffEffect)

  pure def battleRuntimeScalarBuffRequiresConcentration(profile: BattleRuntimeScalarBuffProfile): bool =
    scalarBuffRequiresConcentration(battleRuntimeScalarBuffProfile(profile))

  pure def battleRuntimeDamageRiderSpellProfile(
    profile: BattleRuntimeDamageRiderSpellProfile
  ): DamageRiderSpellProfile =
    match profile {
      | BattleRuntimeDivineFavorWeaponDamageRider => DivineFavorWeaponDamageRiderProfile
      | BattleRuntimeDivineSmiteAfterHitDamage => DivineSmiteAfterHitDamageProfile
      | BattleRuntimeHuntersMarkMarkedDamageRider => HuntersMarkMarkedDamageRiderProfile
      | BattleRuntimeEnsnaringStrikeAfterHitCondition => EnsnaringStrikeAfterHitConditionProfile
      | BattleRuntimeSearingSmiteAfterHitTimedDamage => SearingSmiteAfterHitTimedDamageProfile
      | BattleRuntimeShiningSmiteAfterHitDamageIllumination => ShiningSmiteAfterHitDamageIlluminationProfile
    }

  pure def battleRuntimeDamageRiderUsesBonusAction(profile: BattleRuntimeDamageRiderSpellProfile): bool =
    damageRiderSpellAction(battleRuntimeDamageRiderSpellProfile(profile)) == BonusActionSpellInvocation

  pure def battleRuntimeDamageRiderRequiresConcentration(profile: BattleRuntimeDamageRiderSpellProfile): bool =
    damageRiderRequiresConcentration(battleRuntimeDamageRiderSpellProfile(profile))

  pure def battleRuntimeDivineFavorDamageType: RuleDamageType = divineFavorDamageType

  pure def battleRuntimeDivineFavorDurationTicks: int = divineFavorDurationTicks

  pure def battleRuntimeDivineSmiteDamageType: RuleDamageType = divineSmiteDamageType

  pure def battleRuntimeDivineSmiteDamageDice(slotLevel: int, targetFiendOrUndead: bool): int =
    divineSmiteDamageDice(slotLevel, targetFiendOrUndead)

  pure def battleRuntimeHuntersMarkDamageType: RuleDamageType = huntersMarkDamageType

  pure def battleRuntimeHuntersMarkRangeFeet: int = huntersMarkRangeFeet

  pure def battleRuntimeEnsnaringStrikeDamageType: RuleDamageType = ensnaringStrikeDamageType

  pure def battleRuntimeEnsnaringStrikeDamageDice(slotLevel: int): int =
    ensnaringStrikeDamageDice(slotLevel)

  pure def battleRuntimeEnsnaringStrikeTargetHasSaveAdvantage(targetLargeOrLarger: bool): bool =
    ensnaringStrikeTargetHasSaveAdvantage(targetLargeOrLarger)

  pure def battleRuntimeSearingSmiteDamageType: RuleDamageType = searingSmiteDamageType

  pure def battleRuntimeSearingSmiteDamageDice(slotLevel: int): int =
    searingSmiteDamageDice(slotLevel)

  pure def battleRuntimeSearingSmiteDurationTicks: int = searingSmiteDurationTicks

  pure def battleRuntimeShiningSmiteDamageType: RuleDamageType = shiningSmiteDamageType

  pure def battleRuntimeShiningSmiteDamageDice(slotLevel: int): int =
    shiningSmiteDamageDice(slotLevel)

  pure def battleRuntimeShiningSmiteBrightLightRadiusFeet: int =
    shiningSmiteBrightLightRadiusFeet

  pure def battleRuntimeShiningSmiteDurationTicks: int =
    shiningSmiteDurationTicks

  pure def battleRuntimeChainedSpellAttackDamageProfile(
    profile: BattleRuntimeChainedSpellAttackDamageProfile
  ): ChainedSpellAttackDamageProfile =
    match profile {
      | BattleRuntimeChromaticOrbChainedSpellAttack => ChromaticOrbChainedSpellAttackProfile
    }

  pure def battleRuntimeChainedSpellAttackDamageChoice(
    choice: ChainedSpellAttackDamageTypeChoice
  ): BattleRuntimeChainedSpellAttackDamageTypeChoice =
    match choice {
      | ChainedSpellAttackAcidDamage => BattleRuntimeChainedSpellAttackAcidDamage
      | ChainedSpellAttackColdDamage => BattleRuntimeChainedSpellAttackColdDamage
      | ChainedSpellAttackFireDamage => BattleRuntimeChainedSpellAttackFireDamage
      | ChainedSpellAttackLightningDamage => BattleRuntimeChainedSpellAttackLightningDamage
      | ChainedSpellAttackPoisonDamage => BattleRuntimeChainedSpellAttackPoisonDamage
      | ChainedSpellAttackThunderDamage => BattleRuntimeChainedSpellAttackThunderDamage
    }

  pure def battleRuntimeChainedSpellAttackDamageChoices(
    profile: BattleRuntimeChainedSpellAttackDamageProfile
  ): Set[BattleRuntimeChainedSpellAttackDamageTypeChoice] =
    chainedSpellAttackDamageChoices(battleRuntimeChainedSpellAttackDamageProfile(profile))
      .map(battleRuntimeChainedSpellAttackDamageChoice)

  pure def battleRuntimeChainedSpellAttackDamageType(
    choice: BattleRuntimeChainedSpellAttackDamageTypeChoice
  ): RuleDamageType =
    match choice {
      | BattleRuntimeChainedSpellAttackAcidDamage => chainedSpellAttackDamageType(ChainedSpellAttackAcidDamage)
      | BattleRuntimeChainedSpellAttackColdDamage => chainedSpellAttackDamageType(ChainedSpellAttackColdDamage)
      | BattleRuntimeChainedSpellAttackFireDamage => chainedSpellAttackDamageType(ChainedSpellAttackFireDamage)
      | BattleRuntimeChainedSpellAttackLightningDamage => chainedSpellAttackDamageType(ChainedSpellAttackLightningDamage)
      | BattleRuntimeChainedSpellAttackPoisonDamage => chainedSpellAttackDamageType(ChainedSpellAttackPoisonDamage)
      | BattleRuntimeChainedSpellAttackThunderDamage => chainedSpellAttackDamageType(ChainedSpellAttackThunderDamage)
    }

  pure def battleRuntimeChainedSpellAttackDamageBaseSpellLevel(profile: BattleRuntimeChainedSpellAttackDamageProfile): int =
    chainedSpellAttackDamageBaseSpellLevel(battleRuntimeChainedSpellAttackDamageProfile(profile))

  pure def battleRuntimeChainedSpellAttackDamageDieSize(profile: BattleRuntimeChainedSpellAttackDamageProfile): int =
    chainedSpellAttackDamageDieSize(battleRuntimeChainedSpellAttackDamageProfile(profile))

  pure def battleRuntimeChainedSpellAttackDamageSlotLevelIsLegal(profile: BattleRuntimeChainedSpellAttackDamageProfile, slotLevel: int): bool =
    chainedSpellAttackDamageSlotLevelIsLegal(battleRuntimeChainedSpellAttackDamageProfile(profile), slotLevel)

  pure def battleRuntimeChainedSpellAttackDamageLeapCountIsLegal(
    profile: BattleRuntimeChainedSpellAttackDamageProfile,
    slotLevel: int,
    leapsUsed: int
  ): bool =
    chainedSpellAttackDamageLeapCountIsLegal(battleRuntimeChainedSpellAttackDamageProfile(profile), slotLevel, leapsUsed)

  pure def battleRuntimeChainedSpellAttackDamageDice(profile: BattleRuntimeChainedSpellAttackDamageProfile, slotLevel: int): int =
    chainedSpellAttackDamageDice(battleRuntimeChainedSpellAttackDamageProfile(profile), slotLevel)

  pure def battleRuntimeChainedSpellAttackDamageRolledD8Count(
    profile: BattleRuntimeChainedSpellAttackDamageProfile,
    slotLevel: int,
    criticalHit: bool
  ): int =
    chainedSpellAttackDamageRolledD8Count(battleRuntimeChainedSpellAttackDamageProfile(profile), slotLevel, criticalHit)

  pure def battleRuntimeD8FaceCountTotal(counts: ChainedSpellAttackD8FaceCounts): int =
    chainedSpellAttackD8FaceCountTotal(counts)

  pure def battleRuntimeD8FaceCountsAreNonNegative(counts: ChainedSpellAttackD8FaceCounts): bool =
    chainedSpellAttackD8FaceCountsAreNonNegative(counts)

  pure def battleRuntimeD8FaceCountsMatchRolledDice(
    profile: BattleRuntimeChainedSpellAttackDamageProfile,
    slotLevel: int,
    criticalHit: bool,
    counts: ChainedSpellAttackD8FaceCounts
  ): bool =
    chainedSpellAttackD8FaceCountsMatchRolledDice(
      battleRuntimeChainedSpellAttackDamageProfile(profile),
      slotLevel,
      criticalHit,
      counts,
    )

  pure def battleRuntimeDamageRollHasDuplicateD8Face(counts: ChainedSpellAttackD8FaceCounts): bool =
    chainedSpellAttackDamageRollHasDuplicateD8Face(counts)

  pure def battleRuntimeChainedSpellAttackDamageCanLeap(
    profile: BattleRuntimeChainedSpellAttackDamageProfile,
    slotLevel: int,
    leapsUsed: int,
    criticalHit: bool,
    counts: ChainedSpellAttackD8FaceCounts
  ): bool =
    chainedSpellAttackDamageCanLeap(
      battleRuntimeChainedSpellAttackDamageProfile(profile),
      slotLevel,
      leapsUsed,
      criticalHit,
      counts,
    )

  pure def battleRuntimeAttackBurstSaveDamageProfile(
    profile: BattleRuntimeAttackBurstSaveDamageProfile
  ): AttackBurstSaveDamageProfile =
    match profile {
      | BattleRuntimeIceKnifeAttackBurstSaveDamage => IceKnifeAttackBurstSaveDamageProfile
    }

  pure def battleRuntimeAttackBurstSaveDamageRequiresSlot(profile: BattleRuntimeAttackBurstSaveDamageProfile): bool =
    attackBurstSaveDamageRequiresSlot(battleRuntimeAttackBurstSaveDamageProfile(profile))

  pure def battleRuntimeAttackBurstSaveDamageAttackType(profile: BattleRuntimeAttackBurstSaveDamageProfile): RuleDamageType =
    attackBurstSaveDamageAttackType(battleRuntimeAttackBurstSaveDamageProfile(profile))

  pure def battleRuntimeAttackBurstSaveDamageBurstType(profile: BattleRuntimeAttackBurstSaveDamageProfile): RuleDamageType =
    attackBurstSaveDamageBurstType(battleRuntimeAttackBurstSaveDamageProfile(profile))

  pure def battleRuntimeAttackBurstSaveDamageBurstDice(profile: BattleRuntimeAttackBurstSaveDamageProfile, slotLevel: int): int =
    attackBurstSaveDamageBurstDice(battleRuntimeAttackBurstSaveDamageProfile(profile), slotLevel)

  pure def battleRuntimeAttackBurstSaveDamageBurstAmount(damageRoll: int, savingThrowSucceeded: bool): int =
    attackBurstSaveDamageBurstAmount(damageRoll, savingThrowSucceeded)

  pure def battleRuntimeSpellAttackSequenceProfile(
    profile: BattleRuntimeSpellAttackSequenceProfile
  ): SpellAttackSequenceProfile =
    match profile {
      | BattleRuntimeEldritchBlastBeamSequence => EldritchBlastBeamSequenceProfile
      | BattleRuntimeScorchingRaySequence => ScorchingRaySequenceProfile
    }

  pure def battleRuntimeSpellAttackSequenceStep(
    step: SpellAttackSequenceStep
  ): BattleRuntimeSpellAttackSequenceStep =
    match step {
      | SpellAttackSequenceUnavailable => BattleRuntimeSpellAttackSequenceUnavailable
      | SpellAttackSequenceNeedsTargets => BattleRuntimeSpellAttackSequenceNeedsTargets
      | SpellAttackSequenceNeedsAttackRoll => BattleRuntimeSpellAttackSequenceNeedsAttackRoll
      | SpellAttackSequenceNeedsDamageRoll => BattleRuntimeSpellAttackSequenceNeedsDamageRoll
      | SpellAttackSequenceComplete => BattleRuntimeSpellAttackSequenceComplete
    }

  pure def battleRuntimeSpellAttackSequenceDamageType(
    profile: BattleRuntimeSpellAttackSequenceProfile
  ): RuleDamageType =
    spellAttackSequenceDamageType(battleRuntimeSpellAttackSequenceProfile(profile))

  pure def battleRuntimeSpellAttackSequenceSupportsObjectTargets(
    profile: BattleRuntimeSpellAttackSequenceProfile
  ): bool =
    spellAttackSequenceSupportsObjectTargets(battleRuntimeSpellAttackSequenceProfile(profile))

  pure def battleRuntimeSpellAttackSequenceAttackCount(
    profile: BattleRuntimeSpellAttackSequenceProfile,
    scalingLevel: int
  ): int =
    spellAttackSequenceAttackCount(battleRuntimeSpellAttackSequenceProfile(profile), scalingLevel)

  pure def battleRuntimeSpellAttackSequenceNextStep(
    profile: BattleRuntimeSpellAttackSequenceProfile,
    canCastSpells: bool,
    attackCount: int,
    targetsFilled: int,
    attackRollsFilled: int,
    hits: int,
    damageRollsFilled: int,
  ): BattleRuntimeSpellAttackSequenceStep =
    battleRuntimeSpellAttackSequenceStep(
      spellAttackSequenceStep(
        battleRuntimeSpellAttackSequenceProfile(profile),
        canCastSpells,
        attackCount,
        targetsFilled,
        attackRollsFilled,
        hits,
        damageRollsFilled,
      )
    )

  pure def battleRuntimeSorcerousBurstDamageTypeChoices: Set[BattleRuntimeSorcerousBurstDamageTypeChoice] =
    Set(
      BattleRuntimeSorcerousBurstAcidDamage,
      BattleRuntimeSorcerousBurstColdDamage,
      BattleRuntimeSorcerousBurstFireDamage,
      BattleRuntimeSorcerousBurstLightningDamage,
      BattleRuntimeSorcerousBurstPoisonDamage,
      BattleRuntimeSorcerousBurstPsychicDamage,
      BattleRuntimeSorcerousBurstThunderDamage,
    )

  pure def battleRuntimeSorcerousBurstDamageType(
    choice: BattleRuntimeSorcerousBurstDamageTypeChoice
  ): RuleDamageType =
    match choice {
      | BattleRuntimeSorcerousBurstAcidDamage => AcidDamage
      | BattleRuntimeSorcerousBurstColdDamage => ColdDamage
      | BattleRuntimeSorcerousBurstFireDamage => FireDamage
      | BattleRuntimeSorcerousBurstLightningDamage => LightningDamage
      | BattleRuntimeSorcerousBurstPoisonDamage => PoisonDamage
      | BattleRuntimeSorcerousBurstPsychicDamage => PsychicDamage
      | BattleRuntimeSorcerousBurstThunderDamage => ThunderDamage
    }

  pure def battleRuntimeSorcerousBurstBaseDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 4
    else if (characterLevel >= 11) 3
    else if (characterLevel >= 5) 2
    else 1

  pure def battleRuntimeSorcerousBurstMaximumAdditionalDice(spellcastingAbilityModifier: int): int =
    if (spellcastingAbilityModifier > 0) spellcastingAbilityModifier else 0

  pure def battleRuntimeSorcerousBurstCanRollAdditionalD8(
    maximumD8sRolledSoFar: int,
    spellcastingAbilityModifier: int,
    additionalDiceAlreadyAdded: int,
  ): bool =
    all {
      maximumD8sRolledSoFar >= 0,
      additionalDiceAlreadyAdded >= 0,
      additionalDiceAlreadyAdded < battleRuntimeSorcerousBurstMaximumAdditionalDice(spellcastingAbilityModifier),
      additionalDiceAlreadyAdded < maximumD8sRolledSoFar,
    }

  pure def battleRuntimeSleepRepeatSaveLifecycle(
    lifecycle: SleepRepeatSaveLifecycle
  ): BattleRuntimeSleepRepeatSaveLifecycle =
    match lifecycle {
      | NoSleepRepeatSaveLifecycle => BattleRuntimeNoSleepRepeatSaveLifecycle
      | PendingSleepRepeatSaveLifecycle(data) => BattleRuntimePendingSleepRepeatSaveLifecycle(data)
      | UnconsciousSleepRepeatSaveLifecycle(data) => BattleRuntimeUnconsciousSleepRepeatSaveLifecycle(data)
    }

  pure def battleRuntimeSleepInitialSaveLifecycle(
    savingThrowSucceeded: bool,
    hadIncapacitated: bool,
  ): BattleRuntimeSleepRepeatSaveLifecycle =
    battleRuntimeSleepRepeatSaveLifecycle(
      sleepInitialSaveLifecycle(savingThrowSucceeded, hadIncapacitated)
    )

  pure def battleRuntimeSleepSavingThrowAutomaticallySucceeds(
    targetDoesNotSleep: bool,
    targetHasExhaustionImmunity: bool,
  ): bool =
    sleepSavingThrowAutomaticallySucceeds(targetDoesNotSleep, targetHasExhaustionImmunity)

  pure def battleRuntimeSleepRepeatSaveLifecycleAfterSave(
    lifecycle: BattleRuntimeSleepRepeatSaveLifecycle,
    savingThrowSucceeded: bool,
    hadUnconscious: bool,
  ): BattleRuntimeSleepRepeatSaveLifecycle =
    match lifecycle {
      | BattleRuntimePendingSleepRepeatSaveLifecycle(data) =>
          battleRuntimeSleepRepeatSaveLifecycle(
            sleepRepeatSaveLifecycle(
              PendingSleepRepeatSaveLifecycle(data),
              savingThrowSucceeded,
              hadUnconscious,
            )
          )
      | _ => lifecycle
    }

  pure def battleRuntimeSleepEffectEndsOnDamage: bool =
    sleepEffectEndsOnDamage

  pure def battleRuntimeSleepEffectEndsOnAdjacentShakeAwakeAction: bool =
    sleepEffectEndsOnAdjacentShakeAwakeAction

  pure def battleRuntimeObjectHitPointDamageResult(
    damageType: RuleDamageType,
    rolledDamage: int,
    priorHitPoints: int,
    damageThreshold: int
  ): BattleRuntimeObjectHitPointDamageResult = {
    val damageAfterObjectImmunity = if (battleRuntimeObjectDamageTypeIsImmune(damageType)) 0 else rolledDamage
    val result = objectHitPointDamageResult({
      rolledDamage: damageAfterObjectImmunity,
      priorHitPoints: priorHitPoints,
      damageThreshold: damageThreshold,
    })
    {
      effectiveDamage: result.effectiveDamage,
      priorHitPoints: result.priorHitPoints,
      nextHitPoints: result.nextHitPoints,
      destroyed: result.destroyed,
    }
  }

  pure def battleRuntimeObjectDamageTypeIsImmune(damageType: RuleDamageType): bool =
    damageType == PoisonDamage or damageType == PsychicDamage

  pure def battleRuntimeTurnStartTemporaryHitPoints(
    existingTemporaryHitPoints: int,
    grantedTemporaryHitPoints: int
  ): int =
    turnStartTemporaryHitPoints(existingTemporaryHitPoints, grantedTemporaryHitPoints)

  pure def battleRuntimeOncePerTurnSpellEffectUsedAtTurnStart: bool =
    oncePerTurnSpellEffectUsedAtTurnStart

  pure def battleRuntimeOneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn: bool =
    oneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn

  pure def battleRuntimeTimedSpellEffectDurationAfterRoundTick(durationTicks: int): int =
    timedSpellEffectDurationAfterRoundTick(durationTicks)

  pure def battleRuntimeTimedSpellEffectRemainsActive(durationTicks: int): bool =
    timedSpellEffectRemainsActive(durationTicks)

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
      assert(battleRuntimeAttackBurstSaveDamageBurstAmount(6, false) == 6),
      assert(battleRuntimeAttackBurstSaveDamageBurstAmount(6, true) == 0),
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
