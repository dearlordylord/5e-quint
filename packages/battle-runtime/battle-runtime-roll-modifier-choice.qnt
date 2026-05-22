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
      | EnthrallRollModifier => EnthrallPerceptionPenalty
    }

  pure def rollModifierFixedAbilityCheckDelta(effect: ActiveEffect, skill: AbilityCheckSkill): int =
    match effect {
      | PassWithoutTraceStealthBonus => if (skill == StealthSkill) 10 else 0
      | EnthrallPerceptionPenalty => if (skill == PerceptionSkill) -10 else 0
      | _ => 0
    }

  pure def passivePerceptionModifierDelta(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => rollModifierFixedAbilityCheckDelta(effect, PerceptionSkill))
      .fold(0, (total, delta) => total + delta)
}
