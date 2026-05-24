// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellDirectDamageProjectionCore {
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import spellDamageProjectionCore.* from "./spell-damage-projection-core"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots and Using a Higher-Level
  //   Spell Slot.
  // - Spells/Descriptions-M-P.md: Magic Missile dart count, Force damage, and
  //   one additional dart per spell slot level above 1.
  // - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Slot, Damage, and
  //   Damage Type.

  type MagicMissileDirectDamageFacts = {
    slotLevel: int,
    allocatedDarts: int,
    dartDamageRoll: int,
  }

  pure def magicMissileMinimumSlotLevel: int = 1
  pure def magicMissileMaximumSlotLevel: int = 9
  pure def magicMissileMinimumAllocatedDarts: int = 1
  pure def magicMissileMinimumDartDamage: int = 2
  pure def magicMissileMaximumDartDamage: int = 5

  pure def magicMissileSlotLevelLegal(slotLevel: int): bool = all {
    slotLevel >= magicMissileMinimumSlotLevel,
    slotLevel <= magicMissileMaximumSlotLevel,
  }

  pure def magicMissileDartCount(slotLevel: int): int =
    if (slotLevel <= magicMissileMinimumSlotLevel) 3 else slotLevel + 2

  pure def magicMissileMaximumAllocatedDarts(slotLevel: int): int =
    magicMissileDartCount(slotLevel)

  pure def magicMissileDirectDamageType: RuleDamageType = ForceDamage

  pure def magicMissileDirectDamageFacts(
    facts: MagicMissileDirectDamageFacts
  ): DirectSpellDamageFacts = {
    damageType: magicMissileDirectDamageType,
    instanceCount: facts.allocatedDarts,
    damagePerInstance: facts.dartDamageRoll,
    minimumInstanceCount: magicMissileMinimumAllocatedDarts,
    maximumInstanceCount: magicMissileMaximumAllocatedDarts(facts.slotLevel),
    minimumDamagePerInstance: magicMissileMinimumDartDamage,
    maximumDamagePerInstance: magicMissileMaximumDartDamage,
  }

  pure def legalMagicMissileDirectDamageFacts(facts: MagicMissileDirectDamageFacts): bool = all {
    magicMissileSlotLevelLegal(facts.slotLevel),
    legalDirectSpellDamageFacts(magicMissileDirectDamageFacts(facts)),
  }

  pure def resolveMagicMissileDamage(facts: MagicMissileDirectDamageFacts): DirectSpellDamageResult =
    if (not(magicMissileSlotLevelLegal(facts.slotLevel))) {
      damageAmount: 0,
      damageType: magicMissileDirectDamageType,
    } else {
      resolveDirectSpellDamage(magicMissileDirectDamageFacts(facts))
    }
}
