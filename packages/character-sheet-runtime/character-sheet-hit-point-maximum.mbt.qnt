// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.HIT_POINTS.MAXIMUM_DERIVATION

module characterSheetHitPointMaximumMbt {
  import hitPointMaximum.* from "../shared-algebras/proofs/rule-core/hit-point-maximum"

  type CharacterSheetHitPointMaximumOutcome =
    | CharacterSheetHitPointMaximumInit
    | CharacterSheetHitPointMaximumFighterLevelOne
    | CharacterSheetHitPointMaximumFighterLevelTwo
    | CharacterSheetHitPointMaximumWizardFighterMulticlass
    | CharacterSheetHitPointMaximumMinimumHigherLevelGain
    | CharacterSheetHitPointMaximumSorcererDraconicResilience
    | CharacterSheetHitPointMaximumReducedEffectiveMaximum

  type CharacterSheetHitPointMaximumState = {
    outcome: CharacterSheetHitPointMaximumOutcome,
    normalHitPointMaximum: int,
    effectiveHitPointMaximum: int,
    hitDiceTotal: int,
    hitPointMaximumReduction: int,
    replayIndex: int,
  }

  var qState: CharacterSheetHitPointMaximumState

  action recordProjection(
    outcome: CharacterSheetHitPointMaximumOutcome,
    facts: HitPointMaximumFacts,
    hitDiceTotal: int,
    replayIndex: int,
  ): bool = all {
    legalHitPointMaximumFacts(facts),
    qState' = {
      outcome: outcome,
      normalHitPointMaximum: normalHitPointMaximum(facts),
      effectiveHitPointMaximum: effectiveHitPointMaximum(facts),
      hitDiceTotal: hitDiceTotal,
      hitPointMaximumReduction: facts.hitPointMaximumReduction,
      replayIndex: replayIndex,
    },
  }

  action init =
    recordProjection(
      CharacterSheetHitPointMaximumInit,
      {
      startingHitPointDie: 10,
      constitutionModifier: 0,
      fixedHigherLevelHitPointDice: [],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      1,
      0,
    )

  action doProjectFighterLevelOne = all {
    qState.replayIndex == 0,
    recordProjection(
      CharacterSheetHitPointMaximumFighterLevelOne,
      {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      1,
      1,
    ),
  }

  action doProjectFighterLevelTwo = all {
    qState.replayIndex == 1,
    recordProjection(
      CharacterSheetHitPointMaximumFighterLevelTwo,
      {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [10],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      2,
      2,
    ),
  }

  action doProjectWizardFighterMulticlass = all {
    qState.replayIndex == 2,
    recordProjection(
      CharacterSheetHitPointMaximumWizardFighterMulticlass,
      {
      startingHitPointDie: 6,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [10],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      2,
      3,
    ),
  }

  action doProjectMinimumHigherLevelGain = all {
    qState.replayIndex == 3,
    recordProjection(
      CharacterSheetHitPointMaximumMinimumHigherLevelGain,
      {
      startingHitPointDie: 6,
      constitutionModifier: -4,
      fixedHigherLevelHitPointDice: [6],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      2,
      4,
    ),
  }

  action doProjectSorcererDraconicResilience = all {
    qState.replayIndex == 4,
    recordProjection(
      CharacterSheetHitPointMaximumSorcererDraconicResilience,
      {
      startingHitPointDie: 6,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [6, 6],
      hitPointMaximumBonus: 3,
      hitPointMaximumReduction: 0,
    },
      3,
      5,
    ),
  }

  action doProjectReducedEffectiveMaximum = all {
    qState.replayIndex == 5,
    recordProjection(
      CharacterSheetHitPointMaximumReducedEffectiveMaximum,
      {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      fixedHigherLevelHitPointDice: [10],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 3,
    },
      2,
      6,
    ),
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
