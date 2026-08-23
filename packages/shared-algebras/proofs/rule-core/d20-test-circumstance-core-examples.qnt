// -*- mode: Bluespec; -*-

module d20TestCircumstanceCoreExamples {
  import d20TestCircumstanceCore.* from "./d20-test-circumstance-core"

  pure val noMechanicalSources: D20TestRollModeSources = {
    advantage: false,
    disadvantage: false,
  }

  pure val mechanicalAdvantage: D20TestRollModeSources = {
    advantage: true,
    disadvantage: false,
  }

  pure val mechanicalDisadvantage: D20TestRollModeSources = {
    advantage: false,
    disadvantage: true,
  }

  pure val cancellingMechanicalSources: D20TestRollModeSources = {
    advantage: true,
    disadvantage: true,
  }

  run d20TestCircumstanceSourceCombination = all {
    assert(d20TestRollModeFromSources(noMechanicalSources) == NormalD20TestRoll),
    assert(d20TestRollModeFromSources(mechanicalAdvantage) == AdvantageD20TestRoll),
    assert(d20TestRollModeFromSources(mechanicalDisadvantage) == DisadvantageD20TestRoll),
    assert(d20TestRollModeFromSources(cancellingMechanicalSources) == NormalD20TestRoll),
    assert(d20TestRollModeWithTableCircumstance(
      noMechanicalSources,
      TableGrantsAdvantage,
    ) == AdvantageD20TestRoll),
    assert(d20TestRollModeWithTableCircumstance(
      noMechanicalSources,
      TableImposesDisadvantage,
    ) == DisadvantageD20TestRoll),
    assert(d20TestRollModeWithTableCircumstance(
      mechanicalAdvantage,
      TableGrantsAdvantage,
    ) == AdvantageD20TestRoll),
    assert(d20TestRollModeWithTableCircumstance(
      mechanicalDisadvantage,
      TableImposesDisadvantage,
    ) == DisadvantageD20TestRoll),
    assert(d20TestRollModeWithTableCircumstance(
      mechanicalAdvantage,
      TableImposesDisadvantage,
    ) == NormalD20TestRoll),
    assert(d20TestRollModeWithTableCircumstance(
      mechanicalDisadvantage,
      TableGrantsAdvantage,
    ) == NormalD20TestRoll),
    assert(d20TestRollModeWithTableCircumstance(
      cancellingMechanicalSources,
      TableGrantsAdvantage,
    ) == NormalD20TestRoll),
    assert(d20TestRollModeWithTableCircumstance(
      cancellingMechanicalSources,
      TableImposesDisadvantage,
    ) == NormalD20TestRoll),
    assert(d20TestRollModeWithProneTarget(
      noMechanicalSources,
      5,
    ) == AdvantageD20TestRoll),
    assert(d20TestRollModeWithProneTarget(
      noMechanicalSources,
      6,
    ) == DisadvantageD20TestRoll),
    assert(d20TestRollModeWithProneTarget(
      mechanicalDisadvantage,
      5,
    ) == NormalD20TestRoll),
    assert(d20TestRollModeWithProneTarget(
      mechanicalAdvantage,
      6,
    ) == NormalD20TestRoll),
    assert(d20TestRollModeWithProneTarget(
      cancellingMechanicalSources,
      5,
    ) == NormalD20TestRoll),
    assert(not(validProneAttackRollDistance(-1))),
    assert(proneAttackRollSource(-1) == noMechanicalSources),
  }

  run d20TestCircumstanceExactRequestBinding = {
    val abilityCheckRequest: D20TestRequestRef = {
      lineage: 7,
      testOrdinal: 1,
      testKind: AbilityCheckD20Test,
    }
    val savingThrowRequest: D20TestRequestRef = {
      lineage: 7,
      testOrdinal: 2,
      testKind: SavingThrowD20Test,
    }
    val attackRollRequest: D20TestRequestRef = {
      lineage: 7,
      testOrdinal: 3,
      testKind: AttackRollD20Test,
    }
    val attackDecision: TableD20TestCircumstanceDecision = {
      requestRef: attackRollRequest,
      source: TableImposesDisadvantage,
    }
    all {
      assert(tableD20TestCircumstanceDecisionMatches(
        attackRollRequest,
        attackDecision,
      )),
      assert(not(tableD20TestCircumstanceDecisionMatches(
        abilityCheckRequest,
        attackDecision,
      ))),
      assert(not(tableD20TestCircumstanceDecisionMatches(
        savingThrowRequest,
        attackDecision,
      ))),
      assert(not(tableD20TestCircumstanceDecisionMatches(
        { ...attackRollRequest, lineage: 8 },
        attackDecision,
      ))),
      assert(not(tableD20TestCircumstanceDecisionMatches(
        { ...attackRollRequest, testOrdinal: 4 },
        attackDecision,
      ))),
    }
  }
}
