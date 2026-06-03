// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-mirror-image-hit-interception

module battleRuntimeMirrorImageTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"
  import battleRuntimeSaveGatedSpell.* from "./battle-runtime-save-gated-spell"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"

  run test_mirror_image_intercepts_ice_knife_attack_damage_before_burst = {
    val mirroredGoblin = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(mirrorImageActiveEffect),
        reactionAvailable: false,
      },
    }
    val redirected = resolveIceKnifeWithMirrorImageDuplicateRoll(
      mirroredGoblin,
      20,
      20,
      5,
      true,
      false,
      false,
      6,
      true,
      true,
      3,
      false,
    )
    all {
      assert(redirected.goblin.hp == 10),
      assert(activeEffectsMirrorImageRemainingDuplicates(redirected.goblin.activeEffects) == 2),
      assert(redirected.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(redirected, Fighter)),
    }
  }
}
