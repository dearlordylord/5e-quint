// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveGatedConditionImmunity {
  pure def saveGatedConditionImmunityApplies(
    savingThrowSucceeded: bool,
  ): bool =
    not(savingThrowSucceeded)

  pure def includedTargetCreatureTypeIsLegal(
    targetIncluded: bool,
    targetHasRequiredCreatureType: bool,
  ): bool =
    not(targetIncluded) or targetHasRequiredCreatureType
}
