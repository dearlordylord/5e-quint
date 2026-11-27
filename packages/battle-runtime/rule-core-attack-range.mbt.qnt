// -*- mode: Bluespec; -*-
// Closed range table; expectations come from the attack-damage semantic owner.
module ruleCoreAttackRangeMbt {
  import d20TestRollMode.* from "../shared-algebras/proofs/rule-core/d20-test-roll-mode"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"
  import zeroHitPointLifecycle.* from "../shared-algebras/proofs/rule-core/zero-hit-point-lifecycle"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"

  type AttackRollOffer = NoAttackRoll | OfferedAttackRoll(D20TestRollMode)
  var qCaseIndex: int
  var qOfferedAttackRoll: AttackRollOffer
  var qActionSpent: bool

  action init = all {
    qCaseIndex' = 0,
    qOfferedAttackRoll' = NoAttackRoll,
    qActionSpent' = false,
  }

  action replayRange(caseIndex: int, distanceFeet: int, advantage: bool): bool = {
    val result = resolveAttackProcedure(
      ActionAvailable,
      {
        capability: NormalAndLongRangedRangeCapability({ normalRangeFeet: 80, longRangeFeet: 320 }),
        distanceFeet: distanceFeet,
      },
      { naturalD20: 2, total: 6, armorClass: 18, criticalThreshold: 20 },
      { advantage: advantage, disadvantage: false },
      { kind: PlayerCharacter, hitPoints: 12, hitPointMaximum: 12, temporaryHitPoints: 0, dead: false, unconscious: false },
      resetDeathSavingThrowLifecycle,
      { attackKind: RangedAttack, damageType: PiercingDamage, rolledDamage: 0, damageModifier: 0, targetAdjustments: noDamageAdjustmentFacts, disposition: OrdinaryAttackDamage },
    )
    all {
      qCaseIndex == caseIndex - 1,
      qCaseIndex' = caseIndex,
      qOfferedAttackRoll' =
        if (result.actionQuota == ActionSpent) OfferedAttackRoll(result.attackRollMode)
        else NoAttackRoll,
      qActionSpent' = result.actionQuota == ActionSpent,
    }
  }

  action doNormalEndpoint = replayRange(1, 80, false)
  action doLongBand = replayRange(2, 81, false)
  action doLongEndpoint = replayRange(3, 320, false)
  action doNormalAdvantage = replayRange(4, 80, true)
  action doLongRangeCancellation = replayRange(5, 81, true)
  action doBeyondRange = replayRange(6, 321, false)

  action step = any {
    doNormalEndpoint,
    doLongBand,
    doLongEndpoint,
    doNormalAdvantage,
    doLongRangeCancellation,
    doBeyondRange,
  }
}
