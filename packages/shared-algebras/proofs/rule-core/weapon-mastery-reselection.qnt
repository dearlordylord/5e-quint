// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.WEAPON_MASTERY.RESELECTION SHEET.WEAPON_MASTERY.CLASS_LEVEL_RESELECTION CREATION.WEAPON_MASTERY.CLASS_LEVEL_ADVANCEMENT
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.weapon-mastery-reselection character-sheet.weapon-mastery-class-level-reselection character-creation.weapon-mastery-level-gain

module weaponMasteryReselection {
  type WeaponMasteryReselectionFacts = {
    choiceCount: int,
    longRestChangeCount: int,
    currentWeaponRefs: List[str],
    requestedWeaponRefs: List[str],
    eligibleWeaponRefs: Set[str],
  }

  type WeaponMasteryReselectionResult =
    | WeaponMasteryReselectionAccepted({ selectedWeaponRefs: List[str] })
    | WeaponMasteryReselectionRejected

  type WeaponMasteryLevelGainFacts = {
    currentChoiceCount: int,
    nextChoiceCount: int,
    currentWeaponRefs: List[str],
    requestedWeaponRefs: List[str],
    eligibleWeaponRefs: Set[str],
  }

  type WeaponMasteryLevelGainResult =
    | WeaponMasteryLevelGainAccepted({ selectedWeaponRefs: List[str] })
    | WeaponMasteryLevelGainRejected

  pure def weaponMasteryWeaponRefSet(weaponRefs: List[str]): Set[str] =
    weaponRefs.foldl(Set(), (refs, weaponRef) => refs.union(Set(weaponRef)))

  pure def weaponMasteryWeaponRefsHaveDuplicates(weaponRefs: List[str]): bool =
    weaponRefs.foldl({ seen: Set(), duplicate: false }, (acc, weaponRef) =>
      {
        seen: acc.seen.union(Set(weaponRef)),
        duplicate: acc.duplicate or acc.seen.contains(weaponRef),
      }).duplicate

  pure def allWeaponMasteryWeaponRefsIn(weaponRefs: List[str], allowedWeaponRefs: Set[str]): bool =
    weaponRefs.foldl(true, (allowed, weaponRef) => allowed and allowedWeaponRefs.contains(weaponRef))

  pure def weaponMasteryChangedChoiceCount(currentWeaponRefs: List[str], requestedWeaponRefs: List[str]): int = {
    val currentWeaponRefSet = weaponMasteryWeaponRefSet(currentWeaponRefs)
    requestedWeaponRefs.foldl(0, (changedCount, weaponRef) =>
      if (currentWeaponRefSet.contains(weaponRef)) changedCount else changedCount + 1)
  }

  pure def legalWeaponMasteryReselectionFacts(facts: WeaponMasteryReselectionFacts): bool = all {
    facts.choiceCount > 0,
    facts.longRestChangeCount >= 0,
    facts.longRestChangeCount <= facts.choiceCount,
    facts.eligibleWeaponRefs.size() >= facts.choiceCount,
  }

  pure def existingWeaponMasterySelectionMatchesChoiceCount(facts: WeaponMasteryReselectionFacts): bool = all {
    facts.currentWeaponRefs.length() == facts.choiceCount,
    not(weaponMasteryWeaponRefsHaveDuplicates(facts.currentWeaponRefs)),
  }

  pure def reselectedWeaponMasteryChoicesMatchChoiceCount(facts: WeaponMasteryReselectionFacts): bool =
    facts.requestedWeaponRefs.length() == facts.choiceCount

  pure def reselectedWeaponMasteryChoicesDistinct(facts: WeaponMasteryReselectionFacts): bool =
    not(weaponMasteryWeaponRefsHaveDuplicates(facts.requestedWeaponRefs))

  pure def reselectedWeaponMasteryChoicesEligible(facts: WeaponMasteryReselectionFacts): bool =
    allWeaponMasteryWeaponRefsIn(facts.requestedWeaponRefs, facts.eligibleWeaponRefs)

  pure def weaponMasteryReselectionWithinLongRestChangeCount(facts: WeaponMasteryReselectionFacts): bool =
    weaponMasteryChangedChoiceCount(facts.currentWeaponRefs, facts.requestedWeaponRefs) <= facts.longRestChangeCount

