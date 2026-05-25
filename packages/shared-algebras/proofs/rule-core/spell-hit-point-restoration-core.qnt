// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE10-SPELL-PROCEDURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner spell.hit-point-restoration
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HIT_POINT_RESTORATION

module spellHitPointRestorationCore {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"

  // RAW anchors:
  // - Rules-Glossary.md: Healing, Hit Points, Dead, and Stable.
  // - Spells/Gaining-and-Casting.md: Using a Higher-Level Spell Slot.
  // - Spells/Descriptions-A-D.md: Cure Wounds.
  // - Spells/Descriptions-E-L.md: Healing Word.
  // - Spells/Descriptions-M-P.md: Mass Cure Wounds and Mass Healing Word.
  // - UBIQUITOUS_LANGUAGE.md: Hit Points and Death.

  type HitPointRestorationAreaProfile =
    | NoHitPointRestorationAreaProfile
    | MassCureWoundsPointOriginSphereArea

  type DirectHitPointRestorationProfile =
    | CureWoundsHitPointRestorationProfile
    | HealingWordHitPointRestorationProfile
    | MassCureWoundsHitPointRestorationProfile
    | MassHealingWordHitPointRestorationProfile

  type DirectHitPointRestorationEffectFacts = {
    profile: DirectHitPointRestorationProfile,
    slotLevel: int,
    healingDiceRoll: int,
    spellcastingAbilityModifier: int,
  }

  val massCureWoundsPointOriginSphereRadiusFeet = 30
  val directHitPointRestorationMaximumSlotLevel = 9

  pure def hitPointRestorationAreaProfile(profile: DirectHitPointRestorationProfile): HitPointRestorationAreaProfile =
    match profile {
      | MassCureWoundsHitPointRestorationProfile => MassCureWoundsPointOriginSphereArea
      | CureWoundsHitPointRestorationProfile => NoHitPointRestorationAreaProfile
      | HealingWordHitPointRestorationProfile => NoHitPointRestorationAreaProfile
      | MassHealingWordHitPointRestorationProfile => NoHitPointRestorationAreaProfile
    }

  pure def directHitPointRestorationMinimumSlotLevel(profile: DirectHitPointRestorationProfile): int =
    match profile {
      | CureWoundsHitPointRestorationProfile => 1
      | HealingWordHitPointRestorationProfile => 1
      | MassHealingWordHitPointRestorationProfile => 3
      | MassCureWoundsHitPointRestorationProfile => 5
    }

  pure def directHitPointRestorationDiceCount(
    profile: DirectHitPointRestorationProfile,
    slotLevel: int
  ): int =
    match profile {
      | CureWoundsHitPointRestorationProfile => 2 + (2 * (slotLevel - 1))
      | HealingWordHitPointRestorationProfile => 2 + (2 * (slotLevel - 1))
      | MassHealingWordHitPointRestorationProfile => 2 + (slotLevel - 3)
      | MassCureWoundsHitPointRestorationProfile => 5 + (slotLevel - 5)
    }

  pure def directHitPointRestorationDieSize(profile: DirectHitPointRestorationProfile): int =
    match profile {
      | CureWoundsHitPointRestorationProfile => 8
      | MassCureWoundsHitPointRestorationProfile => 8
      | HealingWordHitPointRestorationProfile => 4
      | MassHealingWordHitPointRestorationProfile => 4
    }

  pure def legalDirectHitPointRestorationEffectFacts(facts: DirectHitPointRestorationEffectFacts): bool = {
    val diceCount = directHitPointRestorationDiceCount(facts.profile, facts.slotLevel)
    val dieSize = directHitPointRestorationDieSize(facts.profile)
    all {
      facts.slotLevel >= directHitPointRestorationMinimumSlotLevel(facts.profile),
      facts.slotLevel <= directHitPointRestorationMaximumSlotLevel,
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
