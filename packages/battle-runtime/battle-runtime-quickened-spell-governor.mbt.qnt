// -*- mode: Bluespec; -*-

module battleRuntimeQuickenedSpellGovernorMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // RAW trace:
  // - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
  //   Metamagic options are known choices, each costs Sorcery Points, and a
  //   spell can use only one option unless an option says otherwise.
  // - .references/srd-5.2.1/Classes/Sorcerer.md#Quickened Spell:
  //   Quickened Spell costs 2 Sorcery Points, changes an action casting time
  //   to a Bonus Action for that casting, and bars level 1+ spell casts before
  //   or after the modified spell on the same turn.
  // - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Casting Time:
  //   spells use the Casting Time entry and a turn can expend only one Spell
  //   Slot to cast a spell.
  // - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Slot,
  //   Sorcery Points as a Pool, and Spend.
  type WitnessHole = | WitnessProtocolHole

  type QuickenedSpellGovernorWitnessState = {
    qQuickenedCureWoundsOffered: bool,
    qColorSprayBlinded: bool,
    qCalmEmotionsImmunity: bool,
    qInvisibilityActive: bool,
    qBlessActive: bool,
    qMagicActionAvailable: bool,
    qBonusActionAvailable: bool,
    qSorceryPointsRemaining: int,
    qTargetHp: int,
    qSpellSlotCommitted: bool,
    qLevelOnePlusCastThisTurn: bool,
    qQuickenedLevelOnePlusCastThisTurn: bool,
    qSpellSlotActsAvailable: bool,
    qInvalidKind: str,
    qScenarioResult: str,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: QuickenedSpellGovernorWitnessState

  pure def qQuickenedCureWoundsOffered: bool = qState.qQuickenedCureWoundsOffered
  pure def qColorSprayBlinded: bool = qState.qColorSprayBlinded
  pure def qCalmEmotionsImmunity: bool = qState.qCalmEmotionsImmunity
  pure def qInvisibilityActive: bool = qState.qInvisibilityActive
  pure def qBlessActive: bool = qState.qBlessActive
  pure def qMagicActionAvailable: bool = qState.qMagicActionAvailable
  pure def qBonusActionAvailable: bool = qState.qBonusActionAvailable
  pure def qSorceryPointsRemaining: int = qState.qSorceryPointsRemaining
  pure def qTargetHp: int = qState.qTargetHp
  pure def qSpellSlotCommitted: bool = qState.qSpellSlotCommitted
  pure def qLevelOnePlusCastThisTurn: bool = qState.qLevelOnePlusCastThisTurn
  pure def qQuickenedLevelOnePlusCastThisTurn: bool = qState.qQuickenedLevelOnePlusCastThisTurn
  pure def qSpellSlotActsAvailable: bool = qState.qSpellSlotActsAvailable
  pure def qInvalidKind: str = qState.qInvalidKind
  pure def qLastResult: str = qState.qScenarioResult

  pure val initialSorceryPoints: int = 4
  pure val highSorceryPoints: int = 5
  pure val unaffordableSorceryPoints: int = 1
  pure val initialTargetHp: int = 4
  pure val quickenedHealingResultHp: int = 14

  pure def witnessProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioResult: str,
    scenarioInvalidReason: str,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioResult == "init") witnessInit(WitnessProtocolHole)
    else if (scenarioInvalidReason == "invalidFill") witnessInvalid(WitnessProtocolHole, WInvalidFill)
    else if (scenarioInvalidReason == "staleSubject") witnessInvalid(WitnessProtocolHole, WStaleSubject)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordQuickenedGovernorState(
    quickenedCureWoundsOffered: bool,
    colorSprayBlinded: bool,
    calmEmotionsImmunity: bool,
    invisibilityActive: bool,
    blessActive: bool,
    magicActionAvailable: bool,
    bonusActionAvailable: bool,
    sorceryPointsRemaining: int,
    targetHp: int,
    spellSlotCommitted: bool,
    levelOnePlusCastThisTurn: bool,
    quickenedLevelOnePlusCastThisTurn: bool,
    spellSlotActsAvailable: bool,
    invalidKind: str,
    lastResult: str,
  ): bool = all {
    qState' = {
      qQuickenedCureWoundsOffered: quickenedCureWoundsOffered,
      qColorSprayBlinded: colorSprayBlinded,
      qCalmEmotionsImmunity: calmEmotionsImmunity,
      qInvisibilityActive: invisibilityActive,
      qBlessActive: blessActive,
      qMagicActionAvailable: magicActionAvailable,
      qBonusActionAvailable: bonusActionAvailable,
      qSorceryPointsRemaining: sorceryPointsRemaining,
      qTargetHp: targetHp,
      qSpellSlotCommitted: spellSlotCommitted,
      qLevelOnePlusCastThisTurn: levelOnePlusCastThisTurn,
      qQuickenedLevelOnePlusCastThisTurn: quickenedLevelOnePlusCastThisTurn,
      qSpellSlotActsAvailable: spellSlotActsAvailable,
      qInvalidKind: invalidKind,
      qScenarioResult: lastResult,
      protocol: witnessProtocolForProjection(Set(), lastResult, ""),
    },
  }

  action init = recordQuickenedGovernorState(
    true,
    false,
    false,
    false,
    false,
    true,
    true,
    initialSorceryPoints,
    initialTargetHp,
    false,
    false,
    false,
    true,
    "none",
    "init",
  )

  action doResolveQuickenedRestoration = recordQuickenedGovernorState(
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    initialSorceryPoints - 2,
    quickenedHealingResultHp,
    true,
    true,
    true,
    false,
    "none",
    "resolvedQuickenedRestoration",
  )

  action doResolveQuickenedSaveGatedCondition = recordQuickenedGovernorState(
    false,
    true,
    false,
    false,
    false,
    true,
    false,
    initialSorceryPoints - 2,
    initialTargetHp,
    true,
    true,
    true,
    false,
    "none",
    "resolvedQuickenedSaveGatedCondition",
  )

  action doResolveQuickenedSaveGatedConditionImmunity = recordQuickenedGovernorState(
    false,
    false,
    true,
    false,
    false,
    true,
    false,
    initialSorceryPoints - 2,
    initialTargetHp,
    true,
    true,
    true,
    false,
    "none",
    "resolvedQuickenedSaveGatedConditionImmunity",
  )

  action doResolveQuickenedDirectCondition = recordQuickenedGovernorState(
    false,
    false,
    false,
    true,
    false,
    true,
    false,
    initialSorceryPoints - 2,
    initialTargetHp,
    true,
    true,
    true,
    false,
    "none",
    "resolvedQuickenedDirectCondition",
  )

  action doResolveQuickenedRollModifier = recordQuickenedGovernorState(
    false,
    false,
    false,
    false,
    true,
    true,
    false,
    initialSorceryPoints - 2,
    initialTargetHp,
    true,
    true,
    true,
    false,
    "none",
    "resolvedQuickenedRollModifier",
  )

  action doResolveQuickenedAfterMagicActionSpent = recordQuickenedGovernorState(
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    initialSorceryPoints - 2,
    quickenedHealingResultHp,
    true,
    true,
    true,
    false,
    "none",
    "resolvedAfterMagicActionSpent",
  )

  action doRejectUnaffordable = recordQuickenedGovernorState(
    false,
    false,
    false,
    false,
    false,
    true,
    true,
    unaffordableSorceryPoints,
    initialTargetHp,
    false,
    false,
    false,
    true,
    "unaffordable",
    "rejectedUnaffordable",
  )

  action doRejectUnknownOption = recordQuickenedGovernorState(
    true,
    false,
    false,
    false,
    false,
    true,
    true,
    initialSorceryPoints,
    initialTargetHp,
    false,
    false,
    false,
    true,
    "unknownOption",
    "rejectedUnknownOption",
  )

  action doRejectUnsupportedSecondOption = recordQuickenedGovernorState(
    true,
    false,
    false,
    false,
    false,
    true,
    true,
    highSorceryPoints,
    initialTargetHp,
    false,
    false,
    false,
    true,
    "unsupportedSecondOption",
    "rejectedUnsupportedSecondOption",
  )

  action doRejectOnePerSpell = recordQuickenedGovernorState(
    true,
    false,
    false,
    false,
    false,
    true,
    true,
    highSorceryPoints,
    initialTargetHp,
    false,
    false,
    false,
    true,
    "onePerSpell",
    "rejectedOnePerSpell",
  )

  action doRejectPriorLevelOnePlusSpell = recordQuickenedGovernorState(
    false,
    false,
    false,
    false,
    false,
    true,
    true,
    initialSorceryPoints,
    initialTargetHp,
    false,
    true,
    false,
    true,
    "sameTurnLevelOnePlus",
    "rejectedPriorLevelOnePlusSpell",
  )

  action step = any {
    doResolveQuickenedRestoration,
    doResolveQuickenedSaveGatedCondition,
    doResolveQuickenedSaveGatedConditionImmunity,
    doResolveQuickenedDirectCondition,
    doResolveQuickenedRollModifier,
    doResolveQuickenedAfterMagicActionSpent,
    doRejectUnaffordable,
    doRejectUnknownOption,
    doRejectUnsupportedSecondOption,
    doRejectOnePerSpell,
    doRejectPriorLevelOnePlusSpell,
  }
}
