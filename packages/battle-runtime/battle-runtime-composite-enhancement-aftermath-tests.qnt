// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-haste-positive

module battleRuntimeCompositeEnhancementAftermathTests {
  import battleRuntimeCompositeEnhancementAftermath.* from "./battle-runtime-composite-enhancement-aftermath"

  run test_composite_enhancement_aftermath_ends_at_target_turn_boundary_and_preserves_other_sources = {
    val activeAftermath = ActiveAftermath
    val cleaned = compositeEnhancementAftermathAfterTargetTurn(activeAftermath, true)
    all {
      assert(compositeEnhancementAftermathIsActive(activeAftermath)),
      assert(aftermathAppliesIncapacitated(activeAftermath)),
      assert(speedFeetWithCompositeEnhancementAftermath(30, activeAftermath) == 0),
      assert(not(compositeEnhancementAftermathIsActive(cleaned))),
      assert(speedFeetWithCompositeEnhancementAftermath(30, cleaned) == 30),
      assert(not(sourceOwnedConditionPreserved(true, true))),
      assert(sourceOwnedConditionPreserved(true, false)),
    }
  }
}
