// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Equipment.md#Weapons defines equipped weapons as
//   attack-capable equipment.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Spell Slots says a
//   level 1+ spell cast with a slot expends one slot of the spell's level or
//   higher, and invalid/early fills are not accepted spell invocations in this
//   reducer contract.
// - .references/srd-5.2.1/Rules-Glossary.md#Attack [Action] and #Magic
//   [Action] define the action families surfaced as battle acts.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Attack Roll, Spell Slot, Spend,
//   Character Sheet, Battle Runtime, and Settlement.
module characterSessionSheetDerivedBattleActsMbt {
  type SheetDerivedBattleActOutcome =
    | SheetDerivedBattleActsInit
    | SheetDerivedMissingWieldedWeaponRejected
    | SheetDerivedMissingSelectedSpellRejected
    | SheetDerivedWeaponAttackCapabilityProjected
    | SheetDerivedResourceBackedSpellAttackCapabilityProjected
    | SheetDerivedEarlySpellFillRejectedWithoutSpend
    | SheetDerivedAcceptedSpellInvocationSpentOneSlot
    | SheetDerivedStaleOpenActionRejectedAfterInvocation
    | SheetDerivedStaleSpellFillRejectedWithoutSecondSpend
    | SheetDerivedSpellSlotExpenditureSettled
    | SheetDerivedExhaustedSlotsRejectedRediscovery

  type SheetDerivedBattleActFacts = {
    wieldedWeaponFact: bool,
    preparedSpellAccessFact: bool,
    weaponAttackDiscovered: bool,
    spellAttackDiscovered: bool,
    manualSubjectProfileHandoff: bool,
    actionAvailable: bool,
    spellSlotActAvailable: bool,
    minimumLevelOrHigherSlotsRemaining: int,
    acceptedInvocationCastLevel: int,
    targetHp: int,
    currentHpSettled: bool,
    spellSlotExpenditureSettled: bool,
  }

  type SheetDerivedBattleActState = {
    outcome: SheetDerivedBattleActOutcome,
    accepted: bool,
    facts: SheetDerivedBattleActFacts,
    replayIndex: int,
  }

  var qState: SheetDerivedBattleActState

  pure def emptySheetDerivedBattleActFacts: SheetDerivedBattleActFacts = {
    wieldedWeaponFact: true,
    preparedSpellAccessFact: true,
    weaponAttackDiscovered: false,
    spellAttackDiscovered: false,
    manualSubjectProfileHandoff: false,
    actionAvailable: true,
    spellSlotActAvailable: true,
    minimumLevelOrHigherSlotsRemaining: 2,
    acceptedInvocationCastLevel: 0,
    targetHp: 13,
    currentHpSettled: false,
    spellSlotExpenditureSettled: false,
  }

  action recordProjection(
    outcome: SheetDerivedBattleActOutcome,
    accepted: bool,
    facts: SheetDerivedBattleActFacts,
    replayIndex: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      accepted: accepted,
      facts: facts,
      replayIndex: replayIndex,
    },
  }

  action init =
    recordProjection(
      SheetDerivedBattleActsInit,
      false,
      emptySheetDerivedBattleActFacts,
      0,
    )

  action doProjectWeaponAttackCapability = all {
    qState.replayIndex == 0,
    qState.facts.wieldedWeaponFact,
    qState.facts.actionAvailable,
    recordProjection(
      SheetDerivedWeaponAttackCapabilityProjected,
      true,
      qState.facts
        .with("weaponAttackDiscovered", true)
        .with("manualSubjectProfileHandoff", false),
      1,
    ),
  }

  action doRejectMissingWieldedWeaponCapability = all {
    qState.replayIndex == 0,
    recordProjection(
      SheetDerivedMissingWieldedWeaponRejected,
      false,
      qState.facts
        .with("wieldedWeaponFact", false)
        .with("weaponAttackDiscovered", false),
      8,
    ),
  }

  action doRejectMissingSelectedSpellAttackCapability = all {
    qState.replayIndex == 0,
    recordProjection(
      SheetDerivedMissingSelectedSpellRejected,
      false,
      qState.facts
        .with("preparedSpellAccessFact", false)
        .with("spellAttackDiscovered", false),
      9,
    ),
  }

  action doProjectResourceBackedSpellAttackCapability = all {
    qState.replayIndex == 1,
    qState.facts.preparedSpellAccessFact,
    qState.facts.actionAvailable,
    qState.facts.spellSlotActAvailable,
    qState.facts.minimumLevelOrHigherSlotsRemaining > 0,
    recordProjection(
      SheetDerivedResourceBackedSpellAttackCapabilityProjected,
      true,
      qState.facts
        .with("spellAttackDiscovered", true)
        .with("manualSubjectProfileHandoff", false),
      2,
    ),
  }

  action doRejectEarlySpellFillWithoutSpend = all {
    qState.replayIndex == 2,
    recordProjection(
      SheetDerivedEarlySpellFillRejectedWithoutSpend,
      false,
      qState.facts.with("minimumLevelOrHigherSlotsRemaining", 2),
      3,
    ),
  }

  action doAcceptSpellInvocationAndSpendOneSlot = all {
    qState.replayIndex == 3,
    recordProjection(
      SheetDerivedAcceptedSpellInvocationSpentOneSlot,
      true,
      qState.facts
        .with("minimumLevelOrHigherSlotsRemaining", 1)
        .with("acceptedInvocationCastLevel", 1)
        .with("targetHp", 9)
        .with("actionAvailable", false)
        .with("spellSlotActAvailable", false),
      4,
    ),
  }

  action doRejectStaleOpenActionAfterInvocation = all {
    qState.replayIndex == 4,
    not(qState.facts.actionAvailable),
    recordProjection(
      SheetDerivedStaleOpenActionRejectedAfterInvocation,
      false,
      qState.facts.with("minimumLevelOrHigherSlotsRemaining", 1),
      5,
    ),
  }

  action doRejectStaleSpellFillWithoutSecondSpend = all {
    qState.replayIndex == 5,
    recordProjection(
      SheetDerivedStaleSpellFillRejectedWithoutSecondSpend,
      false,
      qState.facts.with("minimumLevelOrHigherSlotsRemaining", 1),
      6,
    ),
  }

  action doSettleSpellSlotExpenditure = all {
    qState.replayIndex == 6,
    recordProjection(
      SheetDerivedSpellSlotExpenditureSettled,
      true,
      qState.facts
        .with("currentHpSettled", true)
        .with("spellSlotExpenditureSettled", true),
      7,
    ),
  }

  action doRejectExhaustedSlotRediscovery = all {
    qState.replayIndex == 7,
    recordProjection(
      SheetDerivedExhaustedSlotsRejectedRediscovery,
      false,
      qState.facts
        .with("minimumLevelOrHigherSlotsRemaining", 0)
        .with("spellAttackDiscovered", false),
      8,
    ),
  }

  action step = any {
    doProjectWeaponAttackCapability,
    doRejectMissingWieldedWeaponCapability,
    doRejectMissingSelectedSpellAttackCapability,
    doProjectResourceBackedSpellAttackCapability,
    doRejectEarlySpellFillWithoutSpend,
    doAcceptSpellInvocationAndSpendOneSlot,
    doRejectStaleOpenActionAfterInvocation,
    doRejectStaleSpellFillWithoutSecondSpend,
    doSettleSpellSlotExpenditure,
    doRejectExhaustedSlotRediscovery,
  }
}
