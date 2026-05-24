// -*- mode: Bluespec; -*-

module characterSheetClassFeatureSelectedIdentityMbt {
  var qLastResult: str
  var qFeatureUnitId: str
  var qSpellcastingSourceUnitId: str
  var qExpectedSpellPresent: bool
  var qSpellCount: int
  var qAbilityCheckBonus: int
  var qLand: str
  var qAccepted: bool

  action recordProjection(
    lastResult: str,
    featureUnitId: str,
    spellcastingSourceUnitId: str,
    expectedSpellPresent: bool,
    spellCount: int,
    abilityCheckBonus: int,
    land: str,
    accepted: bool,
  ): bool = all {
    qLastResult' = lastResult,
    qFeatureUnitId' = featureUnitId,
    qSpellcastingSourceUnitId' = spellcastingSourceUnitId,
    qExpectedSpellPresent' = expectedSpellPresent,
    qSpellCount' = spellCount,
    qAbilityCheckBonus' = abilityCheckBonus,
    qLand' = land,
    qAccepted' = accepted,
  }

  action init =
    recordProjection("init", "none", "none", false, 0, 0, "none", false)

  action doProjectBardJackOfAllTrades = all {
    qLastResult == "init",
    recordProjection("bard-jack-of-all-trades", "bard_jack_of_all_trades", "none", false, 0, 1, "none", true),
  }

  action doProjectClericLifeDomainSpells = all {
    qLastResult == "init",
    recordProjection("cleric-life-domain-spells", "cleric_life_domain_spells", "none", true, 4, 0, "none", true),
  }

  action doProjectDruidCircleLandSpells = all {
    qLastResult == "init",
    recordProjection("druid-circle-land-spells", "druid_circle_of_the_land_spells", "class_druid", true, 3, 0, "temperate", true),
  }

  action step = any {
    doProjectBardJackOfAllTrades,
    doProjectClericLifeDomainSpells,
    doProjectDruidCircleLandSpells,
  }
}
