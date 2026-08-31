// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

module battleRuntimeFlamingSphereFacts {
  import battleRuntimePersistentAreaCore.* from "./battle-runtime-persistent-area-core"

  pure val flamingSphereDurationTicks: int = 10
  pure val flamingSphereDiameterFeet: int = 5
  pure val flamingSphereRamMaxMoveFeet: int = 30
  pure val flamingSphereMinimumSlotLevel: int = 2
  pure val flamingSphereBaseDamageDice: int = 2

  pure def flamingSphereDamageDice(slotLevel: int): int =
    persistentAreaScaledDamageDice(
      slotLevel,
      flamingSphereMinimumSlotLevel,
      flamingSphereBaseDamageDice,
    )

  pure def flamingSphereDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int =
    persistentAreaDamageAfterSave(rolledDamage, savingThrowSucceeded)
}
