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
}
