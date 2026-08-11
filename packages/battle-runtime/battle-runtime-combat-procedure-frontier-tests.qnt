// -*- mode: Bluespec; -*-

module battleRuntimeCombatProcedureFrontierTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeCombatHoles.* from "./battle-runtime-combat-holes"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeLegendaryActions.* from "./battle-runtime-legendary-actions"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"


  run test_initial_holes_cover_attack_target = {
    assert(combatOpenHoles(initialState).contains(TargetChoice))
  }

  run test_attack_replay_asks_for_attack_roll_after_target = {
    assert(combatAttackReplayHoles(initialState, AttackNeedsAttackRoll) == Set(AttackRoll))
  }

  run test_attack_replay_asks_for_damage_roll_after_hit = {
    assert(combatAttackReplayHoles(initialState, AttackRollFilled({ attackTotal: 15, naturalD20: 10 })) == Set(DamageRoll))
  }

  run test_goblin_turn_opens_stat_block_attack_target_hole = {
    assert(combatOpenHoles(endTurn(initialState)).contains(TargetChoice))
  }

  run test_goblin_turn_opens_stat_block_recharge_hole_before_attack = {
    val spentRecharge = { ...initialState, goblin: { ...initialState.goblin, rechargeAvailable: false } }
    assert(combatOpenHoles(endTurn(spentRecharge)) == Set(StatBlockRechargeRoll))
  }

  run test_legendary_action_window_excludes_initial_and_own_turn = {
    val goblinTurn = endTurn(initialState)
    all {
      assert(not(goblinLegendaryActionAvailable(initialState))),
      assert(not(goblinLegendaryActionAvailable(goblinTurn))),
    }
  }

  run test_legendary_action_window_after_another_non_current_turn = {
    val afterFighterTurnWithThirdActor = endTurn({
      ...initialState,
      initiative: { round: 1, alreadyActed: [], stillToAct: { actor: Fighter, waiting: [Fighter, Goblin] } },
    })
    val spent = spendGoblinLegendaryAction(afterFighterTurnWithThirdActor)
    all {
      assert(goblinLegendaryActionAvailable(afterFighterTurnWithThirdActor)),
      assert(spent.goblin.legendaryUsesRemaining == 1),
      assert(not(goblinLegendaryActionAvailable(spent))),
    }
  }

  run test_caller_ordered_initiative_tie_selects_first_supplied_actor = {
    all {
      assert(currentActor(callerOrderedTieInitialState) == Goblin),
      assert(
        initiativeStillToActActors(endTurn(endTurn(callerOrderedTieInitialState)).initiative) == [Goblin, Fighter]
      ),
    }
  }

  run test_goblin_attack_replay_uses_fighter_armor_class = {
    assert(combatAttackReplayHoles(endTurn(initialState), AttackRollFilled({ attackTotal: 19, naturalD20: 10 })) == Set(DamageRoll))
  }

}
