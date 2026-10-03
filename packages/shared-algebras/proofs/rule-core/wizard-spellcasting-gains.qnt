// UNIT-PROFILE-COVERAGE: qnt-owner character-creation.wizard-spellcasting-advancement
// RAW: SRD 5.2.1 classes.md:10221-10228;11522-11526.
// KERNEL-COVERAGE: qnt-owner CREATION.SPELL_ACCESS.WIZARD_PROGRESSION
module wizardSpellcastingGains {
 pure def mayGain(book: Set[str], prepared: Set[str], eligible: Set[str], gainedBook: List[str], gainedPrepared: List[str], bookCount: int, preparedCount: int): bool = all {
  gainedBook.length() == bookCount,
  gainedPrepared.length() == preparedCount,
  gainedBook.indices().forall(i => all {eligible.contains(gainedBook.nth(i)),not(book.contains(gainedBook.nth(i))),gainedBook.indices().forall(j => i == j or gainedBook.nth(i) != gainedBook.nth(j))}),
  gainedPrepared.indices().forall(i => all {eligible.contains(gainedPrepared.nth(i)),not(prepared.contains(gainedPrepared.nth(i))),book.contains(gainedPrepared.nth(i)) or gainedBook.indices().exists(j => gainedBook.nth(j) == gainedPrepared.nth(i)),gainedPrepared.indices().forall(j => i == j or gainedPrepared.nth(i) != gainedPrepared.nth(j))}),
 }
 pure def mayUseLearningGrant(ownsGrant: bool, newSlotAccess: bool, book: Set[str], eligibleSchoolAndLevel: Set[str], chosen: List[str], count: int): bool = all {
  ownsGrant, newSlotAccess, chosen.length() == count,
  chosen.indices().forall(i => all {eligibleSchoolAndLevel.contains(chosen.nth(i)),not(book.contains(chosen.nth(i))),chosen.indices().forall(j => i == j or chosen.nth(i) != chosen.nth(j))}),
 }
}
