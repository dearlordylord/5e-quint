// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module battleRuntimeSpellAttackBurstBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import spellAttackBurstSaveDamageCore.* from "../shared-algebras/proofs/rule-core/spell-attack-burst-save-damage-core"

  type BattleRuntimeAttackBurstSaveDamageProfile =
    | BattleRuntimeIceKnifeAttackBurstSaveDamage
  pure def battleRuntimeAttackBurstSaveDamageProfile(
    profile: BattleRuntimeAttackBurstSaveDamageProfile
  ): AttackBurstSaveDamageProfile =
    match profile {
      | BattleRuntimeIceKnifeAttackBurstSaveDamage => IceKnifeAttackBurstSaveDamageProfile
    }
  pure def battleRuntimeAttackBurstSaveDamageRequiresSlot(profile: BattleRuntimeAttackBurstSaveDamageProfile): bool =
    attackBurstSaveDamageRequiresSlot(battleRuntimeAttackBurstSaveDamageProfile(profile))
  pure def battleRuntimeAttackBurstSaveDamageAttackType(profile: BattleRuntimeAttackBurstSaveDamageProfile): RuleDamageType =
    attackBurstSaveDamageAttackType(battleRuntimeAttackBurstSaveDamageProfile(profile))
  pure def battleRuntimeAttackBurstSaveDamageBurstType(profile: BattleRuntimeAttackBurstSaveDamageProfile): RuleDamageType =
    attackBurstSaveDamageBurstType(battleRuntimeAttackBurstSaveDamageProfile(profile))
  pure def battleRuntimeAttackBurstSaveDamageBurstDice(profile: BattleRuntimeAttackBurstSaveDamageProfile, slotLevel: int): int =
    attackBurstSaveDamageBurstDice(battleRuntimeAttackBurstSaveDamageProfile(profile), slotLevel)
  pure def battleRuntimeAttackBurstSaveDamageBurstAmount(
    profile: BattleRuntimeAttackBurstSaveDamageProfile,
    damageRoll: int,
    savingThrowSucceeded: bool
  ): int =
    attackBurstSaveDamageProfileBurstAmount(
      battleRuntimeAttackBurstSaveDamageProfile(profile),
      damageRoll,
      savingThrowSucceeded,
    )
}
