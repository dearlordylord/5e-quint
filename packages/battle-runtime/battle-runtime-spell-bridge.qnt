// -*- mode: Bluespec; -*-

module battleRuntimeSpellBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
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
    | BattleRuntimeShockingGraspSpellAttack
    | BattleRuntimeGuidingBoltSpellAttack
    | BattleRuntimeRayOfSicknessSpellAttack
    | BattleRuntimeProduceFlameHurlSpellAttack

  type BattleRuntimeSpellAttackDamageHitEffect =
    | BattleRuntimeRayOfFrostSpeedReductionHitEffect
    | BattleRuntimeShockingGraspOpportunityAttackDeniedHitEffect
    | BattleRuntimeGuidingBoltNextAttackAdvantageHitEffect
    | BattleRuntimeRayOfSicknessPoisonedHitEffect

  type BattleRuntimeSaveGatedDamageProfile =
    | BattleRuntimeAcidSplashSaveDamage
    | BattleRuntimeSacredFlameSaveDamage
    | BattleRuntimeInflictWoundsSaveDamage
    | BattleRuntimeBurningHandsSaveDamage
    | BattleRuntimeViciousMockerySaveDamage

  type BattleRuntimeSaveGatedConditionProfile =
    | BattleRuntimeColorSpraySaveCondition
    | BattleRuntimeEntangleSaveCondition
    | BattleRuntimeAnimalFriendshipSaveCondition
    | BattleRuntimeCharmPersonSaveCondition
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

  type BattleRuntimeSaveGatedFailedEffect =
    | BattleRuntimeViciousMockeryNextAttackDisadvantageEffect
    | BattleRuntimeColorSprayBlindedEffect
    | BattleRuntimeEntangleRestrainedEffect
    | BattleRuntimeAnimalFriendshipCharmedEffect({ durationTicks: int })
    | BattleRuntimeCharmPersonCharmedEffect({ durationTicks: int })
    | BattleRuntimeFaerieFireAttackRollAdvantageEffect

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
      | BattleRuntimeViciousMockerySaveDamage => ViciousMockerySaveDamageProfile
    }

  pure def battleRuntimeSaveGatedConditionProfile(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): SpellSaveGatedConditionProfile =
    match profile {
      | BattleRuntimeColorSpraySaveCondition => ColorSpraySaveConditionProfile
      | BattleRuntimeEntangleSaveCondition => EntangleSaveConditionProfile
      | BattleRuntimeAnimalFriendshipSaveCondition => AnimalFriendshipSaveConditionProfile
      | BattleRuntimeCharmPersonSaveCondition => CharmPersonSaveConditionProfile
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

  pure def battleRuntimeSaveGatedFailedEffect(
    effect: SpellSaveGatedFailedEffect
  ): BattleRuntimeSaveGatedFailedEffect =
    match effect {
      | ViciousMockeryNextAttackDisadvantageEffect => BattleRuntimeViciousMockeryNextAttackDisadvantageEffect
      | ColorSprayBlindedEffect => BattleRuntimeColorSprayBlindedEffect
      | EntangleRestrainedEffect => BattleRuntimeEntangleRestrainedEffect
      | AnimalFriendshipCharmedEffect(data) => BattleRuntimeAnimalFriendshipCharmedEffect({ durationTicks: data.durationMinutes })
      | CharmPersonCharmedEffect(data) => BattleRuntimeCharmPersonCharmedEffect({ durationTicks: data.durationMinutes })
      | FaerieFireAttackRollAdvantageEffect => BattleRuntimeFaerieFireAttackRollAdvantageEffect
    }

  pure def battleRuntimeSaveGatedDamageFailedSaveEffects(
    profile: BattleRuntimeSaveGatedDamageProfile
  ): Set[BattleRuntimeSaveGatedFailedEffect] =
    spellSaveGatedDamageFailedSaveEffects(battleRuntimeSaveGatedDamageProfile(profile))
      .map(battleRuntimeSaveGatedFailedEffect)

  pure def battleRuntimeSaveGatedConditionFailedSaveEffects(
    profile: BattleRuntimeSaveGatedConditionProfile
  ): Set[BattleRuntimeSaveGatedFailedEffect] =
    spellSaveGatedConditionFailedSaveEffects(battleRuntimeSaveGatedConditionProfile(profile))
      .map(battleRuntimeSaveGatedFailedEffect)

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
      assert(battleRuntimeSpellAttackDamageHitEffects(BattleRuntimeRayOfFrostSpellAttack) == Set(BattleRuntimeRayOfFrostSpeedReductionHitEffect)),
      assert(battleRuntimeSpellAttackDamageHitEffects(BattleRuntimeGuidingBoltSpellAttack) == Set(BattleRuntimeGuidingBoltNextAttackAdvantageHitEffect)),
      assert(battleRuntimeSpellAttackDamageSupportsObjectTarget(BattleRuntimeStarryWispSpellAttack)),
      assert(not(battleRuntimeSpellAttackDamageSupportsObjectTarget(BattleRuntimeRayOfFrostSpellAttack))),
    }
  }

  run test_save_gated_profile_projection = {
    val animalTargets = battleRuntimeSaveGatedConditionTargeting(BattleRuntimeAnimalFriendshipSaveCondition)
    all {
      assert(battleRuntimeSaveGatedDamageTargeting(BattleRuntimeSacredFlameSaveDamage) == BattleRuntimeSingleSaveTarget),
      assert(battleRuntimeSaveGatedDamageTargeting(BattleRuntimeBurningHandsSaveDamage) == BattleRuntimeAreaSaveTargets),
      assert(battleRuntimeSaveGatedDamageSuccess(BattleRuntimeInflictWoundsSaveDamage) == BattleRuntimeHalfDamageOnSaveSuccess),
      assert(battleRuntimeSaveGatedDamageType(BattleRuntimeViciousMockerySaveDamage) == PsychicDamage),
      assert(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeBurningHandsSaveDamage)),
      assert(not(battleRuntimeSaveGatedDamageRequiresSlot(BattleRuntimeAcidSplashSaveDamage))),
      assert(battleRuntimeSaveGatedDamageFailedSaveEffects(BattleRuntimeViciousMockerySaveDamage) == Set(BattleRuntimeViciousMockeryNextAttackDisadvantageEffect)),
      assert(battleRuntimeSaveGatedConditionTargeting(BattleRuntimeColorSpraySaveCondition) == BattleRuntimeAreaSaveTargets),
      assert(battleRuntimeSaveGatedTargetMaxTargets(animalTargets, 2) == 2),
      assert(battleRuntimeSaveGatedConditionFailedSaveEffects(BattleRuntimeEntangleSaveCondition) == Set(BattleRuntimeEntangleRestrainedEffect)),
      assert(battleRuntimeSaveGatedConditionFailedSaveEffects(BattleRuntimeFaerieFireSaveAttackRollAdvantage) == Set(BattleRuntimeFaerieFireAttackRollAdvantageEffect)),
      assert(battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(BattleRuntimeAnimalFriendshipSaveCondition, true, false)),
      assert(not(battleRuntimeSaveGatedConditionTargetCreatureTypeIsLegal(BattleRuntimeAnimalFriendshipSaveCondition, false, true))),
      assert(battleRuntimeSaveGatedConditionSavingThrowHasAdvantage(BattleRuntimeCharmPersonSaveCondition, true)),
    }
  }
}
