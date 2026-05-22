// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_REST_BENEFIT.APPLICATION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.spell-rest-benefit-application
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-sheet.spell-rest-benefit-application

module characterSheetSpellRestBenefitApplicationMbt {
  var qLastResult: str
  var qSlotSpent: bool
  var qShortRestBenefitApplied: bool
  var qHealingApplied: bool
  var qLongRestLockoutStored: bool
  var qReplayIndex: int

  action recordProjection(
    lastResult: str,
    slotSpent: bool,
    shortRestBenefitApplied: bool,
    healingApplied: bool,
    longRestLockoutStored: bool,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qSlotSpent' = slotSpent,
    qShortRestBenefitApplied' = shortRestBenefitApplied,
    qHealingApplied' = healingApplied,
    qLongRestLockoutStored' = longRestLockoutStored,
    qReplayIndex' = replayIndex,
  }

  action init =
    recordProjection("init", false, false, false, false, 0)

  action doApplyPrayerOfHealingRestBenefit = all {
    qReplayIndex == 0,
    recordProjection("applied", true, true, true, true, 1),
  }

  action doRejectRecipientLongRestLockout = all {
    qReplayIndex == 1,
    recordProjection("recipient-lockout-rejected", false, false, false, true, 2),
  }

  action step = any {
    doApplyPrayerOfHealingRestBenefit,
    doRejectRecipientLongRestLockout,
  }
}
