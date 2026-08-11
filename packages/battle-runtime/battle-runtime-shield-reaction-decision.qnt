// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME
// UNIT-PROFILE-COVERAGE: qnt-owner spell.reaction-shield

module battleRuntimeShieldReactionDecision {
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"

  // RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield

  type ShieldReactionDecisionFrame =
    | ShieldReactionDecisionFrameOpen({ state: BattleState })
    | ShieldReactionDecisionFrameClosed({ state: BattleState })

  type ShieldReactionDecision =
    | ShieldReactionDecisionUnchanged
    | ShieldReactionDecisionDeclined(ShieldReactionDecisionFrame)
    | ShieldReactionDecisionTaken(ShieldReactionDecisionFrame)

  pure def shieldReactionFrameIsFreshGoblinTarget(
    frame: PendingReactionFrame,
  ): bool =
    frame.eligibleReactors == Set(Goblin) and frame.offeredReactors == Set()

  pure def shieldReactionDecisionFrame(
    before: BattleState,
    after: BattleState,
  ): ShieldReactionDecisionFrame =
    if (reactionDecisionClosedFrame(before, after))
      ShieldReactionDecisionFrameClosed({ state: after })
    else
      ShieldReactionDecisionFrameOpen({ state: after })

  pure def declineShieldReactionDecision(
    state: BattleState,
    reactor: Actor,
  ): ShieldReactionDecision = {
    val afterDecision = stateAfterDecliningReactionOffer(state, reactor)
    if (afterDecision == state)
      ShieldReactionDecisionUnchanged
    else
      ShieldReactionDecisionDeclined(shieldReactionDecisionFrame(state, afterDecision))
  }

  pure def takeShieldReactionDecision(
    state: BattleState,
    reactor: Actor,
  ): ShieldReactionDecision = {
    val reactorIsGoblin = reactor == Goblin
    val decision = battleRuntimeTakeReactionDecision(
      battleRuntimeReactionTrigger(AttackHit),
      battleRuntimeReactionProcedure(ShieldReactionProcedure),
      reactorIsGoblin,
      false,
      reactorCanReact(state, reactor),
      canActorExpendSpellSlotThisTurn(state, reactor),
      reactorIsGoblin,
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
          ShieldReactionDecisionTaken(
            shieldReactionDecisionFrame(state, afterDecision)
          )
        }
      | _ => ShieldReactionDecisionUnchanged
    }
  }
}
