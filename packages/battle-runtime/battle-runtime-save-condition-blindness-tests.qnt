// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save

module battleRuntimeSaveConditionBlindnessTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveConditionBlindnessFacts.* from "./battle-runtime-save-condition-blindness-facts"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSaveConditionBlindness.* from "./battle-runtime-save-condition-blindness"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_blindness_deafness_condition_choice_slot_scaling_and_repeat_save = {
    val deafened = resolveBlindnessDeafness(
      initialState,
      2,
      BlindnessDeafnessDeafenedChoice,
      false,
      true,
      true,
      false,
    )
    val illegalLevelOne = resolveBlindnessDeafness(
      initialState,
      1,
      BlindnessDeafnessDeafenedChoice,
      false,
      true,
      true,
      false,
    )
    val illegalTwoTargetsLevelTwo = resolveBlindnessDeafness(
      initialState,
      2,
      BlindnessDeafnessBlindedChoice,
      true,
      false,
      true,
      false,
    )
    val twoTargetsLevelThree = resolveBlindnessDeafness(
      initialState,
      3,
      BlindnessDeafnessBlindedChoice,
      true,
      false,
      true,
      false,
    )
    val goblinTurn = endTurn(deafened)
    val failedRepeat = endTurnWithBlindnessDeafnessRepeatSave(
      goblinTurn,
      Fighter,
      BlindnessDeafnessDeafenedChoice,
      false,
    )
    val successfulRepeat = endTurnWithBlindnessDeafnessRepeatSave(
      goblinTurn,
      Fighter,
      BlindnessDeafnessDeafenedChoice,
      true,
    )
    all {
      assert(deafened.goblin.activeEffects.contains(BlindnessDeafnessDeafened({
        source: Fighter,
        heightenedRepeatSaveDisadvantage: false,
        durationTicks: blindnessDeafnessDurationTicks,
      }))),
      assert(battleActorHasCommittedSpellSlotUse(deafened, Fighter)),
      assert(not(deafened.actionAvailable)),
      assert(illegalLevelOne == initialState),
      assert(illegalTwoTargetsLevelTwo == initialState),
      assert(twoTargetsLevelThree.fighter.activeEffects.contains(BlindnessDeafnessBlinded({
        source: Fighter,
        heightenedRepeatSaveDisadvantage: false,
        durationTicks: blindnessDeafnessDurationTicks,
      }))),
      assert(twoTargetsLevelThree.goblin.activeEffects.contains(BlindnessDeafnessBlinded({
        source: Fighter,
        heightenedRepeatSaveDisadvantage: false,
        durationTicks: blindnessDeafnessDurationTicks,
      }))),
      assert(failedRepeat.goblin.activeEffects.contains(BlindnessDeafnessDeafened({
        source: Fighter,
        heightenedRepeatSaveDisadvantage: false,
        durationTicks: blindnessDeafnessDurationTicks - 1,
      }))),
      assert(not(successfulRepeat.goblin.activeEffects.exists(effect => match effect {
        | BlindnessDeafnessDeafened(_) => true
        | _ => false
      }))),
    }
  }

}
