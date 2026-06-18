// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT

module characterCreationFighterFightingStyleSelectedIdentityMbt {
  var qLastResult: str
  var qSelectedFromUnitId: str
  var qSelectedFeatUnitId: str
  var qSelectedFightingStyleFeatureRefCount: int
  var qFighterFightingStyleUnitRefPresent: bool
  var qSelectedFeatUnitRefCount: int
  var qNonSelectedFightingStyleUnitRefCount: int
  var qTotalLevel: int

  action recordProjection(
    lastResult: str,
    selectedFromUnitId: str,
    selectedFeatUnitId: str,
    selectedFightingStyleFeatureRefCount: int,
    fighterFightingStyleUnitRefPresent: bool,
    selectedFeatUnitRefCount: int,
    nonSelectedFightingStyleUnitRefCount: int,
    totalLevel: int,
  ): bool = all {
    qLastResult' = lastResult,
    qSelectedFromUnitId' = selectedFromUnitId,
    qSelectedFeatUnitId' = selectedFeatUnitId,
    qSelectedFightingStyleFeatureRefCount' = selectedFightingStyleFeatureRefCount,
    qFighterFightingStyleUnitRefPresent' = fighterFightingStyleUnitRefPresent,
    qSelectedFeatUnitRefCount' = selectedFeatUnitRefCount,
    qNonSelectedFightingStyleUnitRefCount' = nonSelectedFightingStyleUnitRefCount,
    qTotalLevel' = totalLevel,
  }

  action init =
    recordProjection("init", "none", "none", 0, false, 0, 0, 1)

  action doSelectDefenseFightingStyle = all {
    qLastResult == "init",
    recordProjection("finalized", "fighter_fighting_style", "defense", 1, true, 1, 0, 1),
  }

  action doSelectArcheryFightingStyle = all {
    qLastResult == "init",
    recordProjection("finalized", "fighter_fighting_style", "feat_archery", 1, true, 1, 0, 1),
  }

  action doSelectGreatWeaponFightingStyle = all {
    qLastResult == "init",
    recordProjection("finalized", "fighter_fighting_style", "feat_great_weapon_fighting", 1, true, 1, 0, 1),
  }

  action doSelectTwoWeaponFightingStyle = all {
    qLastResult == "init",
    recordProjection("finalized", "fighter_fighting_style", "feat_two_weapon_fighting", 1, true, 1, 0, 1),
  }

  action doReplaceArcheryWithDefenseOnFighterLevelGain = all {
    qLastResult == "init",
    recordProjection("replaced", "fighter_fighting_style", "defense", 1, true, 1, 0, 2),
  }

  action doReplaceDefenseWithArcheryOnFighterLevelGain = all {
    qLastResult == "init",
    recordProjection("replaced", "fighter_fighting_style", "feat_archery", 1, true, 1, 0, 2),
  }

  action doReplaceDefenseWithGreatWeaponFightingOnFighterLevelGain = all {
    qLastResult == "init",
    recordProjection("replaced", "fighter_fighting_style", "feat_great_weapon_fighting", 1, true, 1, 0, 2),
  }

  action doReplaceDefenseWithTwoWeaponFightingOnFighterLevelGain = all {
    qLastResult == "init",
    recordProjection("replaced", "fighter_fighting_style", "feat_two_weapon_fighting", 1, true, 1, 0, 2),
  }

  action step = any {
    doSelectDefenseFightingStyle,
    doSelectArcheryFightingStyle,
    doSelectGreatWeaponFightingStyle,
    doSelectTwoWeaponFightingStyle,
    doReplaceArcheryWithDefenseOnFighterLevelGain,
    doReplaceDefenseWithArcheryOnFighterLevelGain,
    doReplaceDefenseWithGreatWeaponFightingOnFighterLevelGain,
    doReplaceDefenseWithTwoWeaponFightingOnFighterLevelGain,
  }
}
