// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeReactionWindow {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"

  pure def counterspellFrameClaimsTriggeringSlot(frame: PendingReactionFrame): bool =
    match frame.request {
      | SpellCastCounterspellReactionRequest(request) =>
          request.counterspell.triggeringSpellUsesSlot
      | _ => false
    }

  pure def fighterCanReleaseReadiedSpell(state: BattleState): bool =
    state.fighter.readiedSpellHeld and not(fighterHasRage(state))

  pure def reactionRequestProcedureCanOpen(state: BattleState, frame: PendingReactionFrame): bool =
    match frame.request {
      | AttackHitShieldReactionRequest(_) =>
          canActorExpendSpellSlotThisTurn(state, Goblin)
      | SpellCastCounterspellReactionRequest(request) =>
          canActorExpendSpellSlotThisTurn(
            state,
            reactionFrameReactor(frame),
          ) and
            (not(counterspellFrameClaimsTriggeringSlot(frame)) or
              canActorExpendSpellSlotThisTurn(
                state,
                request.counterspell.triggeringCaster,
              ))
      | AttackHitFighterReadiedSpellReleaseReactionRequest(_) =>
          fighterCanReleaseReadiedSpell(state)
      | AfterDamageHellishRebukeReactionRequest(request) =>
          canActorExpendSpellSlotThisTurn(state, request.damaged)
      | OpportunityAttackReactionRequest(_) => true
    }

  pure def stateAfterOpeningReactionWindow(state: BattleState, frame: PendingReactionFrame): BattleState =
    match frame.request {
      | SpellCastCounterspellReactionRequest(request) =>
          if (counterspellFrameClaimsTriggeringSlot(frame))
            claimPendingActorSpellSlotUse(
              state,
              request.counterspell.triggeringCaster,
            )
          else
            state
      | _ => state
    }

  pure def pendingReactionFrameIsCanonical(frame: PendingReactionFrame): bool =
    match frame.request {
      | AfterDamageHellishRebukeReactionRequest(data) => data.slotLevel >= 1
      | _ => true
    }

  pure def reactionWindowCanOpen(state: BattleState, frame: PendingReactionFrame): bool =
    pendingReactionFrameIsCanonical(frame) and
      reactionRequestProcedureCanOpen(state, frame) and
      reactorCanReact(state, reactionFrameReactor(frame))

  pure def openReactionWindow(state: BattleState, frame: PendingReactionFrame): BattleState =
    if (reactionWindowCanOpen(state, frame)) {
      val openingState = stateAfterOpeningReactionWindow(state, frame)
      { ...openingState, interruptStack: openingState.interruptStack.append(PendingReaction(frame)) }
    }
    else
      state

  pure def reactionWindowOpened(before: BattleState, after: BattleState): bool =
    after.interruptStack.length() > before.interruptStack.length()

  pure def shieldReactionFrame(
    continuation: ShieldReactionContinuation,
  ): PendingReactionFrame = {
    request: AttackHitShieldReactionRequest(continuation),
  }

  pure def shieldReactionWindowCanOpen(
    state: BattleState,
    continuation: ShieldReactionContinuation,
  ): bool =
    reactionWindowCanOpen(state, shieldReactionFrame(continuation))

  pure def openShieldReactionWindow(
    state: BattleState,
    continuation: ShieldReactionContinuation,
  ): BattleState =
    openReactionWindow(state, shieldReactionFrame(continuation))

  pure def combatantCanReact(combatant: Combatant): bool =
    combatant.reactionAvailable and
      not(combatantIsDead(combatant)) and
      not(combatant.unconscious) and
      not(combatant.incapacitated)

  pure def reactorCanReact(state: BattleState, reactor: Actor): bool =
    match reactor {
      | Fighter => combatantCanReact(state.fighter)
      | Goblin => combatantCanReact(state.goblin)
    }

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

  pure def reactionFrameCanOffer(
    frame: PendingReactionFrame,
    reactor: Actor,
  ): bool =
    pendingReactionFrameIsCanonical(frame) and
      reactionFrameReactor(frame) == reactor

  pure def stateAfterDecliningReactionOffer(state: BattleState, reactor: Actor): BattleState =
    if (state.interruptStack.length() == 0)
      state
    else {
      val top = state.interruptStack[state.interruptStack.length() - 1]
      match top {
        | PendingReaction(frame) => {
            if (not(reactionFrameCanOffer(frame, reactor)))
              state
            else {
              val decision = battleRuntimeDeclineReactionDecision(true)
              match (decision) {
                | BattleRuntimeDeclinedReaction => {
                    val rest = state.interruptStack.slice(0, state.interruptStack.length() - 1)
                    { ...state, interruptStack: rest }
                  }
                | _ => state
              }
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
            battleRuntimeReactionWindowKind(
              battleRuntimeReactionTrigger(reactionFrameTrigger(pending)),
            ),
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
    not(counterspell.triggeringCasterConSaveSucceeded)

  pure def counterspellSpellCastReactionEndsCounterspell(
    reaction: PendingCounterspellSpellCastReaction,
  ): bool =
    match reaction {
      | CounterspellSpellCastNotCountered => false
      | CounterspellSpellCastCounteredByReaction(counterspell) =>
          not(counterspell.counterspellCasterConSaveSucceeded)
    }

  pure def pendingCounterspellTakesEffect(counterspell: PendingCounterspellReaction): bool =
    not(counterspellSpellCastReactionEndsCounterspell(
      counterspell.counterspellSpellCastReaction,
    ))

  pure def counterspellNestedReactionCanCast(
    state: BattleState,
    counterspell: PendingCounterspellReaction,
  ): bool = {
    val reactor = counterspellReactionReactor(counterspell)
    val nestedReactor = nestedCounterspellReactionReactor(counterspell)
    val afterCounterspellPending = claimPendingActorSpellSlotUse(state, reactor)
    match counterspell.counterspellSpellCastReaction {
      | CounterspellSpellCastNotCountered => false
      | CounterspellSpellCastCounteredByReaction(_) =>
          reactorCanReact(afterCounterspellPending, nestedReactor) and
            canActorExpendSpellSlotThisTurn(afterCounterspellPending, nestedReactor)
    }
  }

  pure def pendingCounterspellTakesEffectInState(
    state: BattleState,
    counterspell: PendingCounterspellReaction,
  ): bool =
    not(counterspellNestedReactionCanCast(state, counterspell) and
      counterspellSpellCastReactionEndsCounterspell(
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
    counterspell: PendingCounterspellReaction,
  ): BattleState = {
    val reactor = counterspellReactionReactor(counterspell)
    val nestedReactor = nestedCounterspellReactionReactor(counterspell)
    val afterCounterspellPending = claimPendingActorSpellSlotUse(state, reactor)
    val nestedCounterspellCanCast = counterspellNestedReactionCanCast(state, counterspell)
    val afterNestedCounterspell =
      match counterspell.counterspellSpellCastReaction {
        | CounterspellSpellCastNotCountered => afterCounterspellPending
        | CounterspellSpellCastCounteredByReaction(_) =>
            if (nestedCounterspellCanCast)
              spendReaction(
                commitActorSpellSlotUse(afterCounterspellPending, nestedReactor),
                nestedReactor,
              )
            else
              afterCounterspellPending
      }
    if (
      nestedCounterspellCanCast and
        counterspellSpellCastReactionEndsCounterspell(
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

  pure def counterspellEndsSpellCastInState(
    state: BattleState,
    counterspell: PendingCounterspellReaction,
  ): bool =
    pendingCounterspellTakesEffectInState(state, counterspell) and
      pendingCounterspellEndsTriggeringSpell(counterspell)

  pure def readyFighterReadiedSpell(state: BattleState): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      state.fighter.readiedSpellHeld
    )
      state
    else
      {
        ...state,
        fighter: {
          ...state.fighter,
          concentrating: true,
          readiedSpellHeld: true,
        },
        actionAvailable: false,
      }

  pure def releaseFighterReadiedSpell(state: BattleState): BattleState =
    if (fighterCanReleaseReadiedSpell(state))
      {
        ...state,
        fighter: {
          ...state.fighter,
          concentrating: false,
          readiedSpellHeld: false,
        },
      }
    else
      state
}
