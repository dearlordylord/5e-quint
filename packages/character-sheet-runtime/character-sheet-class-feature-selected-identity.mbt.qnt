// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION

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

  action doProjectPaladinOathDevotionSpells = all {
    qLastResult == "init",
    recordProjection("paladin-oath-devotion-spells", "paladin_oath_of_devotion_spells", "none", true, 2, 0, "none", true),
  }

  action doProjectPaladinsSmite = all {
    qLastResult == "init",
    recordProjection("paladins-smite", "paladin_paladins_smite", "none", true, 1, 0, "none", true),
  }

  action doProjectRangerFavoredEnemy = all {
    qLastResult == "init",
    recordProjection("ranger-favored-enemy", "ranger_favored_enemy", "none", true, 1, 0, "none", true),
  }

  action doProjectSorcererDraconicSpells = all {
    qLastResult == "init",
    recordProjection("sorcerer-draconic-spells", "sorcerer_draconic_spells", "none", true, 4, 0, "none", true),
  }

  action doProjectWarlockFiendSpells = all {
    qLastResult == "init",
    recordProjection("warlock-fiend-spells", "warlock_fiend_spells", "none", true, 4, 0, "none", true),
  }

  action stepProjectBardJackOfAllTrades = any {
    doProjectBardJackOfAllTrades,
  }

  action stepProjectClericLifeDomainSpells = any {
    doProjectClericLifeDomainSpells,
  }

  action stepProjectDruidCircleLandSpells = any {
    doProjectDruidCircleLandSpells,
  }

  action stepProjectPaladinOathDevotionSpells = any {
    doProjectPaladinOathDevotionSpells,
  }

  action stepProjectPaladinsSmite = any {
    doProjectPaladinsSmite,
  }

  action stepProjectRangerFavoredEnemy = any {
    doProjectRangerFavoredEnemy,
  }

  action stepProjectSorcererDraconicSpells = any {
    doProjectSorcererDraconicSpells,
  }

  action stepProjectWarlockFiendSpells = any {
    doProjectWarlockFiendSpells,
  }

  action step = any {
    doProjectBardJackOfAllTrades,
    doProjectClericLifeDomainSpells,
    doProjectDruidCircleLandSpells,
    doProjectPaladinOathDevotionSpells,
    doProjectPaladinsSmite,
    doProjectRangerFavoredEnemy,
    doProjectSorcererDraconicSpells,
    doProjectWarlockFiendSpells,
  }
}
