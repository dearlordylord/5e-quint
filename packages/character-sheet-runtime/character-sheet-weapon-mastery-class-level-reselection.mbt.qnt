// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: parity-witness SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION

module characterSheetWeaponMasteryClassLevelReselectionMbt {
  import weaponMasteryReselection.* from "../shared-algebras/proofs/rule-core/weapon-mastery-reselection"

  type CharacterSheetWeaponMasteryClassLevelReselectionOutcome =
    | CharacterSheetWeaponMasteryClassLevelReselectionInit
    | CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourOneChangeAccepted
    | CharacterSheetWeaponMasteryClassLevelReselectionBarbarianLevelFourOneChangeAccepted
    | CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourUnchangedPreserved
    | CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourTooManyChangesRejected

  type CharacterSheetWeaponMasteryClassLevelReselectionState = {
    outcome: CharacterSheetWeaponMasteryClassLevelReselectionOutcome,
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
  }

  var qState: CharacterSheetWeaponMasteryClassLevelReselectionState

  action recordProjection(
    outcome: CharacterSheetWeaponMasteryClassLevelReselectionOutcome,
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
    qState' = {
      outcome: outcome,
      classUnitId: classUnitId,
      featureUnitId: featureUnitId,
      classLevel: classLevel,
      choiceCount: choiceCount,
      longRestChangeCount: longRestChangeCount,
      requestedWeaponCount: requestedWeaponCount,
      selectedWeaponCount: selectedWeaponCount,
      requestedChangeCount: requestedChangeCount,
      appliedChangeCount: appliedChangeCount,
      firstWeaponUnitId: firstWeaponUnitId,
      secondWeaponUnitId: secondWeaponUnitId,
      thirdWeaponUnitId: thirdWeaponUnitId,
      fourthWeaponUnitId: fourthWeaponUnitId,
      accepted: accepted,
      unchangedPreserved: unchangedPreserved,
      tooManyChangesRejected: tooManyChangesRejected,
      rejectedWithoutStateChange: rejectedWithoutStateChange,
    },
  }

  action init =
    recordProjection(
      CharacterSheetWeaponMasteryClassLevelReselectionInit,
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
    qState.outcome == CharacterSheetWeaponMasteryClassLevelReselectionInit,
    acceptedWeaponMasteryReselection(fighterLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_flail"])),
    recordProjection(
      CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourOneChangeAccepted,
      "class_fighter",
      "fighter_weapon_mastery",
      4,
      4,
      1,
      4,
      4,
      1,
      1,
      "weapon_longsword",
      "weapon_dagger",
      "weapon_spear",
      "weapon_flail",
      true,
      false,
      false,
      false,
    ),
  }

  action doAcceptBarbarianLevelFourOneChangeWeaponMasteryReselection = all {
    qState.outcome == CharacterSheetWeaponMasteryClassLevelReselectionInit,
    acceptedWeaponMasteryReselection(barbarianLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_flail"])),
    recordProjection(
      CharacterSheetWeaponMasteryClassLevelReselectionBarbarianLevelFourOneChangeAccepted,
      "class_barbarian",
      "barbarian_weapon_mastery",
      4,
      3,
      1,
      3,
      3,
      1,
      1,
      "weapon_longsword",
      "weapon_dagger",
      "weapon_flail",
      "none",
      true,
      false,
      false,
      false,
    ),
  }

  action doPreserveFighterLevelFourUnchangedWeaponMasteryReselection = all {
    qState.outcome == CharacterSheetWeaponMasteryClassLevelReselectionInit,
    acceptedWeaponMasteryReselection(fighterLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_spear", "weapon_shortbow"])),
    recordProjection(
      CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourUnchangedPreserved,
      "class_fighter",
      "fighter_weapon_mastery",
      4,
      4,
      1,
      4,
      4,
      0,
      0,
      "weapon_longsword",
      "weapon_dagger",
      "weapon_spear",
      "weapon_shortbow",
      true,
      true,
      false,
      false,
    ),
  }

  action doRejectFighterLevelFourTooManyChangesWeaponMasteryReselection = all {
    qState.outcome == CharacterSheetWeaponMasteryClassLevelReselectionInit,
    rejectedWeaponMasteryReselection(fighterLevelFourFacts(["weapon_longsword", "weapon_dagger", "weapon_shortsword", "weapon_flail"])),
    recordProjection(
      CharacterSheetWeaponMasteryClassLevelReselectionFighterLevelFourTooManyChangesRejected,
      "class_fighter",
      "fighter_weapon_mastery",
      4,
      4,
      1,
      4,
      4,
      2,
      0,
      "weapon_longsword",
      "weapon_dagger",
      "weapon_spear",
      "weapon_shortbow",
      false,
      false,
      true,
      true,
    ),
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
