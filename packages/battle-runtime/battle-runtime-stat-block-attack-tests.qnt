// -*- mode: Bluespec; -*-

module battleRuntimeStatBlockAttackTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"


  run test_stat_block_multiattack_spends_one_attack_action_and_grants_dispatches = {
    val goblinTurn = endTurn(initialState)
    val multiattack = resolveGoblinMultiattack(goblinTurn)
    val recursive = resolveGoblinMultiattack(multiattack)
    val firstDispatch = resolveGoblinMultiattackDispatch(multiattack, 1, 1, 0, true)
    val secondDispatch = resolveGoblinMultiattackDispatch(firstDispatch, 1, 1, 0, true)
    val thirdDispatch = resolveGoblinMultiattackDispatch(secondDispatch, 1, 1, 0, true)
    val ended = endTurn(multiattack)
    all {
      assert(not(multiattack.actionAvailable)),
      assert(multiattack.goblin.multiattackDispatchesRemaining == 3),
      assert(goblinMultiattackDispatchContinuationOpen(multiattack)),
      assert(recursive.goblin.multiattackDispatchesRemaining == 3),
      assert(firstDispatch.goblin.multiattackDispatchesRemaining == 2),
      assert(secondDispatch.goblin.multiattackDispatchesRemaining == 1),
      assert(thirdDispatch.goblin.multiattackDispatchesRemaining == 0),
      assert(not(goblinMultiattackDispatchContinuationOpen(thirdDispatch))),
      assert(ended.goblin.multiattackDispatchesRemaining == 0),
    }
  }

  run test_goblin_attack_hit_applies_stat_block_damage_to_fighter = {
    val result = resolveGoblinAttack(endTurn(initialState), 20, 18, 5, true)
    all {
      assert(result.actionAvailable == false),
      assert(result.fighter.hp == 5),
    }
  }
}
