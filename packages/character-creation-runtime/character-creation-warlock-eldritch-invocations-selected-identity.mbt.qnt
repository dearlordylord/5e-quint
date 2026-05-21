// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE

module characterCreationWarlockEldritchInvocationsSelectedIdentityMbt {
  var qLastResult: str
  var qSelectedFromUnitId: str
  var qSelectedInvocationCount: int
  var qSelectedClassChoiceFeatureRefCount: int
  var qWarlockInvocationsUnitRefPresent: bool
  var qArmorOfShadowsInvocationPresent: bool
  var qPactBladeInvocationPresent: bool
  var qDevilsSightInvocationPresent: bool
  var qEldritchMindInvocationPresent: bool
  var qThirstingBladeInvocationPresent: bool
  var qRepellingBlastEldritchBlastPresent: bool
  var qRepellingBlastPoisonSprayPresent: bool
  var qArmorOfShadowsUnitRefPresent: bool
  var qPactMagicCantripCount: int
  var qPactMagicPreparedSpellCount: int
  var qPactMagicSlotCount: int
  var qPactMagicSlotLevel: int
  var qTotalLevel: int
  var qLockedReplacementRejected: bool
  var qDuplicateNonRepeatableRejected: bool
  var qDuplicateRepeatableChoiceRejected: bool

  action recordProjection(
    lastResult: str,
    selectedFromUnitId: str,
    selectedInvocationCount: int,
    selectedClassChoiceFeatureRefCount: int,
    warlockInvocationsUnitRefPresent: bool,
    armorOfShadowsInvocationPresent: bool,
    pactBladeInvocationPresent: bool,
    devilsSightInvocationPresent: bool,
    eldritchMindInvocationPresent: bool,
    thirstingBladeInvocationPresent: bool,
    repellingBlastEldritchBlastPresent: bool,
    repellingBlastPoisonSprayPresent: bool,
    armorOfShadowsUnitRefPresent: bool,
    pactMagicCantripCount: int,
    pactMagicPreparedSpellCount: int,
    pactMagicSlotCount: int,
    pactMagicSlotLevel: int,
    totalLevel: int,
    lockedReplacementRejected: bool,
    duplicateNonRepeatableRejected: bool,
    duplicateRepeatableChoiceRejected: bool,
  ): bool = all {
    qLastResult' = lastResult,
    qSelectedFromUnitId' = selectedFromUnitId,
    qSelectedInvocationCount' = selectedInvocationCount,
    qSelectedClassChoiceFeatureRefCount' = selectedClassChoiceFeatureRefCount,
    qWarlockInvocationsUnitRefPresent' = warlockInvocationsUnitRefPresent,
    qArmorOfShadowsInvocationPresent' = armorOfShadowsInvocationPresent,
    qPactBladeInvocationPresent' = pactBladeInvocationPresent,
    qDevilsSightInvocationPresent' = devilsSightInvocationPresent,
    qEldritchMindInvocationPresent' = eldritchMindInvocationPresent,
    qThirstingBladeInvocationPresent' = thirstingBladeInvocationPresent,
    qRepellingBlastEldritchBlastPresent' = repellingBlastEldritchBlastPresent,
    qRepellingBlastPoisonSprayPresent' = repellingBlastPoisonSprayPresent,
    qArmorOfShadowsUnitRefPresent' = armorOfShadowsUnitRefPresent,
    qPactMagicCantripCount' = pactMagicCantripCount,
    qPactMagicPreparedSpellCount' = pactMagicPreparedSpellCount,
    qPactMagicSlotCount' = pactMagicSlotCount,
    qPactMagicSlotLevel' = pactMagicSlotLevel,
    qTotalLevel' = totalLevel,
    qLockedReplacementRejected' = lockedReplacementRejected,
    qDuplicateNonRepeatableRejected' = duplicateNonRepeatableRejected,
    qDuplicateRepeatableChoiceRejected' = duplicateRepeatableChoiceRejected,
  }

  action init =
    recordProjection("init", "none", 0, 0, false, false, false, false, false, false, false, false, false, 0, 0, 0, 0, 1, false, false, false)

  action doSelectLevelOneArmorOfShadows = all {
    qLastResult == "init",
    recordProjection("levelOneSelected", "warlock_eldritch_invocations", 1, 0, true, true, false, false, false, false, false, false, false, 2, 2, 1, 1, 1, false, false, false),
  }

  action doGainLevelTwoInvocations = all {
    qLastResult == "init",
    recordProjection("levelTwoGained", "warlock_eldritch_invocations", 3, 0, true, true, true, true, false, false, false, false, false, 2, 3, 2, 1, 2, false, false, false),
  }

  action doReplaceArmorWithEldritchMindOnWarlockLevelGain = all {
    qLastResult == "init",
    recordProjection("nonRepeatableReplaced", "warlock_eldritch_invocations", 3, 0, true, false, true, true, true, false, false, false, false, 2, 4, 2, 2, 3, false, false, false),
  }

  action doReplaceRepeatableInvocationByChoice = all {
    qLastResult == "init",
    recordProjection("repeatableReplaced", "warlock_eldritch_invocations", 3, 0, true, true, false, true, false, false, false, true, false, 2, 4, 2, 2, 3, false, false, false),
  }

  action doRejectPrerequisiteRetainedInvocationReplacement = all {
    qLastResult == "init",
    recordProjection("lockedReplacementRejected", "warlock_eldritch_invocations", 5, 0, true, true, true, true, true, true, false, false, false, 3, 6, 2, 3, 5, true, false, false),
  }

  action doRejectDuplicateInvocationSelections = all {
    qLastResult == "init",
    recordProjection("duplicateSelectionRejected", "warlock_eldritch_invocations", 1, 0, true, true, false, false, false, false, false, false, false, 2, 2, 1, 1, 1, false, true, true),
  }

  action step = any {
    doSelectLevelOneArmorOfShadows,
    doGainLevelTwoInvocations,
    doReplaceArmorWithEldritchMindOnWarlockLevelGain,
    doReplaceRepeatableInvocationByChoice,
    doRejectPrerequisiteRetainedInvocationReplacement,
    doRejectDuplicateInvocationSelections,
  }
}
