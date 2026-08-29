// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE

module battleRuntimeMagicMissileArithmetic {
  import battleRuntimeSimultaneousMultiTargetForceDamage.* from "./battle-runtime-simultaneous-multi-target-force-damage"

  pure def magicMissileDartCount(slotLevel: int): int =
    simultaneousDamagePacketCount(slotLevel, 1, 3, 1)

  pure def magicMissileAllocatedDamage(
    dieTotal: int,
    dartCount: int,
    flatPerDart: int,
  ): int =
    simultaneousAllocatedDamage(dieTotal, dartCount, flatPerDart)

}
