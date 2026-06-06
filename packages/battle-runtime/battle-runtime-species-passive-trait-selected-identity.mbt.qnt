// -*- mode: Bluespec; -*-

module battleRuntimeSpeciesPassiveTraitSelectedIdentityMbt {
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
  // - .references/srd-5.2.1/Character-Origins.md:213 defines Powerful Build's
  //   Advantage on Ability Checks made to end Grappled.
  // - .references/srd-5.2.1/Rules-Glossary.md:514 and 828-830 define Grapple
  //   escape checks and Resistance damage halving.
  var qDragonbornFireDamageAfter: int
  var qDragonbornColdDamageAfter: int
  var qDwarfPoisonDamageAfter: int
  var qDwarfFireDamageAfter: int
  var qDwarfPoisonedSaveAdvantage: bool
  var qDwarfCharmedSaveAdvantage: bool
  var qGoliathEscapeRollMode: str
  var qGoliathPoisonedEscapeRollMode: str
  var qLastResult: str

  action recordProjection(
    dragonbornFireDamageAfter: int,
    dragonbornColdDamageAfter: int,
    dwarfPoisonDamageAfter: int,
    dwarfFireDamageAfter: int,
    dwarfPoisonedSaveAdvantage: bool,
    dwarfCharmedSaveAdvantage: bool,
    goliathEscapeRollMode: str,
    goliathPoisonedEscapeRollMode: str,
    lastResult: str,
  ): bool = all {
    qDragonbornFireDamageAfter' = dragonbornFireDamageAfter,
    qDragonbornColdDamageAfter' = dragonbornColdDamageAfter,
    qDwarfPoisonDamageAfter' = dwarfPoisonDamageAfter,
    qDwarfFireDamageAfter' = dwarfFireDamageAfter,
    qDwarfPoisonedSaveAdvantage' = dwarfPoisonedSaveAdvantage,
    qDwarfCharmedSaveAdvantage' = dwarfCharmedSaveAdvantage,
    qGoliathEscapeRollMode' = goliathEscapeRollMode,
    qGoliathPoisonedEscapeRollMode' = goliathPoisonedEscapeRollMode,
    qLastResult' = lastResult,
  }

  action init = recordProjection(
    9, 9, 9, 9, false, false, "normal", "normal", "init",
  )

  action doDragonbornDamageResistance = all {
    qLastResult == "init",
    recordProjection(
      4, 9, 9, 9, false, false, "normal", "normal",
      "dragonbornDamageResistance",
    ),
  }

  action doDwarvenResilience = all {
    qLastResult == "init",
    recordProjection(
      9, 9, 4, 9, true, false, "normal", "normal",
      "dwarvenResilience",
    ),
  }

  action doGoliathPowerfulBuild = all {
    qLastResult == "init",
    recordProjection(
      9, 9, 9, 9, false, false, "advantage", "normal",
      "goliathPowerfulBuild",
    ),
  }

  action step = any {
    doDragonbornDamageResistance,
    doDwarvenResilience,
    doGoliathPowerfulBuild,
  }
}
