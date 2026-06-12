// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: parity-witness SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION

module characterSheetWeaponMasteryClassLevelReselectionMbt {
  import weaponMasteryReselection.* from "../shared-algebras/proofs/rule-core/weapon-mastery-reselection"

  var qLastResult: str
  var qClassUnitId: str
  var qFeatureUnitId: str
  var qClassLevel: int
  var qChoiceCount: int
  var qLongRestChangeCount: int
  var qRequestedWeaponCount: int
  var qSelectedWeaponCount: int
  var qRequestedChangeCount: int
  var qAppliedChangeCount: int
  var qFirstWeaponUnitId: str
  var qSecondWeaponUnitId: str
  var qThirdWeaponUnitId: str
  var qFourthWeaponUnitId: str
  var qAccepted: bool
  var qUnchangedPreserved: bool
  var qTooManyChangesRejected: bool
  var qRejectedWithoutStateChange: bool

  action recordProjection(
    lastResult: str,
    classUnitId: str,
    featureUnitId: str,
    classLevel: int,
    choiceCount: int,
    longRestChangeCount: int,
    requestedWeaponCount: int,
    selectedWeaponCount: int,
    requestedChangeCount: int,
    appliedChangeCount: int,
    firstWeaponUnitId: str,
    secondWeaponUnitId: str,
    thirdWeaponUnitId: str,
    fourthWeaponUnitId: str,
    accepted: bool,
    unchangedPreserved: bool,
    tooManyChangesRejected: bool,
    rejectedWithoutStateChange: bool,
  ): bool = all {
    qLastResult' = lastResult,
    qClassUnitId' = classUnitId,
    qFeatureUnitId' = featureUnitId,
    qClassLevel' = classLevel,
    qChoiceCount' = choiceCount,
    qLongRestChangeCount' = longRestChangeCount,
    qRequestedWeaponCount' = requestedWeaponCount,
    qSelectedWeaponCount' = selectedWeaponCount,
    qRequestedChangeCount' = requestedChangeCount,
    qAppliedChangeCount' = appliedChangeCount,
    qFirstWeaponUnitId' = firstWeaponUnitId,
    qSecondWeaponUnitId' = secondWeaponUnitId,
    qThirdWeaponUnitId' = thirdWeaponUnitId,
    qFourthWeaponUnitId' = fourthWeaponUnitId,
    qAccepted' = accepted,
    qUnchangedPreserved' = unchangedPreserved,
    qTooManyChangesRejected' = tooManyChangesRejected,
    qRejectedWithoutStateChange' = rejectedWithoutStateChange,
  }

  action init =
    recordProjection("init", "none", "none", 0, 0, 0, 0, 0, 0, 0, "none", "none", "none", "none", false, false, false, false)

  pure def acceptedWeaponMasteryReselection(facts: WeaponMasteryReselectionFacts): bool =
    match applyWeaponMasteryLongRestReselection(facts) {
      | WeaponMasteryReselectionAccepted(accepted) => accepted.selectedWeaponRefs == facts.requestedWeaponRefs
      | WeaponMasteryReselectionRejected => false
    }

  pure def rejectedWeaponMasteryReselection(facts: WeaponMasteryReselectionFacts): bool =
    match applyWeaponMasteryLongRestReselection(facts) {
      | WeaponMasteryReselectionAccepted(_) => false
      | WeaponMasteryReselectionRejected => true
    }

  pure def fighterLevelFourFacts(requestedWeaponRefs: List[str]): WeaponMasteryReselectionFacts = {
    choiceCount: 4,
    longRestChangeCount: 1,
    currentWeaponRefs: ["weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_shortbow"],
    requestedWeaponRefs: requestedWeaponRefs,
    eligibleWeaponRefs: Set("weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_shortbow", "weapon_flail", "weapon_shortsword"),
  }

  pure def barbarianLevelFourFacts(requestedWeaponRefs: List[str]): WeaponMasteryReselectionFacts = {
    choiceCount: 3,
    longRestChangeCount: 1,
    currentWeaponRefs: ["weapon_longsword", "weapon_dagger", "weapon_spear"],
    requestedWeaponRefs: requestedWeaponRefs,
    eligibleWeaponRefs: Set("weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_flail"),
  }

  action doAcceptFighterLevelFourOneChangeWeaponMasteryReselection = all {
    qLastResult == "init",
    acceptedWeaponMasteryReselection(fighterLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_flail"])),
    recordProjection("fighterLevelFourOneChangeAccepted", "class_fighter", "fighter_weapon_mastery", 4, 4, 1, 4, 4, 1, 1, "weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_flail", true, false, false, false),
  }

  action doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection = all {
    qLastResult == "init",
    acceptedWeaponMasteryReselection(barbarianLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_flail"])),
    recordProjection("barbarianLevelFourOneChangeAccepted", "class_barbarian", "barbarian_weapon_mastery", 4, 3, 1, 3, 3, 1, 1, "weapon_longsword", "weapon_dagger", "weapon_flail", "none", true, false, false, false),
  }

  action doPreserveFighterLevelFourUnchangedWeaponMasteryReselection = all {
    qLastResult == "init",
    acceptedWeaponMasteryReselection(fighterLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_shortbow"])),
    recordProjection("fighterLevelFourUnchangedPreserved", "class_fighter", "fighter_weapon_mastery", 4, 4, 1, 4, 4, 0, 0, "weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_shortbow", true, true, false, false),
  }

  action doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection = all {
    qLastResult == "init",
    rejectedWeaponMasteryReselection(fighterLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_shortsword", "weapon_flail"])),
    recordProjection("fighterLevelFourTooManyChangesRejected", "class_fighter", "fighter_weapon_mastery", 4, 4, 1, 4, 4, 2, 0, "weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_shortbow", false, false, true, true),
  }

  action stepAcceptFighterLevelFourOneChangeWeaponMasteryReselection = any {
    doAcceptFighterLevelFourOneChangeWeaponMasteryReselection,
  }

  action stepAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection = any {
    doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection,
  }

  action stepPreserveFighterLevelFourUnchangedWeaponMasteryReselection = any {
    doPreserveFighterLevelFourUnchangedWeaponMasteryReselection,
  }

  action stepRejectFighterLevelFourTooManyChangesWeaponMasteryReselection = any {
    doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection,
  }

  action step = any {
    doAcceptFighterLevelFourOneChangeWeaponMasteryReselection,
    doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection,
    doPreserveFighterLevelFourUnchangedWeaponMasteryReselection,
    doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection,
  }
}
