// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-hellish-rebuke

module battleRuntimeTriggeredReactionResolution {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSaveGatedDamageTarget.* from "./battle-runtime-save-gated-damage-target"
  import battleRuntimeSaveGatedDamageResolution.* from "./battle-runtime-save-gated-damage-resolution"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeCommandMovementNextTurn.* from "./battle-runtime-command-movement-next-turn"
  import battleRuntimeAttackDamageConcentrationReaction.* from "./battle-runtime-attack-damage-concentration-reaction"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

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

  pure def resolveHellishRebukeAfterDamage(
    state: BattleState,
    continuation: HellishRebukeAfterDamageContinuation,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      continuation.damaged == continuation.damager or
      continuation.slotLevel < 1 or
      not(reactorCanReact(state, continuation.damaged)) or
      not(canActorExpendSpellSlotThisTurn(state, continuation.damaged))
    )
      state
    else {
      val afterReactionSpend = spendReaction(state, continuation.damaged)
      val damagedTarget = match continuation.damager {
        | Fighter => {
            ...afterReactionSpend,
            fighter: saveGatedDamageTarget(
              HellishRebukeSaveGate,
              afterReactionSpend.fighter,
              savingThrowSucceeded,
              damageRoll,
              concentrationSaveSucceeded,
              continuation.damaged,
            ),
          }
        | Goblin => {
            ...afterReactionSpend,
            goblin: saveGatedDamageTarget(
              HellishRebukeSaveGate,
              afterReactionSpend.goblin,
              savingThrowSucceeded,
              damageRoll,
              concentrationSaveSucceeded,
              continuation.damaged,
            ),
          }
      }
      commitActorSpellSlotUse(damagedTarget, continuation.damaged)
    }
}
