// -*- mode: Bluespec; -*-
// RAW-COVERAGE: verification-owner:qnt-proof RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof stat-block.attack-procedure

module statBlockAttackResolutionInductive {
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import statBlockAttackResolution.* from "./stat-block-attack-resolution"

  type StatBlockAttackProofScenario =
    | ProofStaticCritical
    | ProofRolledCritical
    | ProofHeterogeneousComponents
    | ProofSameTypeNormal
    | ProofSameTypeAdvantage
    | ProofMissWithRider
    | ProofHitWithRider

  var qScenario: StatBlockAttackProofScenario
  var qFactsLegal: bool
  var qHits: bool
  var qCritical: bool
  var qRawDamageAmount: int
  var qTargetProneApplied: bool

  pure def proofBaseStaticDamage(
    ordinal: int,
    damageType: RuleDamageType,
    amount: int
  ): SelectedStatBlockDamageComponent = {
    componentRole: BaseStatBlockDamageComponent({ ordinal: ordinal }),
    damageType: damageType,
    selectedAmount: SelectedStaticStatBlockDamage({ amount: amount }),
  }

  pure def proofBaseRolledDamage(
    ordinal: int,
    damageType: RuleDamageType,
    dieResults: List[int],
    flatModifier: int
  ): SelectedStatBlockDamageComponent = {
    componentRole: BaseStatBlockDamageComponent({ ordinal: ordinal }),
    damageType: damageType,
    selectedAmount: SelectedRolledStatBlockDamage({
      baseDiceCount: 1,
      dieSize: 6,
      dieResults: dieResults,
      flatModifier: flatModifier,
    }),
  }

  pure def proofAdvantageBonus: StatBlockAdvantageBonusDamage =
    SelectedStatBlockAdvantageBonusDamage({
      component: {
        componentRole: AdvantageBonusStatBlockDamageComponent,
        damageType: SlashingDamage,
        selectedAmount: SelectedStaticStatBlockDamage({ amount: 3 }),
      },
    })

  pure def proofRider: StatBlockHitRider =
    StatBlockProneIfTargetSizeAtMost({
      targetSize: MediumStatBlockCreature,
      maximumTargetSize: MediumStatBlockCreature,
      targetProneImmune: false,
    })

  pure def ordinaryHitRoll: AttackRollProcedureFacts = {
    naturalD20: 12,
    total: 18,
    armorClass: 15,
    criticalThreshold: 20,
  }

  pure def criticalHitRoll: AttackRollProcedureFacts =
    ordinaryHitRoll.with("naturalD20", 20)

  pure def missRoll: AttackRollProcedureFacts =
    ordinaryHitRoll.with("total", 8).with("naturalD20", 2)

  pure def proofFacts(
    attackRoll: AttackRollProcedureFacts,
    attackRollMode: StatBlockAttackRollMode,
    firstBaseDamageComponent: SelectedStatBlockDamageComponent,
    remainingBaseDamageComponents: List[SelectedStatBlockDamageComponent],
    advantageBonusDamage: StatBlockAdvantageBonusDamage,
    hitRider: StatBlockHitRider
  ): StatBlockAttackResolutionFacts = {
    attackRoll: attackRoll,
    attackRollMode: attackRollMode,
    firstBaseDamageComponent: firstBaseDamageComponent,
    remainingBaseDamageComponents: remainingBaseDamageComponents,
    advantageBonusDamage: advantageBonusDamage,
    targetDamageAdjustments: noDamageAdjustmentFacts,
    hitRider: hitRider,
  }

  // Prebinding each finite impact keeps the proof state identical while
  // avoiding a symbolic scenario match over heterogeneous List/variant values.
  pure def proofStaticCriticalImpact: StatBlockAttackImpact =
    resolveStatBlockAttackImpact(proofFacts(
      criticalHitRoll,
      NormalStatBlockAttackRoll,
      proofBaseStaticDamage(1, PiercingDamage, 5),
      List(),
      NoStatBlockAdvantageBonusDamage,
      NoStatBlockHitRider
    ))

  pure def proofRolledCriticalImpact: StatBlockAttackImpact =
    resolveStatBlockAttackImpact(proofFacts(
      criticalHitRoll,
      NormalStatBlockAttackRoll,
      proofBaseRolledDamage(1, SlashingDamage, List(2, 3), 2),
      List(),
      NoStatBlockAdvantageBonusDamage,
      NoStatBlockHitRider
    ))

  pure def proofHeterogeneousComponentsImpact: StatBlockAttackImpact =
    resolveStatBlockAttackImpact(proofFacts(
      ordinaryHitRoll,
      NormalStatBlockAttackRoll,
      proofBaseStaticDamage(1, PiercingDamage, 4),
      List(proofBaseRolledDamage(2, PoisonDamage, List(3), 0)),
      NoStatBlockAdvantageBonusDamage,
      NoStatBlockHitRider
    ))

