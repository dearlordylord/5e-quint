// -*- mode: Bluespec; -*-

module battleRuntimeReactionContinuationTests {
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
    val awaiting = moveFighter(
      { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } },
      5,
      movementProvokesOpportunityAttack,
    )
    all {
      assert(resolveTriggeredReactionOffer(awaiting, Goblin) == awaiting),
      assert(declineTriggeredReactionOfferAndResume(awaiting, Goblin).fighter.movementSpent == 5),
    }
  }

  run test_unsupported_shield_continuation_is_rejected_without_reaction_spend = {
    // The former Shield + after-damage continuation frame is now
    // unconstructable. A valid Shield request remains unsupported by this
    // generic triggered-reaction owner and must be left to its narrowed owner.
    val awaiting = openReactionWindow(initialState, {
      request: AttackHitShieldReactionRequest({
        eligibleReactors: Set(Fighter),
        continuation: ShieldResumesRayOfFrost,
      }),
      offeredReactors: Set(),
    })
    val resolved = resolveTriggeredReactionOffer(awaiting, Fighter)
    val declined = declineTriggeredReactionOfferAndResume(awaiting, Fighter)
    all {
      assert(resolved == awaiting),
      assert(declined == awaiting),
      assert(resolved.fighter.reactionAvailable),
    }
  }

  run test_after_damage_reaction_resolves_through_damage_interruption_contract = {
    val awaitingReaction = openReactionWindow(initialState, {
      request: AfterDamageInterruptionReactionRequest({
        damageSource: Goblin,
        damaged: Fighter,
        eligibleReactors: Set(Fighter),
      }),
      offeredReactors: Set(),
    })
    val resolved = resolveTriggeredReactionOffer(awaitingReaction, Fighter)
    all {
      assert(resolved.interruptStack == []),
      assert(not(resolved.fighter.reactionAvailable)),
    }
  }

  run test_declined_opportunity_attack_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, movementProvokesOpportunityAttack)
    val resumed = declineTriggeredReactionOfferAndResume(awaiting, Goblin)
    all {
      assert(resumed.interruptStack == []),
      assert(resumed.fighter.movementSpent == 5),
      assert(resumed.goblin.reactionAvailable),
    }
  }

  run test_resolved_opportunity_attack_spends_reaction_damages_then_resumes_movement = {
    val awaiting = moveFighter(initialState, 5, movementProvokesOpportunityAttack)
    val resolved = resolveTriggeredReactionOffer(awaiting, Goblin)
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
      request: AttackHitReadiedSpellReleaseReactionRequest({
        eligibleReactors: Set(Fighter),
        damage: 7,
      }),
      offeredReactors: Set(),
    })
    val resolved = resolveTriggeredReactionOffer(awaitingReaction, Fighter)
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
