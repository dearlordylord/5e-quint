// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_REST_BENEFIT.APPLICATION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.spell-rest-benefit-application
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-sheet.spell-rest-benefit-application

module characterSheetSpellRestBenefitApplicationMbt {
  import spellRestBenefitApplication.* from "../shared-algebras/proofs/rule-core/spell-rest-benefit-application"

  type CharacterSheetSpellRestBenefitApplicationOutcome =
    | CharacterSheetSpellRestBenefitApplicationInit
    | CharacterSheetSpellRestBenefitApplicationApplied
    | CharacterSheetSpellRestBenefitApplicationRecipientLockoutRejected

  type CharacterSheetSpellRestBenefitApplicationState = {
    outcome: CharacterSheetSpellRestBenefitApplicationOutcome,
    slotSpent: bool,
    shortRestBenefitApplied: bool,
    healingApplied: bool,
    healingDiceCount: int,
    longRestLockoutStored: bool,
    replayIndex: int,
  }

  var qState: CharacterSheetSpellRestBenefitApplicationState

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
    outcome: CharacterSheetSpellRestBenefitApplicationOutcome,
    slotSpent: bool,
    shortRestBenefitApplied: bool,
    healingApplied: bool,
    healingDiceCount: int,
    longRestLockoutStored: bool,
    replayIndex: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      slotSpent: slotSpent,
      shortRestBenefitApplied: shortRestBenefitApplied,
      healingApplied: healingApplied,
      healingDiceCount: healingDiceCount,
      longRestLockoutStored: longRestLockoutStored,
      replayIndex: replayIndex,
    },
  }

  action recordSpellRestBenefitProjection(
    outcome: CharacterSheetSpellRestBenefitApplicationOutcome,
    projection: SpellRestBenefitProjection,
    replayIndex: int,
  ): bool =
    recordProjection(
      outcome,
      projection.slotSpent,
      projection.shortRestBenefitApplied,
      projection.healingApplied,
      projection.healingDiceCount,
      projection.longRestLockoutStored,
      replayIndex,
    )

  action init =
    recordProjection(
      CharacterSheetSpellRestBenefitApplicationInit,
      false,
      false,
      false,
      0,
      false,
      0,
    )

  action doApplyPrayerOfHealingRestBenefit = all {
    qState.replayIndex == 0,
    recordSpellRestBenefitProjection(
      CharacterSheetSpellRestBenefitApplicationApplied,
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
    qState.replayIndex == 1,
    recordSpellRestBenefitProjection(
      CharacterSheetSpellRestBenefitApplicationRecipientLockoutRejected,
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
