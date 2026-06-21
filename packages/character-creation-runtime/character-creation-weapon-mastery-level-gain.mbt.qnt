// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: parity-witness CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT

module characterCreationWeaponMasteryLevelGainMbt {
  import weaponMasteryReselection.* from "../shared-algebras/proofs/rule-core/weapon-mastery-reselection"

  type CharacterCreationWeaponMasteryLevelGainOutcome =
    | CharacterCreationWeaponMasteryLevelGainInit
    | CharacterCreationWeaponMasteryLevelGainFighterLevelFourAccepted
    | CharacterCreationWeaponMasteryLevelGainBarbarianLevelFourAccepted
    | CharacterCreationWeaponMasteryLevelGainFighterOverCountRejected
    | CharacterCreationWeaponMasteryLevelGainFighterDuplicateRejected

  type CharacterCreationWeaponMasteryLevelGainState = {
    outcome: CharacterCreationWeaponMasteryLevelGainOutcome,
    classUnitId: str,
    featureUnitId: str,
    currentClassLevel: int,
    nextClassLevel: int,
    currentChoiceCount: int,
    nextChoiceCount: int,
    requestedWeaponCount: int,
    selectedWeaponCount: int,
    gainCount: int,
    firstWeaponUnitId: str,
    secondWeaponUnitId: str,
    thirdWeaponUnitId: str,
    fourthWeaponUnitId: str,
    accepted: bool,
    overCountRejected: bool,
    duplicateRejected: bool,
    rejectedWithoutStateChange: bool,
  }

  var qState: CharacterCreationWeaponMasteryLevelGainState

