// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS

module spellSlotTransitions {
  import spellSlotTable.* from "./spell-slot-table"

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

  pure def ordinaryLevel1CapacityMatches(sheet: SheetSlotFacts, expectedCapacity: int): bool =
    sheet.ordinary.level1Capacity == expectedCapacity

  pure def pactSlotExpenditureWithinCapacity(sheet: SheetSlotFacts): bool =
    sheet.pact.expended <= sheet.pact.capacity

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

  pure def canRecoverOrdinarySpellSlots(
    sheet: SheetSlotFacts,
    level1Count: int,
    level2Count: int,
  ): bool = all {
    level1Count <= sheet.ordinary.level1Expended,
    level2Count <= sheet.ordinary.level2Expended,
  }

  pure def applyArcaneRecovery(
    sheet: SheetSlotFacts,
    level1Count: int,
    level2Count: int,
  ): SheetSlotFacts =
    sheet
      .with("ordinary", sheet.ordinary
        .with("level1Expended", sheet.ordinary.level1Expended - level1Count)
        .with("level2Expended", sheet.ordinary.level2Expended - level2Count))
      .with("arcaneRecoveryUsedSinceLongRest", true)

  pure def magicalCunningRecoveryCount(sheet: SheetSlotFacts): int =
    (sheet.pact.capacity + 1) / 2

  pure def canApplyMagicalCunning(sheet: SheetSlotFacts): bool =
    sheet.pact.expended > 0

  pure def applyMagicalCunning(sheet: SheetSlotFacts): SheetSlotFacts = {
    val recovered = magicalCunningRecoveryCount(sheet)
    sheet
      .with("pact", sheet.pact.with("expended", if (sheet.pact.expended - recovered < 0) 0 else sheet.pact.expended - recovered))
      .with("magicalCunningUsedSinceLongRest", true)
  }
}
