// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE

module battleRuntimeSpellCastResources {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  type FighterSpellActionCostSpendResult = {
    state: BattleState,
    admitted: bool,
  }

  pure def battleTurnSpellSlotUseActor(slotUse: BattleTurnSpellSlotUse): Actor =
    match slotUse {
      | BattlePendingSpellSlotUse(actor) => actor
      | BattleCommittedSpellSlotUse(actor) => actor
    }

  pure def battleActorHasSpellSlotUse(state: BattleState, actor: Actor): bool =
    state.spellSlotUsesThisTurn.exists(slotUse => battleTurnSpellSlotUseActor(slotUse) == actor)

  pure def battleActorHasCommittedSpellSlotUse(state: BattleState, actor: Actor): bool =
    state.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(actor))

  pure def canActorExpendSpellSlotThisTurn(state: BattleState, actor: Actor): bool =
    not(battleActorHasSpellSlotUse(state, actor))

  pure def battleActorHasCastLevelOnePlusSpellThisTurn(state: BattleState, actor: Actor): bool =
    state.levelOnePlusSpellCastsThisTurn.contains(actor)

  pure def battleActorHasQuickenedLevelOnePlusSpellThisTurn(state: BattleState, actor: Actor): bool =
    state.quickenedLevelOnePlusSpellCastsThisTurn.contains(actor)

  pure def commitActorLevelOnePlusSpellCast(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasCastLevelOnePlusSpellThisTurn(state, actor))
      state
    else
      { ...state, levelOnePlusSpellCastsThisTurn: state.levelOnePlusSpellCastsThisTurn.union(Set(actor)) }

  pure def commitActorQuickenedLevelOnePlusSpellCast(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasQuickenedLevelOnePlusSpellThisTurn(state, actor))
      state
    else
      { ...state, quickenedLevelOnePlusSpellCastsThisTurn: state.quickenedLevelOnePlusSpellCastsThisTurn.union(Set(actor)) }

  pure def claimPendingActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasSpellSlotUse(state, actor))
      state
    else
      { ...state, spellSlotUsesThisTurn: state.spellSlotUsesThisTurn.union(Set(BattlePendingSpellSlotUse(actor))) }

  pure def releasePendingActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    { ...state, spellSlotUsesThisTurn: state.spellSlotUsesThisTurn.filter(slotUse => slotUse != BattlePendingSpellSlotUse(actor)) }

  pure def commitActorSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    if (battleActorHasCommittedSpellSlotUse(state, actor))
      state
    else {
      val released = releasePendingActorSpellSlotUse(state, actor)
      commitActorLevelOnePlusSpellCast({
        ...released,
        spellSlotUsesThisTurn: released.spellSlotUsesThisTurn.union(Set(BattleCommittedSpellSlotUse(actor))),
      }, actor)
    }

  pure def canExpendSpellSlotThisTurn(state: BattleState): bool =
    canActorExpendSpellSlotThisTurn(state, state.initiative.stillToAct.actor)

  pure def fighterSpellActionResources(state: BattleState): ActionResourceState = {
    currentActorOwnsTurn: currentActor(state) == Fighter and not(state.fighter.unconscious) and not(state.fighter.incapacitated),
    actionQuota: if (state.actionAvailable) ActionAvailable else ActionSpent,
    bonusActionAvailable: state.bonusActionAvailable,
  }

  pure def stateAfterFighterSpellActionCostSpend(state: BattleState, spent: ActionResourceState): BattleState = {
    ...state,
    actionAvailable: spent.actionQuota == ActionAvailable,
    bonusActionAvailable: spent.bonusActionAvailable,
  }

  pure def spendFighterSpellActionCost(state: BattleState, actionCost: SpellActionCost): FighterSpellActionCostSpendResult = {
    val cost = if (actionCost == SpellBonusAction) BonusActionCost else StandardActionCost(MagicAction)
    val spend = spendActionResources(fighterSpellActionResources(state), cost)
    {
      state: stateAfterFighterSpellActionCostSpend(state, spend.resources),
      admitted: spend.admitted,
    }
  }

  pure def canSpendFighterSpellActionCost(state: BattleState, actionCost: SpellActionCost): bool =
    spendFighterSpellActionCost(state, actionCost).admitted
}
