// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.spellbook-ritual-invocation

module characterSheetSpellbookRitualSelectedIdentityMbt {
  import spellbookRitualAccess.* from "../shared-algebras/proofs/rule-core/spellbook-ritual-access"

  type CharacterSheetSpellbookRitualSelectedIdentityOutcome =
    | CharacterSheetSpellbookRitualSelectedIdentityInit
    | CharacterSheetSpellbookRitualSelectedIdentityInvoked
    | CharacterSheetSpellbookRitualSelectedIdentityPreparedOnlyRejected
    | CharacterSheetSpellbookRitualSelectedIdentityNonRitualRejected
    | CharacterSheetSpellbookRitualSelectedIdentityMissingFeatureRejected
    | CharacterSheetSpellbookRitualSelectedIdentityNonLeveledRejected

  type CharacterSheetSpellbookRitualSelectedIdentityState = {
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
    outcome: CharacterSheetSpellbookRitualSelectedIdentityOutcome,
  }

  var qState: CharacterSheetSpellbookRitualSelectedIdentityState

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
    outcome: CharacterSheetSpellbookRitualSelectedIdentityOutcome,
  ): bool = all {
    qState' = {
      featureUnitId: featureUnitId,
      spellId: spellId,
      spellcastingSourceUnitId: spellcastingSourceUnitId,
      spellbookContainsRitual: spellbookContainsRitual,
      preparedContainsRitual: preparedContainsRitual,
      invocationAccepted: invocationAccepted,
      spellSlotCostKind: spellSlotCostKind,
      preparationRequirement: preparationRequirement,
      requiredSpellAccess: requiredSpellAccess,
      additionalCastingTimeMinutes: additionalCastingTimeMinutes,
      requiresReadingSpellbook: requiresReadingSpellbook,
      firstLevelSpellSlotsExpended: firstLevelSpellSlotsExpended,
      outcome: outcome,
    },
  }

  action init =
    recordProjection(
      "none",
      "none",
      "none",
      false,
      false,
      false,
      "none",
      "none",
      "none",
      0,
      false,
      0,
      CharacterSheetSpellbookRitualSelectedIdentityInit,
    )

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
    qState.outcome == CharacterSheetSpellbookRitualSelectedIdentityInit,
    acceptedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookRitualTaggedLevelOnePlusSpell, SpellbookRitualInSpellbook, SpellbookRitualFeaturePresentForSpellbookSource)),
    recordProjection(
      "wizard_ritual_adept",
      "detect_magic",
      "class_wizard",
      true,
      false,
      true,
      "none",
      "not_required",
      "spellbook",
      10,
      true,
      0,
      CharacterSheetSpellbookRitualSelectedIdentityInvoked,
    ),
  }

  action doRejectPreparedOnlyRitual = all {
    qState.outcome == CharacterSheetSpellbookRitualSelectedIdentityInit,
    rejectedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookRitualTaggedLevelOnePlusSpell, SpellbookRitualPreparedOnlyNotInSpellbook, SpellbookRitualFeaturePresentForSpellbookSource)),
    recordProjection(
      "wizard_ritual_adept",
      "detect_magic",
      "class_wizard",
      false,
      true,
      false,
      "none",
      "none",
      "none",
      0,
      false,
      0,
      CharacterSheetSpellbookRitualSelectedIdentityPreparedOnlyRejected,
    ),
  }

  action doRejectNonRitualSpellbookSpell = all {
    qState.outcome == CharacterSheetSpellbookRitualSelectedIdentityInit,
    rejectedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookNonRitualLevelOnePlusSpell, SpellbookRitualInSpellbook, SpellbookRitualFeaturePresentForSpellbookSource)),
    recordProjection(
      "none",
      "none",
      "none",
      false,
      false,
      false,
      "none",
      "none",
      "none",
      0,
      false,
      0,
      CharacterSheetSpellbookRitualSelectedIdentityNonRitualRejected,
    ),
  }

  action doRejectMissingRitualAccessFeature = all {
    qState.outcome == CharacterSheetSpellbookRitualSelectedIdentityInit,
    rejectedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookRitualTaggedLevelOnePlusSpell, SpellbookRitualInSpellbook, SpellbookRitualFeatureMissing)),
    recordProjection(
      "none",
      "none",
      "none",
      true,
      false,
      false,
      "none",
      "none",
      "none",
      0,
      false,
      0,
      CharacterSheetSpellbookRitualSelectedIdentityMissingFeatureRejected,
    ),
  }

  action doRejectNonLeveledRitualSpellbookSpell = all {
    qState.outcome == CharacterSheetSpellbookRitualSelectedIdentityInit,
    rejectedSpellbookRitualAccess(spellbookRitualReplayFacts(SpellbookNonLeveledSpell, SpellbookRitualInSpellbook, SpellbookRitualFeaturePresentForSpellbookSource)),
    recordProjection(
      "none",
      "none",
      "none",
      true,
      false,
      false,
      "none",
      "none",
      "none",
      0,
      false,
      0,
      CharacterSheetSpellbookRitualSelectedIdentityNonLeveledRejected,
    ),
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
