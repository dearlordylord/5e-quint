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
    | ShieldReactionDecisionTakenClosed({ state: BattleState })
    | ShieldReactionDecisionDeclinedClosed({ state: BattleState })

  pure def shieldReactionFrameIsFreshGoblinTarget(
    frame: PendingReactionFrame,
  ): bool =
    pendingReactionFrameIsCanonical(frame) and
      reactionFrameReactor(frame) == Goblin

  pure def declineShieldReactionDecision(
    state: BattleState,
    reactor: Actor,
  ): ShieldReactionDecision = {
    val afterDecision = stateAfterDecliningReactionOffer(state, reactor)
    if (afterDecision == state)
      ShieldReactionDecisionUnchanged
    else
      ShieldReactionDecisionDeclinedClosed({ state: afterDecision })
  }

  pure def takeShieldReactionDecision(
    state: BattleState,
    reactor: Actor,
  ): ShieldReactionDecision = {
    val reactorIsGoblin = reactor == Goblin
    val decision = battleRuntimeTakeReactionDecision(
      battleRuntimeReactionTrigger(AttackHit),
      BattleRuntimeShieldReactionProcedure,
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
          ShieldReactionDecisionTakenClosed({ state: afterDecision })
        }
      | _ => ShieldReactionDecisionUnchanged
    }
  }
}
