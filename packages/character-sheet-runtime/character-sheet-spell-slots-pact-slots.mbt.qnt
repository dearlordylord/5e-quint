// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS

module characterSheetSpellSlotsPactSlotsMbt {
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
    ordinary: {
      level1Capacity: 2,
      level1Expended: 1,
      level2Capacity: 0,
      level2Expended: 0,
      createdLevel1Capacity: 0,
      createdLevel1Expended: 0,
    },
    pact: {
      slotLevel: 1,
      capacity: 1,
      expended: 1,
    },
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

  pure def wizardArcaneRecoverySpent: SheetSlotFacts = {
    ordinary: {
      level1Capacity: 4,
      level1Expended: 2,
      level2Capacity: 3,
      level2Expended: 1,
      createdLevel1Capacity: 0,
      createdLevel1Expended: 0,
    },
    pact: {
      slotLevel: 1,
      capacity: 1,
      expended: 1,
    },
    arcaneRecoveryUsedSinceLongRest: false,
    magicalCunningUsedSinceLongRest: false,
  }

  pure def sorcererWarlockLongRestSpent: SheetSlotFacts = {
    ordinary: {
      level1Capacity: 3,
      level1Expended: 2,
      level2Capacity: 0,
      level2Expended: 0,
      createdLevel1Capacity: 1,
      createdLevel1Expended: 0,
    },
    pact: {
      slotLevel: 1,
      capacity: 2,
      expended: 1,
    },
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
      emptySlotFacts.with("ordinary", noOrdinarySpellSlots.with("level1Capacity", 3)),
      1,
    ),
  }

  action doRejectPactSlotExpenditureOverCapacity = all {
    qReplayIndex == 1,
    recordProjection(
      "pact-expenditure-over-capacity-rejected",
      false,
      "Pact Slot state must match Pact Magic build capacity.",
      emptySlotFacts.with("pact", { slotLevel: 1, capacity: 2, expended: 3 }),
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
      applyMagicalCunning(emptySlotFacts.with("pact", { slotLevel: 1, capacity: 2, expended: 2 })),
      9,
    ),
  }

  action doRejectMagicalCunningWithoutExpendedPactSlots = all {
    qReplayIndex == 9,
    recordProjection(
      "magical-cunning-no-expended-pact-slots-rejected",
      false,
      "Magical Cunning must recover expended Pact Slots.",
      emptySlotFacts.with("pact", { slotLevel: 1, capacity: 1, expended: 0 }),
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
