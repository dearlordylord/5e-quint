// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_SLOTS.TABLE_DERIVATION

module spellSlotTable {
  type FullCasterSpellSlotTableLevel =
    | FullCasterLevelOne
    | FullCasterLevelTwo
    | FullCasterLevelThree
    | FullCasterLevelFour

  type PactMagicSpellSlotTableLevel =
    | PactMagicLevelOne
    | PactMagicLevelTwo

  type OrdinarySpellSlotTable = {
    level1Capacity: int,
    level2Capacity: int,
  }

  type PactMagicSlotTable = {
    slotLevel: int,
    capacity: int,
  }

  pure def fullCasterSpellSlotTable(level: FullCasterSpellSlotTableLevel): OrdinarySpellSlotTable =
    match level {
      | FullCasterLevelOne => { level1Capacity: 2, level2Capacity: 0 }
      | FullCasterLevelTwo => { level1Capacity: 3, level2Capacity: 0 }
      | FullCasterLevelThree => { level1Capacity: 4, level2Capacity: 2 }
      | FullCasterLevelFour => { level1Capacity: 4, level2Capacity: 3 }
    }

  pure def pactMagicSpellSlotTable(level: PactMagicSpellSlotTableLevel): PactMagicSlotTable =
    match level {
      | PactMagicLevelOne => { slotLevel: 1, capacity: 1 }
      | PactMagicLevelTwo => { slotLevel: 1, capacity: 2 }
    }

  pure def legalOrdinarySpellSlotTable(table: OrdinarySpellSlotTable): bool = all {
    table.level1Capacity >= 0,
    table.level2Capacity >= 0,
    table.level1Capacity <= 4,
    table.level2Capacity <= 3,
  }

  pure def legalPactMagicSlotTable(table: PactMagicSlotTable): bool = all {
    table.slotLevel >= 1,
    table.slotLevel <= 5,
    table.capacity >= 1,
    table.capacity <= 4,
  }
}
