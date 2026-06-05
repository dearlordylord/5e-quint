// -*- mode: Bluespec; -*-

module battleRuntimeQuickenedSpellGovernorMbt {
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
  var qQuickenedCureWoundsOffered: bool
  var qColorSprayBlinded: bool
  var qCalmEmotionsImmunity: bool
  var qInvisibilityActive: bool
  var qBlessActive: bool
  var qMagicActionAvailable: bool
  var qBonusActionAvailable: bool
  var qSorceryPointsRemaining: int
  var qTargetHp: int
  var qSpellSlotCommitted: bool
  var qLevelOnePlusCastThisTurn: bool
  var qQuickenedLevelOnePlusCastThisTurn: bool
  var qSpellSlotActsAvailable: bool
  var qInvalidKind: str
  var qLastResult: str

  pure val initialSorceryPoints: int = 4
  pure val highSorceryPoints: int = 5
  pure val unaffordableSorceryPoints: int = 1
  pure val initialTargetHp: int = 4
  pure val quickenedHealingResultHp: int = 14

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
    qQuickenedCureWoundsOffered' = quickenedCureWoundsOffered,
    qColorSprayBlinded' = colorSprayBlinded,
    qCalmEmotionsImmunity' = calmEmotionsImmunity,
    qInvisibilityActive' = invisibilityActive,
    qBlessActive' = blessActive,
    qMagicActionAvailable' = magicActionAvailable,
    qBonusActionAvailable' = bonusActionAvailable,
    qSorceryPointsRemaining' = sorceryPointsRemaining,
    qTargetHp' = targetHp,
    qSpellSlotCommitted' = spellSlotCommitted,
    qLevelOnePlusCastThisTurn' = levelOnePlusCastThisTurn,
    qQuickenedLevelOnePlusCastThisTurn' = quickenedLevelOnePlusCastThisTurn,
    qSpellSlotActsAvailable' = spellSlotActsAvailable,
    qInvalidKind' = invalidKind,
    qLastResult' = lastResult,
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
