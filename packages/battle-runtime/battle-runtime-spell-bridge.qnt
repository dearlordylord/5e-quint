// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS
module battleRuntimeSpellBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  // Sorcerous Burst damage-choice enum lives in a leaf so battle-runtime-model can
  // reference it without importing this bridge's closure. See the leaf header.
  import battleRuntimeSorcerousBurstDamageChoice.* from "./battle-runtime-sorcerous-burst-damage-choice"
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

  pure def battleRuntimeAttackBurstSaveDamageBurstAmount(
    profile: BattleRuntimeAttackBurstSaveDamageProfile,
    damageRoll: int,
    savingThrowSucceeded: bool
  ): int =
    attackBurstSaveDamageProfileBurstAmount(
      battleRuntimeAttackBurstSaveDamageProfile(profile),
      damageRoll,
      savingThrowSucceeded,
    )

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

  pure def battleRuntimeObjectDamageThreshold(damageThreshold: int): ObjectDamageThreshold =
    if (damageThreshold <= 0)
      ObjectWithoutDamageThreshold
    else
      ObjectWithDamageThreshold({ amount: damageThreshold })

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
      damageThreshold: battleRuntimeObjectDamageThreshold(damageThreshold),
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
}
