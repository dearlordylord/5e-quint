// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.prepared-spell-rest-replacement
// RAW: SRD 5.2.1 classes.md:10269-10272.
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_ACCESS.SHORT_REST_PREPARED_REPLACEMENT
module preparedSpellRestReplacement {
  pure def mayReplace(completedShortRest: bool, ownsFeature: bool, prepared: Set[str], book: Set[str], eligible: Set[str], removed: str, added: str): bool = all {
    completedShortRest, ownsFeature,
    prepared.contains(removed), eligible.contains(removed),
    book.contains(added), eligible.contains(added),
    not(prepared.contains(added)),
  }
  pure def replacePrepared(prepared: List[str], removed: str, added: str): List[str] =
    prepared.foldl([], (spells, spell) => spells.append(if (spell == removed) added else spell))
}
