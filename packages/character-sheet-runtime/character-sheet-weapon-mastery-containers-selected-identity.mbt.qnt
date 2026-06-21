// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.WEAPON_MASTERY.RESELECTION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.weapon-mastery-reselection

module characterSheetWeaponMasteryContainersSelectedIdentityMbt {
  import weaponMasteryReselection.* from "../shared-algebras/proofs/rule-core/weapon-mastery-reselection"

  type CharacterSheetWeaponMasteryContainersSelectedIdentityOutcome =
    | CharacterSheetWeaponMasteryContainersSelectedIdentityInit
    | CharacterSheetWeaponMasteryContainersSelectedIdentityPaladinSelected
    | CharacterSheetWeaponMasteryContainersSelectedIdentityPaladinReselected
    | CharacterSheetWeaponMasteryContainersSelectedIdentityRangerSelected
    | CharacterSheetWeaponMasteryContainersSelectedIdentityRangerReselected
    | CharacterSheetWeaponMasteryContainersSelectedIdentityRogueSelected
    | CharacterSheetWeaponMasteryContainersSelectedIdentityRogueReselected
    | CharacterSheetWeaponMasteryContainersSelectedIdentityOneChangeAccepted
    | CharacterSheetWeaponMasteryContainersSelectedIdentityTooManyChangesRejected

  type CharacterSheetWeaponMasteryContainersSelectedIdentityState = {
    outcome: CharacterSheetWeaponMasteryContainersSelectedIdentityOutcome,
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
  }

  var qState: CharacterSheetWeaponMasteryContainersSelectedIdentityState

  action recordProjection(
    outcome: CharacterSheetWeaponMasteryContainersSelectedIdentityOutcome,
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
    qState' = {
      outcome: outcome,
      featureUnitId: featureUnitId,
      classUnitId: classUnitId,
      firstWeaponUnitId: firstWeaponUnitId,
      secondWeaponUnitId: secondWeaponUnitId,
      choiceCount: choiceCount,
      longRestChangeCount: longRestChangeCount,
      selectedWeaponCount: selectedWeaponCount,
      changedChoiceCount: changedChoiceCount,
      firstWeaponEligible: firstWeaponEligible,
      secondWeaponEligible: secondWeaponEligible,
      featureUnitRefPresent: featureUnitRefPresent,
      accepted: accepted,
    },
  }

  action init =
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
      "none",
      "none",
      "none",
      "none",
      0,
      0,
      0,
      0,
      false,
      false,
      false,
      false,
    )

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
    qState.outcome == CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityPaladinSelected,
      "paladin_weapon_mastery",
      "class_paladin",
      "weapon_longsword",
      "weapon_dagger",
      2,
      2,
      2,
      0,
      true,
      true,
      true,
      true,
    ),
  }

  action doReselectPaladinWeaponMasteryOnLongRest = all {
    qState.outcome == CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
    acceptedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 2, "weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_flail", true, true)),
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityPaladinReselected,
      "paladin_weapon_mastery",
      "class_paladin",
      "weapon_spear",
      "weapon_flail",
      2,
      2,
      2,
      2,
      true,
      true,
      true,
      true,
    ),
  }

  action doSelectRangerWeaponMastery = all {
    qState.outcome == CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityRangerSelected,
      "ranger_weapon_mastery",
      "class_ranger",
      "weapon_longsword",
      "weapon_dagger",
      2,
      2,
      2,
      0,
      true,
      true,
      true,
      true,
    ),
  }

  action doReselectRangerWeaponMasteryOnLongRest = all {
    qState.outcome == CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
    acceptedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 2, "weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_flail", true, true)),
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityRangerReselected,
      "ranger_weapon_mastery",
      "class_ranger",
      "weapon_spear",
      "weapon_flail",
      2,
      2,
      2,
      2,
      true,
      true,
      true,
      true,
    ),
  }

  action doSelectRogueWeaponMastery = all {
    qState.outcome == CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityRogueSelected,
      "rogue_weapon_mastery",
      "class_rogue",
      "weapon_dagger",
      "weapon_shortbow",
      2,
      2,
      2,
      0,
      true,
      true,
      true,
      true,
    ),
  }

  action doReselectRogueWeaponMasteryOnLongRest = all {
    qState.outcome == CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
    acceptedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 2, "weapon_dagger", "weapon_shortbow", "weapon_spear", "weapon_shortsword", true, true)),
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityRogueReselected,
      "rogue_weapon_mastery",
      "class_rogue",
      "weapon_spear",
      "weapon_shortsword",
      2,
      2,
      2,
      2,
      true,
      true,
      true,
      true,
    ),
  }

  action doAcceptOneChangeWeaponMasteryReselection = all {
    qState.outcome == CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
    acceptedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 1, "current_first", "current_second", "current_first", "requested_second", true, true)),
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityOneChangeAccepted,
      "semantic_core",
      "semantic_core",
      "current_first",
      "requested_second",
      2,
      1,
      2,
      1,
      true,
      true,
      true,
      true,
    ),
  }

  action doRejectTooManyChangesWeaponMasteryReselection = all {
    qState.outcome == CharacterSheetWeaponMasteryContainersSelectedIdentityInit,
    rejectedWeaponMasteryReselection(twoChoiceWeaponMasteryReselectionReplayFacts(2, 1, "current_first", "current_second", "requested_first", "requested_second", true, true)),
    recordProjection(
      CharacterSheetWeaponMasteryContainersSelectedIdentityTooManyChangesRejected,
      "semantic_core",
      "semantic_core",
      "requested_first",
      "requested_second",
      2,
      1,
      2,
      2,
      true,
      true,
      true,
      false,
    ),
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
