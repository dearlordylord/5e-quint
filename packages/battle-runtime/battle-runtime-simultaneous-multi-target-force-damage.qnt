// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DAMAGE_SAVE_OR_ATTACK_PROCEDURE

module battleRuntimeSimultaneousMultiTargetForceDamage {
  pure def simultaneousDamagePacketCount(
    slotLevel: int,
    baseSlotLevel: int,
    basePacketCount: int,
    additionalPacketsPerSlotLevel: int,
  ): int =
    if (slotLevel < baseSlotLevel)
      0
    else
      basePacketCount + ((slotLevel - baseSlotLevel) * additionalPacketsPerSlotLevel)

  pure def simultaneousAllocatedDamage(
    dieTotal: int,
    packetCount: int,
    flatDamagePerPacket: int,
  ): int =
    dieTotal + (packetCount * flatDamagePerPacket)
}
