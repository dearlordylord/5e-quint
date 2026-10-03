// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-sheet.prepared-spell-rest-replacement
// RAW: SRD 5.2.1 classes.md:10269-10272.
module preparedSpellRestReplacementExamples {
  import preparedSpellRestReplacement.* from "./prepared-spell-rest-replacement"
  run legalReplacementRetainsCount = {
    assert(mayReplace(true, true, Set("prepared"), Set("prepared", "book"), Set("prepared", "book"), "prepared", "book"))
      .then(assert(replacePrepared(List("prepared", "retained"), "prepared", "book") == List("book", "retained")))
  }
  run rejectsCantripsAndAbsentBook = {
    assert(not(mayReplace(true,true,Set("prepared"),Set("book","cantrip"),Set("prepared","book"),"prepared","cantrip")))
      .then(assert(not(mayReplace(true,true,Set("prepared"),Set("book"),Set("prepared","absent"),"prepared","absent"))))
  }
  run rejectsForgedRestAndOwnership = {
    assert(not(mayReplace(false,true,Set("prepared"),Set("book"),Set("prepared","book"),"prepared","book")))
      .then(assert(not(mayReplace(true,false,Set("prepared"),Set("book"),Set("prepared","book"),"prepared","book"))))
  }
}
