// -*- mode: Bluespec; -*-

module battleRuntimeDispelMagicOngoingSpellEndingMbt {
  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dispel Magic:
  //   choose a creature, object, or magical effect within range; ongoing spells
  //   at or below the Dispel Magic slot level end; higher-level ongoing spells
  //   require a spellcasting ability check against DC 10 plus that spell level;
  //   higher-level slots automatically end same-or-lower-level ongoing spells.
  // - .references/srd-5.2.1/Playing-the-Game.md#Ability Checks:
  //   ability checks compare the total to a Difficulty Class.
  // - UBIQUITOUS_LANGUAGE.md: Ability Check, Difficulty Class, Magic Action,
  //   Spell Slot, and Concentration.
  var qActionAvailable: bool
  var qSlot3Available: bool
  var qSlot4Available: bool
  var qLowLevelEffectActive: bool
  var qHighLevelEffectActive: bool
  var qHigherLevelCheckHoleCount: int
  var qHigherLevelCheckDc: int
  var qHighLevelCasterConcentrating: bool
  var qLastResult: str

  pure val baseSlotLevel: int = 3
  pure val upcastSlotLevel: int = 4
  pure val higherLevelSourceSpellLevel: int = 4
  pure val higherLevelCheckDc: int = 10 + higherLevelSourceSpellLevel

  action recordDispelState(
    actionAvailable: bool,
    slot3Available: bool,
    slot4Available: bool,
    lowLevelEffectActive: bool,
    highLevelEffectActive: bool,
    higherLevelCheckHoleCount: int,
    higherLevelCheckDc: int,
    highLevelCasterConcentrating: bool,
    lastResult: str,
  ): bool = all {
    qActionAvailable' = actionAvailable,
    qSlot3Available' = slot3Available,
    qSlot4Available' = slot4Available,
    qLowLevelEffectActive' = lowLevelEffectActive,
    qHighLevelEffectActive' = highLevelEffectActive,
    qHigherLevelCheckHoleCount' = higherLevelCheckHoleCount,
    qHigherLevelCheckDc' = higherLevelCheckDc,
    qHighLevelCasterConcentrating' = highLevelCasterConcentrating,
    qLastResult' = lastResult,
  }

  action init = recordDispelState(
    true,
    true,
    true,
    true,
    true,
    0,
    0,
    true,
    "init",
  )

  action doRequestHigherLevelCheck = all {
    qActionAvailable,
    qSlot3Available,
    qLowLevelEffectActive,
    qHighLevelEffectActive,
    baseSlotLevel < higherLevelSourceSpellLevel,
    recordDispelState(
      true,
      true,
      true,
      true,
      true,
      1,
      higherLevelCheckDc,
      true,
      "needsHigherLevelCheck",
    ),
  }

  action doFailHigherLevelCheck = all {
    qActionAvailable,
    qSlot3Available,
    qLowLevelEffectActive,
    qHighLevelEffectActive,
    qHigherLevelCheckHoleCount == 1,
    baseSlotLevel < higherLevelSourceSpellLevel,
    recordDispelState(
      false,
      false,
      true,
      false,
      true,
      0,
      0,
      true,
      "failedHigherLevelCheck",
    ),
  }

  action doSucceedHigherLevelCheck = all {
    qActionAvailable,
    qSlot3Available,
    qLowLevelEffectActive,
    qHighLevelEffectActive,
    qHigherLevelCheckHoleCount == 1,
    baseSlotLevel < higherLevelSourceSpellLevel,
    recordDispelState(
      false,
      false,
      true,
      false,
      false,
      0,
      0,
      false,
      "succeededHigherLevelCheck",
    ),
  }

  action doUpcastAutoEnd = all {
    qActionAvailable,
    qSlot4Available,
    qLowLevelEffectActive,
    qHighLevelEffectActive,
    upcastSlotLevel >= higherLevelSourceSpellLevel,
    recordDispelState(
      false,
      true,
      false,
      false,
      false,
      0,
      0,
      false,
      "upcastAutoEnded",
    ),
  }

  action doStutter = all {
    not(qActionAvailable) or not(qLowLevelEffectActive),
    recordDispelState(
      qActionAvailable,
      qSlot3Available,
      qSlot4Available,
      qLowLevelEffectActive,
      qHighLevelEffectActive,
      qHigherLevelCheckHoleCount,
      qHigherLevelCheckDc,
      qHighLevelCasterConcentrating,
      qLastResult,
    ),
  }

  action step = any {
    doRequestHigherLevelCheck,
    doFailHigherLevelCheck,
    doSucceedHigherLevelCheck,
    doUpcastAutoEnd,
    doStutter,
  }
}
