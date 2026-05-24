// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellAttackDamageProjectionCore {
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Attack Rolls.
  // - Rules-Glossary.md: Breaking Objects, Object, Spell Attack, Invisible,
  //   Opportunity Attack, Poisoned, and Speed.
  // - Spells/Descriptions-A-D.md: Chill Touch.
  // - Spells/Descriptions-E-L.md: Fire Bolt and Guiding Bolt.
  // - Spells/Descriptions-M-P.md: Poison Spray and Produce Flame.
  // - Spells/Descriptions-Q-R.md: Ray of Frost and Ray of Sickness.
  // - Spells/Descriptions-S-Z.md: Shocking Grasp and Starry Wisp.
  // - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Attack Roll, Damage Type,
  //   Hit Points, and condition terminology.

  type SpellAttackDamageProfile =
    | RayOfFrostSpellAttackProfile
    | PoisonSpraySpellAttackProfile
    | ChillTouchSpellAttackProfile
    | StarryWispSpellAttackProfile
    | FireBoltSpellAttackProfile
    | ShockingGraspSpellAttackProfile
    | GuidingBoltSpellAttackProfile
    | RayOfSicknessSpellAttackProfile
    | ProduceFlameHurlSpellAttackProfile

  type SpellAttackDamageHitEffect =
    | RayOfFrostSpeedReductionHitEffect
    | ChillTouchHitPointRegainPreventionHitEffect
    | StarryWispInvisibleBenefitDeniedHitEffect
    | ShockingGraspOpportunityAttackDeniedHitEffect
    | GuidingBoltNextAttackAdvantageHitEffect
    | RayOfSicknessPoisonedHitEffect

  pure def spellAttackDamageProfileDamageType(profile: SpellAttackDamageProfile): RuleDamageType =
    match profile {
      | RayOfFrostSpellAttackProfile => ColdDamage
      | PoisonSpraySpellAttackProfile => PoisonDamage
      | ChillTouchSpellAttackProfile => NecroticDamage
      | StarryWispSpellAttackProfile => RadiantDamage
      | FireBoltSpellAttackProfile => FireDamage
      | ShockingGraspSpellAttackProfile => LightningDamage
      | GuidingBoltSpellAttackProfile => RadiantDamage
      | RayOfSicknessSpellAttackProfile => PoisonDamage
      | ProduceFlameHurlSpellAttackProfile => FireDamage
    }

  pure def spellAttackDamageProfileHitEffects(profile: SpellAttackDamageProfile): Set[SpellAttackDamageHitEffect] =
    match profile {
      | RayOfFrostSpellAttackProfile => Set(RayOfFrostSpeedReductionHitEffect)
      | PoisonSpraySpellAttackProfile => Set()
      | ChillTouchSpellAttackProfile => Set(ChillTouchHitPointRegainPreventionHitEffect)
      | StarryWispSpellAttackProfile => Set(StarryWispInvisibleBenefitDeniedHitEffect)
      | FireBoltSpellAttackProfile => Set()
      | ShockingGraspSpellAttackProfile => Set(ShockingGraspOpportunityAttackDeniedHitEffect)
      | GuidingBoltSpellAttackProfile => Set(GuidingBoltNextAttackAdvantageHitEffect)
      | RayOfSicknessSpellAttackProfile => Set(RayOfSicknessPoisonedHitEffect)
      | ProduceFlameHurlSpellAttackProfile => Set()
    }

  pure def spellAttackDamageProfileSupportsObjectTarget(profile: SpellAttackDamageProfile): bool =
    match profile {
      | RayOfFrostSpellAttackProfile => false
      | PoisonSpraySpellAttackProfile => false
      | ChillTouchSpellAttackProfile => true
      | StarryWispSpellAttackProfile => true
      | FireBoltSpellAttackProfile => true
      | ShockingGraspSpellAttackProfile => false
      | GuidingBoltSpellAttackProfile => false
      | RayOfSicknessSpellAttackProfile => false
      | ProduceFlameHurlSpellAttackProfile => true
    }
}
