module battleTraversalTest::Impl {
  import battle.* from "./battle"
  import creature.* from "./creature"

  run test_pStartTraversalMovement_spends_bonus_action_movement_and_recharge = {
    val mover = mkMonster(20, NULL_STAT_BLOCK)
      .with("turn", FRESH_TURN.with("movementRemaining", 30).with("effectiveSpeed", 30))
      .with("monsterResources", EMPTY_MONSTER_RESOURCES
        .with("rechargeAvailable", Map("tramplingCharge" -> true)))
    val traversal: TraversalMovementCtx = {
      mover: "C",
      abilityId: "tramplingCharge",
      actionCost: TACostBonusAction,
      resourceKind: TRRecharge,
      save: {
        saveDC: 14,
        damageOnFail: 7,
        halfOnSuccess: false,
        damageType: Bludgeoning,
        conditionOnFail: CProne,
        applyCondition: true,
        saveAbility: Str,
        conditionDurationOnFail: NO_SAVE_FAILURE_CONDITION_DURATION,
        failureBandCondition: NO_SAVE_FAILURE_BAND_CONDITION,
      },
      remaining: [{ targetId: "A", saveRoll: 4, saveRollB: 4 }],
    }
    val started = pStartTraversalMovement(Map("C" -> mover), "C", traversal, 15)
    val updatedMover = started.creatures.get("C")
    all {
      assert(updatedMover.turn.movementRemaining == 15),
      assert(updatedMover.turn.bonusActionUsed),
      assert(not(updatedMover.monsterResources.rechargeAvailable.get("tramplingCharge"))),
      assert(started.phase == BPResolvingTraversal(traversal)),
    }
  }

  run test_pStartTraversalMovement_spends_action_and_daily_use = {
    val mover = mkMonster(20, NULL_STAT_BLOCK)
      .with("turn", FRESH_TURN.with("actionsRemaining", 1).with("movementRemaining", 30).with("effectiveSpeed", 30))
      .with("monsterResources", EMPTY_MONSTER_RESOURCES
        .with("dailyUsesRemaining", Map("trample" -> 2)))
    val traversal: TraversalMovementCtx = {
      mover: "C",
      abilityId: "trample",
      actionCost: TACostAction,
      resourceKind: TRDaily,
      save: {
        saveDC: 14,
        damageOnFail: 7,
        halfOnSuccess: false,
        damageType: Bludgeoning,
        conditionOnFail: CProne,
        applyCondition: true,
        saveAbility: Str,
        conditionDurationOnFail: NO_SAVE_FAILURE_CONDITION_DURATION,
        failureBandCondition: NO_SAVE_FAILURE_BAND_CONDITION,
      },
      remaining: List(),
    }
    val started = pStartTraversalMovement(Map("C" -> mover), "C", traversal, 10)
    val updatedMover = started.creatures.get("C")
    all {
      assert(updatedMover.turn.actionsRemaining == 0),
      assert(updatedMover.turn.movementRemaining == 20),
      assert(updatedMover.monsterResources.dailyUsesRemaining.get("trample") == 1),
      assert(started.phase == BPActiveTurn),
    }
  }

  run test_saveFailedReturnTo_traversalContinuation = {
    val traversal: TraversalMovementCtx = {
      mover: "C",
      abilityId: "tramplingCharge",
      actionCost: TACostBonusAction,
      resourceKind: TRRecharge,
      save: {
        saveDC: 14,
        damageOnFail: 7,
        halfOnSuccess: false,
        damageType: Bludgeoning,
        conditionOnFail: CProne,
        applyCondition: true,
        saveAbility: Str,
        conditionDurationOnFail: NO_SAVE_FAILURE_CONDITION_DURATION,
        failureBandCondition: NO_SAVE_FAILURE_BAND_CONDITION,
      },
      remaining: [{ targetId: "B", saveRoll: 4, saveRollB: 4 }],
    }
    val sf = mkSaveFailedCtx(
      "C", "A",
      7, false, Bludgeoning,
      CProne, true,
      13,
      NO_SAVE_FAILURE_CONDITION_DURATION,
      NO_SAVE_FAILURE_BAND_CONDITION
    )
    assert(
      saveFailedReturnTo(PISaveFailedTraversal({ sf: sf, traversal: traversal })) ==
      ADRResolvingTraversal(traversal)
    )
  }
}
