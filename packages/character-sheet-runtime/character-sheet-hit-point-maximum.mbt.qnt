// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.HIT_POINTS.MAXIMUM_DERIVATION

module characterSheetHitPointMaximumMbt {
  import hitPointMaximum.* from "../shared-algebras/proofs/rule-core/hit-point-maximum"

  var qLastResult: str
  var qNormalHitPointMaximum: int
  var qEffectiveHitPointMaximum: int
  var qHitDiceTotal: int
  var qHitPointMaximumReduction: int
  var qReplayIndex: int

  action recordProjection(
    lastResult: str,
    facts: HitPointMaximumFacts,
    hitDiceTotal: int,
    replayIndex: int,
  ): bool = all {
    legalHitPointMaximumFacts(facts),
    qLastResult' = lastResult,
    qNormalHitPointMaximum' = normalHitPointMaximum(facts),
    qEffectiveHitPointMaximum' = effectiveHitPointMaximum(facts),
    qHitDiceTotal' = hitDiceTotal,
    qHitPointMaximumReduction' = facts.hitPointMaximumReduction,
    qReplayIndex' = replayIndex,
  }

  action init =
    recordProjection("init", {
      startingHitPointDie: 10,
      constitutionModifier: 0,
      fixedHigherLevelHitPointDice: [],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }, 1, 0)

  action doProjectFighterLevelOne = all {
    qReplayIndex == 0,
    recordProjection("fighter-level-one", {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }, 1, 1),
  }

  action doProjectFighterLevelTwo = all {
    qReplayIndex == 1,
    recordProjection("fighter-level-two", {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [10],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }, 2, 2),
  }

  action doProjectWizardFighterMulticlass = all {
    qReplayIndex == 2,
    recordProjection("wizard-fighter-multiclass", {
      startingHitPointDie: 6,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [10],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }, 2, 3),
  }

  action doProjectMinimumHigherLevelGain = all {
    qReplayIndex == 3,
    recordProjection("minimum-higher-level-gain", {
      startingHitPointDie: 6,
      constitutionModifier: -4,
      fixedHigherLevelHitPointDice: [6],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    }, 2, 4),
  }

  action doProjectSorcererDraconicResilience = all {
    qReplayIndex == 4,
    recordProjection("sorcerer-draconic-resilience", {
      startingHitPointDie: 6,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [6, 6],
      hitPointMaximumBonus: 3,
      hitPointMaximumReduction: 0,
    }, 3, 5),
  }

  action doProjectReducedEffectiveMaximum = all {
    qReplayIndex == 5,
    recordProjection("reduced-effective-maximum", {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [10],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 3,
    }, 2, 6),
  }

  action step = any {
    doProjectFighterLevelOne,
    doProjectFighterLevelTwo,
    doProjectWizardFighterMulticlass,
    doProjectMinimumHigherLevelGain,
    doProjectSorcererDraconicResilience,
    doProjectReducedEffectiveMaximum,
  }
}
