// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-hypnotic-pattern-control

module battleRuntimeSaveGatedControlEscapeTests {
  import battleRuntimeSaveGatedControlEscape.* from "./battle-runtime-save-gated-control-escape"

  run test_save_gated_control_ends_on_damage_or_witnessed_other_creature_action = {
    all {
      assert(controlProjectionIsActive(true, true, 0)),
      assert(not(controlEffectRemainsAfter(TargetDamaged, false))),
      assert(not(controlEffectRemainsAfter(OtherCreatureAction, true))),
      assert(controlEffectRemainsAfter(OtherCreatureAction, false)),
      assert(controlEffectRemainsAfter(NoEscapeEvent, false)),
    }
  }
}
