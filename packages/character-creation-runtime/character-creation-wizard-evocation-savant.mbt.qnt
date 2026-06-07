// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION
// UNIT-PROFILE-COVERAGE: qnt-owner character-creation.wizard-spellbook-learning-choice

module characterCreationWizardEvocationSavantMbt {
  var qLastResult: str
  var qFeatureUnitId: str
  var qAcquisitionChoiceCount: int
  var qAcquisitionMaximumSpellLevel: int
  var qLaterSlotAccessChoiceCount: int
  var qLaterSlotAccessTimingKind: str
  var qLaterSlotAccessCreatesCreationHole: bool
  var qLevel3CreationChoiceCount: int
  var qFinalSpellbookAddedCount: int
  var qFinalSpellbookTotalCount: int
  var qFirstLaterSlotAccessCharacterLevel: int
  var qFirstLaterNewSlotLevel: int

  action recordProjection(
    lastResult: str,
    featureUnitId: str,
    acquisitionChoiceCount: int,
    acquisitionMaximumSpellLevel: int,
    laterSlotAccessChoiceCount: int,
    laterSlotAccessTimingKind: str,
    laterSlotAccessCreatesCreationHole: bool,
    level3CreationChoiceCount: int,
    finalSpellbookAddedCount: int,
    finalSpellbookTotalCount: int,
    firstLaterSlotAccessCharacterLevel: int,
    firstLaterNewSlotLevel: int,
  ): bool = all {
    qLastResult' = lastResult,
    qFeatureUnitId' = featureUnitId,
    qAcquisitionChoiceCount' = acquisitionChoiceCount,
    qAcquisitionMaximumSpellLevel' = acquisitionMaximumSpellLevel,
    qLaterSlotAccessChoiceCount' = laterSlotAccessChoiceCount,
    qLaterSlotAccessTimingKind' = laterSlotAccessTimingKind,
    qLaterSlotAccessCreatesCreationHole' = laterSlotAccessCreatesCreationHole,
    qLevel3CreationChoiceCount' = level3CreationChoiceCount,
    qFinalSpellbookAddedCount' = finalSpellbookAddedCount,
    qFinalSpellbookTotalCount' = finalSpellbookTotalCount,
    qFirstLaterSlotAccessCharacterLevel' = firstLaterSlotAccessCharacterLevel,
    qFirstLaterNewSlotLevel' = firstLaterNewSlotLevel,
  }

  action init =
    recordProjection("init", "none", 0, 0, 0, "none", false, 0, 0, 0, 0, 0)

  action doProjectLevel3Creation = all {
    qLastResult == "init",
    recordProjection(
      "wizard-evocation-savant-level3-creation",
      "wizard_evocation_savant",
      2,
      2,
      1,
      "new_spell_slot_level_access",
      false,
      2,
      2,
      12,
      5,
      3,
    ),
  }

  action step = any {
    doProjectLevel3Creation,
  }
}
