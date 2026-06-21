// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.WIZARD_SPELLBOOK_LEARNING.CHOICE_FINALIZATION
// UNIT-PROFILE-COVERAGE: qnt-owner character-creation.wizard-spellbook-learning-choice

module characterCreationWizardEvocationSavantMbt {
  type CharacterCreationWizardEvocationSavantOutcome =
    | CharacterCreationWizardEvocationSavantInit
    | CharacterCreationWizardEvocationSavantWizardEvocationSavantLevel3Creation

  type CharacterCreationWizardEvocationSavantState = {
    outcome: CharacterCreationWizardEvocationSavantOutcome,
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
  }

  var qState: CharacterCreationWizardEvocationSavantState

  action recordProjection(
    outcome: CharacterCreationWizardEvocationSavantOutcome,
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
    qState' = {
      outcome: outcome,
      featureUnitId: featureUnitId,
      acquisitionChoiceCount: acquisitionChoiceCount,
      acquisitionMaximumSpellLevel: acquisitionMaximumSpellLevel,
      laterSlotAccessChoiceCount: laterSlotAccessChoiceCount,
      laterSlotAccessTimingKind: laterSlotAccessTimingKind,
      laterSlotAccessCreatesCreationHole: laterSlotAccessCreatesCreationHole,
      level3CreationChoiceCount: level3CreationChoiceCount,
      finalSpellbookAddedCount: finalSpellbookAddedCount,
      finalSpellbookTotalCount: finalSpellbookTotalCount,
      firstLaterSlotAccessCharacterLevel: firstLaterSlotAccessCharacterLevel,
      firstLaterNewSlotLevel: firstLaterNewSlotLevel,
    },
  }

  action init =
    recordProjection(
      CharacterCreationWizardEvocationSavantInit,
      "none",
      0,
      0,
      0,
      "none",
      false,
      0,
      0,
      0,
      0,
      0,
    )

  action doProjectLevel3Creation = all {
    qState.outcome == CharacterCreationWizardEvocationSavantInit,
    recordProjection(
      CharacterCreationWizardEvocationSavantWizardEvocationSavantLevel3Creation,
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
