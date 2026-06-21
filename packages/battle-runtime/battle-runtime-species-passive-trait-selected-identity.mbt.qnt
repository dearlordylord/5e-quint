// -*- mode: Bluespec; -*-

module battleRuntimeSpeciesPassiveTraitSelectedIdentityMbt {
  import battleRuntimeWitnessProtocol.* from "./battle-runtime-witness-protocol"

  // Self-contained literal projection witness for selected passive species
  // traits. The paired TypeScript witness independently discovers these facts
  // through production battle-runtime entrypoints and typed support profiles.
  //
  // RAW trace:
  // - .references/srd-5.2.1/Character-Origins.md:107-123 defines Draconic
  //   Ancestry and Dragonborn Damage Resistance.
  // - .references/srd-5.2.1/Character-Origins.md:139 defines Dwarven
  //   Resilience's Poison Resistance and Advantage on Saving Throws made to
  //   avoid or end Poisoned.
  // - .references/srd-5.2.1/Character-Origins.md:223 defines Brave's
  //   Advantage on Saving Throws made to avoid or end Frightened.
  // - .references/srd-5.2.1/Character-Origins.md:213 defines Powerful Build's
  //   Advantage on Ability Checks made to end Grappled.
  // - .references/srd-5.2.1/Rules-Glossary.md:514 and 828-830 define Grapple
  //   escape checks and Resistance damage halving.
  type Hole = | NoHole

  type SpeciesPassiveTraitSelectedIdentityScenarioOutcome = | Init | DragonbornDamageResistance | DwarvenResilience | HalflingBrave | GoliathPowerfulBuild

  type SpeciesPassiveTraitSelectedIdentityWitnessState = {
    dragonbornFireDamageAfter: int,
    dragonbornColdDamageAfter: int,
    dwarfPoisonDamageAfter: int,
    dwarfFireDamageAfter: int,
    dwarfPoisonedSaveAdvantage: bool,
    dwarfCharmedSaveAdvantage: bool,
    halflingFrightenedAvoidSaveAdvantage: bool,
    halflingFrightenedEndSaveAdvantage: bool,
    halflingPoisonedSaveAdvantage: bool,
    goliathEscapeRollMode: str,
    goliathPoisonedEscapeRollMode: str,
    scenarioOutcome: SpeciesPassiveTraitSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  }

  var qState: SpeciesPassiveTraitSelectedIdentityWitnessState

  action recordProjection(
    dragonbornFireDamageAfter: int,
    dragonbornColdDamageAfter: int,
    dwarfPoisonDamageAfter: int,
    dwarfFireDamageAfter: int,
    dwarfPoisonedSaveAdvantage: bool,
    dwarfCharmedSaveAdvantage: bool,
    halflingFrightenedAvoidSaveAdvantage: bool,
    halflingFrightenedEndSaveAdvantage: bool,
    halflingPoisonedSaveAdvantage: bool,
    goliathEscapeRollMode: str,
    goliathPoisonedEscapeRollMode: str,
    scenarioOutcome: SpeciesPassiveTraitSelectedIdentityScenarioOutcome,
    protocol: WitnessProtocol[Hole],
  ): bool = all {
    qState' = {
      dragonbornFireDamageAfter: dragonbornFireDamageAfter,
      dragonbornColdDamageAfter: dragonbornColdDamageAfter,
      dwarfPoisonDamageAfter: dwarfPoisonDamageAfter,
      dwarfFireDamageAfter: dwarfFireDamageAfter,
      dwarfPoisonedSaveAdvantage: dwarfPoisonedSaveAdvantage,
      dwarfCharmedSaveAdvantage: dwarfCharmedSaveAdvantage,
      halflingFrightenedAvoidSaveAdvantage: halflingFrightenedAvoidSaveAdvantage,
      halflingFrightenedEndSaveAdvantage: halflingFrightenedEndSaveAdvantage,
      halflingPoisonedSaveAdvantage: halflingPoisonedSaveAdvantage,
      goliathEscapeRollMode: goliathEscapeRollMode,
      goliathPoisonedEscapeRollMode: goliathPoisonedEscapeRollMode,
      scenarioOutcome: scenarioOutcome,
      protocol: protocol,
    },
  }

  action init = recordProjection(
    9, 9, 9, 9, false, false, false, false, false, "normal", "normal", Init,
    witnessInit(NoHole))

  action doDragonbornDamageResistance = all {
    qState.protocol.result == WInit,
    recordProjection(
      4, 9, 9, 9, false, false, false, false, false, "normal", "normal",
      DragonbornDamageResistance,
      witnessResolved(NoHole)),
  }

  action doDwarvenResilience = all {
    qState.protocol.result == WInit,
    recordProjection(
      9, 9, 4, 9, true, false, false, false, false, "normal", "normal",
      DwarvenResilience,
      witnessResolved(NoHole)),
  }

  action doHalflingBrave = all {
    qState.protocol.result == WInit,
    recordProjection(
      9, 9, 9, 9, false, false, true, true, false, "normal", "normal",
      HalflingBrave,
      witnessResolved(NoHole)),
  }

  action doGoliathPowerfulBuild = all {
    qState.protocol.result == WInit,
    recordProjection(
      9, 9, 9, 9, false, false, false, false, false, "advantage", "normal",
      GoliathPowerfulBuild,
      witnessResolved(NoHole)),
  }

  action step = any {
    doDragonbornDamageResistance,
    doDwarvenResilience,
    doHalflingBrave,
    doGoliathPowerfulBuild,
  }
}
