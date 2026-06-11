// -*- mode: Bluespec; -*-

module battleRuntimeDispelMagicOngoingSpellEndingMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | DispelMagicOngoingSpellEnding

  type DispelMagicOngoingSpellEndingScenarioOutcome = | Init | NeedsHigherLevelCheck | FailedHigherLevelCheck | SucceededHigherLevelCheck | UpcastAutoEnded | AntimagicAuraUnaffected


  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dispel Magic:
  //   choose a creature, object, or magical effect within range; ongoing spells
  //   at or below the Dispel Magic slot level end; higher-level ongoing spells
  //   require a spellcasting ability check against DC 10 plus that spell level;
  //   higher-level slots automatically end same-or-lower-level ongoing spells.
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic Field:
  //   Dispel Magic has no effect on the aura.
  // - .references/srd-5.2.1/Playing-the-Game.md#Ability Checks:
  //   ability checks compare the total to a Difficulty Class.
  // - UBIQUITOUS_LANGUAGE.md: Ability Check, Difficulty Class, Magic Action,
  //   Spell Slot, and Concentration.
  type WitnessState = {
    qActionAvailable: bool,
    qSlot3Available: bool,
    qSlot4Available: bool,
    qLowLevelEffectActive: bool,
    qHighLevelEffectActive: bool,
    qAntimagicAuraActive: bool,
    qHigherLevelCheckHoleCount: int,
    qHigherLevelCheckDc: int,
    qHighLevelCasterConcentrating: bool,
    qScenarioOutcome: DispelMagicOngoingSpellEndingScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: WitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSlot3Available: bool = qState.qSlot3Available
  pure def qSlot4Available: bool = qState.qSlot4Available
  pure def qLowLevelEffectActive: bool = qState.qLowLevelEffectActive
  pure def qHighLevelEffectActive: bool = qState.qHighLevelEffectActive
  pure def qAntimagicAuraActive: bool = qState.qAntimagicAuraActive
  pure def qHigherLevelCheckHoleCount: int = qState.qHigherLevelCheckHoleCount
  pure def qHigherLevelCheckDc: int = qState.qHigherLevelCheckDc
  pure def qHighLevelCasterConcentrating: bool = qState.qHighLevelCasterConcentrating
  pure def qScenarioOutcome: DispelMagicOngoingSpellEndingScenarioOutcome = qState.qScenarioOutcome

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
    antimagicAuraActive: bool,
    higherLevelCheckHoleCount: int,
    higherLevelCheckDc: int,
    highLevelCasterConcentrating: bool,
    scenarioOutcome: DispelMagicOngoingSpellEndingScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  ): bool = all {
    qState' = {
      qActionAvailable: actionAvailable,
      qSlot3Available: slot3Available,
      qSlot4Available: slot4Available,
      qLowLevelEffectActive: lowLevelEffectActive,
      qHighLevelEffectActive: highLevelEffectActive,
      qAntimagicAuraActive: antimagicAuraActive,
      qHigherLevelCheckHoleCount: higherLevelCheckHoleCount,
      qHigherLevelCheckDc: higherLevelCheckDc,
      qHighLevelCasterConcentrating: highLevelCasterConcentrating,
      qScenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordDispelState(
    true,
    true,
    true,
    true,
    true,
    true,
    0,
    0,
    true,
    Init,
    witnessInit(DispelMagicOngoingSpellEnding),
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
      true,
      1,
      higherLevelCheckDc,
      true,
      NeedsHigherLevelCheck,
    witnessResolved(DispelMagicOngoingSpellEnding),
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
      true,
      0,
      0,
      true,
      FailedHigherLevelCheck,
    witnessResolved(DispelMagicOngoingSpellEnding),
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
      true,
      0,
      0,
      false,
      SucceededHigherLevelCheck,
    witnessResolved(DispelMagicOngoingSpellEnding),
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
      true,
      0,
      0,
      false,
      UpcastAutoEnded,
    witnessResolved(DispelMagicOngoingSpellEnding),
  ),
  }

  action doTargetAntimagicAura = all {
    qActionAvailable,
    qSlot3Available,
    qLowLevelEffectActive,
    qHighLevelEffectActive,
    qAntimagicAuraActive,
    recordDispelState(
      false,
      false,
      true,
      true,
      true,
      true,
      0,
      0,
      true,
      AntimagicAuraUnaffected,
    witnessResolved(DispelMagicOngoingSpellEnding),
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
      qAntimagicAuraActive,
      qHigherLevelCheckHoleCount,
      qHigherLevelCheckDc,
      qHighLevelCasterConcentrating,
      qScenarioOutcome,
    qState.protocol,),
  }

  action step = any {
    doRequestHigherLevelCheck,
    doFailHigherLevelCheck,
    doSucceedHigherLevelCheck,
    doUpcastAutoEnd,
    doTargetAntimagicAura,
    doStutter,
  }
}
