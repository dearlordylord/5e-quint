// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.WEAPON_MASTERY.RESELECTION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.weapon-mastery-reselection

module characterSheetWeaponMasteryContainersSelectedIdentityMbt {
  import weaponMasteryReselection.* from "../shared-algebras/proofs/rule-core/weapon-mastery-reselection"

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

  pure def twoChoiceWeaponMasteryReselectionReplayFacts(
    choiceCount: int,
    longRestChangeCount: int,
    currentFirstWeaponRef: str,
    currentSecondWeaponRef: str,
    requestedFirstWeaponRef: str,
    requestedSecondWeaponRef: str,
    firstWeaponEligible: bool,
    secondWeaponEligible: bool,
  ): WeaponMasteryReselectionFacts = {
    choiceCount: choiceCount,
    longRestChangeCount: longRestChangeCount,
    currentWeaponRefs: [currentFirstWeaponRef, currentSecondWeaponRef],
    requestedWeaponRefs: [requestedFirstWeaponRef, requestedSecondWeaponRef],
    eligibleWeaponRefs:
      (if (firstWeaponEligible) Set(requestedFirstWeaponRef) else Set())
        .union(if (secondWeaponEligible) Set(requestedSecondWeaponRef) else Set()),
  }

  action doSelectPaladinWeaponMastery = all {
    qLastResult == "init",
    recordProjection("paladinSelected", "paladin_weapon_mastery", "class_paladin", "weapon_longsword", "weapon_dagger", 2, 2, 2, 0, true, true, true, true),
  }

  action doReselectPaladinWeaponMasteryOnLongRest = all {
    qLastResult == "init",
    acceptedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 2, "weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_flail", true, true)),
    recordProjection("paladinReselected", "paladin_weapon_mastery", "class_paladin", "weapon_spear", "weapon_flail", 2, 2, 2, 2, true, true, true, true),
  }

  action doSelectRangerWeaponMastery = all {
    qLastResult == "init",
    recordProjection("rangerSelected", "ranger_weapon_mastery", "class_ranger", "weapon_longsword", "weapon_dagger", 2, 2, 2, 0, true, true, true, true),
  }

  action doReselectRangerWeaponMasteryOnLongRest = all {
    qLastResult == "init",
    acceptedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 2, "weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_flail", true, true)),
    recordProjection("rangerReselected", "ranger_weapon_mastery", "class_ranger", "weapon_spear", "weapon_flail", 2, 2, 2, 2, true, true, true, true),
  }

  action doSelectRogueWeaponMastery = all {
    qLastResult == "init",
    recordProjection("rogueSelected", "rogue_weapon_mastery", "class_rogue", "weapon_dagger", "weapon_shortbow", 2, 2, 2, 0, true, true, true, true),
  }

  action doReselectRogueWeaponMasteryOnLongRest = all {
    qLastResult == "init",
    acceptedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 2, "weapon_dagger", "weapon_shortbow", "weapon_spear", "weapon_shortsword", true, true)),
    recordProjection("rogueReselected", "rogue_weapon_mastery", "class_rogue", "weapon_spear", "weapon_shortsword", 2, 2, 2, 2, true, true, true, true),
  }

  action doAcceptOneChangeWeaponMasteryReselection = all {
    qLastResult == "init",
    acceptedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 1, "current_first", "current_second", "current_first", "requested_second", true, true)),
    recordProjection("oneChangeAccepted", "semantic_core", "semantic_core", "current_first", "requested_second", 2, 1, 2, 1, true, true, true, true),
  }

  action doRejectTooManyChangesWeaponMasteryReselection = all {
    qLastResult == "init",
    rejectedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 1, "current_first", "current_second", "requested_first", "requested_second", true, true)),
    recordProjection("tooManyChangesRejected", "semantic_core", "semantic_core", "requested_first", "requested_second", 2, 1, 2, 2, true, true, true, false),
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

  action stepAcceptOneChangeWeaponMasteryReselection = any {
    doAcceptOneChangeWeaponMasteryReselection,
  }

  action stepRejectTooManyChangesWeaponMasteryReselection = any {
    doRejectTooManyChangesWeaponMasteryReselection,
  }

  action step = any {
    doSelectPaladinWeaponMastery,
    doReselectPaladinWeaponMasteryOnLongRest,
    doSelectRangerWeaponMastery,
    doReselectRangerWeaponMasteryOnLongRest,
    doSelectRogueWeaponMastery,
    doReselectRogueWeaponMasteryOnLongRest,
    doAcceptOneChangeWeaponMasteryReselection,
    doRejectTooManyChangesWeaponMasteryReselection,
  }
}
