// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.magic-action-area-save-damage-healing
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureLandsAidCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Druid.md:406-410: Land's Aid Magic Action,
  //   Wild Shape spend, 60-foot point, 10-foot-radius Sphere, Constitution save,
  //   Necrotic damage, half damage on success, one in-area healing target, and
  //   Druid-level dice scaling.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Area of Effect, Sphere, Saving
  //   Throw, Damage Type, and Hit Points.

  type LandsAidSaveAbility =
    | LandsAidConstitutionSave

  type LandsAidDamageType =
    | LandsAidNecroticDamage

  pure def landsAidPointRangeFeet: int = 60

  pure def landsAidSphereRadiusFeet: int = 10

  pure def landsAidDamageDieSize: int = 6

  pure def landsAidDice(druidLevel: int): int =
    if (druidLevel >= 14) 4
    else if (druidLevel >= 10) 3
    else 2

  pure def landsAidSuccessfulSaveDamage(failedSaveDamage: int): int =
    failedSaveDamage / 2
}
