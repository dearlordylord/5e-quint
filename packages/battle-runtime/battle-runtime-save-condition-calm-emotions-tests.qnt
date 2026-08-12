// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-save-gated-condition-immunity
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.creature-type-protection-and-charm

module battleRuntimeSaveConditionCalmEmotionsTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveConditionCalmEmotions.* from "./battle-runtime-save-condition-calm-emotions"

  run test_calm_emotions_condition_immunity_branch_targets_humanoids_until_concentration_break = {
    val result = resolveCalmEmotions(
      initialState,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val broken = breakConcentrationSpellEffects(result, Fighter)
    all {
      assert(result.actionAvailable == false),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(CalmEmotionsCharmedImmunity))),
      assert(not(result.fighter.activeEffects.contains(CalmEmotionsFrightenedImmunity))),
      assert(result.goblin.activeEffects.contains(CalmEmotionsCharmedImmunity)),
      assert(result.goblin.activeEffects.contains(CalmEmotionsFrightenedImmunity)),
      assert(not(broken.goblin.activeEffects.contains(CalmEmotionsCharmedImmunity))),
      assert(not(broken.goblin.activeEffects.contains(CalmEmotionsFrightenedImmunity))),
    }
  }

  run test_calm_emotions_successful_saves_and_non_humanoids = {
    val allSuccess = resolveCalmEmotions(
      initialState,
      true,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      true,
    )
    val rejectedNonHumanoid = resolveCalmEmotions(
      initialState,
      false,
      HumanoidCreature,
      true,
      true,
      BeastCreature,
      false,
    )
    all {
      assert(allSuccess.fighter.concentrating),
      assert(battleActorHasCommittedSpellSlotUse(allSuccess, Fighter)),
      assert(not(allSuccess.fighter.activeEffects.contains(CalmEmotionsCharmedImmunity))),
      assert(not(allSuccess.goblin.activeEffects.contains(CalmEmotionsCharmedImmunity))),
      assert(rejectedNonHumanoid == initialState),
    }
  }

}
