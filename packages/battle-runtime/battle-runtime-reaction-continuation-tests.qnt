// -*- mode: Bluespec; -*-

module battleRuntimeReactionContinuationTests {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionKinds.* from "./battle-runtime-reaction-kinds"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTriggeredReactionResolution.* from "./battle-runtime-triggered-reaction-resolution"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeOpportunityAttack.* from "./battle-runtime-opportunity-attack"

  run test_reaction_continuations_have_battle_runtime_contract_kinds = {
    all {
      assert(reactionContinuationKind(ResumeAttack({ damage: 7 })) == BattleRuntimeAttackDamageContinuation),
      assert(reactionContinuationKind(ResumeRayOfFrost) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumePoisonSpray) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeChillTouch) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeTrueStrikeWeaponAttack) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeProduceFlameHurl) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeFlameBladeAttack) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeIceKnife) == BattleRuntimeSpellAttackContinuation),
      assert(reactionContinuationKind(ResumeSaveGateDamage) == BattleRuntimeSaveGateContinuation),
      assert(reactionContinuationKind(ResumeAfterDamage) == BattleRuntimeAfterDamageContinuation),
      assert(reactionContinuationKind(ResumeHellishRebukeAfterDamage({ damager: Goblin, damaged: Fighter, slotLevel: 1 })) == BattleRuntimeAfterDamageContinuation),
      assert(reactionContinuationKind(ResumeMovement({ speedKind: WalkSpeedKind, movementCost: 5 })) == BattleRuntimeMovementContinuation),
      assert(reactionContinuationKind(ResumeDissonantWhispersMovementThenAfterDamage({ speedKind: WalkSpeedKind, movementCost: 5 })) == BattleRuntimeMovementContinuation),
    }
  }

  run test_reaction_decision_contract_rejects_unavailable_reaction = {
    val awaiting = moveFighter({ ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }, 5, 10 > 5)
    all {
      assert(resolveNonSpellReactionOffer(awaiting, Goblin) == awaiting),
      assert(declineNonSpellReactionOfferAndResume(awaiting, Goblin).fighter.movementSpent == 5),
    }
  }

  run test_unsupported_shield_continuation_is_rejected_without_reaction_spend = {
    val awaiting = openReactionWindow(initialState, {
      trigger: AttackHit,
      procedure: ShieldReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAfterDamage,
    })
    val resolved = resolveNonSpellReactionOffer(awaiting, Fighter)
    val declined = declineNonSpellReactionOfferAndResume(awaiting, Fighter)
    all {
      assert(resolved == awaiting),
      assert(declined == awaiting),
      assert(resolved.fighter.reactionAvailable),
    }
  }

  run test_after_damage_reaction_resolves_through_damage_interruption_contract = {
    val awaitingReaction = openReactionWindow(initialState, {
      trigger: AfterDamage,
      procedure: DamageInterruptionReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAfterDamage,
    })
    val resolved = resolveNonSpellReactionOffer(awaitingReaction, Fighter)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
    }
  }

  run test_declined_opportunity_attack_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    val resumed = declineNonSpellReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.fighter.movementSpent == 5),
      assert(resumed.goblin.reactionAvailable),
    }
  }

  run test_resolved_opportunity_attack_spends_reaction_damages_then_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, 10 > 5)
    val resolved = resolveNonSpellReactionOffer(awaiting, Goblin)
    all {
      assert(resolved.interruptStack == []),
      assert(resolved.goblin.reactionAvailable == false),
      assert(resolved.fighter.hp == 6),
      assert(resolved.fighter.movementSpent == 5),
    }
  }

  run test_goblin_opportunity_attack_can_knock_out = {
    val result = resolveGoblinOpportunityAttackWithDisposition(withFighterHp(initialState, 3, 0), 20, 18, 1, true, KnockOut)
    all {
      assert(result.fighter.hp == 1),
      assert(result.fighter.unconscious),
    }
  }

  run test_resolved_reaction_releases_readied_spell_and_resumes_attack_continuation = {
    val readied = { ...readyFighterReadiedSpell(initialState), actionAvailable: true }
    val awaitingReaction = openReactionWindow(readied, {
      trigger: AttackHit,
      procedure: ReadiedSpellReleaseReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAttack({ damage: 7 }),
    })
    val resolved = resolveNonSpellReactionOffer(awaitingReaction, Fighter)
    all {
      assert(not(resolved.fighter.readiedSpellHeld)),
      assert(not(resolved.fighter.concentrating)),
      assert(not(resolved.fighter.reactionAvailable)),
      assert(resolved.goblin.hp == 3),
      assert(not(resolved.actionAvailable)),
      assert(resolved.interruptStack == []),
    }
  }

}
