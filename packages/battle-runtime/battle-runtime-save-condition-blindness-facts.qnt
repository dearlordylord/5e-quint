// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveConditionBlindnessFacts {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def blindnessDeafnessDurationTicks: int = 10
  pure def blindnessDeafnessActiveEffect(choice: BlindnessDeafnessConditionChoice, source: Actor): ActiveEffect =
    blindnessDeafnessActiveEffectWithHeightened(choice, source, false)
  pure def blindnessDeafnessActiveEffectWithHeightened(
    choice: BlindnessDeafnessConditionChoice,
    source: Actor,
    heightenedRepeatSaveDisadvantage: bool,
  ): ActiveEffect =
    match choice {
      | BlindnessDeafnessBlindedChoice => BlindnessDeafnessBlinded({
          source: source,
          heightenedRepeatSaveDisadvantage: heightenedRepeatSaveDisadvantage,
          durationTicks: blindnessDeafnessDurationTicks,
        })
      | BlindnessDeafnessDeafenedChoice => BlindnessDeafnessDeafened({
          source: source,
          heightenedRepeatSaveDisadvantage: heightenedRepeatSaveDisadvantage,
          durationTicks: blindnessDeafnessDurationTicks,
        })
    }
}
