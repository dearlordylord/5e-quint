// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveConditionColorSpray {

  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"

  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeSaveConditionTargetList.* from "./battle-runtime-save-condition-target-list"

  pure def resolveColorSpray(
    state: BattleState,
    fighterSavingThrowSucceeded: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: saveGatedConditionTarget(ColorSpraySaveGate, state, state.fighter, fighterSavingThrowSucceeded, Fighter, Fighter, HumanoidCreature),
        goblin: saveGatedConditionTarget(ColorSpraySaveGate, state, state.goblin, goblinSavingThrowSucceeded, Fighter, Goblin, HumanoidCreature),
        actionAvailable: false,
      }, Fighter)
  pure def resolveColorSprayEmptyArea(state: BattleState): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        actionAvailable: false,
      }, Fighter)
}