  pure def proofSameTypeNormalImpact: StatBlockAttackImpact =
    resolveStatBlockAttackImpact(proofFacts(
      ordinaryHitRoll,
      NormalStatBlockAttackRoll,
      proofBaseStaticDamage(1, SlashingDamage, 5),
      List(),
      proofAdvantageBonus,
      NoStatBlockHitRider
    ))

  pure def proofSameTypeAdvantageImpact: StatBlockAttackImpact =
    resolveStatBlockAttackImpact(proofFacts(
      ordinaryHitRoll,
      AdvantageStatBlockAttackRoll,
      proofBaseStaticDamage(1, SlashingDamage, 5),
      List(),
      proofAdvantageBonus,
      NoStatBlockHitRider
    ))

  pure def proofMissWithRiderImpact: StatBlockAttackImpact =
    resolveStatBlockAttackImpact(proofFacts(
      missRoll,
      NormalStatBlockAttackRoll,
      proofBaseRolledDamage(1, PiercingDamage, List(), 2),
      List(),
      NoStatBlockAdvantageBonusDamage,
      proofRider
    ))

  pure def proofHitWithRiderImpact: StatBlockAttackImpact =
    resolveStatBlockAttackImpact(proofFacts(
      ordinaryHitRoll,
      NormalStatBlockAttackRoll,
      proofBaseStaticDamage(1, PiercingDamage, 2),
      List(),
      NoStatBlockAdvantageBonusDamage,
      proofRider
    ))

  action recordScenario(
    scenario: StatBlockAttackProofScenario,
    impact: StatBlockAttackImpact
  ): bool = all {
    qScenario' = scenario,
    qFactsLegal' = impact.factsLegal,
    qHits' = impact.attackHits,
    qCritical' = impact.critical,
    qRawDamageAmount' = impact.rawDamageAmount,
    qTargetProneApplied' = impact.targetProneApplied,
  }

  action doRecordStaticCritical =
    recordScenario(ProofStaticCritical, proofStaticCriticalImpact)
  action doRecordRolledCritical =
    recordScenario(ProofRolledCritical, proofRolledCriticalImpact)
  action doRecordHeterogeneousComponents =
    recordScenario(
      ProofHeterogeneousComponents,
      proofHeterogeneousComponentsImpact
    )
  action doRecordSameTypeNormal =
    recordScenario(ProofSameTypeNormal, proofSameTypeNormalImpact)
  action doRecordSameTypeAdvantage =
    recordScenario(ProofSameTypeAdvantage, proofSameTypeAdvantageImpact)
  action doRecordMissWithRider =
    recordScenario(ProofMissWithRider, proofMissWithRiderImpact)
  action doRecordHitWithRider =
    recordScenario(ProofHitWithRider, proofHitWithRiderImpact)

  action chooseProofScenario = any {
    doRecordStaticCritical,
    doRecordRolledCritical,
    doRecordHeterogeneousComponents,
    doRecordSameTypeNormal,
    doRecordSameTypeAdvantage,
    doRecordMissWithRider,
    doRecordHitWithRider,
  }

  action init = any { chooseProofScenario, }
  action step = any { chooseProofScenario, }

  // Branch budget: seven projection-shaped scenarios cover the cross-product
  // boundaries without importing authored records or broad battle state.
  val invariant = all {
    qScenario.in(Set(
      ProofStaticCritical,
      ProofRolledCritical,
      ProofHeterogeneousComponents,
      ProofSameTypeNormal,
      ProofSameTypeAdvantage,
      ProofMissWithRider,
      ProofHitWithRider
    )),
    qFactsLegal.in(Set(true, false)),
    qHits.in(Set(true, false)),
    qCritical.in(Set(true, false)),
    qTargetProneApplied.in(Set(true, false)),
    qFactsLegal,
    qRawDamageAmount.in(0.to(16)),
    qCritical implies qHits,
    not(qHits) implies all {
      qRawDamageAmount == 0,
      not(qTargetProneApplied),
    },
    qTargetProneApplied implies qHits,
    (qScenario == ProofStaticCritical) implies all {
      qCritical,
      qRawDamageAmount == 5,
    },
    (qScenario == ProofRolledCritical) implies all {
      qCritical,
      qRawDamageAmount == 7,
    },
    (qScenario == ProofSameTypeNormal) implies qRawDamageAmount == 5,
    (qScenario == ProofSameTypeAdvantage) implies qRawDamageAmount == 8,
    (qScenario == ProofMissWithRider) implies not(qTargetProneApplied),
    (qScenario == ProofHitWithRider) implies qTargetProneApplied,
  }
}
