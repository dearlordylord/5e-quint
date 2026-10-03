// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-creation.class-feature-proficiency-choice
module granted_choice_selection_examples {
  import granted_choice_selection.* from "../shared-algebras/proofs/rule-core/granted-choice-selection"
  run test_threeSkills = validSelection(List(4,5,6), eligibleSkills(Set(1,2,3,4,5,6), Set(1,2,3)),3).assert()
  run test_rejections = (not(validSelection(List(4,4,5),Set(4,5,6),3)) and not(validSelection(List(1,4,5),eligibleSkills(Set(1,4,5,6),Set(1)),3)) and not(validSelection(List(4,5),Set(4,5,6),3))).assert()
}
