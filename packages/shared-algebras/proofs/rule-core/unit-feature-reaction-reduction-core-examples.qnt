// -*- mode: Bluespec; -*-

module unitFeatureReactionReductionCoreExamples {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import unitFeatureReactionReductionCore.* from "./unit-feature-reaction-reduction-core"

  run test_cutting_words_spends_reaction_and_bardic_pool_for_damage_reduction = {
    val result = resolveCuttingWordsDamageReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      {
        trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
        damageRoll: 9,
        bardicDieRoll: 4,
      }
    )
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.pool.usesRemaining == 2),
      assert(result.reducedAmount == 5),
    }
  }

  run test_cutting_words_roll_reduction_can_turn_success_into_failure = {
    val facts = {
      trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
      kind: CuttingWordsAttackRollReduction,
      originalTotal: 17,
      dc: 15,
      bardicDieRoll: 3,
    }
    val result = resolveCuttingWordsRollReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      facts
    )
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.pool.usesRemaining == 2),
      assert(result.reducedAmount == 14),
      assert(cuttingWordsRollTotalAfterReduction(facts) == 14),
      assert(cuttingWordsTurnsSuccessIntoFailure(facts)),
    }
  }

  run test_cutting_words_ability_check_reduction_can_leave_success_intact = {
    val facts = {
      trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
      kind: CuttingWordsAbilityCheckReduction,
      originalTotal: 18,
      dc: 15,
      bardicDieRoll: 2,
    }
    val result = resolveCuttingWordsRollReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      facts
    )
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.pool.usesRemaining == 2),
      assert(result.reducedAmount == 16),
      assert(not(cuttingWordsTurnsSuccessIntoFailure(facts))),
    }
  }

  run test_cutting_words_requires_seen_in_range_trigger_and_prior_success = {
    val unseenDamage = resolveCuttingWordsDamageReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      {
        trigger: { creatureSeen: false, creatureWithinSixtyFeet: true },
        damageRoll: 9,
        bardicDieRoll: 4,
      }
    )
    val outOfRangeDamage = resolveCuttingWordsDamageReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      {
        trigger: { creatureSeen: true, creatureWithinSixtyFeet: false },
        damageRoll: 9,
        bardicDieRoll: 4,
      }
    )
    val failedRoll = resolveCuttingWordsRollReaction(
      initialTurnProcedureState,
      { usesRemaining: 3, maximumUses: 3 },
      {
        trigger: { creatureSeen: true, creatureWithinSixtyFeet: true },
        kind: CuttingWordsAbilityCheckReduction,
        originalTotal: 12,
        dc: 15,
        bardicDieRoll: 4,
      }
    )
    all {
      assert(unseenDamage.turn.reactionAvailable),
      assert(unseenDamage.pool.usesRemaining == 3),
      assert(unseenDamage.reducedAmount == 9),
      assert(outOfRangeDamage.turn.reactionAvailable),
      assert(outOfRangeDamage.pool.usesRemaining == 3),
      assert(outOfRangeDamage.reducedAmount == 9),
      assert(failedRoll.turn.reactionAvailable),
      assert(failedRoll.pool.usesRemaining == 3),
      assert(failedRoll.reducedAmount == 12),
    }
  }

  run test_uncanny_dodge_spends_reaction_and_halves_visible_attack_damage = {
    val result = resolveUncannyDodgeReaction(
      initialTurnProcedureState,
      {
        attackerSeen: true,
        hitWithAttackRoll: true,
        incomingDamage: 9,
      }
    )
    all {
      assert(not(result.turn.reactionAvailable)),
      assert(result.reducedAmount == 4),
    }
  }

  run test_deflect_attacks_zero_damage_redirect_spends_focus_and_deals_failed_save_damage = {
    val reduction = resolveDeflectAttacksReductionReaction(
      initialTurnProcedureState,
      {
        incomingDamage: 8,
        damageIncludesBludgeoningPiercingOrSlashing: true,
        deflectRoll: 5,
        dexterityModifier: 0,
        monkLevel: 3,
      }
    )
    val redirect = resolveDeflectAttacksZeroDamageRedirect(
      { usesRemaining: 3, maximumUses: 3 },
      reduction.reducedAmount,
      {
        target: {
          targetSeen: true,
          attackWasMelee: true,
          targetWithinFiveFeet: true,
          targetWithinSixtyFeet: false,
          targetBehindTotalCover: true,
        },
        savingThrowSucceeded: false,
        firstMartialArtsRoll: 5,
        secondMartialArtsRoll: 5,
        dexterityModifier: 0,
      }
    )
    all {
      assert(not(reduction.turn.reactionAvailable)),
      assert(reduction.reducedAmount == 0),
      assert(redirect.pool.usesRemaining == 2),
      assert(redirect.redirectedDamage == 10),
    }
  }

  run test_deflect_attacks_ranged_redirect_requires_no_total_cover = {
    val blocked = resolveDeflectAttacksZeroDamageRedirect(
      { usesRemaining: 3, maximumUses: 3 },
      0,
      {
        target: {
          targetSeen: true,
          attackWasMelee: false,
          targetWithinFiveFeet: false,
          targetWithinSixtyFeet: true,
          targetBehindTotalCover: true,
        },
        savingThrowSucceeded: false,
        firstMartialArtsRoll: 5,
        secondMartialArtsRoll: 5,
        dexterityModifier: 0,
      }
    )
    all {
      assert(blocked.pool.usesRemaining == 3),
      assert(blocked.redirectedDamage == 0),
    }
  }
}
