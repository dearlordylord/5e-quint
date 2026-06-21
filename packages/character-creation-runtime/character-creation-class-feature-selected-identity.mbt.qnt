// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION

module characterCreationClassFeatureSelectedIdentityMbt {
  type CharacterCreationClassFeatureSelectedIdentityOutcome =
    | CharacterCreationClassFeatureSelectedIdentityInit
    | CharacterCreationClassFeatureSelectedIdentityBardExpertise
    | CharacterCreationClassFeatureSelectedIdentityClericChannelDivinity
    | CharacterCreationClassFeatureSelectedIdentityDruidWildShape
    | CharacterCreationClassFeatureSelectedIdentityDruidWildCompanion
    | CharacterCreationClassFeatureSelectedIdentityMonkMonksFocus
    | CharacterCreationClassFeatureSelectedIdentityMonkUncannyMetabolism
    | CharacterCreationClassFeatureSelectedIdentityPaladinFightingStyle
    | CharacterCreationClassFeatureSelectedIdentityRangerDeftExplorer
    | CharacterCreationClassFeatureSelectedIdentityRangerFightingStyle
    | CharacterCreationClassFeatureSelectedIdentityWarlockPactMagic
    | CharacterCreationClassFeatureSelectedIdentityWizardScholar
    | CharacterCreationClassFeatureSelectedIdentityWizardEvocationSavant

  type CharacterCreationClassFeatureSelectedIdentityState = {
    outcome: CharacterCreationClassFeatureSelectedIdentityOutcome,
    featureUnitId: str,
    linkedUnitId: str,
    choiceCount: int,
    resourceMaximum: int,
    knownFormCount: int,
    shortRestRefill: int,
    longRestRefillsAll: bool,
    accepted: bool,
  }

  var qState: CharacterCreationClassFeatureSelectedIdentityState

  action recordProjection(
    outcome: CharacterCreationClassFeatureSelectedIdentityOutcome,
    featureUnitId: str,
    linkedUnitId: str,
    choiceCount: int,
    resourceMaximum: int,
    knownFormCount: int,
    shortRestRefill: int,
    longRestRefillsAll: bool,
    accepted: bool,
  ): bool = all {
    qState' = {
      outcome: outcome,
      featureUnitId: featureUnitId,
      linkedUnitId: linkedUnitId,
      choiceCount: choiceCount,
      resourceMaximum: resourceMaximum,
      knownFormCount: knownFormCount,
      shortRestRefill: shortRestRefill,
      longRestRefillsAll: longRestRefillsAll,
      accepted: accepted,
    },
  }

  action init =
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityInit,
      "none",
      "none",
      0,
      0,
      0,
      0,
      false,
      false,
    )

  action doSelectBardExpertise = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityBardExpertise,
      "bard_expertise",
      "none",
      2,
      0,
      0,
      0,
      false,
      true,
    ),
  }

  action doProjectClericChannelDivinity = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityClericChannelDivinity,
      "cleric_channel_divinity",
      "none",
      2,
      2,
      0,
      1,
      true,
      true,
    ),
  }

  action doProjectDruidWildShape = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityDruidWildShape,
      "druid_wild_shape",
      "none",
      0,
      2,
      4,
      1,
      true,
      true,
    ),
  }

  action doProjectDruidWildCompanion = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityDruidWildCompanion,
      "druid_wild_companion",
      "druid_wild_shape",
      2,
      0,
      0,
      0,
      false,
      true,
    ),
  }

  action doProjectMonksFocus = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityMonkMonksFocus,
      "monk_monks_focus",
      "none",
      3,
      2,
      0,
      0,
      true,
      true,
    ),
  }

  action doProjectMonkUncannyMetabolism = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityMonkUncannyMetabolism,
      "monk_uncanny_metabolism",
      "monk_monks_focus",
      0,
      0,
      6,
      0,
      true,
      true,
    ),
  }

  action doSelectPaladinFightingStyle = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityPaladinFightingStyle,
      "paladin_fighting_style",
      "defense",
      2,
      0,
      0,
      0,
      false,
      true,
    ),
  }

  action doSelectRangerDeftExplorer = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityRangerDeftExplorer,
      "ranger_deft_explorer",
      "none",
      3,
      0,
      0,
      0,
      false,
      true,
    ),
  }

  action doSelectRangerFightingStyle = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityRangerFightingStyle,
      "ranger_fighting_style",
      "guidance",
      3,
      0,
      0,
      0,
      false,
      true,
    ),
  }

  action doProjectWarlockPactMagic = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityWarlockPactMagic,
      "warlock_pact_magic",
      "class_warlock",
      4,
      1,
      1,
      1,
      true,
      true,
    ),
  }

  action doSelectWizardScholar = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityWizardScholar,
      "wizard_scholar",
      "none",
      1,
      0,
      0,
      0,
      false,
      true,
    ),
  }

  action doSelectWizardEvocationSavant = all {
    qState.outcome == CharacterCreationClassFeatureSelectedIdentityInit,
    recordProjection(
      CharacterCreationClassFeatureSelectedIdentityWizardEvocationSavant,
      "wizard_evocation_savant",
      "shatter",
      2,
      0,
      0,
      0,
      false,
      true,
    ),
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
