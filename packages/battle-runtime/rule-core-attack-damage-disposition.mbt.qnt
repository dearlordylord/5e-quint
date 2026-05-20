// -*- mode: Bluespec; -*-

module ruleCoreAttackDamageDispositionMbt {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"

  var qLastScenario: str
  var qAccepted: bool
  var qTargetHp: int
  var qTargetUnconscious: bool
  var qTargetDead: bool
  var qKnockOutRecovery: bool
  var qReplayIndex: int

  pure def targetVitals: CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: 3,
    hitPointMaximum: 12,
    temporaryHitPoints: 0,
    dead: false,
    unconscious: false,
  }

  pure def rollFacts: AttackRollProcedureFacts = {
    naturalD20: 10,
    total: 15,
    armorClass: 10,
    criticalThreshold: 20,
  }

  pure def damageFacts(
    attackKind: AttackKind,
    disposition: AttackDamageDisposition
  ): AttackDamageProcedureFacts = {
    attackKind: attackKind,
    damageType: SlashingDamage,
    rolledDamage: 8,
    damageModifier: 0,
    targetAdjustments: noDamageAdjustmentFacts,
    disposition: disposition,
  }

  action recordProjection(
    scenario: str,
    accepted: bool,
    targetHp: int,
    targetUnconscious: bool,
    targetDead: bool,
    knockOutRecovery: bool,
    replayIndex: int,
  ): bool = all {
    qLastScenario' = scenario,
    qAccepted' = accepted,
    qTargetHp' = targetHp,
    qTargetUnconscious' = targetUnconscious,
    qTargetDead' = targetDead,
    qKnockOutRecovery' = knockOutRecovery,
    qReplayIndex' = replayIndex,
  }

  action init = recordProjection("init", true, 3, false, false, false, 0)

  action doMeleeKnockOut = {
    val result = resolveAttackProcedure(
      ActionAvailable,
      WithinMeleeReach,
      rollFacts,
      targetVitals,
      damageFacts(MeleeAttack, KnockOutAttackDamage),
    )
    all {
      qReplayIndex == 0,
      recordProjection(
        "melee-knock-out",
        true,
        result.damageResult.vitals.hitPoints,
        result.damageResult.vitals.unconscious,
        result.damageResult.vitals.dead,
        result.damageResult.positiveHitPointUnconsciousRecovery == EndsWhenHitPointsRegained,
        1,
      ),
    }
  }

  action doRejectRangedKnockOut = {
    val facts = damageFacts(RangedAttack, KnockOutAttackDamage)
    all {
      qReplayIndex == 1,
      not(attackDamageDispositionIsLegal(
        targetVitals,
        damageAmountBeforeHitPoints(facts),
        facts,
      )),
      recordProjection("ranged-knock-out-rejected", false, 3, false, false, false, 2),
    }
  }

  action step = any {
    doMeleeKnockOut,
    doRejectRangedKnockOut,
  }
}