  pure def canApplyWeaponMasteryLongRestReselection(facts: WeaponMasteryReselectionFacts): bool = all {
    legalWeaponMasteryReselectionFacts(facts),
    existingWeaponMasterySelectionMatchesChoiceCount(facts),
    reselectedWeaponMasteryChoicesMatchChoiceCount(facts),
    reselectedWeaponMasteryChoicesDistinct(facts),
    reselectedWeaponMasteryChoicesEligible(facts),
    weaponMasteryReselectionWithinLongRestChangeCount(facts),
  }

  pure def applyWeaponMasteryLongRestReselection(facts: WeaponMasteryReselectionFacts): WeaponMasteryReselectionResult =
    if (canApplyWeaponMasteryLongRestReselection(facts))
      WeaponMasteryReselectionAccepted({ selectedWeaponRefs: facts.requestedWeaponRefs })
    else
      WeaponMasteryReselectionRejected

  pure def legalWeaponMasteryLevelGainFacts(facts: WeaponMasteryLevelGainFacts): bool = all {
    facts.currentChoiceCount > 0,
    facts.nextChoiceCount >= facts.currentChoiceCount,
    facts.eligibleWeaponRefs.size() >= facts.nextChoiceCount,
  }

  pure def currentWeaponMasteryLevelGainSelectionMatchesChoiceCount(facts: WeaponMasteryLevelGainFacts): bool = all {
    facts.currentWeaponRefs.length() == facts.currentChoiceCount,
    not(weaponMasteryWeaponRefsHaveDuplicates(facts.currentWeaponRefs)),
  }

  pure def requestedWeaponMasteryLevelGainSelectionMatchesChoiceCount(facts: WeaponMasteryLevelGainFacts): bool =
    facts.requestedWeaponRefs.length() == facts.nextChoiceCount

  pure def requestedWeaponMasteryLevelGainChoicesDistinct(facts: WeaponMasteryLevelGainFacts): bool =
    not(weaponMasteryWeaponRefsHaveDuplicates(facts.requestedWeaponRefs))

  pure def requestedWeaponMasteryLevelGainChoicesEligible(facts: WeaponMasteryLevelGainFacts): bool =
    allWeaponMasteryWeaponRefsIn(facts.requestedWeaponRefs, facts.eligibleWeaponRefs)

  pure def weaponMasteryLevelGainPreservesCurrentChoices(facts: WeaponMasteryLevelGainFacts): bool = {
    val requestedWeaponRefSet = weaponMasteryWeaponRefSet(facts.requestedWeaponRefs)
    facts.currentWeaponRefs.foldl(true, (preserved, weaponRef) =>
      preserved and requestedWeaponRefSet.contains(weaponRef))
  }

  pure def weaponMasteryLevelGainAddsTableDelta(facts: WeaponMasteryLevelGainFacts): bool =
    weaponMasteryChangedChoiceCount(facts.currentWeaponRefs, facts.requestedWeaponRefs) == facts.nextChoiceCount - facts.currentChoiceCount

  pure def canApplyWeaponMasteryLevelGain(facts: WeaponMasteryLevelGainFacts): bool = all {
    legalWeaponMasteryLevelGainFacts(facts),
    currentWeaponMasteryLevelGainSelectionMatchesChoiceCount(facts),
    requestedWeaponMasteryLevelGainSelectionMatchesChoiceCount(facts),
    requestedWeaponMasteryLevelGainChoicesDistinct(facts),
    requestedWeaponMasteryLevelGainChoicesEligible(facts),
    weaponMasteryLevelGainPreservesCurrentChoices(facts),
    weaponMasteryLevelGainAddsTableDelta(facts),
  }

  pure def applyWeaponMasteryLevelGain(facts: WeaponMasteryLevelGainFacts): WeaponMasteryLevelGainResult =
    if (canApplyWeaponMasteryLevelGain(facts))
      WeaponMasteryLevelGainAccepted({ selectedWeaponRefs: facts.requestedWeaponRefs })
    else
      WeaponMasteryLevelGainRejected
}
