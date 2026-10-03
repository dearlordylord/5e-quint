// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-creation.chosen-prepared-spell-access
module chosen_prepared_spell_access_examples {
  import chosen_prepared_spell_access.* from "../shared-algebras/proofs/rule-core/chosen-prepared-spell-access"
  run test_selection = validSelection(Set(1, 2), Set(1, 2, 3)).assert()
  run test_rejections = (not(validSelection(Set(1), Set(1,2,3))) and not(validSelection(Set(1,4), Set(1,2,3)))).assert()
  run test_replacement = (validReplacement(Set(1,2), Set(2,3), Set(1,2,3)) and not(validReplacement(Set(1,2), Set(3,4), Set(1,2,3,4)))).assert()
}
