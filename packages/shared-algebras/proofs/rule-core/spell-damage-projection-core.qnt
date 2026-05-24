// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES

module spellDamageProjectionCore {
  import hitPointDamage.* from "./hit-point-damage"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"

  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: spell effects, targets, Saving Throws,
  //   and Attack Rolls.
  // - Spells/Descriptions-M-P.md: Magic Missile direct Force dart damage.
  // - Spells/Descriptions-Q-R.md: Ray of Frost attack-hit Cold damage and
  //   Speed reduction; Ray of Sickness attack-hit Poisoned effect.
  // - Spells/Descriptions-A-D.md: Chill Touch attack-hit Hit Point regain
  //   prevention; Dissonant Whispers failed-save forced Reaction movement.
  // - Spells/Descriptions-E-L.md: Fireball save-for-half damage; Guiding Bolt
  //   attack-hit next Attack Roll Advantage.
  // - Spells/Descriptions-S-Z.md: Sacred Flame no-damage successful save,
  //   Shocking Grasp attack-hit Opportunity Attack denial, Starry Wisp
  //   attack-hit Invisible-benefit denial, Thunderwave failed-save push, and
  //   Vicious Mockery failed-save next Attack Roll Disadvantage.
  // - UBIQUITOUS_LANGUAGE.md: Spell Invocation, Attack Roll, Saving Throw,
  //   Critical Hit, Damage, and Damage Type.

  type SpellAttackHitProjection =
    | SpellAttackSpeedReductionHitProjection
    | SpellAttackHitPointRegainPreventionHitProjection
    | SpellAttackInvisibleBenefitDeniedHitProjection
    | SpellAttackOpportunityAttackDeniedHitProjection
    | SpellAttackNextAttackAdvantageHitProjection
    | SpellAttackPoisonedHitProjection

  type SpellFailedSaveProjection =
    | SpellSaveNextAttackDisadvantageFailedProjection
    | SpellSavePush10FeetFailedProjection
    | SpellSaveForcedReactionMovementFailedProjection

  type SpellSaveSuccessDamagePolicy =
    | SpellNoDamageOnSuccessfulSave
    | SpellHalfDamageOnSuccessfulSave

  type DirectSpellDamageFacts = {
    damageType: RuleDamageType,
    instanceCount: int,
    damagePerInstance: int,
    minimumInstanceCount: int,
    maximumInstanceCount: int,
    minimumDamagePerInstance: int,
    maximumDamagePerInstance: int,
  }

  type SpellAttackDamageBranchFacts = {
    attackRoll: AttackRollProcedureFacts,
    damageType: RuleDamageType,
    hitProjections: Set[SpellAttackHitProjection],
    baseDamageDice: int,
    maximumBaseDamageDice: int,
    rolledDamageDiceCount: int,
    damageDieSize: int,
    damageRoll: int,
  }

  type SpellSaveDamageBranchFacts = {
    damageType: RuleDamageType,
    successPolicy: SpellSaveSuccessDamagePolicy,
    failedSaveProjections: Set[SpellFailedSaveProjection],
    savingThrowFailed: bool,
    damageRoll: int,
  }

  type DirectSpellDamageResult = {
    damageAmount: int,
    damageType: RuleDamageType,
  }

  type SpellAttackDamageBranchResult = {
    damageAmount: int,
    damageType: RuleDamageType,
    hitProjections: Set[SpellAttackHitProjection],
  }

  type SpellSaveDamageBranchResult = {
    damageAmount: int,
    damageType: RuleDamageType,
    failedSaveProjections: Set[SpellFailedSaveProjection],
  }

  pure def legalSpellSaveSuccessDamagePolicy(policy: SpellSaveSuccessDamagePolicy): bool =
    policy.in(Set(SpellNoDamageOnSuccessfulSave, SpellHalfDamageOnSuccessfulSave))

  pure def legalDirectSpellDamageFacts(facts: DirectSpellDamageFacts): bool = all {
    facts.minimumInstanceCount >= 1,
    facts.maximumInstanceCount >= facts.minimumInstanceCount,
    facts.instanceCount >= facts.minimumInstanceCount,
    facts.instanceCount <= facts.maximumInstanceCount,
    facts.minimumDamagePerInstance >= 0,
    facts.maximumDamagePerInstance >= facts.minimumDamagePerInstance,
    facts.damagePerInstance >= facts.minimumDamagePerInstance,
    facts.damagePerInstance <= facts.maximumDamagePerInstance,
  }

  pure def resolveDirectSpellDamage(facts: DirectSpellDamageFacts): DirectSpellDamageResult =
    if (not(legalDirectSpellDamageFacts(facts))) {
      damageAmount: 0,
      damageType: facts.damageType,
    } else {
      damageAmount: facts.instanceCount * facts.damagePerInstance,
      damageType: facts.damageType,
    }

  pure def legalSpellAttackDamageBranchFacts(facts: SpellAttackDamageBranchFacts): bool = all {
    legalAttackRollProcedureFacts(facts.attackRoll),
    facts.baseDamageDice >= 1,
    facts.maximumBaseDamageDice >= 1,
    facts.maximumBaseDamageDice <= 10,
    facts.baseDamageDice <= facts.maximumBaseDamageDice,
    facts.damageDieSize >= 1,
    facts.damageDieSize <= 12,
    damageDiceCountMatchesCritical(
      facts.baseDamageDice,
      facts.rolledDamageDiceCount,
      resolveAttackRoll(facts.attackRoll).critical
    ),
    facts.damageRoll >= facts.rolledDamageDiceCount,
    facts.damageRoll <= facts.rolledDamageDiceCount * facts.damageDieSize,
  }

  pure def resolveSpellAttackDamageBranch(facts: SpellAttackDamageBranchFacts): SpellAttackDamageBranchResult = {
    val outcome = resolveAttackRoll(facts.attackRoll)
    val canProjectDamage = legalSpellAttackDamageBranchFacts(facts) and outcome.hits
    if (not(canProjectDamage)) {
      damageAmount: 0,
      damageType: facts.damageType,
      hitProjections: Set(),
    } else {
      damageAmount: nonnegative(facts.damageRoll),
      damageType: facts.damageType,
      hitProjections: facts.hitProjections,
    }
  }

  pure def spellSaveSuccessDamageAmount(
    policy: SpellSaveSuccessDamagePolicy,
    damageRoll: int
  ): int =
    match policy {
      | SpellNoDamageOnSuccessfulSave => 0
      | SpellHalfDamageOnSuccessfulSave => nonnegative(damageRoll) / 2
    }

  pure def legalSpellSaveDamageBranchFacts(facts: SpellSaveDamageBranchFacts): bool = all {
    facts.savingThrowFailed.in(Set(true, false)),
    facts.damageRoll >= 0,
    legalSpellSaveSuccessDamagePolicy(facts.successPolicy),
  }

  pure def resolveSpellSaveDamageBranch(facts: SpellSaveDamageBranchFacts): SpellSaveDamageBranchResult =
    if (not(legalSpellSaveDamageBranchFacts(facts))) {
      damageAmount: 0,
      damageType: facts.damageType,
      failedSaveProjections: Set(),
    } else if (facts.savingThrowFailed) {
      damageAmount: nonnegative(facts.damageRoll),
      damageType: facts.damageType,
      failedSaveProjections: facts.failedSaveProjections,
    } else {
      damageAmount: spellSaveSuccessDamageAmount(facts.successPolicy, facts.damageRoll),
      damageType: facts.damageType,
      failedSaveProjections: Set(),
    }
}
