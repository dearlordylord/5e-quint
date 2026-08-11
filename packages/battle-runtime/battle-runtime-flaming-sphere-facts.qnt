// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

module battleRuntimeFlamingSphereFacts {
  import spellSaveGate.* from "../shared-algebras/proofs/rule-core/spell-save-gate"

  pure val flamingSphereDurationTicks: int = 10
  pure val flamingSphereDiameterFeet: int = 5
  pure val flamingSphereRamMaxMoveFeet: int = 30
  pure val flamingSphereMinimumSlotLevel: int = 2
  pure val flamingSphereBaseDamageDice: int = 2

  pure def flamingSphereDamageDice(slotLevel: int): int =
    flamingSphereBaseDamageDice + (slotLevel - flamingSphereMinimumSlotLevel)

  pure def flamingSphereDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int = {
    val branch = spellSaveGateBranch(savingThrowSucceeded)
    val damageResult = spellSaveGateDamageResult(branch, SpellSaveGateHalfDamageOnSuccess)
    spellSaveGateDamageAmount(rolledDamage, damageResult)
  }
}
