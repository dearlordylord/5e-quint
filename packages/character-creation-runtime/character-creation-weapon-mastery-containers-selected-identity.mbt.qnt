// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION

module characterCreationWeaponMasteryContainersSelectedIdentityMbt {
  type CharacterCreationWeaponMasteryContainersSelectedIdentityOutcome =
    | CharacterCreationWeaponMasteryContainersSelectedIdentityInit
    | CharacterCreationWeaponMasteryContainersSelectedIdentityFighterFinalized
    | CharacterCreationWeaponMasteryContainersSelectedIdentityBarbarianFinalized
    | CharacterCreationWeaponMasteryContainersSelectedIdentityPaladinFinalized
    | CharacterCreationWeaponMasteryContainersSelectedIdentityRangerFinalized
    | CharacterCreationWeaponMasteryContainersSelectedIdentityRogueFinalized

  type CharacterCreationWeaponMasteryContainersSelectedIdentityState = {
    outcome: CharacterCreationWeaponMasteryContainersSelectedIdentityOutcome,
    featureUnitId: str,
    classUnitId: str,
    firstWeaponUnitId: str,
    secondWeaponUnitId: str,
    thirdWeaponUnitId: str,
    selectedMasteryChoiceCount: int,
    buildMasteryFeatureCount: int,
    openHoleCount: int,
    featureUnitRefPresent: bool,
    firstWeaponUnitRefPresent: bool,
    secondWeaponUnitRefPresent: bool,
    thirdWeaponUnitRefPresent: bool,
    totalLevel: int,
  }

  var qState: CharacterCreationWeaponMasteryContainersSelectedIdentityState

  action recordProjection(
    outcome: CharacterCreationWeaponMasteryContainersSelectedIdentityOutcome,
    featureUnitId: str,
    classUnitId: str,
    firstWeaponUnitId: str,
    secondWeaponUnitId: str,
    thirdWeaponUnitId: str,
    selectedMasteryChoiceCount: int,
    buildMasteryFeatureCount: int,
    openHoleCount: int,
    featureUnitRefPresent: bool,
    firstWeaponUnitRefPresent: bool,
    secondWeaponUnitRefPresent: bool,
    thirdWeaponUnitRefPresent: bool,
    totalLevel: int,
  ): bool = all {
    qState' = {
      outcome: outcome,
      featureUnitId: featureUnitId,
      classUnitId: classUnitId,
      firstWeaponUnitId: firstWeaponUnitId,
      secondWeaponUnitId: secondWeaponUnitId,
      thirdWeaponUnitId: thirdWeaponUnitId,
      selectedMasteryChoiceCount: selectedMasteryChoiceCount,
      buildMasteryFeatureCount: buildMasteryFeatureCount,
      openHoleCount: openHoleCount,
      featureUnitRefPresent: featureUnitRefPresent,
      firstWeaponUnitRefPresent: firstWeaponUnitRefPresent,
      secondWeaponUnitRefPresent: secondWeaponUnitRefPresent,
      thirdWeaponUnitRefPresent: thirdWeaponUnitRefPresent,
      totalLevel: totalLevel,
    },
  }

  action init =
    recordProjection(
      CharacterCreationWeaponMasteryContainersSelectedIdentityInit,
      "none",
      "none",
      "none",
      "none",
      "none",
      0,
      0,
      0,
      false,
      false,
      false,
      false,
      1,
    )

  action doFinalizeFighterWeaponMastery = all {
    qState.outcome == CharacterCreationWeaponMasteryContainersSelectedIdentityInit,
    recordProjection(
      CharacterCreationWeaponMasteryContainersSelectedIdentityFighterFinalized,
      "fighter_weapon_mastery",
      "class_fighter",
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
      3,
      3,
      0,
      true,
      true,
      true,
      true,
      1,
    ),
  }

  action doFinalizeBarbarianWeaponMastery = all {
    qState.outcome == CharacterCreationWeaponMasteryContainersSelectedIdentityInit,
    recordProjection(
      CharacterCreationWeaponMasteryContainersSelectedIdentityBarbarianFinalized,
      "barbarian_weapon_mastery",
      "class_barbarian",
      "weapon_longsword",
      "weapon_dagger",
      "none",
      2,
      2,
      0,
      true,
      true,
      true,
      false,
      1,
    ),
  }

  action doFinalizePaladinWeaponMastery = all {
    qState.outcome == CharacterCreationWeaponMasteryContainersSelectedIdentityInit,
    recordProjection(
      CharacterCreationWeaponMasteryContainersSelectedIdentityPaladinFinalized,
      "paladin_weapon_mastery",
      "class_paladin",
      "weapon_longsword",
      "weapon_dagger",
      "none",
      2,
      2,
      0,
      true,
      true,
      true,
      false,
      1,
    ),
  }

  action doFinalizeRangerWeaponMastery = all {
    qState.outcome == CharacterCreationWeaponMasteryContainersSelectedIdentityInit,
    recordProjection(
      CharacterCreationWeaponMasteryContainersSelectedIdentityRangerFinalized,
      "ranger_weapon_mastery",
      "class_ranger",
      "weapon_longsword",
      "weapon_dagger",
      "none",
      2,
      2,
      0,
      true,
      true,
      true,
      false,
      1,
    ),
  }

  action doFinalizeRogueWeaponMastery = all {
    qState.outcome == CharacterCreationWeaponMasteryContainersSelectedIdentityInit,
    recordProjection(
      CharacterCreationWeaponMasteryContainersSelectedIdentityRogueFinalized,
      "rogue_weapon_mastery",
      "class_rogue",
      "weapon_dagger",
      "weapon_shortsword",
      "none",
      2,
      2,
      0,
      true,
      true,
      true,
      false,
      1,
    ),
  }

  action stepFighterWeaponMastery = any {
    doFinalizeFighterWeaponMastery,
  }

  action stepBarbarianWeaponMastery = any {
    doFinalizeBarbarianWeaponMastery,
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
    doFinalizeFighterWeaponMastery,
    doFinalizeBarbarianWeaponMastery,
    doFinalizePaladinWeaponMastery,
    doFinalizeRangerWeaponMastery,
    doFinalizeRogueWeaponMastery,
  }
}
