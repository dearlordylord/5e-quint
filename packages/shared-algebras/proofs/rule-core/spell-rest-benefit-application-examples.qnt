// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-sheet.spell-rest-benefit-application

module spellRestBenefitApplicationExamples {
  import spellRestBenefitApplication.* from "./spell-rest-benefit-application"

  // RAW anchors:
  // - .references/srd-5.2.1/Rules-Glossary.md:674-696: Long Rest and
  //   Short Rest benefit boundaries.
  // - .references/srd-5.2.1/Rules-Glossary.md:702: long casting fails before
  //   Spell Slot expenditure when Concentration is broken.
  // - .references/srd-5.2.1/Playing-the-Game.md:740: magic and rests restore
  //   Hit Points.
  // - UBIQUITOUS_LANGUAGE.md: Spell Slot, Using a Higher-Level Spell Slot,
  //   Short Rest, Long Rest, and Hit Points.

  pure def exampleProfile: SpellRestBenefitProfile = {
    baseSpellLevel: 2,
    maxRecipients: 5,
    healingBaseDice: 2,
    healingDieSize: 8,
    healingDicePerSlotAboveBase: 1,
  }

  pure def eligibleRecipient: SpellRestBenefitRecipientFacts = {
    remainedWithinRangeForEntireCasting: true,
    lockedUntilLongRest: false,
  }

  pure def lockedRecipient: SpellRestBenefitRecipientFacts = {
    remainedWithinRangeForEntireCasting: true,
    lockedUntilLongRest: true,
  }

  run test_spell_rest_benefit_applies_healing_and_stores_long_rest_lockout = {
    val result = applySpellRestBenefit(
      exampleProfile,
      3,
      [eligibleRecipient],
      3,
      12,
    )
    val projection = spellRestBenefitProjection(result, false)
    all {
      assert(canApplySpellRestBenefit(exampleProfile, 3, [eligibleRecipient], 3, 12)),
      assert(projection.slotSpent),
      assert(projection.shortRestBenefitApplied),
      assert(projection.healingApplied),
      assert(projection.healingDiceCount == 3),
      assert(projection.longRestLockoutStored),
    }
  }

  run test_spell_rest_benefit_rejects_locked_recipient_before_slot_spend = {
    val result = applySpellRestBenefit(
      exampleProfile,
      2,
      [lockedRecipient],
      2,
      7,
    )
    val projection = spellRestBenefitProjection(result, true)
    all {
      assert(spellRestBenefitRejectedBeforeSlotSpend(result)),
      assert(not(projection.slotSpent)),
      assert(not(projection.shortRestBenefitApplied)),
      assert(projection.longRestLockoutStored),
    }
  }
}
