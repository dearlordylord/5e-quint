// -*- mode: Bluespec; -*-

module battleRuntimeSpellFactsBlindnessEffectTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveConditionBlindnessFacts.* from "./battle-runtime-save-condition-blindness-facts"

  run test_spell_facts_blindness_effect =
    assert(blindnessDeafnessActiveEffect(BlindnessDeafnessDeafenedChoice, Fighter) == BlindnessDeafnessDeafened({
      source: Fighter,
      heightenedRepeatSaveDisadvantage: false,
      durationTicks: blindnessDeafnessDurationTicks,
    }))
}
