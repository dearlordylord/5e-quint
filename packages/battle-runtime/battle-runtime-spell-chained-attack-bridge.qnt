// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE

module battleRuntimeSpellChainedAttackBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import spellChainedAttackDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-chained-attack-damage-projection-core"

  type BattleRuntimeChainedSpellAttackDamageProfile =
    | BattleRuntimeChromaticOrbChainedSpellAttack
  type BattleRuntimeChainedSpellAttackDamageTypeChoice =
    | BattleRuntimeChainedSpellAttackAcidDamage
    | BattleRuntimeChainedSpellAttackColdDamage
    | BattleRuntimeChainedSpellAttackFireDamage
    | BattleRuntimeChainedSpellAttackLightningDamage
    | BattleRuntimeChainedSpellAttackPoisonDamage
    | BattleRuntimeChainedSpellAttackThunderDamage
  pure def battleRuntimeChainedSpellAttackDamageProfile(
    profile: BattleRuntimeChainedSpellAttackDamageProfile
  ): ChainedSpellAttackDamageProfile =
    match profile {
      | BattleRuntimeChromaticOrbChainedSpellAttack => ChromaticOrbChainedSpellAttackProfile
    }
  pure def battleRuntimeChainedSpellAttackDamageChoice(
    choice: ChainedSpellAttackDamageTypeChoice
  ): BattleRuntimeChainedSpellAttackDamageTypeChoice =
    match choice {
      | ChainedSpellAttackAcidDamage => BattleRuntimeChainedSpellAttackAcidDamage
      | ChainedSpellAttackColdDamage => BattleRuntimeChainedSpellAttackColdDamage
      | ChainedSpellAttackFireDamage => BattleRuntimeChainedSpellAttackFireDamage
      | ChainedSpellAttackLightningDamage => BattleRuntimeChainedSpellAttackLightningDamage
      | ChainedSpellAttackPoisonDamage => BattleRuntimeChainedSpellAttackPoisonDamage
      | ChainedSpellAttackThunderDamage => BattleRuntimeChainedSpellAttackThunderDamage
    }
  pure def battleRuntimeChainedSpellAttackDamageChoices(
    profile: BattleRuntimeChainedSpellAttackDamageProfile
  ): Set[BattleRuntimeChainedSpellAttackDamageTypeChoice] =
    chainedSpellAttackDamageChoices(battleRuntimeChainedSpellAttackDamageProfile(profile))
      .map(battleRuntimeChainedSpellAttackDamageChoice)
  pure def battleRuntimeChainedSpellAttackDamageType(
    choice: BattleRuntimeChainedSpellAttackDamageTypeChoice
  ): RuleDamageType =
    match choice {
      | BattleRuntimeChainedSpellAttackAcidDamage => chainedSpellAttackDamageType(ChainedSpellAttackAcidDamage)
      | BattleRuntimeChainedSpellAttackColdDamage => chainedSpellAttackDamageType(ChainedSpellAttackColdDamage)
      | BattleRuntimeChainedSpellAttackFireDamage => chainedSpellAttackDamageType(ChainedSpellAttackFireDamage)
      | BattleRuntimeChainedSpellAttackLightningDamage => chainedSpellAttackDamageType(ChainedSpellAttackLightningDamage)
      | BattleRuntimeChainedSpellAttackPoisonDamage => chainedSpellAttackDamageType(ChainedSpellAttackPoisonDamage)
      | BattleRuntimeChainedSpellAttackThunderDamage => chainedSpellAttackDamageType(ChainedSpellAttackThunderDamage)
    }
  pure def battleRuntimeChainedSpellAttackDamageBaseSpellLevel(profile: BattleRuntimeChainedSpellAttackDamageProfile): int =
    chainedSpellAttackDamageBaseSpellLevel(battleRuntimeChainedSpellAttackDamageProfile(profile))
  pure def battleRuntimeChainedSpellAttackDamageDieSize(profile: BattleRuntimeChainedSpellAttackDamageProfile): int =
    chainedSpellAttackDamageDieSize(battleRuntimeChainedSpellAttackDamageProfile(profile))
  pure def battleRuntimeChainedSpellAttackDamageSlotLevelIsLegal(profile: BattleRuntimeChainedSpellAttackDamageProfile, slotLevel: int): bool =
    chainedSpellAttackDamageSlotLevelIsLegal(battleRuntimeChainedSpellAttackDamageProfile(profile), slotLevel)
  pure def battleRuntimeChainedSpellAttackDamageLeapCountIsLegal(
    profile: BattleRuntimeChainedSpellAttackDamageProfile,
    slotLevel: int,
    leapsUsed: int
  ): bool =
    chainedSpellAttackDamageLeapCountIsLegal(battleRuntimeChainedSpellAttackDamageProfile(profile), slotLevel, leapsUsed)
  pure def battleRuntimeChainedSpellAttackDamageDice(profile: BattleRuntimeChainedSpellAttackDamageProfile, slotLevel: int): int =
    chainedSpellAttackDamageDice(battleRuntimeChainedSpellAttackDamageProfile(profile), slotLevel)
  pure def battleRuntimeChainedSpellAttackDamageRolledD8Count(
    profile: BattleRuntimeChainedSpellAttackDamageProfile,
    slotLevel: int,
    criticalHit: bool
  ): int =
    chainedSpellAttackDamageRolledD8Count(battleRuntimeChainedSpellAttackDamageProfile(profile), slotLevel, criticalHit)
  pure def battleRuntimeD8FaceCountTotal(counts: ChainedSpellAttackD8FaceCounts): int =
    chainedSpellAttackD8FaceCountTotal(counts)
  pure def battleRuntimeD8FaceCountsAreNonNegative(counts: ChainedSpellAttackD8FaceCounts): bool =
    chainedSpellAttackD8FaceCountsAreNonNegative(counts)
  pure def battleRuntimeD8FaceCountsMatchRolledDice(
    profile: BattleRuntimeChainedSpellAttackDamageProfile,
    slotLevel: int,
    criticalHit: bool,
    counts: ChainedSpellAttackD8FaceCounts
  ): bool =
    chainedSpellAttackD8FaceCountsMatchRolledDice(
      battleRuntimeChainedSpellAttackDamageProfile(profile),
      slotLevel,
      criticalHit,
      counts,
    )
  pure def battleRuntimeDamageRollHasDuplicateD8Face(counts: ChainedSpellAttackD8FaceCounts): bool =
    chainedSpellAttackDamageRollHasDuplicateD8Face(counts)
  pure def battleRuntimeChainedSpellAttackDamageCanLeap(
    profile: BattleRuntimeChainedSpellAttackDamageProfile,
    slotLevel: int,
    leapsUsed: int,
    criticalHit: bool,
    counts: ChainedSpellAttackD8FaceCounts
  ): bool =
    chainedSpellAttackDamageCanLeap(
      battleRuntimeChainedSpellAttackDamageProfile(profile),
      slotLevel,
      leapsUsed,
      criticalHit,
      counts,
    )
}
