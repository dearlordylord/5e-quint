// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_REST_BENEFIT.APPLICATION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.spell-rest-benefit-application

module spellRestBenefitApplication {
  type SpellRestBenefitProfile = {
    baseSpellLevel: int,
    maxRecipients: int,
    healingBaseDice: int,
    healingDieSize: int,
    healingDicePerSlotAboveBase: int,
  }

  type SpellRestBenefitRecipientFacts = {
    remainedWithinRangeForEntireCasting: bool,
    lockedUntilLongRest: bool,
  }

  type SpellRestBenefitApplicationResult =
    | SpellRestBenefitApplied({ healingDiceCount: int })
    | SpellRestBenefitRejected

  type SpellRestBenefitProjection = {
    slotSpent: bool,
    shortRestBenefitApplied: bool,
    healingApplied: bool,
    healingDiceCount: int,
    longRestLockoutStored: bool,
  }

  pure def legalSpellRestBenefitProfile(profile: SpellRestBenefitProfile): bool = all {
    profile.baseSpellLevel >= 1,
    profile.maxRecipients >= 1,
    profile.healingBaseDice >= 1,
    profile.healingDieSize >= 1,
    profile.healingDicePerSlotAboveBase >= 0,
  }

  pure def spellRestBenefitHealingDiceCount(
    profile: SpellRestBenefitProfile,
    castLevel: int,
  ): int =
    profile.healingBaseDice
      + ((castLevel - profile.baseSpellLevel) * profile.healingDicePerSlotAboveBase)

  pure def legalSpellRestBenefitHealingRolls(
    profile: SpellRestBenefitProfile,
    castLevel: int,
    rollCount: int,
    rollTotal: int,
  ): bool = {
    val diceCount = spellRestBenefitHealingDiceCount(profile, castLevel)
    all {
      rollCount == diceCount,
      rollTotal >= rollCount,
      rollTotal <= rollCount * profile.healingDieSize,
    }
  }

  pure def spellRestBenefitRecipientEligible(
    recipient: SpellRestBenefitRecipientFacts,
  ): bool =
    recipient.remainedWithinRangeForEntireCasting
      and not(recipient.lockedUntilLongRest)

  pure def spellRestBenefitRecipientsEligible(
    recipients: List[SpellRestBenefitRecipientFacts],
  ): bool =
    recipients.foldl(true, (eligible, recipient) =>
      eligible and spellRestBenefitRecipientEligible(recipient))

  pure def canApplySpellRestBenefit(
    profile: SpellRestBenefitProfile,
    castLevel: int,
    recipients: List[SpellRestBenefitRecipientFacts],
    rollCount: int,
    rollTotal: int,
  ): bool = all {
    legalSpellRestBenefitProfile(profile),
    castLevel >= profile.baseSpellLevel,
    recipients.length() >= 1,
    recipients.length() <= profile.maxRecipients,
    spellRestBenefitRecipientsEligible(recipients),
    legalSpellRestBenefitHealingRolls(profile, castLevel, rollCount, rollTotal),
  }

  pure def applySpellRestBenefit(
    profile: SpellRestBenefitProfile,
    castLevel: int,
    recipients: List[SpellRestBenefitRecipientFacts],
    rollCount: int,
    rollTotal: int,
  ): SpellRestBenefitApplicationResult =
    if (canApplySpellRestBenefit(profile, castLevel, recipients, rollCount, rollTotal)) {
      SpellRestBenefitApplied({
        healingDiceCount: spellRestBenefitHealingDiceCount(profile, castLevel),
      })
    } else {
      SpellRestBenefitRejected
    }

  pure def spellRestBenefitRejectedBeforeSlotSpend(
    result: SpellRestBenefitApplicationResult,
  ): bool =
    match result {
      | SpellRestBenefitApplied(_) => false
      | SpellRestBenefitRejected => true
    }

  pure def spellRestBenefitProjection(
    result: SpellRestBenefitApplicationResult,
    longRestLockoutStored: bool,
  ): SpellRestBenefitProjection =
    match result {
      | SpellRestBenefitApplied(applied) => {
          slotSpent: true,
          shortRestBenefitApplied: true,
          healingApplied: true,
          healingDiceCount: applied.healingDiceCount,
          longRestLockoutStored: true,
        }
      | SpellRestBenefitRejected => {
          slotSpent: false,
          shortRestBenefitApplied: false,
          healingApplied: false,
          healingDiceCount: 0,
          longRestLockoutStored: longRestLockoutStored,
        }
    }
}
