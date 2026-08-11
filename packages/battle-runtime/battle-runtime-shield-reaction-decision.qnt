// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-shield

module battleRuntimeShieldReactionDecision {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"

  // RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield

  type ShieldReactionDecision =
    | ShieldReactionDecisionUnchanged
    | ShieldReactionDecisionDeclined({
        state: BattleState,
        frameClosed: bool,
      })
    | ShieldReactionDecisionTaken({
        state: BattleState,
        frameClosed: bool,
      })

  pure def shieldReactionFrameIsFreshGoblinTarget(
    frame: PendingReactionFrame,
  ): bool =
    frame.eligibleReactors == Set(Goblin) and frame.offeredReactors == Set()

  pure def declineShieldReactionDecision(
    state: BattleState,
    reactor: Actor,
  ): ShieldReactionDecision = {
    val afterDecision = stateAfterDecliningReactionOffer(state, reactor)
    if (afterDecision == state)
      ShieldReactionDecisionUnchanged
    else
      ShieldReactionDecisionDeclined({
        state: afterDecision,
        frameClosed: reactionDecisionClosedFrame(state, afterDecision),
      })
  }

  pure def resumeShieldReactionAfterDecline(
    state: BattleState,
    reactor: Actor,
    resumeContinuation: (BattleState) => BattleState,
  ): BattleState = {
    val reactionAvailable = reactorCanReact(state, reactor)
    val stateWithoutReaction = match reactor {
      | Fighter => {
          ...state,
          fighter: { ...state.fighter, reactionAvailable: false },
        }
      | Goblin => {
          ...state,
          goblin: { ...state.goblin, reactionAvailable: false },
        }
    }
    val resumed = resumeContinuation(stateWithoutReaction)
    match reactor {
      | Fighter => {
          ...resumed,
          fighter: { ...resumed.fighter, reactionAvailable: reactionAvailable },
        }
      | Goblin => {
          ...resumed,
          goblin: { ...resumed.goblin, reactionAvailable: reactionAvailable },
        }
    }
  }

  pure def takeShieldReactionDecision(
    state: BattleState,
    reactor: Actor,
    eligibleReactors: Set[Actor],
    offeredReactors: Set[Actor],
  ): ShieldReactionDecision = {
    val decision = battleRuntimeTakeReactionDecision(
      battleRuntimeReactionTrigger(AttackHit),
      battleRuntimeReactionProcedure(ShieldReactionProcedure),
      eligibleReactors.contains(reactor),
      offeredReactors.contains(reactor),
      reactorCanReact(state, reactor),
      canActorExpendSpellSlotThisTurn(state, reactor),
      reactionOfferCompletesFrame(
        eligibleReactors,
        offeredReactors,
        reactor,
      ),
    )
    match decision {
      | BattleRuntimeTookReaction(_) => {
          val afterReactionSpend = spendReaction(state, reactor)
          val afterReactionProcedure = castShieldReactionSpell(
            afterReactionSpend,
            reactor,
          )
          val afterDecision = stateAfterDecliningReactionOffer(
            afterReactionProcedure,
            reactor,
          )
          ShieldReactionDecisionTaken({
            state: afterDecision,
            frameClosed: reactionDecisionClosedFrame(state, afterDecision),
          })
        }
      | _ => ShieldReactionDecisionUnchanged
    }
  }
}
