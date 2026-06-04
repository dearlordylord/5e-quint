// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION
// UNIT-PROFILE-COVERAGE: qnt-owner character-sheet.spellbook-ritual-invocation

module spellbookRitualAccess {
  type SpellbookRitualSpellDefinition =
    | SpellbookRitualTaggedLevelOnePlusSpell
    | SpellbookNonRitualLevelOnePlusSpell
    | SpellbookNonLeveledSpell

  type SpellbookRitualAccessPath =
    | SpellbookRitualInSpellbook
    | SpellbookRitualPreparedOnlyNotInSpellbook
    | SpellbookRitualNoRelevantAccess

  type SpellbookRitualFeature =
    | SpellbookRitualFeaturePresentForSpellbookSource
    | SpellbookRitualFeatureMissing

  type SpellbookRitualAccessFacts = {
    spellDefinition: SpellbookRitualSpellDefinition,
    accessPath: SpellbookRitualAccessPath,
    feature: SpellbookRitualFeature,
  }

  type SpellbookRitualInvocationProjection = {
    spellSlotCostKind: str,
    preparationRequirement: str,
    requiredSpellAccess: str,
    additionalCastingTimeMinutes: int,
    requiresReadingSpellbook: bool,
  }

  type SpellbookRitualAccessResult =
    | SpellbookRitualAccepted({ invocation: SpellbookRitualInvocationProjection })
    | SpellbookRitualRejected

  pure def spellbookRitualSpellDefinitionAccepted(spellDefinition: SpellbookRitualSpellDefinition): bool =
    match spellDefinition {
      | SpellbookRitualTaggedLevelOnePlusSpell => true
      | SpellbookNonRitualLevelOnePlusSpell => false
      | SpellbookNonLeveledSpell => false
    }

  pure def spellbookRitualAccessPathAccepted(accessPath: SpellbookRitualAccessPath): bool =
    match accessPath {
      | SpellbookRitualInSpellbook => true
      | SpellbookRitualPreparedOnlyNotInSpellbook => false
      | SpellbookRitualNoRelevantAccess => false
    }

  pure def spellbookRitualFeatureAccepted(feature: SpellbookRitualFeature): bool =
    match feature {
      | SpellbookRitualFeaturePresentForSpellbookSource => true
      | SpellbookRitualFeatureMissing => false
    }

  pure def canAccessSpellbookRitual(facts: SpellbookRitualAccessFacts): bool = all {
    spellbookRitualSpellDefinitionAccepted(facts.spellDefinition),
    spellbookRitualAccessPathAccepted(facts.accessPath),
    spellbookRitualFeatureAccepted(facts.feature),
  }

  pure val spellbookRitualInvocationProjection: SpellbookRitualInvocationProjection = {
    spellSlotCostKind: "none",
    preparationRequirement: "not_required",
    requiredSpellAccess: "spellbook",
    additionalCastingTimeMinutes: 10,
    requiresReadingSpellbook: true,
  }

  pure def applySpellbookRitualAccess(facts: SpellbookRitualAccessFacts): SpellbookRitualAccessResult =
    if (canAccessSpellbookRitual(facts))
      SpellbookRitualAccepted({ invocation: spellbookRitualInvocationProjection })
    else
      SpellbookRitualRejected
}
