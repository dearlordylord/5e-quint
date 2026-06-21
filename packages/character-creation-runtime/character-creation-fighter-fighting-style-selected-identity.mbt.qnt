// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT

module characterCreationFighterFightingStyleSelectedIdentityMbt {
  type CharacterCreationFighterFightingStyleSelectedIdentityOutcome =
    | CharacterCreationFighterFightingStyleSelectedIdentityInit
    | CharacterCreationFighterFightingStyleSelectedIdentityFinalized
    | CharacterCreationFighterFightingStyleSelectedIdentityReplaced

  type CharacterCreationFighterFightingStyleSelectedIdentityState = {
    outcome: CharacterCreationFighterFightingStyleSelectedIdentityOutcome,
    selectedFromUnitId: str,
    selectedFeatUnitId: str,
    selectedFightingStyleFeatureRefCount: int,
    fighterFightingStyleUnitRefPresent: bool,
    selectedFeatUnitRefCount: int,
    nonSelectedFightingStyleUnitRefCount: int,
    totalLevel: int,
  }

  var qState: CharacterCreationFighterFightingStyleSelectedIdentityState

  action recordProjection(
    outcome: CharacterCreationFighterFightingStyleSelectedIdentityOutcome,
    selectedFromUnitId: str,
    selectedFeatUnitId: str,
    selectedFightingStyleFeatureRefCount: int,
    fighterFightingStyleUnitRefPresent: bool,
    selectedFeatUnitRefCount: int,
    nonSelectedFightingStyleUnitRefCount: int,
    totalLevel: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      selectedFromUnitId: selectedFromUnitId,
      selectedFeatUnitId: selectedFeatUnitId,
      selectedFightingStyleFeatureRefCount: selectedFightingStyleFeatureRefCount,
      fighterFightingStyleUnitRefPresent: fighterFightingStyleUnitRefPresent,
      selectedFeatUnitRefCount: selectedFeatUnitRefCount,
      nonSelectedFightingStyleUnitRefCount: nonSelectedFightingStyleUnitRefCount,
      totalLevel: totalLevel,
    },
  }

  action init =
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityInit,
      "none",
      "none",
      0,
      false,
      0,
      0,
      1,
    )

  action doSelectDefenseFightingStyle = all {
    qState.outcome == CharacterCreationFighterFightingStyleSelectedIdentityInit,
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityFinalized,
      "fighter_fighting_style",
      "defense",
      1,
      true,
      1,
      0,
      1,
    ),
  }

  action doSelectArcheryFightingStyle = all {
    qState.outcome == CharacterCreationFighterFightingStyleSelectedIdentityInit,
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityFinalized,
      "fighter_fighting_style",
      "feat_archery",
      1,
      true,
      1,
      0,
      1,
    ),
  }

  action doSelectGreatWeaponFightingStyle = all {
    qState.outcome == CharacterCreationFighterFightingStyleSelectedIdentityInit,
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityFinalized,
      "fighter_fighting_style",
      "feat_great_weapon_fighting",
      1,
      true,
      1,
      0,
      1,
    ),
  }

  action doSelectTwoWeaponFightingStyle = all {
    qState.outcome == CharacterCreationFighterFightingStyleSelectedIdentityInit,
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityFinalized,
      "fighter_fighting_style",
      "feat_two_weapon_fighting",
      1,
      true,
      1,
      0,
      1,
    ),
  }

  action doReplaceArcheryWithDefenseOnFighterLevelGain = all {
    qState.outcome == CharacterCreationFighterFightingStyleSelectedIdentityInit,
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityReplaced,
      "fighter_fighting_style",
      "defense",
      1,
      true,
      1,
      0,
      2,
    ),
  }

  action doReplaceDefenseWithArcheryOnFighterLevelGain = all {
    qState.outcome == CharacterCreationFighterFightingStyleSelectedIdentityInit,
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityReplaced,
      "fighter_fighting_style",
      "feat_archery",
      1,
      true,
      1,
      0,
      2,
    ),
  }

  action doReplaceDefenseWithGreatWeaponFightingOnFighterLevelGain = all {
    qState.outcome == CharacterCreationFighterFightingStyleSelectedIdentityInit,
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityReplaced,
      "fighter_fighting_style",
      "feat_great_weapon_fighting",
      1,
      true,
      1,
      0,
      2,
    ),
  }

  action doReplaceDefenseWithTwoWeaponFightingOnFighterLevelGain = all {
    qState.outcome == CharacterCreationFighterFightingStyleSelectedIdentityInit,
    recordProjection(
      CharacterCreationFighterFightingStyleSelectedIdentityReplaced,
      "fighter_fighting_style",
      "feat_two_weapon_fighting",
      1,
      true,
      1,
      0,
      2,
    ),
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
