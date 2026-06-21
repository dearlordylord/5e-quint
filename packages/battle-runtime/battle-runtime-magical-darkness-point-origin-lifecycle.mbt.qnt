// -*- mode: Bluespec; -*-

module battleRuntimeMagicalDarknessPointOriginLifecycleMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // RAW trace:
  // - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Darkness:
  //   magical Darkness spreads from a point within range and fills a
  //   15-foot-radius Sphere; Darkvision cannot see through it, nonmagical
  //   light cannot illuminate it, overlapping spell-created Bright Light or
  //   Dim Light from level 2 or lower is dispelled, and the duration is
  //   Concentration up to 10 minutes.
  // - .references/srd-5.2.1/Rules-Glossary.md#Darkness and #Darkvision:
  //   Darkness is Heavily Obscured, and magical Darkness blocks Darkvision
  //   when a spell says so.
  // - UBIQUITOUS_LANGUAGE.md: Area of Effect, Concentration, Illumination,
  //   Obscurement, Darkvision, and Spell Slot.
  type WitnessHole = | WitnessProtocolHole

  type MagicalDarknessPointOriginLifecycleScenarioOutcome = | Init | CastWithAreaAndLightWitnesses | ConcentrationCleaned | DurationCleaned

  type MagicalDarknessPointOriginLifecycleWitnessState = {
    qActionAvailable: bool,
    qSpellAvailable: bool,
    qDarknessActive: bool,
    qZoneProjected: bool,
    qCasterConcentrating: bool,
    qOrdinarySightObscurement: str,
    qDarkvisionSightObscurement: str,
    qNonmagicalLightIllumination: str,
    qOverlappingLowLevelSpellLightActive: bool,
    qOverlappingHighLevelSpellLightActive: bool,
    qNonOverlappingLowLevelSpellLightActive: bool,
    qScenarioOutcome: MagicalDarknessPointOriginLifecycleScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: MagicalDarknessPointOriginLifecycleWitnessState

  pure def qActionAvailable: bool = qState.qActionAvailable
  pure def qSpellAvailable: bool = qState.qSpellAvailable
  pure def qDarknessActive: bool = qState.qDarknessActive
  pure def qZoneProjected: bool = qState.qZoneProjected
  pure def qCasterConcentrating: bool = qState.qCasterConcentrating
  pure def qOrdinarySightObscurement: str = qState.qOrdinarySightObscurement
  pure def qDarkvisionSightObscurement: str = qState.qDarkvisionSightObscurement
  pure def qNonmagicalLightIllumination: str = qState.qNonmagicalLightIllumination
  pure def qOverlappingLowLevelSpellLightActive: bool = qState.qOverlappingLowLevelSpellLightActive
  pure def qOverlappingHighLevelSpellLightActive: bool = qState.qOverlappingHighLevelSpellLightActive
  pure def qNonOverlappingLowLevelSpellLightActive: bool = qState.qNonOverlappingLowLevelSpellLightActive
  pure def scenarioOutcome: MagicalDarknessPointOriginLifecycleScenarioOutcome = qState.qScenarioOutcome

  pure def witnessProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: MagicalDarknessPointOriginLifecycleScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)

  action recordDarknessState(
    actionAvailable: bool,
    spellAvailable: bool,
    darknessActive: bool,
    zoneProjected: bool,
    casterConcentrating: bool,
    ordinarySightObscurement: str,
    darkvisionSightObscurement: str,
    nonmagicalLightIllumination: str,
    overlappingLowLevelSpellLightActive: bool,
    overlappingHighLevelSpellLightActive: bool,
    nonOverlappingLowLevelSpellLightActive: bool,
    lastResult: MagicalDarknessPointOriginLifecycleScenarioOutcome,
  ): bool = all {
    qState' = {
      qActionAvailable: actionAvailable,
      qSpellAvailable: spellAvailable,
      qDarknessActive: darknessActive,
      qZoneProjected: zoneProjected,
      qCasterConcentrating: casterConcentrating,
      qOrdinarySightObscurement: ordinarySightObscurement,
      qDarkvisionSightObscurement: darkvisionSightObscurement,
      qNonmagicalLightIllumination: nonmagicalLightIllumination,
      qOverlappingLowLevelSpellLightActive: overlappingLowLevelSpellLightActive,
      qOverlappingHighLevelSpellLightActive: overlappingHighLevelSpellLightActive,
      qNonOverlappingLowLevelSpellLightActive: nonOverlappingLowLevelSpellLightActive,
      qScenarioOutcome: lastResult,
      protocol: witnessProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordDarknessState(
    true,
    true,
    false,
    false,
    false,
    "none",
    "none",
    "none",
    true,
    true,
    true,
    Init,
  )

  action doCastWithAreaAndLightWitnesses = all {
    qActionAvailable,
    qSpellAvailable,
    not(qDarknessActive),
    qOverlappingLowLevelSpellLightActive,
    qOverlappingHighLevelSpellLightActive,
    qNonOverlappingLowLevelSpellLightActive,
    recordDarknessState(
      false,
      false,
      true,
      true,
      true,
      "heavilyObscured",
      "heavilyObscured",
      "darkness",
      false,
      true,
      true,
      CastWithAreaAndLightWitnesses,
    ),
  }

  action doBreakConcentration = all {
    qDarknessActive,
    qCasterConcentrating,
    recordDarknessState(
      qActionAvailable,
      qSpellAvailable,
      false,
      false,
      false,
      "none",
      "none",
      "none",
      qOverlappingLowLevelSpellLightActive,
      qOverlappingHighLevelSpellLightActive,
      qNonOverlappingLowLevelSpellLightActive,
      ConcentrationCleaned,
    ),
  }

  action doExpireDuration = all {
    qDarknessActive,
    qCasterConcentrating,
    recordDarknessState(
      qActionAvailable,
      qSpellAvailable,
      false,
      false,
      false,
      "none",
      "none",
      "none",
      qOverlappingLowLevelSpellLightActive,
      qOverlappingHighLevelSpellLightActive,
      qNonOverlappingLowLevelSpellLightActive,
      DurationCleaned,
    ),
  }

  action doStutter = all {
    not(qDarknessActive),
    not(qSpellAvailable),
    recordDarknessState(
      qActionAvailable,
      qSpellAvailable,
      qDarknessActive,
      qZoneProjected,
      qCasterConcentrating,
      qOrdinarySightObscurement,
      qDarkvisionSightObscurement,
      qNonmagicalLightIllumination,
      qOverlappingLowLevelSpellLightActive,
      qOverlappingHighLevelSpellLightActive,
      qNonOverlappingLowLevelSpellLightActive,
      scenarioOutcome,
    ),
  }

  action step = any {
    doCastWithAreaAndLightWitnesses,
    doBreakConcentration,
    doExpireDuration,
    doStutter,
  }
}
