// -*- mode: Bluespec; -*-

module ruleCoreAttackDamageDispositionMbt {
  import ruleCoreComponentRoute.* from "./rule-core-component-route"
  import attackRollDamageDiceCore.* from "../shared-algebras/proofs/rule-core/attack-roll-damage-dice-core"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import hitPointRecovery.* from "../shared-algebras/proofs/rule-core/hit-point-recovery"

  var qLastScenario: str
  var qAccepted: bool
  var qTargetHp: int
  var qTargetUnconscious: bool
  var qTargetDead: bool
  var qKnockOutRecovery: bool
  var qTargetDeathSavingThrowFailures: int
  var qReplayIndex: int
  var qComponentRoute: List[RuleCoreComponentRouteEvent]

  pure def componentRouteEvidence: List[RuleCoreComponentRouteEvent] =
    ruleCoreComponentRoute(RuleCoreAttackDamageDispositionOwner)

  pure def targetVitals: CreatureVitals = {
    kind: PlayerCharacter,
    hitPoints: 3,
    hitPointMaximum: 12,
    temporaryHitPoints: 0,
    dead: false,
    unconscious: false,
  }

  pure def dyingTargetVitals: CreatureVitals = {
    ...targetVitals,
    hitPoints: 0,
    unconscious: true,
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
    targetDeathSavingThrowFailures: int,
    replayIndex: int,
  ): bool = all {
    qLastScenario' = scenario,
    qAccepted' = accepted,
    qTargetHp' = targetHp,
    qTargetUnconscious' = targetUnconscious,
    qTargetDead' = targetDead,
    qKnockOutRecovery' = knockOutRecovery,
    qTargetDeathSavingThrowFailures' = targetDeathSavingThrowFailures,
    qReplayIndex' = replayIndex,
    qComponentRoute' = componentRouteEvidence,
  }

  action init = recordProjection("init", true, 3, false, false, false, 0, 0)

  action doMeleeKnockOut = {
    val result = resolveAttackProcedure(
      ActionAvailable,
      {
        capability: MeleeReachRangeCapability({ reachFeet: 5 }),
        distanceFeet: 5,
      },
      rollFacts,
      { advantage: false, disadvantage: false },
      targetVitals,
      resetDeathSavingThrowLifecycle,
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
        deathSavingThrowFailures(result.damageResult.deathSavingThrows),
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
      recordProjection("ranged-knock-out-rejected", false, 3, false, false, false, 0, 2),
    }
  }

  // playing-the-game.md, "Damage at 0 Hit Points" and "Unconscious": an
  // adjacent hit on a Dying target is a Critical Hit and adds two failures.
  action doMeleeHitOnDyingTarget = {
    val result = resolveAttackProcedure(
      ActionAvailable,
      {
        capability: MeleeReachRangeCapability({ reachFeet: 5 }),
        distanceFeet: 5,
      },
      rollFacts,
      { advantage: false, disadvantage: false },
      dyingTargetVitals,
      resetDeathSavingThrowLifecycle,
      damageFacts(MeleeAttack, OrdinaryAttackDamage),
    )
    all {
      qReplayIndex == 2,
      result.actionQuota == ActionSpent,
      recordProjection(
        "melee-hit-on-dying-target",
        true,
        result.damageResult.vitals.hitPoints,
        result.damageResult.vitals.unconscious,
        result.damageResult.vitals.dead,
        false,
        deathSavingThrowFailures(result.damageResult.deathSavingThrows),
        3,
      ),
    }
  }

  action step = any {
    doMeleeKnockOut,
    doRejectRangedKnockOut,
    doMeleeHitOnDyingTarget,
  }
}
