// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.spellbook-ritual-invocation

module characterSheetSpellbookRitualSelectedIdentityMbt {
  import spellbookRitualAccess.* from "../shared-algebras/proofs/rule-core/spellbook-ritual-access"

  var qFeatureUnitId: str
  var qSpellId: str
  var qSpellcastingSourceUnitId: str
  var qSpellbookContainsRitual: bool
  var qPreparedContainsRitual: bool
  var qInvocationAccepted: bool
  var qSpellSlotCostKind: str
  var qPreparationRequirement: str
  var qRequiredSpellAccess: str
  var qAdditionalCastingTimeMinutes: int
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
    additionalCastingTimeMinutes: int,
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
    qAdditionalCastingTimeMinutes' = additionalCastingTimeMinutes,
    qRequiresReadingSpellbook' = requiresReadingSpellbook,
    qFirstLevelSpellSlotsExpended' = firstLevelSpellSlotsExpended,
    qLastResult' = lastResult,
  }

  action init =
    recordProjection("none", "none", "none", false, false, false, "none", "none", "none", 0, false, 0, "init")

  pure def acceptedSpellbookRitualAccess(facts: SpellbookRitualAccessFacts): bool =
    match applySpellbookRitualAccess(facts) {
      | SpellbookRitualAccepted(accepted) => all {
          accepted.invocation.spellSlotCostKind == "none",
          accepted.invocation.preparationRequirement == "not_required",
          accepted.invocation.requiredSpellAccess == "spellbook",
          accepted.invocation.additionalCastingTimeMinutes == 10,
          accepted.invocation.requiresReadingSpellbook,
        }
      | SpellbookRitualRejected => false
    }

  pure def rejectedSpellbookRitualAccess(facts: SpellbookRitualAccessFacts): bool =
    match applySpellbookRitualAccess(facts) {
      | SpellbookRitualAccepted(_) => false
      | SpellbookRitualRejected => true
    }

  pure def spellbookRitualReplayFacts(
    spellDefinition: SpellbookRitualSpellDefinition,
    accessPath: SpellbookRitualAccessPath,
    feature: SpellbookRitualFeature,
  ): SpellbookRitualAccessFacts = {
    spellDefinition: spellDefinition,
    accessPath: accessPath,
    feature: feature,
  }

  action doInvokeSpellbookRitual = all {
    qLastResult == "init",
    acceptedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookRitualTaggedLevelOnePlusSpell, SpellbookRitualInSpellbook, SpellbookRitualFeaturePresentForSpellbookSource)),
    recordProjection("wizard_ritual_adept", "detect_magic", "class_wizard", true, false, true, "none", "not_required", "spellbook", 10, true, 0, "invoked"),
  }

  action doRejectPreparedOnlyRitual = all {
    qLastResult == "init",
    rejectedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookRitualTaggedLevelOnePlusSpell, SpellbookRitualPreparedOnlyNotInSpellbook, SpellbookRitualFeaturePresentForSpellbookSource)),
    recordProjection("wizard_ritual_adept", "detect_magic", "class_wizard", false, true, false, "none", "none", "none", 0, false, 0, "prepared_only_rejected"),
  }

  action doRejectNonRitualSpellbookSpell = all {
    qLastResult == "init",
    rejectedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookNonRitualLevelOnePlusSpell, SpellbookRitualInSpellbook, SpellbookRitualFeaturePresentForSpellbookSource)),
    recordProjection("none", "none", "none", false, false, false, "none", "none", "none", 0, false, 0, "non_ritual_rejected"),
  }

  action doRejectMissingRitualAccessFeature = all {
    qLastResult == "init",
    rejectedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookRitualTaggedLevelOnePlusSpell, SpellbookRitualInSpellbook, SpellbookRitualFeatureMissing)),
    recordProjection("none", "none", "none", true, false, false, "none", "none", "none", 0, false, 0, "missing_feature_rejected"),
  }

  action doRejectNonLeveledRitualSpellbookSpell = all {
    qLastResult == "init",
    rejectedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookNonLeveledSpell, SpellbookRitualInSpellbook, SpellbookRitualFeaturePresentForSpellbookSource)),
    recordProjection("none", "none", "none", true, false, false, "none", "none", "none", 0, false, 0, "non_leveled_rejected"),
  }

  action stepInvokeSpellbookRitual = any {
    doInvokeSpellbookRitual,
  }

  action stepRejectPreparedOnlyRitual = any {
    doRejectPreparedOnlyRitual,
  }

  action stepRejectNonRitualSpellbookSpell = any {
    doRejectNonRitualSpellbookSpell,
  }

  action stepRejectMissingRitualAccessFeature = any {
    doRejectMissingRitualAccessFeature,
  }

  action stepRejectNonLeveledRitualSpellbookSpell = any {
    doRejectNonLeveledRitualSpellbookSpell,
  }

  action step = any {
    doInvokeSpellbookRitual,
    doRejectPreparedOnlyRitual,
    doRejectNonRitualSpellbookSpell,
    doRejectMissingRitualAccessFeature,
    doRejectNonLeveledRitualSpellbookSpell,
  }
}
