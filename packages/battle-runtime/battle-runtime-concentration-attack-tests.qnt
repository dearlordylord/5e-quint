// -*- mode: Bluespec; -*-

module battleRuntimeConcentrationAttackTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

  run test_roll_modifier_concentration_effects_end_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus({ skill: StealthSkill }), PassWithoutTraceStealthBonus),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus({ skill: StealthSkill }), PassWithoutTraceStealthBonus),
      },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.fighter.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.fighter.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.fighter.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
      assert(not(result.fighter.activeEffects.contains(PassWithoutTraceStealthBonus))),
      assert(not(result.goblin.activeEffects.contains(BaneD20RollPenalty))),
      assert(not(result.goblin.activeEffects.contains(BlessD20RollBonus))),
      assert(not(result.goblin.activeEffects.contains(GuidanceAbilityCheckBonus({ skill: StealthSkill })))),
      assert(not(result.goblin.activeEffects.contains(PassWithoutTraceStealthBonus))),
    }
  }

  run test_scalar_buff_shield_of_faith_ends_when_caster_concentration_breaks = {
    val concentrating = {
      ...endTurn(initialState),
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: { ...initialState.goblin, activeEffects: Set(ShieldOfFaithArmorClassBonus) },
    }
    val result = resolveGoblinAttack(concentrating, 20, 18, 5, false)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.goblin.activeEffects.contains(ShieldOfFaithArmorClassBonus))),
    }
  }

  run test_attack_action_can_break_target_concentration = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val result = resolveAttack(concentratingGoblin, 15, 10, fighterWeaponAttackDamageRoll(4), false)
    all {
      assert(result.goblin.hp == 3),
      assert(not(result.goblin.concentrating)),
      assert(result.goblin.activeEffects == Set()),
    }
  }

  run test_goblin_attack_action_can_break_target_concentration = {
    val concentratingFighter = { ...endTurn(initialState), fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val result = resolveGoblinAttack(concentratingFighter, 20, 18, 5, false)
    all {
      assert(result.fighter.hp == 5),
      assert(not(result.fighter.concentrating)),
      assert(result.fighter.activeEffects == Set()),
    }
  }

}
