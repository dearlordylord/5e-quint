// -*- mode: Bluespec; -*-

module characterSheetSpellbookRitualSelectedIdentityMbt {
  var qFeatureUnitId: str
  var qSpellId: str
  var qSpellcastingSourceUnitId: str
  var qSpellbookContainsRitual: bool
  var qPreparedContainsRitual: bool
  var qInvocationAccepted: bool
  var qSpellSlotCostKind: str
  var qPreparationRequirement: str
  var qRequiredSpellAccess: str
  var qRequiresReadingSpellbook: bool
  var qFirstLevelSpellSlotsExpended: int
  var qLastResult: str

  action recordProjection(
    featureUnitId: str,
    spellId: str,
    spellcastingSourceUnitId: str,
    spellbookContainsRitual: bool,
    preparedContainsRitual: bool,
    invocationAccepted: bool,
    spellSlotCostKind: str,
    preparationRequirement: str,
    requiredSpellAccess: str,
    requiresReadingSpellbook: bool,
    firstLevelSpellSlotsExpended: int,
    lastResult: str,
  ): bool = all {
    qFeatureUnitId' = featureUnitId,
    qSpellId' = spellId,
    qSpellcastingSourceUnitId' = spellcastingSourceUnitId,
    qSpellbookContainsRitual' = spellbookContainsRitual,
    qPreparedContainsRitual' = preparedContainsRitual,
    qInvocationAccepted' = invocationAccepted,
    qSpellSlotCostKind' = spellSlotCostKind,
    qPreparationRequirement' = preparationRequirement,
    qRequiredSpellAccess' = requiredSpellAccess,
    qRequiresReadingSpellbook' = requiresReadingSpellbook,
    qFirstLevelSpellSlotsExpended' = firstLevelSpellSlotsExpended,
    qLastResult' = lastResult,
  }

  action init =
    recordProjection("none", "none", "none", false, false, false, "none", "none", "none", false, 0, "init")

  action doInvokeSpellbookRitual = all {
    qLastResult == "init",
    recordProjection("wizard_ritual_adept", "detect_magic", "class_wizard", true, false, true, "none", "not_required", "spellbook", true, 0, "invoked"),
  }

  action doRejectPreparedOnlyRitual = all {
    qLastResult == "init",
    recordProjection("wizard_ritual_adept", "detect_magic", "class_wizard", false, true, false, "none", "none", "none", false, 0, "prepared_only_rejected"),
  }

  action step = any {
    doInvokeSpellbookRitual,
    doRejectPreparedOnlyRitual,
  }
}
