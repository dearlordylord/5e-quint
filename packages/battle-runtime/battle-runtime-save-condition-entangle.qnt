// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveConditionEntangle {
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeSaveConditionTargetList.* from "./battle-runtime-save-condition-target-list"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"

  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def resolveEntangle(
    state: BattleState,
    fighterIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (fighterIncludedInArea or not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: saveGatedConditionTarget(EntangleSaveGate, withoutPrior, withoutPrior.goblin, goblinSavingThrowSucceeded, Fighter, Goblin, HumanoidCreature),
        actionAvailable: false,
      }, Fighter)
    }
  pure def escapeEntangle(state: BattleState, checkSucceeded: bool): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Goblin or not(state.goblin.activeEffects.contains(EntangleRestrained)))
      state
    else
      {
        ...state,
        goblin: if (checkSucceeded) { ...state.goblin, activeEffects: state.goblin.activeEffects.exclude(Set(EntangleRestrained)) } else state.goblin,
        actionAvailable: false,
      }
}
