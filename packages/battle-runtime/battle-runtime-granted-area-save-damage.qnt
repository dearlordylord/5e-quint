// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION

module battleRuntimeGrantedAreaSaveDamage {
  pure def grantedAreaSaveDamageDurationTicks: int = 10

  pure def grantedAreaSaveDamageDice(
    slotLevel: int,
    baseSlotLevel: int,
    baseDamageDice: int,
  ): int =
    baseDamageDice + (slotLevel - baseSlotLevel)

  pure def grantedAreaSaveDamageRollAccepted(damageRoll: int, damageDice: int): bool =
    damageRoll >= damageDice and damageRoll <= damageDice * 6

  pure def grantedAreaDamageAfterSave(damageRoll: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded) damageRoll / 2 else damageRoll
}
