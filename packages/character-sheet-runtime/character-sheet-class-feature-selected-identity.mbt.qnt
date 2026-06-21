// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_ACCESS.CLASS_FEATURE_PREPARED_PROJECTION

module characterSheetClassFeatureSelectedIdentityMbt {
  type CharacterSheetClassFeatureSelectedIdentityOutcome =
    | CharacterSheetClassFeatureSelectedIdentityInit
    | CharacterSheetClassFeatureSelectedIdentityBardJackOfAllTrades
    | CharacterSheetClassFeatureSelectedIdentityClericLifeDomainSpells
    | CharacterSheetClassFeatureSelectedIdentityDruidCircleLandSpells
    | CharacterSheetClassFeatureSelectedIdentityPaladinOathDevotionSpells
    | CharacterSheetClassFeatureSelectedIdentityPaladinsSmite
    | CharacterSheetClassFeatureSelectedIdentityRangerFavoredEnemy
    | CharacterSheetClassFeatureSelectedIdentitySorcererDraconicSpells
    | CharacterSheetClassFeatureSelectedIdentityWarlockFiendSpells

  type CharacterSheetClassFeatureSelectedIdentityState = {
    outcome: CharacterSheetClassFeatureSelectedIdentityOutcome,
    featureUnitId: str,
    spellcastingSourceUnitId: str,
    expectedSpellPresent: bool,
    spellCount: int,
    abilityCheckBonus: int,
    land: str,
    accepted: bool,
  }

  var qState: CharacterSheetClassFeatureSelectedIdentityState

  action recordProjection(
    outcome: CharacterSheetClassFeatureSelectedIdentityOutcome,
    featureUnitId: str,
    spellcastingSourceUnitId: str,
    expectedSpellPresent: bool,
    spellCount: int,
    abilityCheckBonus: int,
    land: str,
    accepted: bool,
  ): bool = all {
    qState' = {
      outcome: outcome,
      featureUnitId: featureUnitId,
      spellcastingSourceUnitId: spellcastingSourceUnitId,
      expectedSpellPresent: expectedSpellPresent,
      spellCount: spellCount,
      abilityCheckBonus: abilityCheckBonus,
      land: land,
      accepted: accepted,
    },
  }

  action init =
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentityInit,
      "none",
      "none",
      false,
      0,
      0,
      "none",
      false,
    )

  action doProjectBardJackOfAllTrades = all {
    qState.outcome == CharacterSheetClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentityBardJackOfAllTrades,
      "bard_jack_of_all_trades",
      "none",
      false,
      0,
      1,
      "none",
      true,
    ),
  }

  action doProjectClericLifeDomainSpells = all {
    qState.outcome == CharacterSheetClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentityClericLifeDomainSpells,
      "cleric_life_domain_spells",
      "none",
      true,
      4,
      0,
      "none",
      true,
    ),
  }

  action doProjectDruidCircleLandSpells = all {
    qState.outcome == CharacterSheetClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentityDruidCircleLandSpells,
      "druid_circle_of_the_land_spells",
      "class_druid",
      true,
      3,
      0,
      "temperate",
      true,
    ),
  }

  action doProjectPaladinOathDevotionSpells = all {
    qState.outcome == CharacterSheetClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentityPaladinOathDevotionSpells,
      "paladin_oath_of_devotion_spells",
      "none",
      true,
      2,
      0,
      "none",
      true,
    ),
  }

  action doProjectPaladinsSmite = all {
    qState.outcome == CharacterSheetClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentityPaladinsSmite,
      "paladin_paladins_smite",
      "none",
      true,
      1,
      0,
      "none",
      true,
    ),
  }

  action doProjectRangerFavoredEnemy = all {
    qState.outcome == CharacterSheetClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentityRangerFavoredEnemy,
      "ranger_favored_enemy",
      "none",
      true,
      1,
      0,
      "none",
      true,
    ),
  }

  action doProjectSorcererDraconicSpells = all {
    qState.outcome == CharacterSheetClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentitySorcererDraconicSpells,
      "sorcerer_draconic_spells",
      "none",
      true,
      4,
      0,
      "none",
      true,
    ),
  }

  action doProjectWarlockFiendSpells = all {
    qState.outcome == CharacterSheetClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterSheetClassFeatureSelectedIdentityWarlockFiendSpells,
      "warlock_fiend_spells",
      "none",
      true,
      4,
      0,
      "none",
      true,
    ),
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
