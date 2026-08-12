// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeTriggeredReactionResolution {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeCommandMovementNextTurn.* from "./battle-runtime-command-movement-next-turn"
  import battleRuntimeAttackDamageConcentrationReaction.* from "./battle-runtime-attack-damage-concentration-reaction"
  import battleRuntimeOpportunityAttack.* from "./battle-runtime-opportunity-attack"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  pure def resumeOpportunityAttackReactionContinuation(
    state: BattleState,
    request: OpportunityAttackReactionRequestData,
  ): BattleState =
    match request.continuation {
      | OpportunityAttackResumesMovement(movement) =>
          applyActorMovementWithSpeedKind(
            state,
            request.mover,
            movement.speedKind,
            movement.movementCost,
          )
      | OpportunityAttackResumesCommandFleeMovement(movement) =>
          if (currentActor(state) == request.mover)
            followCommandFlee(
              state,
              movement.speedKind,
              movement.movementCost,
              false,
            )
          else
            state
      | OpportunityAttackResumesDissonantWhispersMovementThenAfterDamage(movement) =>
          if (request.mover == Goblin and movement.damageSource != request.mover) {
            // The frame records the already-validated Reaction movement fill.
            // Spatial displacement remains table/runtime state in this slice,
            // and its completion spends neither turn movement nor a phantom
            // second Reaction after Dissonant Whispers damage.
            state
          }
          else
            state
    }

  pure def declineOpportunityAttackReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
    request: OpportunityAttackReactionRequestData,
  ): BattleState = {
    val afterDecision = stateAfterDecliningReactionOffer(state, reactor)
    if (not(reactionDecisionClosedFrame(state, afterDecision)))
      afterDecision
    else
      resumeOpportunityAttackReactionContinuation(afterDecision, request)
  }

  pure def declineReadiedSpellReleaseReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
    damage: int,
  ): BattleState = {
    val afterDecision = stateAfterDecliningReactionOffer(state, reactor)
    if (not(reactionDecisionClosedFrame(state, afterDecision)))
      afterDecision
    else
      resumeAttackDamageReactionContinuation(
        afterDecision,
        damage,
      )
  }

  // Shield, Counterspell, and Hellish Rebuke have narrowed resolution owners.
  // This dispatcher deliberately owns only Opportunity Attack and the
  // Fighter's readied-spell release branches below.
  pure def declineTriggeredReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) =>
            match frame.request {
              | AttackHitShieldReactionRequest(_) => state
              | SpellCastCounterspellReactionRequest(_) => state
              | AfterDamageHellishRebukeReactionRequest(_) => state
              | OpportunityAttackReactionRequest(request) =>
                  declineOpportunityAttackReactionOfferAndResume(
                    state,
                    reactor,
                    request,
                  )
              | AttackHitFighterReadiedSpellReleaseReactionRequest(request) =>
                  declineReadiedSpellReleaseReactionOfferAndResume(
                    state,
                    reactor,
                    request.damage,
                  )
            }
        | _ => state
      }
    }

  pure def resolveTriggeredReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) => {
            match frame.request {
              | AttackHitShieldReactionRequest(_) => state
              | SpellCastCounterspellReactionRequest(_) => state
              | AfterDamageHellishRebukeReactionRequest(_) => state
              | OpportunityAttackReactionRequest(request) => {
                  val decision = battleRuntimeTakeReactionDecision(
                    battleRuntimeReactionTrigger(OpportunityAttack),
                    BattleRuntimeOpportunityAttackProcedure,
                    reactor != request.mover and reactionFrameCanOffer(frame, reactor),
                    frame.offeredReactors.contains(reactor),
                    reactorCanReact(state, reactor),
                    true,
                    reactionFrameCompleteAfterOffering(frame, reactor),
                  )
                  match decision {
                    | BattleRuntimeTookReaction(_) => {
                        val afterReactionSpend = spendReaction(state, reactor)
                        val afterReactionProcedure = resolveOpportunityAttack(
                          afterReactionSpend,
                          reactor,
                          request.mover,
                          20,
                          18,
                          4,
                          true,
                        )
                        val afterDecision = stateAfterDecliningReactionOffer(
                          afterReactionProcedure,
                          reactor,
                        )
                        if (reactionDecisionClosedFrame(state, afterDecision))
                          resumeOpportunityAttackReactionContinuation(
                            afterDecision,
                            request,
                          )
                        else
                          afterDecision
                      }
                    | _ => state
                  }
                }
              | AttackHitFighterReadiedSpellReleaseReactionRequest(request) => {
                  val decision = battleRuntimeTakeReactionDecision(
                    battleRuntimeReactionTrigger(AttackHit),
                    BattleRuntimeReadiedSpellReleaseProcedure,
                    reactor == Fighter and reactionFrameCanOffer(frame, reactor),
                    frame.offeredReactors.contains(reactor),
                    reactorCanReact(state, reactor),
                    fighterCanReleaseReadiedSpell(state),
                    reactionFrameCompleteAfterOffering(frame, reactor),
                  )
                  match decision {
                    | BattleRuntimeTookReaction(_) => {
                        val afterProcedure = releaseFighterReadiedSpell(
                          spendReaction(state, reactor),
                        )
                        val afterDecision = stateAfterDecliningReactionOffer(
                          afterProcedure,
                          reactor,
                        )
                        if (reactionDecisionClosedFrame(state, afterDecision))
                          resumeAttackDamageReactionContinuation(
                            afterDecision,
                            request.damage,
                          )
                        else
                          afterDecision
                      }
                    | _ => state
                  }
                }
            }
          }
        | _ => state
      }
    }

}
