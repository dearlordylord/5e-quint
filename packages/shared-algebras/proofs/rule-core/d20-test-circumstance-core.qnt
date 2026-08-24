// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#D20 Tests defines Ability
//   Checks, Saving Throws, and Attack Rolls as the three D20 Test kinds.
// - .references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage says the
//   GM can decide that circumstances grant Advantage or impose Disadvantage.
// - The same section says like sources do not stack and any Advantage plus
//   any Disadvantage produces a normal one-d20 roll.
// - UBIQUITOUS_LANGUAGE.md defines D20 Test, Advantage, Disadvantage, and
//   Table Decision.
//
// Scope: this module owns source combination and exact pending-test binding.
// It does not model d20 faces, totals, target numbers, or success/failure.
// Update this module before changing the executable source-combination or
// request-admission boundary.

module d20TestCircumstanceCore {
  type D20TestKind =
    | AbilityCheckD20Test
    | SavingThrowD20Test
    | AttackRollD20Test

  type D20TestRollMode =
    | NormalD20TestRoll
    | AdvantageD20TestRoll
    | DisadvantageD20TestRoll

  type D20TestRollModeSources = {
    advantage: bool,
    disadvantage: bool,
  }

  type TableD20TestCircumstanceSource =
    | TableGrantsAdvantage
    | TableImposesDisadvantage

  type D20TestRequestRef = {
    lineage: int,
    testOrdinal: int,
    testKind: D20TestKind,
  }

  type TableD20TestCircumstanceDecision = {
    requestRef: D20TestRequestRef,
    source: TableD20TestCircumstanceSource,
  }

  pure def d20TestRollModeFromSources(
    sources: D20TestRollModeSources,
  ): D20TestRollMode =
    if (sources.advantage == sources.disadvantage)
      NormalD20TestRoll
    else if (sources.advantage)
      AdvantageD20TestRoll
    else
      DisadvantageD20TestRoll

  pure def addTableD20TestCircumstanceSource(
    mechanicalSources: D20TestRollModeSources,
    tableSource: TableD20TestCircumstanceSource,
  ): D20TestRollModeSources =
    match tableSource {
      | TableGrantsAdvantage => {
          ...mechanicalSources,
          advantage: true,
        }
      | TableImposesDisadvantage => {
          ...mechanicalSources,
          disadvantage: true,
        }
    }

  pure def d20TestRollModeWithTableCircumstance(
    mechanicalSources: D20TestRollModeSources,
    tableSource: TableD20TestCircumstanceSource,
  ): D20TestRollMode =
    d20TestRollModeFromSources(
      addTableD20TestCircumstanceSource(mechanicalSources, tableSource)
    )

  pure def tableD20TestCircumstanceDecisionMatches(
    pendingRequestRef: D20TestRequestRef,
    decision: TableD20TestCircumstanceDecision,
  ): bool =
    decision.requestRef == pendingRequestRef
}
