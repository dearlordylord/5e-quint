// KERNEL-COVERAGE: qnt-owner CREATION.FEATURE.PROFICIENCY_CHOICE
// UNIT-PROFILE-COVERAGE: qnt-owner character-creation.class-feature-proficiency-choice
// SRD 5.2.1 classes.md:1729-1731 grants proficiency in three chosen skills.
// The eligible set is projected from canonical allowed choices and held facts.
module granted_choice_selection {
  pure def validSelection(selected: List[int], eligible: Set[int], count: int): bool =
    selected.length() == count and selected.indices().forall(i =>
      eligible.contains(selected.nth(i)) and selected.indices().forall(j => i == j or selected.nth(i) != selected.nth(j)))
  pure def eligibleSkills(allowed: Set[int], owned: Set[int]): Set[int] = allowed.exclude(owned)
}
