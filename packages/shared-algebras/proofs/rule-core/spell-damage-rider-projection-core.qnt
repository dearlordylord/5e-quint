// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellDamageRiderProjectionCore {
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Casting Time, Spell Slots, Duration,
  //   Range, and Using a Higher-Level Spell Slot.
  // - Spells/Descriptions-A-D.md: Divine Favor and Divine Smite.
  // - Spells/Descriptions-E-L.md: Ensnaring Strike and Hunter's Mark.
  // - Spells/Descriptions-S-Z.md: Searing Smite and Shining Smite.
  // - Rules-Glossary.md: Advantage, Bright Light, Concentration, Damage,
  //   Damage Types, Melee Attack, and Unarmed Strike.
  // - UBIQUITOUS_LANGUAGE.md: Attack Damage Rider, Spell Invocation,
  //   Concentration, Damage Type, and Duration.

  type DamageRiderSpellProfile =
    | DivineFavorWeaponDamageRiderProfile
    | DivineSmiteAfterHitDamageProfile
    | HuntersMarkMarkedDamageRiderProfile
    | EnsnaringStrikeAfterHitConditionProfile
    | SearingSmiteAfterHitTimedDamageProfile
    | ShiningSmiteAfterHitDamageIlluminationProfile

  pure def damageRiderSpellAction(profile: DamageRiderSpellProfile): SpellInvocationAction =
    BonusActionSpellInvocation

  pure def damageRiderRequiresConcentration(profile: DamageRiderSpellProfile): bool =
    profile == HuntersMarkMarkedDamageRiderProfile
      or profile == EnsnaringStrikeAfterHitConditionProfile
      or profile == ShiningSmiteAfterHitDamageIlluminationProfile

  pure def divineFavorDamageType: RuleDamageType = RadiantDamage

  pure def divineFavorDurationTicks: int = 10

  pure def divineSmiteDamageType: RuleDamageType = RadiantDamage

  pure def divineSmiteDamageDice(slotLevel: int, targetFiendOrUndead: bool): int =
    2 + (if (slotLevel > 1) slotLevel - 1 else 0) + (if (targetFiendOrUndead) 1 else 0)

  pure def huntersMarkDamageType: RuleDamageType = ForceDamage

  pure def huntersMarkRangeFeet: int = 90

  pure def ensnaringStrikeDamageType: RuleDamageType = PiercingDamage

  pure def ensnaringStrikeDamageDice(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def ensnaringStrikeTargetHasSaveAdvantage(targetLargeOrLarger: bool): bool =
    targetLargeOrLarger

  pure def searingSmiteDamageType: RuleDamageType = FireDamage

  pure def searingSmiteDamageDice(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def searingSmiteDurationTicks: int = 10

  pure def shiningSmiteDamageType: RuleDamageType = RadiantDamage

  pure def shiningSmiteDamageDice(slotLevel: int): int =
    if (slotLevel < 2) 0 else slotLevel

  pure def shiningSmiteBrightLightRadiusFeet: int = 5

  pure def shiningSmiteDurationTicks: int = 10
}
