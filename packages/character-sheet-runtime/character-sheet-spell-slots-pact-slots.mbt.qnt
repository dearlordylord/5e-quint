// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS.TABLE_DERIVATION

module characterSheetSpellSlotsPactSlotsMbt {
  import spellSlotTable.* from "../shared-algebras/proofs/rule-core/spell-slot-table"
  import spellSlotTransitions.* from "../shared-algebras/proofs/rule-core/spell-slot-transitions"

  type CharacterSheetSpellSlotsPactSlotsOutcome =
    | CharacterSheetSpellSlotsPactSlotsInit
    | CharacterSheetSpellSlotsPactSlotsOrdinaryCapacityMismatchRejected
    | CharacterSheetSpellSlotsPactSlotsPactExpenditureOverCapacityRejected
    | CharacterSheetSpellSlotsPactSlotsShortRestRestoresPactSlotsOnly
    | CharacterSheetSpellSlotsPactSlotsShortRestArcaneRecoveryRefundsOrdinarySpellSlot
    | CharacterSheetSpellSlotsPactSlotsLongRestRestoresOrdinaryPactAndClearsCreatedSlots
    | CharacterSheetSpellSlotsPactSlotsShortRestInterruptedNoSlotBenefit
    | CharacterSheetSpellSlotsPactSlotsLongRestInterruptedBeforeOneHourNoSlotBenefit
    | CharacterSheetSpellSlotsPactSlotsLongRestInterruptedWithShortRestSlotBenefits
    | CharacterSheetSpellSlotsPactSlotsMagicalCunningRecoversPactSlots
    | CharacterSheetSpellSlotsPactSlotsMagicalCunningNoExpendedPactSlotsRejected
    | CharacterSheetSpellSlotsPactSlotsArcaneRecoveryPactSlotRefundRejected

  type CharacterSheetSpellSlotsPactSlotsState = {
    outcome: CharacterSheetSpellSlotsPactSlotsOutcome,
    accepted: bool,
    message: str,
    ordinaryLevel1Capacity: int,
    ordinaryLevel1Expended: int,
    ordinaryLevel2Capacity: int,
    ordinaryLevel2Expended: int,
    createdLevel1Capacity: int,
    createdLevel1Expended: int,
    pactSlotLevel: int,
    pactSlotCapacity: int,
    pactSlotExpended: int,
    arcaneRecoveryUsedSinceLongRest: bool,
    magicalCunningUsedSinceLongRest: bool,
    replayIndex: int,
  }

  var qState: CharacterSheetSpellSlotsPactSlotsState

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
    outcome: CharacterSheetSpellSlotsPactSlotsOutcome,
    accepted: bool,
    message: str,
    sheet: SheetSlotFacts,
    replayIndex: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      accepted: accepted,
      message: message,
      ordinaryLevel1Capacity: sheet.ordinary.level1Capacity,
      ordinaryLevel1Expended: sheet.ordinary.level1Expended,
      ordinaryLevel2Capacity: sheet.ordinary.level2Capacity,
      ordinaryLevel2Expended: sheet.ordinary.level2Expended,
      createdLevel1Capacity: sheet.ordinary.createdLevel1Capacity,
      createdLevel1Expended: sheet.ordinary.createdLevel1Expended,
      pactSlotLevel: sheet.pact.slotLevel,
      pactSlotCapacity: sheet.pact.capacity,
      pactSlotExpended: sheet.pact.expended,
      arcaneRecoveryUsedSinceLongRest: sheet.arcaneRecoveryUsedSinceLongRest,
      magicalCunningUsedSinceLongRest: sheet.magicalCunningUsedSinceLongRest,
      replayIndex: replayIndex,
    },
  }

  action init =
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsInit,
      false,
      "none",
      emptySlotFacts,
      0,
    )

  action doRejectMismatchedOrdinarySpellSlotCapacity = all {
    qState.replayIndex == 0,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsOrdinaryCapacityMismatchRejected,
      false,
      "Spell Slot state does not match build capacity for level 1.",
      mismatchedOrdinaryLevel1Capacity,
      1,
    ),
    not(ordinaryLevel1CapacityMatches(mismatchedOrdinaryLevel1Capacity, 3)),
  }

  action doRejectPactSlotExpenditureOverCapacity = all {
    qState.replayIndex == 1,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsPactExpenditureOverCapacityRejected,
      false,
      "Pact Slot state must match Pact Magic build capacity.",
      pactSlotExpendedOverCapacity,
      2,
    ),
    not(pactSlotExpenditureWithinCapacity(pactSlotExpendedOverCapacity)),
  }

  action doShortRestRestoresPactSlotsOnly = all {
    qState.replayIndex == 2,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsShortRestRestoresPactSlotsOnly,
      true,
      "none",
      recoverPactSlots(shortRestPactSpentSlots),
      3,
    ),
  }

  action doShortRestArcaneRecoveryRefundsOrdinarySpellSlot = all {
    qState.replayIndex == 3,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsShortRestArcaneRecoveryRefundsOrdinarySpellSlot,
      true,
      "none",
      applyArcaneRecovery(recoverPactSlots(arcaneRecoveryLevel2SpentSlots), 0, 1),
      4,
    ),
    canRecoverOrdinarySpellSlots(recoverPactSlots(arcaneRecoveryLevel2SpentSlots), 0, 1),
  }

  action doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots = all {
    qState.replayIndex == 4,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsLongRestRestoresOrdinaryPactAndClearsCreatedSlots,
      true,
      "none",
      completeLongRestSlotBenefits(longRestCreatedSlotSpentSlots),
      5,
    ),
  }

  action doInterruptShortRestNoSlotBenefit = all {
    qState.replayIndex == 5,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsShortRestInterruptedNoSlotBenefit,
      true,
      "none",
      shortRestPactSpentSlots,
      6,
    ),
  }

  action doInterruptLongRestBeforeOneHourNoSlotBenefit = all {
    qState.replayIndex == 6,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsLongRestInterruptedBeforeOneHourNoSlotBenefit,
      true,
      "none",
      shortRestPactSpentSlots,
      7,
    ),
  }

  action doInterruptLongRestWithShortRestSlotBenefits = all {
    qState.replayIndex == 7,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsLongRestInterruptedWithShortRestSlotBenefits,
      true,
      "none",
      recoverPactSlots(shortRestPactSpentSlots),
      8,
    ),
  }

  action doMagicalCunningRecoversPactSlots = all {
    qState.replayIndex == 8,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsMagicalCunningRecoversPactSlots,
      true,
      "none",
      applyMagicalCunning(magicalCunningSpentPactSlots),
      9,
    ),
    canApplyMagicalCunning(magicalCunningSpentPactSlots),
  }

  action doRejectMagicalCunningWithoutExpendedPactSlots = all {
    qState.replayIndex == 9,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsMagicalCunningNoExpendedPactSlotsRejected,
      false,
      "Magical Cunning must recover expended Pact Slots.",
      magicalCunningFreshPactSlots,
      10,
    ),
    not(canApplyMagicalCunning(magicalCunningFreshPactSlots)),
  }

  action doRejectArcaneRecoveryPactSlotRefund = all {
    qState.replayIndex == 10,
    recordProjection(
      CharacterSheetSpellSlotsPactSlotsArcaneRecoveryPactSlotRefundRejected,
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
