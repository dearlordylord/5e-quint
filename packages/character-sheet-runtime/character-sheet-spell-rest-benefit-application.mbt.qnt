// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_REST_BENEFIT.APPLICATION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.spell-rest-benefit-application
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-sheet.spell-rest-benefit-application

module characterSheetSpellRestBenefitApplicationMbt {
  import spellRestBenefitApplication.* from "../shared-algebras/proofs/rule-core/spell-rest-benefit-application"

  var qLastResult: str
  var qSlotSpent: bool
  var qShortRestBenefitApplied: bool
  var qHealingApplied: bool
  var qHealingDiceCount: int
  var qLongRestLockoutStored: bool
  var qReplayIndex: int

  pure def witnessedSpellRestBenefitProfile: SpellRestBenefitProfile = {
    baseSpellLevel: 2,
    maxRecipients: 5,
    healingBaseDice: 2,
    healingDieSize: 8,
    healingDicePerSlotAboveBase: 1,
  }

  pure def eligibleSpellRestBenefitRecipient: SpellRestBenefitRecipientFacts = {
    remainedWithinRangeForEntireCasting: true,
    lockedUntilLongRest: false,
  }

  pure def lockedSpellRestBenefitRecipient: SpellRestBenefitRecipientFacts = {
    remainedWithinRangeForEntireCasting: true,
    lockedUntilLongRest: true,
  }

  pure def witnessedSpellRestBenefitApplicationResult: SpellRestBenefitApplicationResult =
    applySpellRestBenefit(
      witnessedSpellRestBenefitProfile,
      2,
      [eligibleSpellRestBenefitRecipient],
      2,
      11
    )

  pure def lockedRecipientSpellRestBenefitResult: SpellRestBenefitApplicationResult =
    applySpellRestBenefit(
      witnessedSpellRestBenefitProfile,
      2,
      [lockedSpellRestBenefitRecipient],
      2,
      2
    )

  action recordProjection(
    lastResult: str,
    slotSpent: bool,
    shortRestBenefitApplied: bool,
    healingApplied: bool,
    healingDiceCount: int,
    longRestLockoutStored: bool,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qSlotSpent' = slotSpent,
    qShortRestBenefitApplied' = shortRestBenefitApplied,
    qHealingApplied' = healingApplied,
    qHealingDiceCount' = healingDiceCount,
    qLongRestLockoutStored' = longRestLockoutStored,
    qReplayIndex' = replayIndex,
  }

  action recordSpellRestBenefitProjection(
    lastResult: str,
    projection: SpellRestBenefitProjection,
    replayIndex: int,
  ): bool =
    recordProjection(
      lastResult,
      projection.slotSpent,
      projection.shortRestBenefitApplied,
      projection.healingApplied,
      projection.healingDiceCount,
      projection.longRestLockoutStored,
      replayIndex
    )

  action init =
    recordProjection("init", false, false, false, 0, false, 0)

  action doApplyPrayerOfHealingRestBenefit = all {
    qReplayIndex == 0,
    recordSpellRestBenefitProjection(
      "applied",
      spellRestBenefitProjection(witnessedSpellRestBenefitApplicationResult, true),
      1
    ),
    canApplySpellRestBenefit(
      witnessedSpellRestBenefitProfile,
      2,
      [eligibleSpellRestBenefitRecipient],
      2,
      11
    ),
  }

  action doRejectRecipientLongRestLockout = all {
    qReplayIndex == 1,
    recordSpellRestBenefitProjection(
      "recipient-lockout-rejected",
      spellRestBenefitProjection(lockedRecipientSpellRestBenefitResult, true),
      2
    ),
    spellRestBenefitRejectedBeforeSlotSpend(lockedRecipientSpellRestBenefitResult),
  }

  action step = any {
    doApplyPrayerOfHealingRestBenefit,
    doRejectRecipientLongRestLockout,
  }
}
