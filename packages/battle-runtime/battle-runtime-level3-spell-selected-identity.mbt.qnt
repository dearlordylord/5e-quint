// -*- mode: Bluespec; -*-

module battleRuntimeLevel3SpellSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  type WitnessHole = | WitnessProtocolHole

  type Level3SpellSelectedIdentityScenarioOutcome = | Init | GlyphDurableOccurrence | GlyphExplosiveRuneRelease | GlyphStoredSpellRelease | HastePositiveEffects | ProtectionFromEnergyResistance | SleetStormAreaHazard | SlowActivePenalties

  type Level3SpellSelectedIdentityWitnessState = {
    qScenarioOutcome: Level3SpellSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[WitnessHole],
  }

  var qState: Level3SpellSelectedIdentityWitnessState

  pure def scenarioOutcome: Level3SpellSelectedIdentityScenarioOutcome = qState.qScenarioOutcome

  pure def level3SpellSelectedIdentityProtocolForProjection(
    holes: Set[WitnessHole],
    scenarioOutcome: Level3SpellSelectedIdentityScenarioOutcome,
  ): WitnessProtocol[WitnessHole] =
    if (scenarioOutcome == Init) witnessInit(WitnessProtocolHole)
    else if (holes != Set()) witnessNeedsHoles(holes)
    else witnessResolved(WitnessProtocolHole)


  action recordProjection(lastResult: Level3SpellSelectedIdentityScenarioOutcome): bool = all {
    qState' = {
      qScenarioOutcome: lastResult,
      protocol: level3SpellSelectedIdentityProtocolForProjection(Set(), lastResult),
    },
  }

  action init = recordProjection(Init)

  action doDiscoverGlyphDurableOccurrence = all {
    scenarioOutcome == Init,
    recordProjection(GlyphDurableOccurrence),
  }

  action doDiscoverGlyphExplosiveRuneRelease = all {
    scenarioOutcome == Init,
    recordProjection(GlyphExplosiveRuneRelease),
  }

  action doDiscoverGlyphStoredSpellRelease = all {
    scenarioOutcome == Init,
    recordProjection(GlyphStoredSpellRelease),
  }

  action doDiscoverHastePositiveEffects = all {
    scenarioOutcome == Init,
    recordProjection(HastePositiveEffects),
  }

  action doDiscoverProtectionFromEnergyResistance = all {
    scenarioOutcome == Init,
    recordProjection(ProtectionFromEnergyResistance),
  }

  action doDiscoverSleetStormAreaHazard = all {
    scenarioOutcome == Init,
    recordProjection(SleetStormAreaHazard),
  }

  action doDiscoverSlowActivePenalties = all {
    scenarioOutcome == Init,
    recordProjection(SlowActivePenalties),
  }

  action step = any {
    doDiscoverGlyphDurableOccurrence,
    doDiscoverGlyphExplosiveRuneRelease,
    doDiscoverGlyphStoredSpellRelease,
    doDiscoverHastePositiveEffects,
    doDiscoverProtectionFromEnergyResistance,
    doDiscoverSleetStormAreaHazard,
    doDiscoverSlowActivePenalties,
  }
}
