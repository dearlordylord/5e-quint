// -*- mode: Bluespec; -*-

module d20TestCircumstanceCoreExamples {
  import d20TestCircumstanceCore.* from "./d20-test-circumstance-core"
  import d20TestRollMode.* from "./d20-test-roll-mode"

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
    assert(attackRollModeMatches(
      d20TestRollModeWithProneTarget(noMechanicalSources, 5),
      AdvantageD20TestRoll,
    )),
    assert(attackRollModeMatches(
      d20TestRollModeWithProneTarget(noMechanicalSources, 6),
      DisadvantageD20TestRoll,
    )),
    assert(attackRollModeMatches(
      d20TestRollModeWithProneTarget(mechanicalDisadvantage, 5),
      NormalD20TestRoll,
    )),
    assert(attackRollModeMatches(
      d20TestRollModeWithProneTarget(mechanicalAdvantage, 6),
      NormalD20TestRoll,
    )),
    assert(attackRollModeMatches(
      d20TestRollModeWithProneTarget(cancellingMechanicalSources, 5),
      NormalD20TestRoll,
    )),
    assert(attackRollModeMatches(
      d20TestRollModeWithUnconsciousTarget(noMechanicalSources, 5),
      AdvantageD20TestRoll,
    )),
    assert(attackRollModeMatches(
      d20TestRollModeWithUnconsciousTarget(noMechanicalSources, 6),
      NormalD20TestRoll,
    )),
    assert(proneAttackRollSource(-1) == ProneAttackRollSourceInvalidDistance),
    assert(d20TestRollModeWithProneTarget(
      noMechanicalSources,
      -1,
    ) == AttackRollModeInvalidDistance),
  }

  run d20TestCircumstanceProneAttacker = all {
    assert(d20TestRollModeWithProneAttacker(noMechanicalSources) == DisadvantageD20TestRoll),
    assert(d20TestRollModeWithProneAttacker(mechanicalDisadvantage) == DisadvantageD20TestRoll),
    assert(d20TestRollModeWithProneAttacker(mechanicalAdvantage) == NormalD20TestRoll),
    assert(d20TestRollModeWithProneAttacker(cancellingMechanicalSources) == NormalD20TestRoll),
    assert(attackRollModeMatches(
      d20TestRollModeWithProneAttackerAndProneTarget(noMechanicalSources, 5),
      NormalD20TestRoll,
    )),
    assert(attackRollModeMatches(
      d20TestRollModeWithProneAttackerAndProneTarget(noMechanicalSources, 6),
      DisadvantageD20TestRoll,
    )),
    assert(d20TestRollModeWithProneAttackerAndProneTarget(
      noMechanicalSources,
      -1,
    ) == AttackRollModeInvalidDistance),
  }

  run d20TestCircumstanceRangedAttackCloseCombat = {
    val qualifying: RangedAttackProximityEnemy = {
      distanceFeet: 5,
      canSeeAttacker: true,
      incapacitated: false,
    }
    all {
      assert(d20TestRollModeWithRangedAttackCloseCombat(noMechanicalSources, [])
        == NormalD20TestRoll),
      assert(d20TestRollModeWithRangedAttackCloseCombat(noMechanicalSources, [qualifying])
        == DisadvantageD20TestRoll),
      assert(d20TestRollModeWithRangedAttackCloseCombat(
        noMechanicalSources,
        [{ ...qualifying, distanceFeet: 6 }],
      ) == NormalD20TestRoll),
      assert(d20TestRollModeWithRangedAttackCloseCombat(
        noMechanicalSources,
        [{ ...qualifying, canSeeAttacker: false }],
      ) == NormalD20TestRoll),
      assert(d20TestRollModeWithRangedAttackCloseCombat(
        noMechanicalSources,
        [{ ...qualifying, incapacitated: true }],
      ) == NormalD20TestRoll),
      assert(d20TestRollModeWithRangedAttackCloseCombat(
        noMechanicalSources,
        [{ ...qualifying, incapacitated: true }, qualifying],
      ) == DisadvantageD20TestRoll),
      assert(d20TestRollModeWithRangedAttackCloseCombat(mechanicalAdvantage, [qualifying])
        == NormalD20TestRoll),
      // A Prone target 5 feet away gives Advantage, which cancels it.
      assert(attackRollModeMatches(
        d20TestRollModeWithRangedAttackCloseCombatAndProneTarget(
          noMechanicalSources,
          [qualifying],
          5,
        ),
        NormalD20TestRoll,
      )),
    }
  }

  run d20TestCircumstanceConditionSources = {
    val noAttacker = noAttackerAttackRollConditions
    val noTarget = noTargetAttackRollConditions
    val restrainedAttacker = { ...noAttacker, restrained: true }
    val poisonedAttacker = { ...noAttacker, poisoned: true }
    val restrainedTarget = { ...noTarget, restrained: true }
    val paralyzedTarget = { ...noTarget, paralyzed: true }
    val petrifiedTarget = { ...noTarget, petrified: true }
    val stunnedTarget = { ...noTarget, stunned: true }
    val proneTarget = { ...noTarget, prone: true }
    all {
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, restrainedAttacker, noTarget, 5),
        DisadvantageD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, poisonedAttacker, noTarget, 5),
        DisadvantageD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, noAttacker, restrainedTarget, 5),
        AdvantageD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, noAttacker, paralyzedTarget, 30),
        AdvantageD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, noAttacker, petrifiedTarget, 30),
        AdvantageD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, noAttacker, stunnedTarget, 30),
        AdvantageD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, restrainedAttacker, restrainedTarget, 5),
        NormalD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(mechanicalDisadvantage, noAttacker, stunnedTarget, 5),
        NormalD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, noAttacker, noTarget, 5),
        NormalD20TestRoll,
      )),
      // A Prone target's distance source applies only when the target is Prone.
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, restrainedAttacker, proneTarget, 5),
        NormalD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, noAttacker, { ...paralyzedTarget, prone: true }, 6),
        NormalD20TestRoll,
      )),
      assert(attackRollModeMatches(
        d20TestRollModeWithConditions(noMechanicalSources, noAttacker, paralyzedTarget, 6),
        AdvantageD20TestRoll,
      )),
      assert(d20TestRollModeWithConditions(
        noMechanicalSources,
        noAttacker,
        noTarget,
        -1,
      ) == AttackRollModeInvalidDistance),
    }
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
