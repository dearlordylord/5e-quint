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
    | CharacterSheetHitPointMaximumWizardLevelFour
    | CharacterSheetHitPointMaximumDwarfWizardLevelFour
    | CharacterSheetHitPointMaximumSorcererDraconicResilience
    | CharacterSheetHitPointMaximumReducedEffectiveMaximum
    | CharacterSheetHitPointMaximumRolledMinimumHigherLevelGain
    | CharacterSheetHitPointMaximumRolledMulticlass
    | CharacterSheetHitPointMaximumRolledMinimumGainAfterConstitutionIncrease

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
      higherLevelHitPointGains: [],
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
      higherLevelHitPointGains: [],
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
      higherLevelHitPointGains: [fixedHigherLevelHitPointGainFor(10, 1)],
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
      higherLevelHitPointGains: [fixedHigherLevelHitPointGainFor(10, 1)],
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
      higherLevelHitPointGains: [fixedHigherLevelHitPointGainFor(6, -4)],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      2,
      4,
    ),
  }

  action doProjectSorcererDraconicResilience = all {
    qState.replayIndex == 6,
    recordProjection(
      CharacterSheetHitPointMaximumSorcererDraconicResilience,
      {
      startingHitPointDie: 6,
      constitutionModifier: 1,
      higherLevelHitPointGains: [fixedHigherLevelHitPointGainFor(6, 1), fixedHigherLevelHitPointGainFor(6, 1)],
      hitPointMaximumBonus: 3,
      hitPointMaximumReduction: 0,
    },
      3,
      7,
    ),
  }

  action doProjectReducedEffectiveMaximum = all {
    qState.replayIndex == 7,
    recordProjection(
      CharacterSheetHitPointMaximumReducedEffectiveMaximum,
      {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      higherLevelHitPointGains: [fixedHigherLevelHitPointGainFor(10, 1)],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 3,
    },
      2,
      8,
    ),
  }

  action doProjectWizardLevelFour = all {
    qState.replayIndex == 4,
    recordProjection(
      CharacterSheetHitPointMaximumWizardLevelFour,
      {
      startingHitPointDie: 6,
      constitutionModifier: 2,
      higherLevelHitPointGains: [fixedHigherLevelHitPointGainFor(6, 2), fixedHigherLevelHitPointGainFor(6, 2), fixedHigherLevelHitPointGainFor(6, 2)],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      4,
      5,
    ),
  }

  action doProjectDwarfWizardLevelFour = all {
    qState.replayIndex == 5,
    recordProjection(
      CharacterSheetHitPointMaximumDwarfWizardLevelFour,
      {
      startingHitPointDie: 6,
      constitutionModifier: 2,
      higherLevelHitPointGains: [fixedHigherLevelHitPointGainFor(6, 2), fixedHigherLevelHitPointGainFor(6, 2), fixedHigherLevelHitPointGainFor(6, 2)],
      hitPointMaximumBonus: 4,
      hitPointMaximumReduction: 0,
    },
      4,
      6,
    ),
  }

  action doProjectRolledMinimumHigherLevelGain = all {
    qState.replayIndex == 8,
    recordProjection(
      CharacterSheetHitPointMaximumRolledMinimumHigherLevelGain,
      {
      startingHitPointDie: 6,
      constitutionModifier: -1,
      higherLevelHitPointGains: [rolledHigherLevelHitPointGainFor(6, 1, -1)],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      2,
      9,
    ),
  }

  action doProjectRolledMulticlass = all {
    qState.replayIndex == 9,
    recordProjection(
      CharacterSheetHitPointMaximumRolledMulticlass,
      {
      startingHitPointDie: 10,
      constitutionModifier: 1,
      higherLevelHitPointGains: [rolledHigherLevelHitPointGainFor(6, 5, 1), rolledHigherLevelHitPointGainFor(10, 8, 1)],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      3,
      10,
    ),
  }

  // Level 2 rolled 1 at Constitution 8; Constitution is now 10.
  action doProjectRolledMinimumGainAfterConstitutionIncrease = all {
    qState.replayIndex == 10,
    recordProjection(
      CharacterSheetHitPointMaximumRolledMinimumGainAfterConstitutionIncrease,
      {
      startingHitPointDie: 6,
      constitutionModifier: 0,
      higherLevelHitPointGains: [rolledHigherLevelHitPointGainFor(6, 1, -1)],
      hitPointMaximumBonus: 0,
      hitPointMaximumReduction: 0,
    },
      2,
      11,
    ),
  }

  action step = any {
    doProjectFighterLevelOne,
    doProjectFighterLevelTwo,
    doProjectWizardFighterMulticlass,
    doProjectMinimumHigherLevelGain,
    doProjectWizardLevelFour,
    doProjectDwarfWizardLevelFour,
    doProjectSorcererDraconicResilience,
    doProjectReducedEffectiveMaximum,
    doProjectRolledMinimumHigherLevelGain,
    doProjectRolledMulticlass,
    doProjectRolledMinimumGainAfterConstitutionIncrease,
  }
}
