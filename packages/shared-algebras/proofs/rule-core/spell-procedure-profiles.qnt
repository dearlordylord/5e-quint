// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-damage-save-or-attack spell.hit-point-restoration spell.reaction-shield
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.SPELL.HIT_POINT_RESTORATION

module spellProcedureProfiles {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationActionSlotCore.* from "./spell-invocation-action-slot-core"
  import spellDamageProjectionCore.* from "./spell-damage-projection-core"
  import spellAttackDamageProjectionCore.* from "./spell-attack-damage-projection-core"
  import spellSaveDamageProjectionCore.* from "./spell-save-damage-projection-core"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots, cantrips, Casting Time,
  //   targets, Saving Throws, Attack Rolls, and spell effects.
  // - Rules-Glossary.md: Magic, Spell Attack, Target, and Hit Points.
  // - Spells/Descriptions-A-D.md: Acid Splash and Cure Wounds.
  // - Spells/Descriptions-E-L.md: Healing Word.
  // - Spells/Descriptions-M-P.md: Mass Cure Wounds, Mass Healing Word, and
  //   Mind Spike.
  // - Spells/Descriptions-Q-R.md: Ray of Frost.

  type SpellAreaProfile =
    | NoSpellAreaProfile
    | MassCureWoundsPointOriginSphereArea

  type RayOfFrostEffectFacts = {
    attackRoll: AttackRollProcedureFacts,
    baseDamageDice: int,
    rolledDamageDiceCount: int,
    damageRoll: int,
  }

  type SaveDamageSpellEffectFacts = {
    savingThrowFailed: bool,
    damageRoll: int,
  }

  type DirectHitPointRestorationEffectFacts = {
    profile: SpellDefinitionProfile,
    slotLevel: int,
    healingDiceRoll: int,
    spellcastingAbilityModifier: int,
  }

  type SpellEffect =
    | NoSpellEffect
    | RayOfFrostSpeedReductionEffect

  type DamageSpellEffectResult = {
    damageAmount: int,
    damageType: RuleDamageType,
    effect: SpellEffect,
  }

  pure def legalSpellEffects: Set[SpellEffect] = Set(
    NoSpellEffect,
    RayOfFrostSpeedReductionEffect
  )

  pure def legalSpellEffect(effect: SpellEffect): bool =
    effect.in(legalSpellEffects)

  pure def spellProfileArea(profile: SpellDefinitionProfile): SpellAreaProfile =
    if (profile == MassCureWoundsSpellProfile) MassCureWoundsPointOriginSphereArea else NoSpellAreaProfile

  val massCureWoundsPointOriginSphereRadiusFeet = 30

  pure def rayOfFrostMaximumBaseDamageDice: int = 4

  pure def resolveRayOfFrostEffect(facts: RayOfFrostEffectFacts): DamageSpellEffectResult = {
    val result = resolveSpellAttackDamageBranch({
      attackRoll: facts.attackRoll,
      damageType: ColdDamage,
      hitProjections: Set(SpellAttackSpeedReductionHitProjection),
      baseDamageDice: facts.baseDamageDice,
      maximumBaseDamageDice: rayOfFrostMaximumBaseDamageDice,
      rolledDamageDiceCount: facts.rolledDamageDiceCount,
      damageDieSize: 8,
      damageRoll: facts.damageRoll,
    })
    {
      damageAmount: result.damageAmount,
      damageType: result.damageType,
      effect:
        if (result.hitProjections.contains(SpellAttackSpeedReductionHitProjection))
          RayOfFrostSpeedReductionEffect
        else
          NoSpellEffect,
    }
  }

  pure def resolveAcidSplashEffect(facts: SaveDamageSpellEffectFacts): DamageSpellEffectResult = {
    val result = resolveSpellSaveDamageBranch({
      damageType: AcidDamage,
      successPolicy: SpellNoDamageOnSuccessfulSave,
      failedSaveProjections: Set(),
      savingThrowFailed: facts.savingThrowFailed,
      damageRoll: facts.damageRoll,
    })
    {
      damageAmount: result.damageAmount,
      damageType: result.damageType,
      effect: NoSpellEffect,
    }
  }

  pure def directHitPointRestorationDiceCount(
    profile: SpellDefinitionProfile,
    slotLevel: int
  ): int =
    if (profile == CureWoundsSpellProfile) 2 + (2 * (slotLevel - 1))
    else if (profile == MassHealingWordSpellProfile) 2 + (slotLevel - 3)
    else if (profile == MassCureWoundsSpellProfile) 5 + (slotLevel - 5)
    else 2 + (2 * (slotLevel - 1))

  pure def directHitPointRestorationDieSize(profile: SpellDefinitionProfile): int =
    if (profile == CureWoundsSpellProfile or profile == MassCureWoundsSpellProfile) 8 else 4

  pure def legalDirectHitPointRestorationEffectFacts(facts: DirectHitPointRestorationEffectFacts): bool = {
    val diceCount = directHitPointRestorationDiceCount(facts.profile, facts.slotLevel)
    val dieSize = directHitPointRestorationDieSize(facts.profile)
    all {
      facts.profile.in(Set(HealingWordSpellProfile, CureWoundsSpellProfile, MassHealingWordSpellProfile, MassCureWoundsSpellProfile)),
      facts.slotLevel >= spellProfileMinimumSlotLevel(facts.profile),
      facts.slotLevel <= 9,
      facts.healingDiceRoll >= diceCount,
      facts.healingDiceRoll <= diceCount * dieSize,
      facts.spellcastingAbilityModifier >= -5,
      facts.spellcastingAbilityModifier <= 10,
    }
  }

  pure def resolveDirectHitPointRestorationEffect(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
    facts: DirectHitPointRestorationEffectFacts
  ): HitPointRecoveryResult =
    if (not(legalDirectHitPointRestorationEffectFacts(facts))) {
      vitals: vitals,
      deathSavingThrows: lifecycle,
      positiveHitPointUnconsciousRecovery: recovery,
      hitPointsRegained: 0,
    } else {
      applyHitPointHealing(
        vitals,
        lifecycle,
        recovery,
        facts.healingDiceRoll + facts.spellcastingAbilityModifier
      )
    }

}
