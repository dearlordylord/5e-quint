// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_PROCEDURE

// This focused bridge computes expected attack, per-instance damage, Critical
// Hit, Advantage-bonus, and admitted hit-rider outcomes through the reusable
// rule core. The paired TypeScript driver supplies the same synthetic facts to
// production reducers and projects only their resulting state and frontiers.
module battleRuntimeStatBlockAttackResolutionMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"
  import damageComponentAdjustments.* from "../shared-algebras/proofs/rule-core/damage-component-adjustments"
  import statBlockAttackResolution.* from "../shared-algebras/proofs/rule-core/stat-block-attack-resolution"

  type StatBlockAttackParityScenario =
    | StaticOnlyHit
    | SingleRollableSelectedStaticHit
    | SingleRollableSelectedRolledHit
    | SingleRollableSelectedRolledMiss
    | SingleRollableSelectedRolledCritical
    | TwoRollableHeterogeneousHit
    | TwoDistinctStaticAggregationHit
    | IntrinsicStaticAndRollableHit
    | AdvantageBonusRiderHit
    | NormalRollAdvantageBonusInactiveHit
    | AdvantageBonusRiderMiss

  type StatBlockAttackParityHole = | TargetChoice | AttackRoll | DamageRoll

  var qScenario: StatBlockAttackParityScenario
  var qTargetHp: int
  var qTargetProne: bool
  var qAttackHits: bool
  var qCritical: bool
  var qRawDamageAmount: int
  var qAdjustedDamageAmount: int
  var qFactsLegal: bool
  var qProtocol: WitnessProtocol[StatBlockAttackParityHole]

  pure val targetInitialHp: int = 40
  pure def qHoles: Set[StatBlockAttackParityHole] = qProtocol.holes

  pure def baseStaticDamage(
    ordinal: int,
    damageType: RuleDamageType,
    amount: int
  ): SelectedStatBlockDamageComponent = {
    componentRole: BaseStatBlockDamageComponent({ ordinal: ordinal }),
    damageType: damageType,
    selectedAmount: SelectedStaticStatBlockDamage({ amount: amount }),
  }

  pure def baseRolledDamage(
    ordinal: int,
    damageType: RuleDamageType,
    baseDiceCount: int,
    dieSize: int,
    dieResults: List[int],
    flatModifier: int
  ): SelectedStatBlockDamageComponent = {
    componentRole: BaseStatBlockDamageComponent({ ordinal: ordinal }),
    damageType: damageType,
    selectedAmount: SelectedRolledStatBlockDamage({
      baseDiceCount: baseDiceCount,
      dieSize: dieSize,
      dieResults: dieResults,
      flatModifier: flatModifier,
    }),
  }

  pure def advantageBonusRolledDamage(
    damageType: RuleDamageType,
    dieResults: List[int]
  ): StatBlockAdvantageBonusDamage =
    SelectedStatBlockAdvantageBonusDamage({
      component: {
        componentRole: AdvantageBonusStatBlockDamageComponent,
        damageType: damageType,
        selectedAmount: SelectedRolledStatBlockDamage({
          baseDiceCount: 1,
          dieSize: 4,
          dieResults: dieResults,
          flatModifier: 0,
        }),
      },
    })

  pure def hitRoll: { naturalD20: int, total: int, armorClass: int, criticalThreshold: int } = {
    naturalD20: 12,
    total: 18,
    armorClass: 15,
    criticalThreshold: 20,
  }

  pure def missRoll: { naturalD20: int, total: int, armorClass: int, criticalThreshold: int } = {
    naturalD20: 2,
    total: 8,
    armorClass: 15,
    criticalThreshold: 20,
  }

  pure def criticalRoll: { naturalD20: int, total: int, armorClass: int, criticalThreshold: int } = {
    naturalD20: 20,
    total: 8,
    armorClass: 15,
    criticalThreshold: 20,
  }

  pure def proneRider: StatBlockHitRider =
    StatBlockProneIfTargetSizeAtMost({
      targetSize: MediumStatBlockCreature,
      maximumTargetSize: MediumStatBlockCreature,
      targetProneImmune: false,
    })

  pure def statBlockAttackParityFacts(
    scenario: StatBlockAttackParityScenario
  ): StatBlockAttackResolutionFacts =
    match scenario {
      | StaticOnlyHit => {
          attackRoll: hitRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent: baseStaticDamage(1, BludgeoningDamage, 3),
          remainingBaseDamageComponents: List(),
          advantageBonusDamage: NoStatBlockAdvantageBonusDamage,
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: NoStatBlockHitRider,
        }
      | SingleRollableSelectedStaticHit => {
          attackRoll: hitRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent: baseStaticDamage(1, SlashingDamage, 5),
          remainingBaseDamageComponents: List(),
          advantageBonusDamage: NoStatBlockAdvantageBonusDamage,
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: NoStatBlockHitRider,
        }
      | SingleRollableSelectedRolledHit => {
          attackRoll: hitRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent:
            baseRolledDamage(1, SlashingDamage, 1, 6, List(3), 2),
          remainingBaseDamageComponents: List(),
          advantageBonusDamage: NoStatBlockAdvantageBonusDamage,
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: NoStatBlockHitRider,
        }
      | SingleRollableSelectedRolledMiss => {
          attackRoll: missRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent:
            baseRolledDamage(1, SlashingDamage, 1, 6, List(), 2),
          remainingBaseDamageComponents: List(),
          advantageBonusDamage: NoStatBlockAdvantageBonusDamage,
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: NoStatBlockHitRider,
        }
      | SingleRollableSelectedRolledCritical => {
          attackRoll: criticalRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent:
            baseRolledDamage(1, SlashingDamage, 1, 6, List(3, 4), 2),
          remainingBaseDamageComponents: List(),
          advantageBonusDamage: NoStatBlockAdvantageBonusDamage,
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: NoStatBlockHitRider,
        }
      | TwoRollableHeterogeneousHit => {
          attackRoll: hitRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent: baseStaticDamage(1, PiercingDamage, 3),
          remainingBaseDamageComponents:
            List(baseRolledDamage(2, PoisonDamage, 1, 6, List(4), 0)),
          advantageBonusDamage: NoStatBlockAdvantageBonusDamage,
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: NoStatBlockHitRider,
        }
      | TwoDistinctStaticAggregationHit => {
          attackRoll: hitRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent: baseStaticDamage(1, PiercingDamage, 3),
          remainingBaseDamageComponents:
            List(baseStaticDamage(2, PoisonDamage, 3)),
          advantageBonusDamage: NoStatBlockAdvantageBonusDamage,
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: NoStatBlockHitRider,
        }
      | IntrinsicStaticAndRollableHit => {
          attackRoll: hitRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent: baseStaticDamage(1, FireDamage, 2),
          remainingBaseDamageComponents:
            List(baseRolledDamage(2, ColdDamage, 1, 8, List(4), 1)),
          advantageBonusDamage: NoStatBlockAdvantageBonusDamage,
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: NoStatBlockHitRider,
        }
      | AdvantageBonusRiderHit => {
          attackRoll: hitRoll,
          attackRollMode: AdvantageStatBlockAttackRoll,
          firstBaseDamageComponent: baseStaticDamage(1, SlashingDamage, 5),
          remainingBaseDamageComponents: List(),
          advantageBonusDamage: advantageBonusRolledDamage(SlashingDamage, List(3)),
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: proneRider,
        }
      | NormalRollAdvantageBonusInactiveHit => {
          attackRoll: hitRoll,
          attackRollMode: NormalStatBlockAttackRoll,
          firstBaseDamageComponent: baseStaticDamage(1, SlashingDamage, 5),
          remainingBaseDamageComponents: List(),
          advantageBonusDamage: advantageBonusRolledDamage(SlashingDamage, List()),
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: proneRider,
        }
      | AdvantageBonusRiderMiss => {
          attackRoll: missRoll,
          attackRollMode: AdvantageStatBlockAttackRoll,
          firstBaseDamageComponent: baseStaticDamage(1, SlashingDamage, 5),
          remainingBaseDamageComponents: List(),
          advantageBonusDamage: advantageBonusRolledDamage(SlashingDamage, List()),
          targetDamageAdjustments: noDamageAdjustmentFacts,
          hitRider: proneRider,
        }
    }

  pure def selectedAmountIsRolled(selectedAmount: SelectedStatBlockDamageAmount): bool =
    match selectedAmount {
      | SelectedStaticStatBlockDamage(_) => false
      | SelectedRolledStatBlockDamage(_) => true
    }

  pure def scenarioRequiresDamageRoll(scenario: StatBlockAttackParityScenario): bool = {
    val facts = statBlockAttackParityFacts(scenario)
    val impact = resolveStatBlockAttackImpact(facts)
    impact.attackHits and
      activeSelectedStatBlockDamageComponents(facts).foldl(
        false,
        (requiresRoll, component) =>
          requiresRoll or selectedAmountIsRolled(component.selectedAmount)
      )
  }

  pure def targetHpAfter(result: StatBlockAttackResolutionResult): int =
    if (targetInitialHp - result.adjustedDamageAmount < 0)
      0
    else
      targetInitialHp - result.adjustedDamageAmount

  action recordProjection(
    scenario: StatBlockAttackParityScenario,
    targetHp: int,
    targetProne: bool,
    attackHits: bool,
    critical: bool,
    rawDamageAmount: int,
    adjustedDamageAmount: int,
    factsLegal: bool,
    holes: Set[StatBlockAttackParityHole],
    result: WitnessResult
  ): bool = all {
    qScenario' = scenario,
    qTargetHp' = targetHp,
    qTargetProne' = targetProne,
    qAttackHits' = attackHits,
    qCritical' = critical,
    qRawDamageAmount' = rawDamageAmount,
    qAdjustedDamageAmount' = adjustedDamageAmount,
    qFactsLegal' = factsLegal,
    qProtocol' = { holes: holes, result: result },
  }

  action recordInitial(scenario: StatBlockAttackParityScenario): bool =
    recordProjection(
      scenario,
      targetInitialHp,
      false,
      false,
      false,
      0,
      0,
      true,
      Set(TargetChoice),
      WInit
    )

  action initStaticOnlyHit = recordInitial(StaticOnlyHit)
  action initSingleRollableSelectedStaticHit =
    recordInitial(SingleRollableSelectedStaticHit)
  action initSingleRollableSelectedRolledHit =
    recordInitial(SingleRollableSelectedRolledHit)
  action initSingleRollableSelectedRolledMiss =
    recordInitial(SingleRollableSelectedRolledMiss)
  action initSingleRollableSelectedRolledCritical =
    recordInitial(SingleRollableSelectedRolledCritical)
  action initTwoRollableHeterogeneousHit =
    recordInitial(TwoRollableHeterogeneousHit)
  action initTwoDistinctStaticAggregationHit =
    recordInitial(TwoDistinctStaticAggregationHit)
  action initIntrinsicStaticAndRollableHit =
    recordInitial(IntrinsicStaticAndRollableHit)
  action initAdvantageBonusRiderHit = recordInitial(AdvantageBonusRiderHit)
  action initNormalRollAdvantageBonusInactiveHit =
    recordInitial(NormalRollAdvantageBonusInactiveHit)
  action initAdvantageBonusRiderMiss = recordInitial(AdvantageBonusRiderMiss)

  action doFillTargetChoice = all {
    qHoles == Set(TargetChoice),
    recordProjection(
      qScenario,
      qTargetHp,
      qTargetProne,
      qAttackHits,
      qCritical,
      qRawDamageAmount,
      qAdjustedDamageAmount,
      qFactsLegal,
      Set(AttackRoll),
      WNeedsHoles
    ),
  }

  action doFillAttackRoll = {
    val semanticResult = resolveStatBlockAttack(statBlockAttackParityFacts(qScenario))
    val requiresDamageRoll = scenarioRequiresDamageRoll(qScenario)
    all {
      qHoles == Set(AttackRoll),
      recordProjection(
        qScenario,
        if (requiresDamageRoll) qTargetHp else targetHpAfter(semanticResult),
        qTargetProne or semanticResult.impact.targetProneApplied,
        semanticResult.impact.attackHits,
        semanticResult.impact.critical,
        if (requiresDamageRoll) 0 else semanticResult.impact.rawDamageAmount,
        if (requiresDamageRoll) 0 else semanticResult.adjustedDamageAmount,
        semanticResult.impact.factsLegal,
        if (requiresDamageRoll) Set(DamageRoll) else Set(),
        if (requiresDamageRoll) WNeedsHoles else WResolved
      ),
    }
  }

  action doFillDamageRoll = {
    val semanticResult = resolveStatBlockAttack(statBlockAttackParityFacts(qScenario))
    all {
      qHoles == Set(DamageRoll),
      recordProjection(
        qScenario,
        targetHpAfter(semanticResult),
        qTargetProne,
        semanticResult.impact.attackHits,
        semanticResult.impact.critical,
        semanticResult.impact.rawDamageAmount,
        semanticResult.adjustedDamageAmount,
        semanticResult.impact.factsLegal,
        Set(),
        WResolved
      ),
    }
  }

  action step = any {
    doFillTargetChoice,
    doFillAttackRoll,
    doFillDamageRoll,
  }
}
