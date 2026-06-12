// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: parity-witness CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT

module characterCreationWeaponMasteryLevelGainMbt {
  import weaponMasteryReselection.* from "../shared-algebras/proofs/rule-core/weapon-mastery-reselection"

  var qLastResult: str
  var qClassUnitId: str
  var qFeatureUnitId: str
  var qCurrentClassLevel: int
  var qNextClassLevel: int
  var qCurrentChoiceCount: int
  var qNextChoiceCount: int
  var qRequestedWeaponCount: int
  var qSelectedWeaponCount: int
  var qGainCount: int
  var qFirstWeaponUnitId: str
  var qSecondWeaponUnitId: str
  var qThirdWeaponUnitId: str
  var qFourthWeaponUnitId: str
  var qAccepted: bool
  var qOverCountRejected: bool
  var qDuplicateRejected: bool
  var qRejectedWithoutStateChange: bool

  action recordProjection(
    lastResult: str,
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
    qLastResult' = lastResult,
    qClassUnitId' = classUnitId,
    qFeatureUnitId' = featureUnitId,
    qCurrentClassLevel' = currentClassLevel,
    qNextClassLevel' = nextClassLevel,
    qCurrentChoiceCount' = currentChoiceCount,
    qNextChoiceCount' = nextChoiceCount,
    qRequestedWeaponCount' = requestedWeaponCount,
    qSelectedWeaponCount' = selectedWeaponCount,
    qGainCount' = gainCount,
    qFirstWeaponUnitId' = firstWeaponUnitId,
    qSecondWeaponUnitId' = secondWeaponUnitId,
    qThirdWeaponUnitId' = thirdWeaponUnitId,
    qFourthWeaponUnitId' = fourthWeaponUnitId,
    qAccepted' = accepted,
    qOverCountRejected' = overCountRejected,
    qDuplicateRejected' = duplicateRejected,
    qRejectedWithoutStateChange' = rejectedWithoutStateChange,
  }

  action init =
    recordProjection("init", "none", "none", 0, 0, 0, 0, 0, 0, 0, "none", "none", "none", "none", false, false, false, false)

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
    qLastResult == "init",
    acceptedWeaponMasteryLevelGain(fighterLevelFourFacts(["weapon_longsword", "weapon_spear", "weapon_flail", "weapon_shortsword"])),
    recordProjection("fighterLevelFourAccepted", "class_fighter", "fighter_weapon_mastery", 3, 4, 3, 4, 4, 4, 1, "weapon_longsword", "weapon_spear", "weapon_flail", "weapon_shortsword", true, false, false, false),
  }

  action doAcceptBarbarianLevelFourWeaponMasteryGain = all {
    qLastResult == "init",
    acceptedWeaponMasteryLevelGain(barbarianLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_spear"])),
    recordProjection("barbarianLevelFourAccepted", "class_barbarian", "barbarian_weapon_mastery", 3, 4, 2, 3, 3, 3, 1, "weapon_longsword", "weapon_dagger", "weapon_spear", "none", true, false, false, false),
  }

  action doRejectFighterOverCountWeaponMasteryGain = all {
    qLastResult == "init",
    rejectedWeaponMasteryLevelGain(fighterLevelFourFacts(["weapon_longsword", "weapon_spear", "weapon_flail", "weapon_shortsword", "weapon_shortbow"])),
    recordProjection("fighterOverCountRejected", "class_fighter", "fighter_weapon_mastery", 3, 4, 3, 4, 5, 3, 0, "weapon_longsword", "weapon_spear", "weapon_flail", "none", false, true, false, true),
  }

  action doRejectFighterDuplicateWeaponMasteryGain = all {
    qLastResult == "init",
    rejectedWeaponMasteryLevelGain(fighterLevelFourFacts(["weapon_longsword", "weapon_spear", "weapon_flail", "weapon_longsword"])),
    recordProjection("fighterDuplicateRejected", "class_fighter", "fighter_weapon_mastery", 3, 4, 3, 4, 4, 3, 0, "weapon_longsword", "weapon_spear", "weapon_flail", "none", false, false, true, true),
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
