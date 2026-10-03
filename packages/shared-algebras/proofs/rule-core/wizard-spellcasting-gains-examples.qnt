// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-creation.wizard-spellcasting-advancement
// RAW: SRD 5.2.1 classes.md:10221-10228.
module wizardSpellcastingGainsExamples {
 import wizardSpellcastingGains.* from "./wizard-spellcasting-gains"
 run legalBookAndPreparationGain = assert(mayGain(Set("held","spare"),Set("held"),Set("held","spare","added1","added2"),List("added1","added2"),List("spare","added1"),2,2))
 run missingDuplicateAndExistingBookRejected = {
  assert(not(mayGain(Set("held"),Set("held"),Set("held","added"),List("added"),List("added"),2,2)))
   .then(assert(not(mayGain(Set("held"),Set("held"),Set("held","added"),List("added","added"),List("added"),2,1))))
   .then(assert(not(mayGain(Set("held"),Set("held"),Set("held","added"),List("held","added"),List("added"),2,1))))
 }
 run absentAndIneligiblePreparationRejected = {
  assert(not(mayGain(Set("held"),Set("held"),Set("held","added","absent"),List("added"),List("absent"),1,1)))
   .then(assert(not(mayGain(Set("held","high"),Set("held"),Set("held","added"),List("added"),List("high"),1,1))))
 }
 run newSlotAccessLearningRetainsEligibility = assert(mayUseLearningGrant(true,true,Set("held"),Set("schoolSpell"),List("schoolSpell"),1))
 run learningRejectsWrongSchoolCountAndSource = {
  assert(not(mayUseLearningGrant(true,true,Set("held"),Set("schoolSpell"),List("wrongSchool"),1)))
   .then(assert(not(mayUseLearningGrant(false,true,Set("held"),Set("schoolSpell"),List("schoolSpell"),1))))
   .then(assert(not(mayUseLearningGrant(true,false,Set("held"),Set("schoolSpell"),List("schoolSpell"),1))))
   .then(assert(not(mayUseLearningGrant(true,true,Set("held"),Set("schoolSpell"),List("schoolSpell","schoolSpell"),1))))
 }
}
