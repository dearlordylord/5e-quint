// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof character-creation.feat-grant-occurrences
// KERNEL-COVERAGE: qnt-owner CREATION.FEAT_GRANT_OCCURRENCE.CHOICE_LIFECYCLE
module featGrantOccurrencesExamples {
  import featGrantOccurrences.* from "./feat-grant-occurrences"
  val prior = [{ origin: { grant: "ability", level: 4 }, feat: "ability-increase", repeatable: true }]
  val earned = Set({ grant: "ability", level: 6 })
  val gained = [{ origin: { grant: "ability", level: 6 }, feat: "ability-increase", repeatable: true }]
  val styles = [
    { origin: { grant: "primary-style", level: 1 }, feat: "style-one", repeatable: false },
    { origin: { grant: "additional-style", level: 7 }, feat: "style-two", repeatable: false },
  ]
  run repeatableChoiceRetainsPrior = all {
    assert(canGainFeatChoices(earned,gained,prior,19,20)),
    assert(retainChoices(prior,gained).length() == 2),
    assert(retainChoices(prior,gained).nth(0) == prior.nth(0)),
  }
  run missingDuplicateAndForgedOriginsRejected = all {
    assert(not(canGainFeatChoices(earned,[],prior,17,20))),
    assert(not(canGainFeatChoices(earned,gained.concat(gained),prior,19,20))),
    assert(not(canGainFeatChoices(earned,[{ ...gained.nth(0), origin: { grant: "ability", level: 8 } }],prior,19,20))),
    assert(not(canGainFeatChoices(earned,gained,prior,21,20))),
  }
  run additionalNonrepeatableChoiceRejectsDuplicate = all {
    assert(not(canGainFeatChoices(Set(styles.nth(1).origin),[{ ...styles.nth(1), feat: "style-one" }],[styles.nth(0)],15,20))),
    assert(replaceAtOrigin(styles,styles.nth(0).origin,"style-three").nth(1) == styles.nth(1)),
  }
  run earlierIncreaseQualifiesLaterFeat = assert(qualifiesAfterPriorIncreases(11,List(2),13,1,20))
  run ownIncreaseCannotSupplyPrerequisite = assert(not(qualifiesAfterPriorIncreases(12,List(),13,1,20)))
}
