// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION

module characterCreationClassFeatureSelectedIdentityMbt {
  var qLastResult: str
  var qFeatureUnitId: str
  var qLinkedUnitId: str
  var qChoiceCount: int
  var qResourceMaximum: int
  var qKnownFormCount: int
  var qShortRestRefill: int
  var qLongRestRefillsAll: bool
  var qAccepted: bool

  action recordProjection(
    lastResult: str,
    featureUnitId: str,
    linkedUnitId: str,
    choiceCount: int,
    resourceMaximum: int,
    knownFormCount: int,
    shortRestRefill: int,
    longRestRefillsAll: bool,
    accepted: bool,
  ): bool = all {
    qLastResult' = lastResult,
    qFeatureUnitId' = featureUnitId,
    qLinkedUnitId' = linkedUnitId,
    qChoiceCount' = choiceCount,
    qResourceMaximum' = resourceMaximum,
    qKnownFormCount' = knownFormCount,
    qShortRestRefill' = shortRestRefill,
    qLongRestRefillsAll' = longRestRefillsAll,
    qAccepted' = accepted,
  }

  action init =
    recordProjection("init", "none", "none", 0, 0, 0, 0, false, false)

  action doSelectBardExpertise = all {
    qLastResult == "init",
    recordProjection("bard-expertise", "bard_expertise", "none", 2, 0, 0, 0, false, true),
  }

  action doProjectClericChannelDivinity = all {
    qLastResult == "init",
    recordProjection("cleric-channel-divinity", "cleric_channel_divinity", "none", 2, 2, 0, 1, true, true),
  }

  action doProjectDruidWildShape = all {
    qLastResult == "init",
    recordProjection("druid-wild-shape", "druid_wild_shape", "none", 0, 2, 4, 1, true, true),
  }

  action doProjectDruidWildCompanion = all {
    qLastResult == "init",
    recordProjection("druid-wild-companion", "druid_wild_companion", "druid_wild_shape", 2, 0, 0, 0, false, true),
  }

  action doProjectMonksFocus = all {
    qLastResult == "init",
    recordProjection("monk-monks-focus", "monk_monks_focus", "none", 3, 2, 0, 0, true, true),
  }

  action doProjectMonkUncannyMetabolism = all {
    qLastResult == "init",
    recordProjection("monk-uncanny-metabolism", "monk_uncanny_metabolism", "monk_monks_focus", 0, 0, 6, 0, true, true),
  }

  action doSelectPaladinFightingStyle = all {
    qLastResult == "init",
    recordProjection("paladin-fighting-style", "paladin_fighting_style", "defense", 2, 0, 0, 0, false, true),
  }

  action doSelectRangerDeftExplorer = all {
    qLastResult == "init",
    recordProjection("ranger-deft-explorer", "ranger_deft_explorer", "none", 3, 0, 0, 0, false, true),
  }

  action doSelectRangerFightingStyle = all {
    qLastResult == "init",
    recordProjection("ranger-fighting-style", "ranger_fighting_style", "guidance", 3, 0, 0, 0, false, true),
  }

  action doProjectWarlockPactMagic = all {
    qLastResult == "init",
    recordProjection("warlock-pact-magic", "warlock_pact_magic", "class_warlock", 4, 1, 1, 1, true, true),
  }

  action doSelectWizardScholar = all {
    qLastResult == "init",
    recordProjection("wizard-scholar", "wizard_scholar", "none", 1, 0, 0, 0, false, true),
  }

  action doSelectWizardEvocationSavant = all {
    qLastResult == "init",
    recordProjection("wizard-evocation-savant", "wizard_evocation_savant", "shatter", 2, 0, 0, 0, false, true),
  }

  action stepSelectBardExpertise = any {
    doSelectBardExpertise,
  }

  action stepProjectClericChannelDivinity = any {
    doProjectClericChannelDivinity,
  }

  action stepProjectDruidWildShape = any {
    doProjectDruidWildShape,
  }

  action stepProjectDruidWildCompanion = any {
    doProjectDruidWildCompanion,
  }

  action stepProjectMonksFocus = any {
    doProjectMonksFocus,
  }

  action stepProjectMonkUncannyMetabolism = any {
    doProjectMonkUncannyMetabolism,
  }

  action stepSelectPaladinFightingStyle = any {
    doSelectPaladinFightingStyle,
  }

  action stepSelectRangerDeftExplorer = any {
    doSelectRangerDeftExplorer,
  }

  action stepSelectRangerFightingStyle = any {
    doSelectRangerFightingStyle,
  }

  action stepProjectWarlockPactMagic = any {
    doProjectWarlockPactMagic,
  }

  action stepSelectWizardScholar = any {
    doSelectWizardScholar,
  }

  action stepSelectWizardEvocationSavant = any {
    doSelectWizardEvocationSavant,
  }

  action step = any {
    doSelectBardExpertise,
    doProjectClericChannelDivinity,
    doProjectDruidWildShape,
    doProjectDruidWildCompanion,
    doProjectMonksFocus,
    doProjectMonkUncannyMetabolism,
    doSelectPaladinFightingStyle,
    doSelectRangerDeftExplorer,
    doSelectRangerFightingStyle,
    doProjectWarlockPactMagic,
    doSelectWizardScholar,
    doSelectWizardEvocationSavant,
  }
}
