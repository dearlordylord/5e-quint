// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls defines spell
//   damage dice, modifiers, and applying damage to Hit Points.
// - .references/srd-5.2.1/Playing-the-Game.md#Critical Hits defines doubled
//   damage dice for critical hits.
// - .references/srd-5.2.1/Playing-the-Game.md#Saving Throws and Damage and
//   #Half Damage define no-damage and half-damage successful-save policies.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Types and
//   UBIQUITOUS_LANGUAGE.md define Damage Type, Critical Hit, Attack Roll, and
//   Saving Throw.
module ruleCoreExactDamageProjectionMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import spellDamageProjectionCore.* from "../shared-algebras/proofs/rule-core/spell-damage-projection-core"

  type ExactDamageProjectionScenario =
    | DirectInstanceDamageProjection
    | AttackCriticalDamageProjection
    | SaveSuccessHalfDamageProjection
    | SaveSuccessNoDamageProjection

  var qScenario: ExactDamageProjectionScenario
  var qDamageType: RuleDamageType
  var qDamageAmount: int
  var qInstanceCount: int
  var qDamagePerInstance: int
  var qBaseDamageDice: int
  var qRolledDamageDiceCount: int
  var qDamageDieSize: int
  var qCritical: bool
  var qSuccessPolicy: SpellSaveSuccessDamagePolicy
  var qSavingThrowFailed: bool
  var qTargetInitialHp: int
  var qTargetHp: int
  var qDamageToHitPoints: int
  var qReplayIndex: int
  var qComponentRoute: List[RuleCoreComponentRouteEvent]

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreSpellProcedureProfileOwner)
      .concat(ruleCoreComponentRoute(RuleCoreHitPointDamageOwner))

  pure def targetInitialHp: int = 20

  pure def targetVitals(hitPoints: int): CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: hitPoints,
    hitPointMaximum: targetInitialHp,
    temporaryHitPoints: 0,
    dead: false,
    unconscious: false,
  }

  action recordProjection(
    scenario: ExactDamageProjectionScenario,
    damageType: RuleDamageType,
    damageAmount: int,
    instanceCount: int,
    damagePerInstance: int,
    baseDamageDice: int,
    rolledDamageDiceCount: int,
    damageDieSize: int,
    critical: bool,
    successPolicy: SpellSaveSuccessDamagePolicy,
    savingThrowFailed: bool,
    applied: DamageResult,
    replayIndex: int,
  ): bool = all {
    qScenario' = scenario,
    qDamageType' = damageType,
    qDamageAmount' = damageAmount,
    qInstanceCount' = instanceCount,
    qDamagePerInstance' = damagePerInstance,
    qBaseDamageDice' = baseDamageDice,
    qRolledDamageDiceCount' = rolledDamageDiceCount,
    qDamageDieSize' = damageDieSize,
    qCritical' = critical,
    qSuccessPolicy' = successPolicy,
    qSavingThrowFailed' = savingThrowFailed,
    qTargetInitialHp' = targetInitialHp,
    qTargetHp' = applied.vitals.hitPoints,
    qDamageToHitPoints' = applied.damageToHitPoints,
    qReplayIndex' = replayIndex,
    qComponentRoute' = componentRouteEvidence,
  }

  action init = {
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), 0)
    all {
      recordProjection(
        DirectInstanceDamageProjection,
        ForceDamage,
        0,
        0,
        0,
        0,
        0,
        0,
        false,
        SpellNoDamageOnSuccessfulSave,
        false,
        applied,
        0,
      ),
    }
  }

  action doDirectInstanceDamage = {
    val facts: DirectSpellDamageFacts = {
      damageType: ForceDamage,
      instanceCount: 3,
      damagePerInstance: 4,
      minimumInstanceCount: 1,
      maximumInstanceCount: 5,
      minimumDamagePerInstance: 2,
      maximumDamagePerInstance: 5,
    }
    val result = resolveDirectSpellDamage(facts)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 0,
      recordProjection(
        DirectInstanceDamageProjection,
        result.damageType,
        result.damageAmount,
        facts.instanceCount,
        facts.damagePerInstance,
        0,
        0,
        0,
        false,
        SpellNoDamageOnSuccessfulSave,
        false,
        applied,
        1,
      ),
    }
  }

  action doAttackCriticalDamage = {
    val facts: SpellAttackDamageBranchFacts = {
      attackRoll: { naturalD20: 20, total: 20, armorClass: 13, criticalThreshold: 20 },
      damageType: ColdDamage,
      hitProjections: Set(),
      baseDamageDice: 1,
      maximumBaseDamageDice: 4,
      rolledDamageDiceCount: 2,
      damageDieSize: 8,
      damageRoll: 7,
    }
    val result = resolveSpellAttackDamageBranch(facts)
    val attackOutcome = resolveAttackRoll(facts.attackRoll)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 1,
      recordProjection(
        AttackCriticalDamageProjection,
        result.damageType,
        result.damageAmount,
        0,
        0,
        facts.baseDamageDice,
        facts.rolledDamageDiceCount,
        facts.damageDieSize,
        attackOutcome.critical,
        SpellNoDamageOnSuccessfulSave,
        false,
        applied,
        2,
      ),
    }
  }

  action doSaveSuccessHalfDamage = {
    val facts: SpellSaveDamageBranchFacts = {
      damageType: FireDamage,
      successPolicy: SpellHalfDamageOnSuccessfulSave,
      failedSaveProjections: Set(),
      savingThrowFailed: false,
      damageRoll: 9,
    }
    val result = resolveSpellSaveDamageBranch(facts)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 2,
      recordProjection(
        SaveSuccessHalfDamageProjection,
        result.damageType,
        result.damageAmount,
        0,
        0,
        0,
        0,
        0,
        false,
        facts.successPolicy,
        facts.savingThrowFailed,
        applied,
        3,
      ),
    }
  }

  action doSaveSuccessNoDamage = {
    val facts: SpellSaveDamageBranchFacts = {
      damageType: AcidDamage,
      successPolicy: SpellNoDamageOnSuccessfulSave,
      failedSaveProjections: Set(),
      savingThrowFailed: false,
      damageRoll: 6,
    }
    val result = resolveSpellSaveDamageBranch(facts)
    val applied = applyResolvedDamageToPositiveHitPoints(targetVitals(targetInitialHp), result.damageAmount)
    all {
      qReplayIndex == 3,
      recordProjection(
        SaveSuccessNoDamageProjection,
        result.damageType,
        result.damageAmount,
        0,
        0,
        0,
        0,
        0,
        false,
        facts.successPolicy,
        facts.savingThrowFailed,
        applied,
        4,
      ),
    }
  }

  action step = any {
    doDirectInstanceDamage,
    doAttackCriticalDamage,
    doSaveSuccessHalfDamage,
    doSaveSuccessNoDamage,
  }
}
