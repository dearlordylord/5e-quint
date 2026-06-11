// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeReactionWindow {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"

  pure def counterspellFrameClaimsTriggeringSlot(frame: PendingReactionFrame): bool =
    match frame.procedure {
      | CounterspellReactionProcedure(counterspell) =>
          frame.trigger == SpellCast and counterspell.triggeringSpellUsesSlot
      | _ => false
    }

  pure def reactionWindowCanOpen(state: BattleState, frame: PendingReactionFrame): bool =
    reactionProcedureMatchesTrigger(frame.trigger, frame.procedure) and
      match frame.procedure {
        | CounterspellReactionProcedure(counterspell) =>
            not(counterspellFrameClaimsTriggeringSlot(frame)) or
              canActorExpendSpellSlotThisTurn(state, counterspell.triggeringCaster)
        | _ => true
      }

  pure def stateAfterOpeningReactionWindow(state: BattleState, frame: PendingReactionFrame): BattleState =
    match frame.procedure {
      | CounterspellReactionProcedure(counterspell) =>
          if (counterspellFrameClaimsTriggeringSlot(frame))
            claimPendingActorSpellSlotUse(state, counterspell.triggeringCaster)
          else
            state
      | _ => state
    }

  pure def reactionProcedureMatchesTrigger(
    trigger: ReactionTrigger,
    procedure: PendingReactionProcedure
  ): bool =
    match procedure {
      | ShieldReactionProcedure => trigger == AttackHit or trigger == SpellCast
      | CounterspellReactionProcedure(_) => trigger == SpellCast
      | OpportunityAttackReactionProcedure => trigger == OpportunityAttack
      | ReadiedSpellReleaseReactionProcedure => trigger == AttackHit
      | DamageInterruptionReactionProcedure =>
          trigger == AttackDamage or trigger == SaveFailed or trigger == AfterDamage
    }

  pure def openReactionWindow(state: BattleState, frame: PendingReactionFrame): BattleState =
    if (reactionWindowCanOpen(state, frame)) {
      val openingState = stateAfterOpeningReactionWindow(state, frame)
      { ...openingState, interruptStack: openingState.interruptStack.append(PendingReaction(frame)) }
    }
    else
      state

  pure def reactionFrameComplete(frame: PendingReactionFrame): bool =
    frame.eligibleReactors == frame.offeredReactors

  pure def reactionFrameCompleteAfterOffering(frame: PendingReactionFrame, reactor: Actor): bool =
    reactionFrameComplete({ ...frame, offeredReactors: frame.offeredReactors.union(Set(reactor)) })

  pure def reactorCanReact(state: BattleState, reactor: Actor): bool =
    match reactor {
      | Fighter => state.fighter.reactionAvailable
      | Goblin => state.goblin.reactionAvailable
    }

  pure def hellishRebukeAfterDamageReactionEligible(
    triggerFacts: HellishRebukeAfterDamageTrigger,
    availability: HellishRebukeAfterDamageAvailability,
  ): bool =
    match triggerFacts {
      | HellishRebukeDamageFromVisibleCreatureWithin60Feet =>
          availability.hellishRebukeAvailable and
            availability.reactionAvailable and
            availability.spellSlotAvailable
      | _ => false
    }

  pure def openHellishRebukeAfterDamageReactionWindow(
    state: BattleState,
    damager: Actor,
    damaged: Actor,
    triggerFacts: HellishRebukeAfterDamageTrigger,
    hellishRebukeAvailable: bool,
    slotLevel: int,
  ): BattleState =
    if (hellishRebukeAfterDamageReactionEligible(
      triggerFacts,
      {
        hellishRebukeAvailable: hellishRebukeAvailable,
        reactionAvailable: reactorCanReact(state, damaged),
        spellSlotAvailable: canActorExpendSpellSlotThisTurn(state, damaged),
      },
    ))
      openReactionWindow(state, {
        trigger: AfterDamage,
        procedure: DamageInterruptionReactionProcedure,
        eligibleReactors: Set(damaged),
        offeredReactors: Set(),
        continuation: ResumeHellishRebukeAfterDamage({
          damager: damager,
          damaged: damaged,
          slotLevel: slotLevel,
        }),
      })
    else
      state

  pure def spendReaction(state: BattleState, reactor: Actor): BattleState =
    match reactor {
      | Fighter => { ...state, fighter: { ...state.fighter, reactionAvailable: false } }
      | Goblin => { ...state, goblin: { ...state.goblin, reactionAvailable: false } }
    }

  pure def pendingReactionFrame(frame: InterruptFrame): PendingReactionFrameOption =
    match frame {
      | PendingReaction(pending) => HasPendingReactionFrame(pending)
      | PendingFlySpeedGrantEndFallCleanup(_) => NoPendingReactionFrame
      | PendingAttackDamageConcentration(_) => NoPendingReactionFrame
    }

  pure def reactionFrameCanOffer(frame: PendingReactionFrame, reactor: Actor): bool =
    frame.eligibleReactors.contains(reactor) and
      not(frame.offeredReactors.contains(reactor))

  pure def reactionFrameAfterOffering(
    frame: PendingReactionFrame,
    reactor: Actor,
  ): PendingReactionFrame =
    if (reactionFrameCanOffer(frame, reactor))
      { ...frame, offeredReactors: frame.offeredReactors.union(Set(reactor)) }
    else
      frame

  pure def stateAfterDecliningReactionOffer(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            val updatedFrame = reactionFrameAfterOffering(frame, reactor)
            val decision = battleRuntimeDeclineReactionDecision(
              frame.eligibleReactors.contains(reactor),
              frame.offeredReactors.contains(reactor),
              reactionFrameComplete(updatedFrame),
            )
            match (decision) {
              | BattleRuntimeDeclinedReaction(result) => {
                  val rest = state.interruptStack.slice(0, state.interruptStack.length() - 1)
                  if (result.frameComplete)
                    { ...state, interruptStack: rest }
                  else
                    { ...state, interruptStack: rest.append(PendingReaction(updatedFrame)) }
                }
              | _ => state
            }
          }
        | _ => state
      }
    }

  pure def reactionDecisionClosedFrame(before: BattleState, after: BattleState): bool =
    after.interruptStack.length() < before.interruptStack.length()

  pure def battleRuntimeInterruptFrameReactionWindow(
    window: ReactionWindowState,
    frame: InterruptFrame,
  ): ReactionWindowState =
    match frame {
      | PendingReaction(pending) =>
          offerReactionWindow(
            window,
            battleRuntimeReactionWindowKind(battleRuntimeReactionTrigger(pending.trigger)),
          )
      | _ => window
    }

  pure def battleRuntimeInterruptStackReactionWindow(
    stack: List[InterruptFrame]
  ): ReactionWindowState =
    stack.foldl(NoReactionWindow, (window, frame) =>
      battleRuntimeInterruptFrameReactionWindow(window, frame)
    )

  pure def battleRuntimePendingReactionFrameCount(
    stack: List[InterruptFrame]
  ): int =
    stack.foldl(0, (count, frame) =>
      match frame {
        | PendingReaction(_) => count + 1
        | _ => count
      }
    )

  pure def battleRuntimeInterruptStackReactionDepth(state: BattleState): int =
    battleRuntimePendingReactionFrameCount(state.interruptStack)

  pure def battleRuntimeInterruptStackWithinReactionDepth(state: BattleState): bool =
    battleRuntimeInterruptStackReactionDepth(state) <= maximumReactionWindowDepth

  pure def battleRuntimeInterruptStackDepthMatchesRuleCore(state: BattleState): bool =
    if (battleRuntimeInterruptStackWithinReactionDepth(state))
      battleRuntimeInterruptStackReactionDepth(state) ==
        reactionWindowDepth(battleRuntimeInterruptStackReactionWindow(state.interruptStack))
    else
      false

  pure def battleRuntimeClosedReactionDecisionMatchesRuleCore(
    before: BattleState,
    after: BattleState,
  ): bool = {
    val beforeWindow = battleRuntimeInterruptStackReactionWindow(before.interruptStack)
    val afterWindow = battleRuntimeInterruptStackReactionWindow(after.interruptStack)
    if (reactionDecisionClosedFrame(before, after))
      afterWindow == advanceContinuation(beforeWindow)
    else
      afterWindow == beforeWindow
  }

  pure def battleRuntimeActiveEffectsChangedBetween(
    before: BattleState,
    after: BattleState,
  ): bool =
    before.fighter.activeEffects != after.fighter.activeEffects or
      before.goblin.activeEffects != after.goblin.activeEffects

  pure def battleRuntimeReactionWindowStableAcrossActiveEffectChange(
    before: BattleState,
    after: BattleState,
  ): bool =
    not(battleRuntimeActiveEffectsChangedBetween(before, after)) or
      battleRuntimeInterruptStackReactionWindow(before.interruptStack) ==
        battleRuntimeInterruptStackReactionWindow(after.interruptStack)

  pure def openDissonantWhispersAfterDamageSequence(state: BattleState): BattleState =
    openReactionWindow(state, {
      trigger: AfterDamage,
      procedure: DamageInterruptionReactionProcedure,
      eligibleReactors: Set(Fighter),
      offeredReactors: Set(),
      continuation: ResumeAfterDamage,
    })

  pure def applyShieldReactionSpell(state: BattleState, reactor: Actor): BattleState =
    match reactor {
      | Fighter => {
          ...state,
          fighter: { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(ShieldArmorClassBonus)) },
        }
      | Goblin => {
          ...state,
          goblin: { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(ShieldArmorClassBonus)) },
        }
    }

  pure def castShieldReactionSpell(state: BattleState, reactor: Actor): BattleState =
    if (canActorExpendSpellSlotThisTurn(state, reactor))
      commitActorSpellSlotUse(applyShieldReactionSpell(state, reactor), reactor)
    else
      state

  pure def pendingCounterspellEndsTriggeringSpell(counterspell: PendingCounterspellReaction): bool =
    counterspell.counterspellSlotLevel >= counterspell.triggeringSpellLevel or
      not(counterspell.triggeringCasterConSaveSucceeded)

  pure def counterspellSpellCastReactionEndsCounterspell(
    firstCounterspellSlotLevel: int,
    reaction: PendingCounterspellSpellCastReaction,
  ): bool =
    match reaction {
      | CounterspellSpellCastNotCountered => false
      | CounterspellSpellCastCounteredByReaction(counterspell) =>
          counterspell.counterspellSlotLevel >= firstCounterspellSlotLevel or
            not(counterspell.counterspellCasterConSaveSucceeded)
    }

  pure def pendingCounterspellTakesEffect(counterspell: PendingCounterspellReaction): bool =
    not(counterspellSpellCastReactionEndsCounterspell(
      counterspell.counterspellSlotLevel,
      counterspell.counterspellSpellCastReaction,
    ))

  pure def counterspellNestedReactionCanCast(
    state: BattleState,
    reactor: Actor,
    counterspell: PendingCounterspellReaction,
  ): bool = {
    val afterCounterspellPending = claimPendingActorSpellSlotUse(state, reactor)
    match counterspell.counterspellSpellCastReaction {
      | CounterspellSpellCastNotCountered => false
      | CounterspellSpellCastCounteredByReaction(nested) =>
          reactorCanReact(afterCounterspellPending, nested.reactor) and
            canActorExpendSpellSlotThisTurn(afterCounterspellPending, nested.reactor)
    }
  }

  pure def pendingCounterspellTakesEffectInState(
    state: BattleState,
    reactor: Actor,
    counterspell: PendingCounterspellReaction,
  ): bool =
    not(counterspellNestedReactionCanCast(state, reactor, counterspell) and
      counterspellSpellCastReactionEndsCounterspell(
        counterspell.counterspellSlotLevel,
        counterspell.counterspellSpellCastReaction,
      ))

  pure def wasteCounteredSpellCastingResource(
    state: BattleState,
    caster: Actor,
    resource: CounterspellCastingResource,
  ): BattleState =
    match resource {
      | CounterspellMagicAction => { ...state, actionAvailable: false }
      | CounterspellBonusAction => { ...state, bonusActionAvailable: false }
      | CounterspellReaction => spendReaction(state, caster)
    }

  pure def castCounterspellReactionSpell(
    state: BattleState,
    reactor: Actor,
    frame: PendingReactionFrame,
  ): BattleState =
    match frame.procedure {
      | CounterspellReactionProcedure(counterspell) => {
          val afterCounterspellPending = claimPendingActorSpellSlotUse(state, reactor)
          val nestedCounterspellCanCast = counterspellNestedReactionCanCast(state, reactor, counterspell)
          val afterNestedCounterspell =
            match counterspell.counterspellSpellCastReaction {
              | CounterspellSpellCastNotCountered => afterCounterspellPending
              | CounterspellSpellCastCounteredByReaction(nested) =>
                  if (nestedCounterspellCanCast)
                    spendReaction(
                      commitActorSpellSlotUse(afterCounterspellPending, nested.reactor),
                      nested.reactor,
                    )
                  else
                    afterCounterspellPending
            }
          if (
            nestedCounterspellCanCast and
              counterspellSpellCastReactionEndsCounterspell(
                counterspell.counterspellSlotLevel,
                counterspell.counterspellSpellCastReaction,
              )
          )
            releasePendingActorSpellSlotUse(afterNestedCounterspell, reactor)
          else {
            val afterCounterspellSlot = commitActorSpellSlotUse(afterNestedCounterspell, reactor)
            if (pendingCounterspellEndsTriggeringSpell(counterspell)) {
              val afterReleasedTriggeringSlot =
                if (counterspell.triggeringSpellUsesSlot)
                  releasePendingActorSpellSlotUse(afterCounterspellSlot, counterspell.triggeringCaster)
                else
                  afterCounterspellSlot
              wasteCounteredSpellCastingResource(
                afterReleasedTriggeringSlot,
                counterspell.triggeringCaster,
                counterspell.triggeringCastingResource,
              )
            } else {
              afterCounterspellSlot
            }
          }
        }
      | _ => state
    }

  pure def reactionProcedureRequiresSpellSlot(procedure: PendingReactionProcedure): bool =
    match procedure {
      | ShieldReactionProcedure => true
      | CounterspellReactionProcedure(_) => true
      | _ => false
    }

  pure def reactionProcedureEndsSpellCastInState(
    state: BattleState,
    reactor: Actor,
    procedure: PendingReactionProcedure,
  ): bool =
    match procedure {
      | CounterspellReactionProcedure(counterspell) =>
          pendingCounterspellTakesEffectInState(state, reactor, counterspell) and
            pendingCounterspellEndsTriggeringSpell(counterspell)
      | _ => false
    }

  pure def hellishRebukeDamageDice(slotLevel: int): int =
    if (slotLevel < 1) 0 else 2 + (slotLevel - 1)
}
