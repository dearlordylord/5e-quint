// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT

module characterCreationFighterFightingStyleSelectedIdentityMbt {
  var qLastResult: str
  var qSelectedFromUnitId: str
  var qSelectedFeatUnitId: str
  var qSelectedFightingStyleFeatureRefCount: int
  var qFighterFightingStyleUnitRefPresent: bool
  var qDefenseUnitRefPresent: bool
  var qArcheryUnitRefPresent: bool
  var qTotalLevel: int

  action recordProjection(
    lastResult: str,
    selectedFromUnitId: str,
    selectedFeatUnitId: str,
    selectedFightingStyleFeatureRefCount: int,
    fighterFightingStyleUnitRefPresent: bool,
    defenseUnitRefPresent: bool,
    archeryUnitRefPresent: bool,
    totalLevel: int,
  ): bool = all {
    qLastResult' = lastResult,
    qSelectedFromUnitId' = selectedFromUnitId,
    qSelectedFeatUnitId' = selectedFeatUnitId,
    qSelectedFightingStyleFeatureRefCount' = selectedFightingStyleFeatureRefCount,
    qFighterFightingStyleUnitRefPresent' = fighterFightingStyleUnitRefPresent,
    qDefenseUnitRefPresent' = defenseUnitRefPresent,
    qArcheryUnitRefPresent' = archeryUnitRefPresent,
    qTotalLevel' = totalLevel,
  }

  action init =
    recordProjection("init", "none", "none", 0, false, false, false, 1)

  action doSelectDefenseFightingStyle = all {
    qLastResult == "init",
    recordProjection("finalized", "fighter_fighting_style", "defense", 1, true, true, false, 1),
  }

  action doReplaceDefenseWithArcheryOnFighterLevelGain = all {
    qLastResult == "init",
    recordProjection("replaced", "fighter_fighting_style", "feat_archery", 1, true, false, true, 2),
  }

  action step = any {
    doSelectDefenseFightingStyle,
    doReplaceDefenseWithArcheryOnFighterLevelGain,
  }
}
