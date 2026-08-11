// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS

module battleRuntimeSpellRiderBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import spellDamageRiderProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-damage-rider-projection-core"
  import spellInvocationResourceCore.* from "../shared-algebras/proofs/rule-core/spell-invocation-resource-core"

  type BattleRuntimeDamageRiderSpellProfile =
    | BattleRuntimeDivineFavorWeaponDamageRider
    | BattleRuntimeDivineSmiteAfterHitDamage
    | BattleRuntimeHuntersMarkMarkedDamageRider
    | BattleRuntimeEnsnaringStrikeAfterHitCondition
    | BattleRuntimeSearingSmiteAfterHitTimedDamage
    | BattleRuntimeShiningSmiteAfterHitDamageIllumination
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
}
