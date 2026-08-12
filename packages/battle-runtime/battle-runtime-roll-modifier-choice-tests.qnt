// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-roll-modifier

module battleRuntimeRollModifierChoiceTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeRollModifierChoice.* from "./battle-runtime-roll-modifier-choice"

  run test_roll_modifier_concentration_replacement_removes_prior_effects_before_new_effect = {
    val prior = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, GuidanceAbilityCheckBonus({ skill: StealthSkill }), PassWithoutTraceStealthBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, GuidanceAbilityCheckBonus({ skill: StealthSkill }), PassWithoutTraceStealthBonus),
      },
    }
    val result = resolveRollModifierChoiceSpell(prior, BlessRollModifier, Set(Goblin), Set(), 1, StrAbility, StealthSkill)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
      assert(not(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
      assert(not(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(result.goblin.activeEffects.contains(BlessD20RollBonus)),
    }
  }

  run test_pass_without_trace_applies_stealth_bonus_to_chosen_aura_targets = {
    val result = resolveRollModifierChoiceSpell(initialState, PassWithoutTraceRollModifier, Set(Fighter, Goblin), Set(), 2, StrAbility, StealthSkill)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus)),
      assert(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus)),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
    }
  }

  run test_pass_without_trace_requires_caster_in_selected_targets = {
    val result = resolveRollModifierChoiceSpell(initialState, PassWithoutTraceRollModifier, Set(Goblin), Set(), 2, StrAbility, StealthSkill)
    all {
      assert(result == initialState),
      assert(not(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(not(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus))),
    }
  }

  run test_enthrall_applies_perception_penalty_to_failed_wisdom_save_targets = {
    val result = resolveRollModifierChoiceSpell(initialState, EnthrallRollModifier, Set(Fighter, Goblin), Set(Goblin), 2, StrAbility, PerceptionSkill)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(EnthrallPerceptionPenalty))),
      assert(result.goblin.activeEffects.contains(EnthrallPerceptionPenalty)),
      assert(passivePerceptionModifierDelta(result.goblin.activeEffects) == -10),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
    }
  }

  run test_enhance_ability_upcast_applies_per_target_ability_advantage = {
    val result =
      resolveRollModifierChoiceSpellWithTargetAbilities(
        initialState,
        EnhanceAbilityRollModifier,
        Set(Fighter, Goblin),
        Set(),
        3,
        DexAbility,
        WisAbility,
        StealthSkill,
      )
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(EnhanceAbilityCheckAdvantage({ ability: DexAbility }))),
      assert(not(result.fighter.activeEffects.contains(EnhanceAbilityCheckAdvantage({ ability: WisAbility })))),
      assert(result.goblin.activeEffects.contains(EnhanceAbilityCheckAdvantage({ ability: WisAbility }))),
      assert(not(result.goblin.activeEffects.contains(EnhanceAbilityCheckAdvantage({ ability: DexAbility })))),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
    }
  }

  run test_guidance_preserves_existing_turn_spell_slot_guard = {
    val alreadySpent = commitActorSpellSlotUse(initialState, Fighter)
    val result = resolveRollModifierChoiceSpell(alreadySpent, GuidanceRollModifier, Set(Fighter), Set(), 0, StrAbility, StealthSkill)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill }))),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
    }
  }

}
