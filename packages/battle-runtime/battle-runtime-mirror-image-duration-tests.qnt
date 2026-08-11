// -*- mode: Bluespec; -*-

module battleRuntimeMirrorImageDurationTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMirrorImage.* from "./battle-runtime-mirror-image"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"

  run test_mirror_image_duplicate_pool_and_duration_facts = {
    all {
      assert(spellInvocationSpendsSpellSlot(MirrorImage)),
      assert(activeEffectsContainMirrorImageDuplicates(Set(mirrorImageActiveEffect))),
      assert(activeEffectsMirrorImageRemainingDuplicates(Set(mirrorImageActiveEffect)) == 3),
      assert(mirrorImageDuplicateRollInterposes(3, 3)),
      assert(not(mirrorImageDuplicateRollInterposes(3, 2))),
      assert(activeEffectsMirrorImageRemainingDuplicates(activeEffectsAfterMirrorImageDuplicateHit(Set(mirrorImageActiveEffect))) == 2),
      assert(not(activeEffectsContainMirrorImageDuplicates(activeEffectsAfterMirrorImageDuplicateHit(Set(MirrorImageDuplicates({ durationTicks: 10, remainingDuplicates: 1 })))))),
      assert(activeEffectsMirrorImageRemainingDuplicates(tickDurationActiveEffects(Set(mirrorImageActiveEffect))) == 3),
      assert(not(activeEffectsContainMirrorImageDuplicates(tickDurationActiveEffects(Set(MirrorImageDuplicates({ durationTicks: 1, remainingDuplicates: 3 })))))),
    }
  }
}
