// -*- mode: Bluespec; -*-

module characterCreationWeaponMasteryContainersSelectedIdentityMbt {
  var qLastResult: str
  var qFeatureUnitId: str
  var qClassUnitId: str
  var qFirstWeaponUnitId: str
  var qSecondWeaponUnitId: str
  var qSelectedMasteryChoiceCount: int
  var qBuildMasteryFeatureCount: int
  var qOpenHoleCount: int
  var qFeatureUnitRefPresent: bool
  var qFirstWeaponUnitRefPresent: bool
  var qSecondWeaponUnitRefPresent: bool
  var qTotalLevel: int

  action recordProjection(
    lastResult: str,
    featureUnitId: str,
    classUnitId: str,
    firstWeaponUnitId: str,
    secondWeaponUnitId: str,
    selectedMasteryChoiceCount: int,
    buildMasteryFeatureCount: int,
    openHoleCount: int,
    featureUnitRefPresent: bool,
    firstWeaponUnitRefPresent: bool,
    secondWeaponUnitRefPresent: bool,
    totalLevel: int,
  ): bool = all {
    qLastResult' = lastResult,
    qFeatureUnitId' = featureUnitId,
    qClassUnitId' = classUnitId,
    qFirstWeaponUnitId' = firstWeaponUnitId,
    qSecondWeaponUnitId' = secondWeaponUnitId,
    qSelectedMasteryChoiceCount' = selectedMasteryChoiceCount,
    qBuildMasteryFeatureCount' = buildMasteryFeatureCount,
    qOpenHoleCount' = openHoleCount,
    qFeatureUnitRefPresent' = featureUnitRefPresent,
    qFirstWeaponUnitRefPresent' = firstWeaponUnitRefPresent,
    qSecondWeaponUnitRefPresent' = secondWeaponUnitRefPresent,
    qTotalLevel' = totalLevel,
  }

  action init =
    recordProjection("init", "none", "none", "none", "none", 0, 0, 0, false, false, false, 1)

  action doFinalizePaladinWeaponMastery = all {
    qLastResult == "init",
    recordProjection("paladinFinalized", "paladin_weapon_mastery", "class_paladin", "weapon_longsword", "weapon_dagger", 2, 2, 0, true, true, true, 1),
  }

  action doFinalizeRangerWeaponMastery = all {
    qLastResult == "init",
    recordProjection("rangerFinalized", "ranger_weapon_mastery", "class_ranger", "weapon_longsword", "weapon_dagger", 2, 2, 0, true, true, true, 1),
  }

  action doFinalizeRogueWeaponMastery = all {
    qLastResult == "init",
    recordProjection("rogueFinalized", "rogue_weapon_mastery", "class_rogue", "weapon_dagger", "weapon_shortsword", 2, 2, 0, true, true, true, 1),
  }

  action stepPaladinWeaponMastery = any {
    doFinalizePaladinWeaponMastery,
  }

  action stepRangerWeaponMastery = any {
    doFinalizeRangerWeaponMastery,
  }

  action stepRogueWeaponMastery = any {
    doFinalizeRogueWeaponMastery,
  }

  action step = any {
    doFinalizePaladinWeaponMastery,
    doFinalizeRangerWeaponMastery,
    doFinalizeRogueWeaponMastery,
  }
}
