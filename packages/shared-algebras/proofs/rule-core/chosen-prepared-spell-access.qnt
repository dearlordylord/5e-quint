// KERNEL-COVERAGE: qnt-owner CREATION.SPELL_ACCESS.CHOSEN_PREPARED_PAIR
// UNIT-PROFILE-COVERAGE: qnt-owner character-creation.chosen-prepared-spell-access
// SRD 5.2.1 classes.md:1737-1742.
module chosen_prepared_spell_access {
  pure def validSelection(selected: Set[int], eligible: Set[int]): bool = selected.size() == 2 and selected.subseteq(eligible)
  pure def validReplacement(before: Set[int], after: Set[int], eligible: Set[int]): bool = validSelection(after, eligible) and before.size() == 2 and before.exclude(after).size() <= 1
}
