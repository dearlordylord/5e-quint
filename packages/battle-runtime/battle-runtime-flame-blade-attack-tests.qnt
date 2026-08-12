// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-spell-created-held-object

module battleRuntimeFlameBladeAttackTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeLightSpellLifecycle.* from "./battle-runtime-light-spell-lifecycle"
  import battleRuntimeLightSpellAttacks.* from "./battle-runtime-light-spell-attacks"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_flame_blade_attack_uses_magic_action_without_second_slot_or_cleanup = {
    val blade = resolveFlameBlade(initialState, 2, 3)
    val nextTurn = {
      ...endTurn(endTurn(blade)),
      goblin: { ...blade.goblin, reactionAvailable: false },
    }
    val unheld = releaseFlameBlade(nextTurn)
    val blocked = resolveFlameBladeAttack(unheld, 15, 10, 6, true)
    val hit = resolveFlameBladeAttack(nextTurn, 15, 10, 6, true)
    all {
      assert(blocked == unheld),
      assert(hit.goblin.hp == 1),
      assert(not(hit.actionAvailable)),
      assert(not(battleActorHasSpellSlotUse(hit, Fighter))),
      assert(activeEffectsContainHeldFlameBlade(hit.fighter.activeEffects)),
      assert(battleRuntimeLightEmitters(hit).contains(flameBladeHeldLightEmitter)),
    }
  }

  run test_flame_blade_attack_hit_reaction_window_keeps_held_blade = {
    val blade = resolveFlameBlade(initialState, 2, 3)
    val nextTurn = endTurn(endTurn(blade))
    val awaiting = resolveFlameBladeAttack(nextTurn, 15, 10, 6, true)
    all {
      assert(awaiting.interruptStack.length() == 1),
      assert(pendingReactionFrame(awaiting.interruptStack[0]) == HasPendingReactionFrame({
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeFlameBladeAttack,
      })),
      assert(activeEffectsContainHeldFlameBlade(awaiting.fighter.activeEffects)),
      assert(battleRuntimeLightEmitters(awaiting).contains(flameBladeHeldLightEmitter)),
    }
  }
}
