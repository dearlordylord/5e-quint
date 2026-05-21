// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.WEAPON_MASTERY.RESELECTION

module characterSheetWeaponMasteryContainersSelectedIdentityMbt {
  var qLastResult: str
  var qFeatureUnitId: str
  var qClassUnitId: str
  var qFirstWeaponUnitId: str
  var qSecondWeaponUnitId: str
  var qChoiceCount: int
  var qLongRestChangeCount: int
  var qSelectedWeaponCount: int
  var qChangedChoiceCount: int
  var qFirstWeaponEligible: bool
  var qSecondWeaponEligible: bool
  var qFeatureUnitRefPresent: bool
  var qAccepted: bool

  action recordProjection(
    lastResult: str,
    featureUnitId: str,
    classUnitId: str,
    firstWeaponUnitId: str,
    secondWeaponUnitId: str,
    choiceCount: int,
    longRestChangeCount: int,
    selectedWeaponCount: int,
    changedChoiceCount: int,
    firstWeaponEligible: bool,
    secondWeaponEligible: bool,
    featureUnitRefPresent: bool,
    accepted: bool,
  ): bool = all {
    qLastResult' = lastResult,
    qFeatureUnitId' = featureUnitId,
    qClassUnitId' = classUnitId,
    qFirstWeaponUnitId' = firstWeaponUnitId,
    qSecondWeaponUnitId' = secondWeaponUnitId,
    qChoiceCount' = choiceCount,
    qLongRestChangeCount' = longRestChangeCount,
    qSelectedWeaponCount' = selectedWeaponCount,
    qChangedChoiceCount' = changedChoiceCount,
    qFirstWeaponEligible' = firstWeaponEligible,
    qSecondWeaponEligible' = secondWeaponEligible,
    qFeatureUnitRefPresent' = featureUnitRefPresent,
    qAccepted' = accepted,
  }

  action init =
    recordProjection("init", "none", "none", "none", "none", 0, 0, 0, 0, false, false, false, false)

  action doSelectPaladinWeaponMastery = all {
    qLastResult == "init",
    recordProjection("paladinSelected", "paladin_weapon_mastery", "class_paladin", "weapon_longsword", "weapon_dagger", 2, 2, 2, 0, true, true, true, true),
  }

  action doReselectPaladinWeaponMasteryOnLongRest = all {
    qLastResult == "init",
    recordProjection("paladinReselected", "paladin_weapon_mastery", "class_paladin", "weapon_spear", "weapon_flail", 2, 2, 2, 2, true, true, true, true),
  }

  action doSelectRangerWeaponMastery = all {
    qLastResult == "init",
    recordProjection("rangerSelected", "ranger_weapon_mastery", "class_ranger", "weapon_longsword", "weapon_dagger", 2, 2, 2, 0, true, true, true, true),
  }

  action doReselectRangerWeaponMasteryOnLongRest = all {
    qLastResult == "init",
    recordProjection("rangerReselected", "ranger_weapon_mastery", "class_ranger", "weapon_spear", "weapon_flail", 2, 2, 2, 2, true, true, true, true),
  }

  action doSelectRogueWeaponMastery = all {
    qLastResult == "init",
    recordProjection("rogueSelected", "rogue_weapon_mastery", "class_rogue", "weapon_dagger", "weapon_shortbow", 2, 2, 2, 0, true, true, true, true),
  }

  action doReselectRogueWeaponMasteryOnLongRest = all {
    qLastResult == "init",
    recordProjection("rogueReselected", "rogue_weapon_mastery", "class_rogue", "weapon_spear", "weapon_shortsword", 2, 2, 2, 2, true, true, true, true),
  }

  action stepSelectPaladinWeaponMastery = any {
    doSelectPaladinWeaponMastery,
  }

  action stepReselectPaladinWeaponMasteryOnLongRest = any {
    doReselectPaladinWeaponMasteryOnLongRest,
  }

  action stepSelectRangerWeaponMastery = any {
    doSelectRangerWeaponMastery,
  }

  action stepReselectRangerWeaponMasteryOnLongRest = any {
    doReselectRangerWeaponMasteryOnLongRest,
  }

  action stepSelectRogueWeaponMastery = any {
    doSelectRogueWeaponMastery,
  }

  action stepReselectRogueWeaponMasteryOnLongRest = any {
    doReselectRogueWeaponMasteryOnLongRest,
  }

  action step = any {
    doSelectPaladinWeaponMastery,
    doReselectPaladinWeaponMasteryOnLongRest,
    doSelectRangerWeaponMastery,
    doReselectRangerWeaponMasteryOnLongRest,
    doSelectRogueWeaponMastery,
    doReselectRogueWeaponMasteryOnLongRest,
  }
}
