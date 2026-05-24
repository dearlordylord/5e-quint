// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellAttackBurstSaveDamageCore {
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import spellDamageProjectionCore.* from "./spell-damage-projection-core"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots and Using a Higher-Level
  //   Spell Slot.
  // - Spells/Descriptions-E-L.md: Ice Knife ranged spell attack Piercing
  //   damage, Dexterity save burst Cold damage, and higher-slot burst scaling.
  // - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Attack, Saving Throw,
  //   Damage, and Damage Type.

  type AttackBurstSaveDamageProfile =
    | IceKnifeAttackBurstSaveDamageProfile

  pure def attackBurstSaveDamageRequiresSlot(profile: AttackBurstSaveDamageProfile): bool =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => true
    }

  pure def attackBurstSaveDamageMinimumSlotLevel(profile: AttackBurstSaveDamageProfile): int =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => 1
    }

  pure def attackBurstSaveDamageAttackType(profile: AttackBurstSaveDamageProfile): RuleDamageType =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => PiercingDamage
    }

  pure def attackBurstSaveDamageBurstType(profile: AttackBurstSaveDamageProfile): RuleDamageType =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => ColdDamage
    }

  pure def attackBurstSaveDamageBaseBurstDice(profile: AttackBurstSaveDamageProfile): int =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => 2
    }

  pure def attackBurstSaveDamageAdditionalBurstDicePerSlotLevel(
    profile: AttackBurstSaveDamageProfile
  ): int =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => 1
    }

  pure def attackBurstSaveDamageBurstDice(profile: AttackBurstSaveDamageProfile, slotLevel: int): int = {
    val minimumSlotLevel = attackBurstSaveDamageMinimumSlotLevel(profile)
    if (slotLevel < minimumSlotLevel)
      0
    else
      attackBurstSaveDamageBaseBurstDice(profile) +
        ((slotLevel - minimumSlotLevel) * attackBurstSaveDamageAdditionalBurstDicePerSlotLevel(profile))
  }

  pure def attackBurstSaveDamageBurstSuccessPolicy(
    profile: AttackBurstSaveDamageProfile
  ): SpellSaveSuccessDamagePolicy =
    match profile {
      | IceKnifeAttackBurstSaveDamageProfile => SpellNoDamageOnSuccessfulSave
    }

  pure def attackBurstSaveDamageBurstAmount(
    policy: SpellSaveSuccessDamagePolicy,
    damageRoll: int,
    savingThrowSucceeded: bool
  ): int =
    if (savingThrowSucceeded)
      spellSaveSuccessDamageAmount(policy, damageRoll)
    else
      damageRoll

  pure def attackBurstSaveDamageProfileBurstAmount(
    profile: AttackBurstSaveDamageProfile,
    damageRoll: int,
    savingThrowSucceeded: bool
  ): int =
    attackBurstSaveDamageBurstAmount(
      attackBurstSaveDamageBurstSuccessPolicy(profile),
      damageRoll,
      savingThrowSucceeded
    )
}
