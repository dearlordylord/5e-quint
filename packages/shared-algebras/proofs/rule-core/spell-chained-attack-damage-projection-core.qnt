// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellChainedAttackDamageProjectionCore {
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Spell Slots and Using a Higher-Level
  //   Spell Slot.
  // - Spells/Descriptions-A-D.md#Chromatic Orb.
  // - Rules-Glossary.md: Attack Roll, Critical Hit, Damage Roll, Damage
  //   Types, Spell Attack, and Target.
  // - Playing-the-Game.md: Damage Rolls and Critical Hits.
  // - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Spell Attack, Damage Type,
  //   Base Spell Level, Cast Level, and Using a Higher-Level Spell Slot.

  type ChainedSpellAttackDamageProfile =
    | ChromaticOrbChainedSpellAttackProfile

  type ChainedSpellAttackDamageTypeChoice =
    | ChainedSpellAttackAcidDamage
    | ChainedSpellAttackColdDamage
    | ChainedSpellAttackFireDamage
    | ChainedSpellAttackLightningDamage
    | ChainedSpellAttackPoisonDamage
    | ChainedSpellAttackThunderDamage

  type ChainedSpellAttackD8FaceCounts = {
    face1: int,
    face2: int,
    face3: int,
    face4: int,
    face5: int,
    face6: int,
    face7: int,
    face8: int,
  }

  pure def chainedSpellAttackDamageChoices(
    profile: ChainedSpellAttackDamageProfile
  ): Set[ChainedSpellAttackDamageTypeChoice] =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile => Set(
          ChainedSpellAttackAcidDamage,
          ChainedSpellAttackColdDamage,
          ChainedSpellAttackFireDamage,
          ChainedSpellAttackLightningDamage,
          ChainedSpellAttackPoisonDamage,
          ChainedSpellAttackThunderDamage,
        )
    }

  pure def chainedSpellAttackDamageType(choice: ChainedSpellAttackDamageTypeChoice): RuleDamageType =
    match choice {
      | ChainedSpellAttackAcidDamage => AcidDamage
      | ChainedSpellAttackColdDamage => ColdDamage
      | ChainedSpellAttackFireDamage => FireDamage
      | ChainedSpellAttackLightningDamage => LightningDamage
      | ChainedSpellAttackPoisonDamage => PoisonDamage
      | ChainedSpellAttackThunderDamage => ThunderDamage
    }

  pure def chainedSpellAttackDamageBaseSpellLevel(profile: ChainedSpellAttackDamageProfile): int =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile => 1
    }

  pure def chainedSpellAttackDamageDieSize(profile: ChainedSpellAttackDamageProfile): int =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile => 8
    }

  pure def chainedSpellAttackDamageSlotLevelIsLegal(profile: ChainedSpellAttackDamageProfile, slotLevel: int): bool =
    slotLevel >= chainedSpellAttackDamageBaseSpellLevel(profile)

  pure def chainedSpellAttackDamageLeapCountIsLegal(
    profile: ChainedSpellAttackDamageProfile,
    slotLevel: int,
    leapsUsed: int,
  ): bool =
    chainedSpellAttackDamageSlotLevelIsLegal(profile, slotLevel) and
    leapsUsed >= 0 and
    leapsUsed <= slotLevel

  pure def chainedSpellAttackDamageDice(profile: ChainedSpellAttackDamageProfile, slotLevel: int): int =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile => 3 + (slotLevel - chainedSpellAttackDamageBaseSpellLevel(profile))
    }

  pure def chainedSpellAttackDamageRolledD8Count(
    profile: ChainedSpellAttackDamageProfile,
    slotLevel: int,
    criticalHit: bool,
  ): int = {
    val ordinaryDice = chainedSpellAttackDamageDice(profile, slotLevel)
    if (criticalHit) ordinaryDice * 2 else ordinaryDice
  }

  pure def chainedSpellAttackD8FaceCountTotal(counts: ChainedSpellAttackD8FaceCounts): int =
    counts.face1 +
    counts.face2 +
    counts.face3 +
    counts.face4 +
    counts.face5 +
    counts.face6 +
    counts.face7 +
    counts.face8

  pure def chainedSpellAttackD8FaceCountsAreNonNegative(counts: ChainedSpellAttackD8FaceCounts): bool =
    counts.face1 >= 0 and
    counts.face2 >= 0 and
    counts.face3 >= 0 and
    counts.face4 >= 0 and
    counts.face5 >= 0 and
    counts.face6 >= 0 and
    counts.face7 >= 0 and
    counts.face8 >= 0

  pure def chainedSpellAttackD8FaceCountsMatchRolledDice(
    profile: ChainedSpellAttackDamageProfile,
    slotLevel: int,
    criticalHit: bool,
    counts: ChainedSpellAttackD8FaceCounts,
  ): bool =
    chainedSpellAttackDamageSlotLevelIsLegal(profile, slotLevel) and
    chainedSpellAttackD8FaceCountsAreNonNegative(counts) and
    chainedSpellAttackD8FaceCountTotal(counts) == chainedSpellAttackDamageRolledD8Count(profile, slotLevel, criticalHit)

  pure def chainedSpellAttackDamageRollHasDuplicateD8Face(counts: ChainedSpellAttackD8FaceCounts): bool =
    counts.face1 >= 2 or
    counts.face2 >= 2 or
    counts.face3 >= 2 or
    counts.face4 >= 2 or
    counts.face5 >= 2 or
    counts.face6 >= 2 or
    counts.face7 >= 2 or
    counts.face8 >= 2

  pure def chainedSpellAttackDamageCanLeap(
    profile: ChainedSpellAttackDamageProfile,
    slotLevel: int,
    leapsUsed: int,
    criticalHit: bool,
    counts: ChainedSpellAttackD8FaceCounts,
  ): bool =
    match profile {
      | ChromaticOrbChainedSpellAttackProfile =>
          chainedSpellAttackD8FaceCountsMatchRolledDice(profile, slotLevel, criticalHit, counts) and
          chainedSpellAttackDamageRollHasDuplicateD8Face(counts) and
          leapsUsed >= 0 and
          leapsUsed < slotLevel
    }
}
