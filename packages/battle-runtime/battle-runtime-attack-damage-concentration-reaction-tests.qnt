// -*- mode: Bluespec; -*-

module battleRuntimeAttackDamageConcentrationReactionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeAttackDamageConcentrationReaction.* from "./battle-runtime-attack-damage-concentration-reaction"


  run test_attack_damage_concentration_interrupt_resolves_before_damage = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val pending = resumeAttackDamageReactionContinuation(concentratingGoblin, ResumeAttack({ damage: 4 }))
    val resolved = resolveBattleAttackDamageConcentration(pending, false)
    all {
      assert(pending.interruptStack.length() == 1),
      assert(pendingReactionFrame(pending.interruptStack[0]) == NoPendingReactionFrame),
      assert(pending.goblin.hp == 10),
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 6),
      assert(not(resolved.goblin.concentrating)),
    }
  }

  run test_zero_damage_reaction_attack_continuation_does_not_open_concentration_interrupt = {
    val concentratingGoblin = { ...initialState, goblin: { ...initialState.goblin, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val resolved = resumeAttackDamageReactionContinuation(concentratingGoblin, ResumeAttack({ damage: 0 }))
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.hp == 10),
      assert(resolved.goblin.concentrating),
    }
  }
}
