// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE

module battleRuntimeSpellIndependentSequenceBridge {
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import battleRuntimeSorcerousBurstDamageChoice.* from "./battle-runtime-sorcerous-burst-damage-choice"
  import spellIndependentAttackSequenceCore.* from "../shared-algebras/proofs/rule-core/spell-independent-attack-sequence-core"

  type BattleRuntimeSpellAttackSequenceProfile =
    | BattleRuntimeEldritchBlastBeamSequence
    | BattleRuntimeScorchingRaySequence
  type BattleRuntimeSpellAttackSequenceStep =
    | BattleRuntimeSpellAttackSequenceUnavailable
    | BattleRuntimeSpellAttackSequenceNeedsTargets
    | BattleRuntimeSpellAttackSequenceNeedsAttackRoll
    | BattleRuntimeSpellAttackSequenceNeedsDamageRoll
    | BattleRuntimeSpellAttackSequenceComplete
  pure def battleRuntimeSpellAttackSequenceProfile(
    profile: BattleRuntimeSpellAttackSequenceProfile
  ): SpellAttackSequenceProfile =
    match profile {
      | BattleRuntimeEldritchBlastBeamSequence => EldritchBlastBeamSequenceProfile
      | BattleRuntimeScorchingRaySequence => ScorchingRaySequenceProfile
    }
  pure def battleRuntimeSpellAttackSequenceStep(
    step: SpellAttackSequenceStep
  ): BattleRuntimeSpellAttackSequenceStep =
    match step {
      | SpellAttackSequenceUnavailable => BattleRuntimeSpellAttackSequenceUnavailable
      | SpellAttackSequenceNeedsTargets => BattleRuntimeSpellAttackSequenceNeedsTargets
      | SpellAttackSequenceNeedsAttackRoll => BattleRuntimeSpellAttackSequenceNeedsAttackRoll
      | SpellAttackSequenceNeedsDamageRoll => BattleRuntimeSpellAttackSequenceNeedsDamageRoll
      | SpellAttackSequenceComplete => BattleRuntimeSpellAttackSequenceComplete
    }
  pure def battleRuntimeSpellAttackSequenceDamageType(
    profile: BattleRuntimeSpellAttackSequenceProfile
  ): RuleDamageType =
    spellAttackSequenceDamageType(battleRuntimeSpellAttackSequenceProfile(profile))
  pure def battleRuntimeSpellAttackSequenceSupportsObjectTargets(
    profile: BattleRuntimeSpellAttackSequenceProfile
  ): bool =
    spellAttackSequenceSupportsObjectTargets(battleRuntimeSpellAttackSequenceProfile(profile))
  pure def battleRuntimeSpellAttackSequenceAttackCount(
    profile: BattleRuntimeSpellAttackSequenceProfile,
    scalingLevel: int
  ): int =
    spellAttackSequenceAttackCount(battleRuntimeSpellAttackSequenceProfile(profile), scalingLevel)
  pure def battleRuntimeSpellAttackSequenceNextStep(
    profile: BattleRuntimeSpellAttackSequenceProfile,
    canCastSpells: bool,
    attackCount: int,
    targetsFilled: int,
    attackRollsFilled: int,
    hits: int,
    damageRollsFilled: int,
  ): BattleRuntimeSpellAttackSequenceStep =
    battleRuntimeSpellAttackSequenceStep(
      spellAttackSequenceStep(
        battleRuntimeSpellAttackSequenceProfile(profile),
        canCastSpells,
        attackCount,
        targetsFilled,
        attackRollsFilled,
        hits,
        damageRollsFilled,
      )
    )
  pure def battleRuntimeSorcerousBurstDamageTypeChoices: Set[BattleRuntimeSorcerousBurstDamageTypeChoice] =
    Set(
      BattleRuntimeSorcerousBurstAcidDamage,
      BattleRuntimeSorcerousBurstColdDamage,
      BattleRuntimeSorcerousBurstFireDamage,
      BattleRuntimeSorcerousBurstLightningDamage,
      BattleRuntimeSorcerousBurstPoisonDamage,
      BattleRuntimeSorcerousBurstPsychicDamage,
      BattleRuntimeSorcerousBurstThunderDamage,
    )
  pure def battleRuntimeSorcerousBurstDamageType(
    choice: BattleRuntimeSorcerousBurstDamageTypeChoice
  ): RuleDamageType =
    match choice {
      | BattleRuntimeSorcerousBurstAcidDamage => AcidDamage
      | BattleRuntimeSorcerousBurstColdDamage => ColdDamage
      | BattleRuntimeSorcerousBurstFireDamage => FireDamage
      | BattleRuntimeSorcerousBurstLightningDamage => LightningDamage
      | BattleRuntimeSorcerousBurstPoisonDamage => PoisonDamage
      | BattleRuntimeSorcerousBurstPsychicDamage => PsychicDamage
      | BattleRuntimeSorcerousBurstThunderDamage => ThunderDamage
    }
  pure def battleRuntimeSorcerousBurstBaseDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 4
    else if (characterLevel >= 11) 3
    else if (characterLevel >= 5) 2
    else 1
  pure def battleRuntimeSorcerousBurstMaximumAdditionalDice(spellcastingAbilityModifier: int): int =
    if (spellcastingAbilityModifier > 0) spellcastingAbilityModifier else 0
  pure def battleRuntimeSorcerousBurstCanRollAdditionalD8(
    maximumD8sRolledSoFar: int,
    spellcastingAbilityModifier: int,
    additionalDiceAlreadyAdded: int,
  ): bool =
    all {
      maximumD8sRolledSoFar >= 0,
      additionalDiceAlreadyAdded >= 0,
      additionalDiceAlreadyAdded < battleRuntimeSorcerousBurstMaximumAdditionalDice(spellcastingAbilityModifier),
      additionalDiceAlreadyAdded < maximumD8sRolledSoFar,
    }
}
