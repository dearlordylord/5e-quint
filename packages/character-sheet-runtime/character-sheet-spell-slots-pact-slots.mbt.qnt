// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS.TABLE_DERIVATION

module characterSheetSpellSlotsPactSlotsMbt {
  import spellSlotTable.* from "../shared-algebras/proofs/rule-core/spell-slot-table"

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

  type OrdinarySpellSlotFacts = {
    level1Capacity: int,
    level1Expended: int,
    level2Capacity: int,
    level2Expended: int,
    createdLevel1Capacity: int,
    createdLevel1Expended: int,
  }

  type PactSlotFacts = {
    slotLevel: int,
    capacity: int,
    expended: int,
  }

  type SheetSlotFacts = {
    ordinary: OrdinarySpellSlotFacts,
    pact: PactSlotFacts,
    arcaneRecoveryUsedSinceLongRest: bool,
    magicalCunningUsedSinceLongRest: bool,
  }

  pure def noOrdinarySpellSlots: OrdinarySpellSlotFacts = {
    level1Capacity: 0,
    level1Expended: 0,
    level2Capacity: 0,
    level2Expended: 0,
    createdLevel1Capacity: 0,
    createdLevel1Expended: 0,
  }

  pure def noPactSlots: PactSlotFacts = {
    slotLevel: 0,
    capacity: 0,
    expended: 0,
  }

  pure def emptySlotFacts: SheetSlotFacts = {
    ordinary: noOrdinarySpellSlots,
    pact: noPactSlots,
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

  pure def ordinarySlotsFromTable(
    table: OrdinarySpellSlotTable,
    level1Expended: int,
    level2Expended: int,
    createdLevel1Capacity: int,
    createdLevel1Expended: int,
  ): OrdinarySpellSlotFacts = {
    level1Capacity: table.level1Capacity,
    level1Expended: level1Expended,
    level2Capacity: table.level2Capacity,
    level2Expended: level2Expended,
    createdLevel1Capacity: createdLevel1Capacity,
    createdLevel1Expended: createdLevel1Expended,
  }

  pure def pactSlotsFromTable(table: PactMagicSlotTable, expended: int): PactSlotFacts = {
    slotLevel: table.slotLevel,
    capacity: table.capacity,
    expended: expended,
  }

  pure def recoverPactSlots(sheet: SheetSlotFacts): SheetSlotFacts =
    sheet.with("pact", sheet.pact.with("expended", 0))

  pure def completeLongRestSlotBenefits(sheet: SheetSlotFacts): SheetSlotFacts =
    sheet
      .with("ordinary", sheet.ordinary
        .with("level1Expended", 0)
        .with("level2Expended", 0)
        .with("createdLevel1Capacity", 0)
        .with("createdLevel1Expended", 0))
      .with("pact", sheet.pact.with("expended", 0))
      .with("arcaneRecoveryUsedSinceLongRest", false)
      .with("magicalCunningUsedSinceLongRest", false)

  pure def applyArcaneRecoveryLevel2(sheet: SheetSlotFacts): SheetSlotFacts =
    sheet
      .with("ordinary", sheet.ordinary.with("level2Expended", sheet.ordinary.level2Expended - 1))
      .with("arcaneRecoveryUsedSinceLongRest", true)

  pure def applyMagicalCunning(sheet: SheetSlotFacts): SheetSlotFacts = {
    val recovered = (sheet.pact.capacity + 1) / 2
    sheet
      .with("pact", sheet.pact.with("expended", if (sheet.pact.expended - recovered < 0) 0 else sheet.pact.expended - recovered))
      .with("magicalCunningUsedSinceLongRest", true)
  }

  pure def wizardWarlockSpent: SheetSlotFacts = {
    ordinary: ordinarySlotsFromTable(fullCasterSpellSlotTable(FullCasterLevelOne), 1, 0, 0, 0),
    pact: pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelOne), 1),
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

