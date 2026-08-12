// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeTriggeredReactionResolution {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeCommandMovementNextTurn.* from "./battle-runtime-command-movement-next-turn"
  import battleRuntimeAttackDamageConcentrationReaction.* from "./battle-runtime-attack-damage-concentration-reaction"
  import battleRuntimeOpportunityAttack.* from "./battle-runtime-opportunity-attack"

  pure def resumeNonSpellReactionContinuation(
    state: BattleState,
    continuation: ReactionContinuation,
  ): BattleState =
    match continuation {
      | ResumeAttack(_) =>
          resumeAttackDamageReactionContinuation(state, continuation)
      | ResumeSaveGateDamage =>
          resolveAcidSplash(state, false, true, 4, true, true)
      | ResumeAfterDamage => state
      | ResumeHellishRebukeAfterDamage(_) => state
      | ResumeMovement(movement) =>
          applyFighterMovementWithSpeedKind(
            state,
            movement.speedKind,
            movement.movementCost,
          )
      | ResumeCommandFleeMovement(movement) =>
          followCommandFlee(
            state,
            movement.speedKind,
            movement.movementCost,
            false,
          )
      | ResumeDissonantWhispersMovementThenAfterDamage(_) =>
          openDissonantWhispersAfterDamageSequence(state)
      // Shield-family continuations are owned by typed Shield resolvers; an
      // unjoined continuation stays unchanged in this generic lane.
      | _ => state
    }

  pure def declineNonSpellReactionOfferAndResume(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            if (
              frame.trigger == SpellCast or
                reactionProcedureRequiresSpellSlot(frame.procedure)
            )
              state
            else
              {
                val afterDecision = stateAfterDecliningReactionOffer(state, reactor)
                if (reactionDecisionClosedFrame(state, afterDecision))
                  resumeNonSpellReactionContinuation(
                    afterDecision,
                    frame.continuation,
                  )
                else
                  afterDecision
              }
          }
        | _ => state
      }
    }

  pure def resolveNonSpellReactionOffer(
    state: BattleState,
    reactor: Actor,
  ): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match state.interruptStack[state.interruptStack.length() - 1] {
        | PendingReaction(frame) =>
            if (
              frame.trigger == SpellCast or
                reactionProcedureRequiresSpellSlot(frame.procedure)
            )
              state
            else {
              val decision = battleRuntimeTakeReactionDecision(
                battleRuntimeReactionTrigger(frame.trigger),
                battleRuntimeReactionProcedure(frame.procedure),
                frame.eligibleReactors.contains(reactor),
                frame.offeredReactors.contains(reactor),
                reactorCanReact(state, reactor),
                true,
                reactionFrameCompleteAfterOffering(frame, reactor),
              )
              match decision {
                | BattleRuntimeTookReaction(_) => {
                    val afterReactionSpend = spendReaction(state, reactor)
                    val afterReactionProcedure =
                      match frame.trigger {
                        | OpportunityAttack =>
                            resolveGoblinOpportunityAttack(
                              afterReactionSpend,
                              20,
                              18,
                              4,
                              true,
                            )
                        | AttackHit =>
                            if (
                              frame.procedure ==
                                ReadiedSpellReleaseReactionProcedure
                            )
                              releaseFighterReadiedSpell(afterReactionSpend)
                            else
                              afterReactionSpend
                        | _ => afterReactionSpend
                      }
                    val afterDecision = stateAfterDecliningReactionOffer(
                      afterReactionProcedure,
                      reactor,
                    )
                    if (reactionDecisionClosedFrame(state, afterDecision))
                      resumeNonSpellReactionContinuation(
                        afterDecision,
                        frame.continuation,
                      )
                    else
                      afterDecision
                  }
                | _ => state
              }
            }
        | _ => state
      }
    }

}
