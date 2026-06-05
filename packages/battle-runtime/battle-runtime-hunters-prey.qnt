// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.hunters-prey
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module battleRuntimeHuntersPrey {
  // RAW anchors:
  // - Classes/Ranger.md Level 3: Hunter's Prey.
  // - UBIQUITOUS_LANGUAGE.md: Attack Roll, Hit Points.

  type HuntersPreyChoice = NoHuntersPreyChoice | ColossusSlayerChoice | HordeBreakerChoice

  type HuntersPreyState = {
    selectedChoice: HuntersPreyChoice,
    targetMissingHitPoints: bool,
    colossusSlayerChosen: bool,
    colossusSlayerUsedThisTurn: bool,
    hordeBreakerUsedThisTurn: bool,
    weaponAttackHit: bool,
    weaponAttackMade: bool,
    secondTargetDifferent: bool,
    secondTargetWithinFiveFeetOfOriginal: bool,
    secondTargetWithinWeaponRange: bool,
    secondTargetNotAttackedThisTurn: bool,
    colossusDamageDice: int,
    hordeBreakerAttackGranted: bool,
    rejected: bool,
  }

  pure def initialHuntersPreyState(choice: HuntersPreyChoice): HuntersPreyState = {
    selectedChoice: choice,
    targetMissingHitPoints: true,
    colossusSlayerChosen: true,
    colossusSlayerUsedThisTurn: false,
    hordeBreakerUsedThisTurn: false,
    weaponAttackHit: true,
    weaponAttackMade: true,
    secondTargetDifferent: true,
    secondTargetWithinFiveFeetOfOriginal: true,
    secondTargetWithinWeaponRange: true,
    secondTargetNotAttackedThisTurn: true,
    colossusDamageDice: 0,
    hordeBreakerAttackGranted: false,
    rejected: false,
  }

  pure def resolveColossusSlayer(state: HuntersPreyState): HuntersPreyState =
    if (state.selectedChoice != ColossusSlayerChoice)
      { ...state, rejected: true }
    else if (not(state.colossusSlayerChosen))
      state
    else if (not(state.weaponAttackHit) or not(state.targetMissingHitPoints) or state.colossusSlayerUsedThisTurn)
      { ...state, rejected: true }
    else
      { ...state, colossusDamageDice: 1, colossusSlayerUsedThisTurn: true }

  pure def resolveHordeBreaker(state: HuntersPreyState): HuntersPreyState =
    if (state.selectedChoice != HordeBreakerChoice)
      { ...state, rejected: true }
    else if (
      not(state.weaponAttackMade) or
      state.hordeBreakerUsedThisTurn or
      not(state.secondTargetDifferent) or
      not(state.secondTargetWithinFiveFeetOfOriginal) or
      not(state.secondTargetWithinWeaponRange) or
      not(state.secondTargetNotAttackedThisTurn)
    )
      { ...state, rejected: true }
    else
      { ...state, hordeBreakerAttackGranted: true, hordeBreakerUsedThisTurn: true }
}
