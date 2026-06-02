// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS.TABLE_DERIVATION

module characterSheetSpellSlotsPactSlotsMbt {
  import spellSlotTable.* from "../shared-algebras/proofs/rule-core/spell-slot-table"
  import spellSlotTransitions.* from "../shared-algebras/proofs/rule-core/spell-slot-transitions"

  var qLastResult: str
  var qAccepted: bool
  var qMessage: str
  var qOrdinaryLevel1Capacity: int
  var qOrdinaryLevel1Expended: int
  var qOrdinaryLevel2Capacity: int
  var qOrdinaryLevel2Expended: int
  var qCreatedLevel1Capacity: int
  var qCreatedLevel1Expended: int
  var qPactSlotLevel: int
  var qPactSlotCapacity: int
  var qPactSlotExpended: int
  var qArcaneRecoveryUsedSinceLongRest: bool
  var qMagicalCunningUsedSinceLongRest: bool
  var qReplayIndex: int

  pure def shortRestPactSpentSlots: SheetSlotFacts = {
    ordinary: ordinarySlotsFromTable(fullCasterSpellSlotTable(FullCasterLevelOne), 1, 0, 0, 0),
    pact: pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelOne), 1),
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

  pure def arcaneRecoveryLevel2SpentSlots: SheetSlotFacts = {
    ordinary: ordinarySlotsFromTable(fullCasterSpellSlotTable(FullCasterLevelFour), 2, 1, 0, 0),
    pact: pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelOne), 1),
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

  pure def longRestCreatedSlotSpentSlots: SheetSlotFacts = {
    ordinary: ordinarySlotsFromTable(fullCasterSpellSlotTable(FullCasterLevelTwo), 2, 0, 1, 0),
    pact: pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelTwo), 1),
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

  pure def mismatchedOrdinaryLevel1Capacity: SheetSlotFacts =
    emptySlotFacts.with(
      "ordinary",
      ordinarySlotsFromTable(fullCasterSpellSlotTable(FullCasterLevelTwo), 0, 0, 0, 0)
    )

  pure def pactSlotExpendedOverCapacity: SheetSlotFacts =
    emptySlotFacts.with(
      "pact",
      pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelTwo), 3)
    )

  pure def magicalCunningSpentPactSlots: SheetSlotFacts =
    emptySlotFacts.with(
      "pact",
      pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelTwo), 2)
    )

  pure def magicalCunningFreshPactSlots: SheetSlotFacts =
    emptySlotFacts.with(
      "pact",
      pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelTwo), 0)
    )

  pure def arcaneRecoveryNoExpendedOrdinarySlots: SheetSlotFacts =
    arcaneRecoveryLevel2SpentSlots
      .with("ordinary", arcaneRecoveryLevel2SpentSlots.ordinary
        .with("level1Expended", 0)
        .with("level2Expended", 0))

  action recordProjection(
    lastResult: str,
    accepted: bool,
    message: str,
    sheet: SheetSlotFacts,
    replayIndex: int,
  ): bool = all {
    qLastResult' = lastResult,
    qAccepted' = accepted,
    qMessage' = message,
    qOrdinaryLevel1Capacity' = sheet.ordinary.level1Capacity,
    qOrdinaryLevel1Expended' = sheet.ordinary.level1Expended,
    qOrdinaryLevel2Capacity' = sheet.ordinary.level2Capacity,
    qOrdinaryLevel2Expended' = sheet.ordinary.level2Expended,
    qCreatedLevel1Capacity' = sheet.ordinary.createdLevel1Capacity,
    qCreatedLevel1Expended' = sheet.ordinary.createdLevel1Expended,
    qPactSlotLevel' = sheet.pact.slotLevel,
    qPactSlotCapacity' = sheet.pact.capacity,
    qPactSlotExpended' = sheet.pact.expended,
    qArcaneRecoveryUsedSinceLongRest' = sheet.arcaneRecoveryUsedSinceLongRest,
    qMagicalCunningUsedSinceLongRest' = sheet.magicalCunningUsedSinceLongRest,
    qReplayIndex' = replayIndex,
  }

  action init =
    recordProjection("init", false, "none", emptySlotFacts, 0)

  action doRejectMismatchedOrdinarySpellSlotCapacity = all {
    qReplayIndex == 0,
    recordProjection(
      "ordinary-capacity-mismatch-rejected",
      false,
      "Spell Slot state does not match build capacity for level 1.",
      mismatchedOrdinaryLevel1Capacity,
      1,
    ),
    not(ordinaryLevel1CapacityMatches(mismatchedOrdinaryLevel1Capacity, 3)),
  }

  action doRejectPactSlotExpenditureOverCapacity = all {
    qReplayIndex == 1,
    recordProjection(
      "pact-expenditure-over-capacity-rejected",
      false,
      "Pact Slot state must match Pact Magic build capacity.",
      pactSlotExpendedOverCapacity,
      2,
    ),
    not(pactSlotExpenditureWithinCapacity(pactSlotExpendedOverCapacity)),
  }

  action doShortRestRestoresPactSlotsOnly = all {
    qReplayIndex == 2,
    recordProjection(
      "short-rest-restores-pact-slots-only",
      true,
      "none",
      recoverPactSlots(shortRestPactSpentSlots),
      3,
    ),
  }

  action doShortRestArcaneRecoveryRefundsOrdinarySpellSlot = all {
    qReplayIndex == 3,
    recordProjection(
      "short-rest-arcane-recovery-refunds-ordinary-spell-slot",
      true,
      "none",
      applyArcaneRecovery(recoverPactSlots(arcaneRecoveryLevel2SpentSlots), 0, 1),
      4,
    ),
    canRecoverOrdinarySpellSlots(recoverPactSlots(arcaneRecoveryLevel2SpentSlots), 0, 1),
  }

  action doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots = all {
    qReplayIndex == 4,
    recordProjection(
      "long-rest-restores-ordinary-pact-and-clears-created-slots",
      true,
      "none",
      completeLongRestSlotBenefits(longRestCreatedSlotSpentSlots),
      5,
    ),
  }

  action doInterruptShortRestNoSlotBenefit = all {
    qReplayIndex == 5,
    recordProjection(
      "short-rest-interrupted-no-slot-benefit",
      true,
      "none",
      shortRestPactSpentSlots,
      6,
    ),
  }

  action doInterruptLongRestBeforeOneHourNoSlotBenefit = all {
    qReplayIndex == 6,
    recordProjection(
      "long-rest-interrupted-before-one-hour-no-slot-benefit",
      true,
      "none",
      shortRestPactSpentSlots,
      7,
    ),
  }

  action doInterruptLongRestWithShortRestSlotBenefits = all {
    qReplayIndex == 7,
    recordProjection(
      "long-rest-interrupted-with-short-rest-slot-benefits",
      true,
      "none",
      recoverPactSlots(shortRestPactSpentSlots),
      8,
    ),
  }

  action doMagicalCunningRecoversPactSlots = all {
    qReplayIndex == 8,
    recordProjection(
      "magical-cunning-recovers-pact-slots",
      true,
      "none",
      applyMagicalCunning(magicalCunningSpentPactSlots),
      9,
    ),
    canApplyMagicalCunning(magicalCunningSpentPactSlots),
  }

  action doRejectMagicalCunningWithoutExpendedPactSlots = all {
    qReplayIndex == 9,
    recordProjection(
      "magical-cunning-no-expended-pact-slots-rejected",
      false,
      "Magical Cunning must recover expended Pact Slots.",
      magicalCunningFreshPactSlots,
      10,
    ),
    not(canApplyMagicalCunning(magicalCunningFreshPactSlots)),
  }

  action doRejectArcaneRecoveryPactSlotRefund = all {
    qReplayIndex == 10,
    recordProjection(
      "arcane-recovery-pact-slot-refund-rejected",
      false,
      "Arcane Recovery cannot refund more Spell Slots than are expended.",
      arcaneRecoveryNoExpendedOrdinarySlots,
      11,
    ),
    not(canRecoverOrdinarySpellSlots(arcaneRecoveryNoExpendedOrdinarySlots, 1, 0)),
  }

  action step = any {
    doRejectMismatchedOrdinarySpellSlotCapacity,
    doRejectPactSlotExpenditureOverCapacity,
    doShortRestRestoresPactSlotsOnly,
    doShortRestArcaneRecoveryRefundsOrdinarySpellSlot,
    doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots,
    doInterruptShortRestNoSlotBenefit,
    doInterruptLongRestBeforeOneHourNoSlotBenefit,
    doInterruptLongRestWithShortRestSlotBenefits,
    doMagicalCunningRecoversPactSlots,
    doRejectMagicalCunningWithoutExpendedPactSlots,
    doRejectArcaneRecoveryPactSlotRefund,
  }
}