  pure def wizardArcaneRecoverySpent: SheetSlotFacts = {
    ordinary: ordinarySlotsFromTable(fullCasterSpellSlotTable(FullCasterLevelFour), 2, 1, 0, 0),
    pact: pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelOne), 1),
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

  pure def sorcererWarlockLongRestSpent: SheetSlotFacts = {
    ordinary: ordinarySlotsFromTable(fullCasterSpellSlotTable(FullCasterLevelTwo), 2, 0, 1, 0),
    pact: pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelTwo), 1),
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

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
      emptySlotFacts.with(
        "ordinary",
        ordinarySlotsFromTable(fullCasterSpellSlotTable(FullCasterLevelTwo), 0, 0, 0, 0)
      ),
      1,
    ),
  }

  action doRejectPactSlotExpenditureOverCapacity = all {
    qReplayIndex == 1,
    recordProjection(
      "pact-expenditure-over-capacity-rejected",
      false,
      "Pact Slot state must match Pact Magic build capacity.",
      emptySlotFacts.with(
        "pact",
        pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelTwo), 3)
      ),
      2,
    ),
  }

  action doShortRestRestoresPactSlotsOnly = all {
    qReplayIndex == 2,
    recordProjection(
      "short-rest-restores-pact-slots-only",
      true,
      "none",
      recoverPactSlots(wizardWarlockSpent),
      3,
    ),
  }

  action doShortRestArcaneRecoveryRefundsOrdinarySpellSlot = all {
    qReplayIndex == 3,
    recordProjection(
      "short-rest-arcane-recovery-refunds-ordinary-spell-slot",
      true,
      "none",
      applyArcaneRecoveryLevel2(recoverPactSlots(wizardArcaneRecoverySpent)),
      4,
    ),
  }

  action doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots = all {
    qReplayIndex == 4,
    recordProjection(
      "long-rest-restores-ordinary-pact-and-clears-created-slots",
      true,
      "none",
      completeLongRestSlotBenefits(sorcererWarlockLongRestSpent),
      5,
    ),
  }

  action doInterruptShortRestNoSlotBenefit = all {
    qReplayIndex == 5,
    recordProjection(
      "short-rest-interrupted-no-slot-benefit",
      true,
      "none",
      wizardWarlockSpent,
      6,
    ),
  }

  action doInterruptLongRestBeforeOneHourNoSlotBenefit = all {
    qReplayIndex == 6,
    recordProjection(
      "long-rest-interrupted-before-one-hour-no-slot-benefit",
      true,
      "none",
      wizardWarlockSpent,
      7,
    ),
  }

  action doInterruptLongRestWithShortRestSlotBenefits = all {
    qReplayIndex == 7,
    recordProjection(
      "long-rest-interrupted-with-short-rest-slot-benefits",
      true,
      "none",
      recoverPactSlots(wizardWarlockSpent),
      8,
    ),
  }

  action doMagicalCunningRecoversPactSlots = all {
    qReplayIndex == 8,
    recordProjection(
      "magical-cunning-recovers-pact-slots",
      true,
      "none",
      applyMagicalCunning(emptySlotFacts.with(
        "pact",
        pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelTwo), 2)
      )),
      9,
    ),
  }

  action doRejectMagicalCunningWithoutExpendedPactSlots = all {
    qReplayIndex == 9,
    recordProjection(
      "magical-cunning-no-expended-pact-slots-rejected",
      false,
      "Magical Cunning must recover expended Pact Slots.",
      emptySlotFacts.with(
        "pact",
        pactSlotsFromTable(pactMagicSpellSlotTable(PactMagicLevelTwo), 0)
      ),
      10,
    ),
  }

  action doRejectArcaneRecoveryPactSlotRefund = all {
    qReplayIndex == 10,
    recordProjection(
      "arcane-recovery-pact-slot-refund-rejected",
      false,
      "Arcane Recovery cannot refund more Spell Slots than are expended.",
      wizardArcaneRecoverySpent
        .with("ordinary", wizardArcaneRecoverySpent.ordinary
          .with("level1Expended", 0)
          .with("level2Expended", 0)),
      11,
    ),
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
