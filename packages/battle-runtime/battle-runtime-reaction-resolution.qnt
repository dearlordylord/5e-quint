// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-counterspell spell.reaction-hellish-rebuke

module battleRuntimeReactionResolution {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSaveGatedSpell.* from "./battle-runtime-save-gated-spell"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeGroundCommand.* from "./battle-runtime-ground-command"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"

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

  pure def declineBattleReaction(state: BattleState, reactor: Actor): BattleState =
    stateAfterDecliningReactionOffer(state, reactor)

  pure def declineReactionOfferAndResume(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            val afterDecision = declineBattleReaction(state, reactor)
            if (reactionDecisionClosedFrame(state, afterDecision))
              resumeBattleReactionContinuation(afterDecision, frame.continuation)
            else
              afterDecision
          }
        | _ => state
      }
    }

  pure def stateAfterResumingSpellCastReactionResolution(
    state: BattleState,
    frame: PendingReactionFrame,
  ): BattleState =
    match frame.procedure {
      | CounterspellReactionProcedure(counterspell) =>
          if (
            frame.trigger == SpellCast and
              counterspell.triggeringSpellUsesSlot and
              (not(pendingCounterspellTakesEffect(counterspell)) or
                not(pendingCounterspellEndsTriggeringSpell(counterspell)))
          )
            commitActorSpellSlotUse(state, counterspell.triggeringCaster)
          else
            state
      | _ => state
    }

  pure def resolveReactionOffer(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      match (state.interruptStack[state.interruptStack.length() - 1]) {
        | PendingReaction(frame) => {
            val decision = battleRuntimeTakeReactionDecision(
              battleRuntimeReactionTrigger(frame.trigger),
              battleRuntimeReactionProcedure(frame.procedure),
              frame.eligibleReactors.contains(reactor),
              frame.offeredReactors.contains(reactor),
              reactorCanReact(state, reactor),
              not(reactionProcedureRequiresSpellSlot(frame.procedure)) or
                canActorExpendSpellSlotThisTurn(state, reactor),
              reactionFrameCompleteAfterOffering(frame, reactor),
            )
            match (decision) {
              | BattleRuntimeTookReaction(_) => {
                  val afterReactionSpend = spendReaction(state, reactor)
                  val afterReactionProcedure =
                    match frame.trigger {
                      | OpportunityAttack => resolveGoblinOpportunityAttack(afterReactionSpend, 20, 18, 4, true)
                      | AttackHit => if (frame.procedure == ReadiedSpellReleaseReactionProcedure) releaseFighterReadiedSpell(afterReactionSpend) else castShieldReactionSpell(afterReactionSpend, reactor)
                      | SpellCast =>
                          match frame.procedure {
                            | ShieldReactionProcedure => castShieldReactionSpell(afterReactionSpend, reactor)
                            | CounterspellReactionProcedure(_) => castCounterspellReactionSpell(afterReactionSpend, reactor, frame)
                            | _ => afterReactionSpend
                          }
                      | _ => releaseFighterReadiedSpell(afterReactionSpend)
                    }
                  val spellCastEnded =
                    reactionProcedureEndsSpellCastInState(afterReactionSpend, reactor, frame.procedure)
                  val closedStack = afterReactionProcedure.interruptStack.slice(0, afterReactionProcedure.interruptStack.length() - 1)
                  val afterDecision =
                    if (spellCastEnded)
                      { ...afterReactionProcedure, interruptStack: closedStack }
                    else
                      declineBattleReaction(afterReactionProcedure, reactor)
                  if (
                    reactionDecisionClosedFrame(state, afterDecision)
                      and not(spellCastEnded)
                  ) {
                    val resumed = resumeBattleReactionContinuation(afterDecision, frame.continuation)
                    stateAfterResumingSpellCastReactionResolution(resumed, frame)
                  }
                  else
                    afterDecision
                }
              | _ => state
            }
          }
        | _ => state
      }
    }

  pure def openBattleAttackDamageConcentration(
    state: BattleState,
    continuation: AttackDamageConcentrationContinuation,
    damage: int,
  ): BattleState =
    { ...state, interruptStack: state.interruptStack.append(PendingAttackDamageConcentration({ continuation: continuation, damage: damage })) }

  pure def resolveBattleAttackDamageConcentration(state: BattleState, concentrationSaveSucceeded: bool): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingAttackDamageConcentration(frame) => {
            val rest = { ...state, interruptStack: state.interruptStack.slice(0, state.interruptStack.length() - 1) }
            match frame.continuation {
              | ResumeAttackDamageToGoblin => { ...rest, goblin: applyDamageFromSource(rest.goblin, frame.damage, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter), actionAvailable: false }
            }
          }
        | _ => state
      }
    }

  pure def resumeBattleReactionContinuation(state: BattleState, continuation: ReactionContinuation): BattleState =
    match continuation {
      | ResumeAttack(attack) =>
          if (state.goblin.concentrating and attack.damage > 0)
            openBattleAttackDamageConcentration(state, ResumeAttackDamageToGoblin, attack.damage)
          else
            { ...state, goblin: applyDamageFromSource(state.goblin, attack.damage, 1, true, OrdinaryDamage, Fighter), actionAvailable: false }
      | ResumeRayOfFrost => resolveRayOfFrost(state, 15, 10, 4, true)
      | ResumePoisonSpray => resolvePoisonSpray(state, 15, 10, 7, true)
      | ResumeChillTouch => resolveChillTouch(state, 15, 10, 6, true)
      | ResumeTrueStrikeWeaponAttack => resolveTrueStrikeWeaponAttack(state, 15, 10, 4, 5, 3, 5, Radiant, Slashing, true)
      | ResumeProduceFlameHurl => resolveProduceFlameHurl(state, 15, 10, 5, true)
      | ResumeFlameBladeAttack => resolveFlameBladeAttack(state, 15, 10, 6, true)
      | ResumeIceKnife => resolveIceKnife(state, 15, 10, 4, false, true, false, 6, true, true)
      | ResumeSaveGateDamage => resolveAcidSplash(state, false, true, 4, true, true)
      | ResumeAfterDamage => state
      | ResumeHellishRebukeAfterDamage(_) => state
      | ResumeMovement(movement) => applyFighterMovementWithSpeedKind(state, movement.speedKind, movement.movementCost)
      | ResumeCommandFleeMovement(movement) => followCommandFlee(state, movement.speedKind, movement.movementCost, false)
      | ResumeDissonantWhispersMovementThenAfterDamage(_) => openDissonantWhispersAfterDamageSequence(state)
    }

  pure def readyFighterReadiedSpell(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or state.fighter.readiedSpellHeld)
      state
    else
      { ...state, fighter: { ...state.fighter, concentrating: true, readiedSpellHeld: true }, actionAvailable: false }

  pure def releaseFighterReadiedSpell(state: BattleState): BattleState =
    if (state.fighter.readiedSpellHeld and not(fighterHasRage(state)))
      { ...state, fighter: { ...state.fighter, concentrating: false, readiedSpellHeld: false } }
    else
      state
}
