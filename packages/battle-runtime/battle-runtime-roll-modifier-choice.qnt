// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
module battleRuntimeRollModifierChoice {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def rollModifierChoiceActiveEffect(
    invocation: RollModifierSpell,
    chosenAbility: Ability,
    chosenSkill: AbilityCheckSkill,
  ): ActiveEffect =
    match invocation {
      | BaneRollModifier => BaneD20RollPenalty
      | BlessRollModifier => BlessD20RollBonus
      | GuidanceRollModifier => GuidanceAbilityCheckBonus({ skill: chosenSkill })
      | PassWithoutTraceRollModifier => PassWithoutTraceStealthBonus
      | EnhanceAbilityRollModifier => EnhanceAbilityCheckAdvantage({ ability: chosenAbility })
    }
}
