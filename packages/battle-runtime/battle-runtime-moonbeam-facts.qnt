// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
module battleRuntimeMoonbeamFacts {
  pure val moonbeamDurationTicks: int = 10
  pure val moonbeamRadiusFeet: int = 5
  pure val moonbeamHeightFeet: int = 40
  pure val moonbeamRepositionMaxMoveFeet: int = 60
  pure val moonbeamMinimumSlotLevel: int = 2
  pure val moonbeamBaseDamageDice: int = 2
  pure val moonbeamDamageDieSize: int = 10

  pure def moonbeamDamageDice(slotLevel: int): int =
    moonbeamBaseDamageDice + (slotLevel - moonbeamMinimumSlotLevel)

  pure def moonbeamDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded) rolledDamage / 2 else rolledDamage
}