  action recordProjection(
    outcome: CharacterCreationWeaponMasteryLevelGainOutcome,
    classUnitId: str,
    featureUnitId: str,
    currentClassLevel: int,
    nextClassLevel: int,
    currentChoiceCount: int,
    nextChoiceCount: int,
    requestedWeaponCount: int,
    selectedWeaponCount: int,
    gainCount: int,
    firstWeaponUnitId: str,
    secondWeaponUnitId: str,
    thirdWeaponUnitId: str,
    fourthWeaponUnitId: str,
    accepted: bool,
    overCountRejected: bool,
    duplicateRejected: bool,
    rejectedWithoutStateChange: bool,
  ): bool = all {
    qState' = {
      outcome: outcome,
      classUnitId: classUnitId,
      featureUnitId: featureUnitId,
      currentClassLevel: currentClassLevel,
      nextClassLevel: nextClassLevel,
      currentChoiceCount: currentChoiceCount,
      nextChoiceCount: nextChoiceCount,
      requestedWeaponCount: requestedWeaponCount,
      selectedWeaponCount: selectedWeaponCount,
      gainCount: gainCount,
      firstWeaponUnitId: firstWeaponUnitId,
      secondWeaponUnitId: secondWeaponUnitId,
      thirdWeaponUnitId: thirdWeaponUnitId,
      fourthWeaponUnitId: fourthWeaponUnitId,
      accepted: accepted,
      overCountRejected: overCountRejected,
      duplicateRejected: duplicateRejected,
      rejectedWithoutStateChange: rejectedWithoutStateChange,
    },
  }

  action init =
    recordProjection(
      CharacterCreationWeaponMasteryLevelGainInit,
      "none",
      "none",
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      "none",
      "none",
      "none",
      "none",
      false,
      false,
      false,
      false,
    )

  pure def acceptedWeaponMasteryLevelGain(facts: WeaponMasteryLevelGainFacts): bool =
    match applyWeaponMasteryLevelGain(facts) {
      | WeaponMasteryLevelGainAccepted(accepted) => accepted.selectedWeaponRefs == facts.requestedWeaponRefs
      | WeaponMasteryLevelGainRejected => false
    }

  pure def rejectedWeaponMasteryLevelGain(facts: WeaponMasteryLevelGainFacts): bool =
    match applyWeaponMasteryLevelGain(facts) {
      | WeaponMasteryLevelGainAccepted(_) => false
      | WeaponMasteryLevelGainRejected => true
    }

  pure def fighterLevelFourFacts(requestedWeaponRefs: List[str]): WeaponMasteryLevelGainFacts = {
    currentChoiceCount: 3,
    nextChoiceCount: 4,
    currentWeaponRefs: ["weapon_longsword", "weapon_spear", "weapon_flail"],
    requestedWeaponRefs: requestedWeaponRefs,
    eligibleWeaponRefs: Set("weapon_longsword", "weapon_spear", "weapon_flail", "weapon_shortsword", "weapon_shortbow"),
  }

  pure def barbarianLevelFourFacts(requestedWeaponRefs: List[str]): WeaponMasteryLevelGainFacts = {
    currentChoiceCount: 2,
    nextChoiceCount: 3,
    currentWeaponRefs: ["weapon_longsword", "weapon_dagger"],
    requestedWeaponRefs: requestedWeaponRefs,
    eligibleWeaponRefs: Set("weapon_longsword", "weapon_dagger", "weapon_spear"),
  }

  action doAcceptFighterLevelFourWeaponMasteryGain = all {
    qState.outcome == CharacterCreationWeaponMasteryLevelGainInit,
    acceptedWeaponMasteryLevelGain(fighterLevelFourFacts(["weapon_longsword", "weapon_spear", "weapon_flail", "weapon_shortsword"])),
    recordProjection(
      CharacterCreationWeaponMasteryLevelGainFighterLevelFourAccepted,
      "class_fighter",
      "fighter_weapon_mastery",
      3,
      4,
      3,
      4,
      4,
      4,
      1,
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
      "weapon_shortsword",
      true,
      false,
      false,
      false,
    ),
  }

  action doAcceptBarbarianLevelFourWeaponMasteryGain = all {
    qState.outcome == CharacterCreationWeaponMasteryLevelGainInit,
    acceptedWeaponMasteryLevelGain(barbarianLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_spear"])),
    recordProjection(
      CharacterCreationWeaponMasteryLevelGainBarbarianLevelFourAccepted,
      "class_barbarian",
      "barbarian_weapon_mastery",
      3,
      4,
      2,
      3,
      3,
      3,
      1,
      "weapon_longsword",
      "weapon_dagger",
      "weapon_spear",
      "none",
      true,
      false,
      false,
      false,
    ),
  }

  action doRejectFighterOverCountWeaponMasteryGain = all {
    qState.outcome == CharacterCreationWeaponMasteryLevelGainInit,
    rejectedWeaponMasteryLevelGain(fighterLevelFourFacts(["weapon_longsword", "weapon_spear", "weapon_flail", "weapon_shortsword", "weapon_shortbow"])),
    recordProjection(
      CharacterCreationWeaponMasteryLevelGainFighterOverCountRejected,
      "class_fighter",
      "fighter_weapon_mastery",
      3,
      4,
      3,
      4,
      5,
      3,
      0,
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
      "none",
      false,
      true,
      false,
      true,
    ),
  }

  action doRejectFighterDuplicateWeaponMasteryGain = all {
    qState.outcome == CharacterCreationWeaponMasteryLevelGainInit,
    rejectedWeaponMasteryLevelGain(fighterLevelFourFacts(["weapon_longsword", "weapon_spear", "weapon_flail", "weapon_longsword"])),
    recordProjection(
      CharacterCreationWeaponMasteryLevelGainFighterDuplicateRejected,
      "class_fighter",
      "fighter_weapon_mastery",
      3,
      4,
      3,
      4,
      4,
      3,
      0,
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
      "none",
      false,
      false,
      true,
      true,
    ),
  }

  action stepAcceptFighterLevelFourWeaponMasteryGain = any {
    doAcceptFighterLevelFourWeaponMasteryGain,
  }

  action stepAcceptBarbarianLevelFourWeaponMasteryGain = any {
    doAcceptBarbarianLevelFourWeaponMasteryGain,
  }

  action stepRejectFighterOverCountWeaponMasteryGain = any {
    doRejectFighterOverCountWeaponMasteryGain,
  }

  action stepRejectFighterDuplicateWeaponMasteryGain = any {
    doRejectFighterDuplicateWeaponMasteryGain,
  }

  action step = any {
    doAcceptFighterLevelFourWeaponMasteryGain,
    doAcceptBarbarianLevelFourWeaponMasteryGain,
    doRejectFighterOverCountWeaponMasteryGain,
    doRejectFighterDuplicateWeaponMasteryGain,
  }
}
