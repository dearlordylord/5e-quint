// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-haste-positive

module battleRuntimeCompositeEnhancementAftermath {
  type CompositeEnhancementAftermath =
    | ActiveAftermath
    | EndedAftermath

  pure def compositeEnhancementAftermathIsActive(
    aftermath: CompositeEnhancementAftermath
  ): bool =
    match aftermath {
      | ActiveAftermath => true
      | EndedAftermath => false
    }

  pure def aftermathAppliesIncapacitated(
    aftermath: CompositeEnhancementAftermath
  ): bool =
    compositeEnhancementAftermathIsActive(aftermath)

  pure def speedFeetWithCompositeEnhancementAftermath(
    baseSpeedFeet: int,
    aftermath: CompositeEnhancementAftermath
  ): int =
    if (compositeEnhancementAftermathIsActive(aftermath)) 0
    else baseSpeedFeet

  pure def compositeEnhancementAftermathAfterTargetTurn(
    aftermath: CompositeEnhancementAftermath,
    reachedTargetTurnEnd: bool
  ): CompositeEnhancementAftermath =
    if (reachedTargetTurnEnd) EndedAftermath else aftermath

  pure def sourceOwnedConditionPreserved(
    removingAftermathSource: bool,
    conditionOwnedByAftermathSource: bool
  ): bool =
    not(removingAftermathSource and conditionOwnedByAftermathSource)
}
