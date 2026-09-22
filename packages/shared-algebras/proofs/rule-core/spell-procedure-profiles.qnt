// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-damage-save-or-attack

module spellProcedureProfiles {
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import attackDamageComposition.* from "./attack-damage-composition"
  import spellDamageProjectionCore.* from "./spell-damage-projection-core"
  import spellAttackDamageProjectionCore.* from "./spell-attack-damage-projection-core"
  import spellSaveDamageProjectionCore.* from "./spell-save-damage-projection-core"

  // RAW anchors:
  // - spells.md: Spell Slots, cantrips, Casting Time,
  //   targets, Saving Throws, Attack Rolls, and spell effects.
  // - rules-glossary.md: Magic, Spell Attack, Target, and Hit Points.
  // - spells.md: Acid Splash and Cure Wounds.
  // - spells.md: Healing Word.
  // - spells.md: Mass Cure Wounds, Mass Healing Word, and
  //   Mind Spike.
  // - spells.md: Ray of Frost.

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

}
