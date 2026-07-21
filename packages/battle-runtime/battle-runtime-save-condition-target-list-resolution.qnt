// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-condition-save

module battleRuntimeSaveConditionTargetListResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeSaveConditionTargetList.* from "./battle-runtime-save-condition-target-list"
  import battleRuntimeSaveConditionTargetingFacts.* from "./battle-runtime-save-condition-targeting-facts"
  import battleRuntimeSaveConditionHold.* from "./battle-runtime-save-condition-hold"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def resolveTargetListSaveGatedCondition(
    state: BattleState,
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    resolveTargetListSaveGatedConditionWithHeightenedTarget(
      state, invocation, slotLevel, fighterTargeted, fighterCreatureType,
      fighterSavingThrowSucceeded, goblinTargeted, goblinCreatureType,
      goblinSavingThrowSucceeded, noSaveGatedConditionHeightenedTarget,
    )

  pure def resolveTargetListSaveGatedConditionWithHeightenedTarget(
    state: BattleState,
    invocation: SaveGatedConditionInvocation,
    slotLevel: int,
    fighterTargeted: bool,
    fighterCreatureType: RuntimeCreatureType,
    fighterSavingThrowSucceeded: bool,
    goblinTargeted: bool,
    goblinCreatureType: RuntimeCreatureType,
    goblinSavingThrowSucceeded: bool,
    heightenedTarget: SaveGatedConditionHeightenedTarget,
  ): BattleState =
    if (invocation == HoldPersonSaveGate)
      resolveHoldPersonWithHeightenedTarget(
        state, slotLevel, fighterTargeted, fighterCreatureType,
        fighterSavingThrowSucceeded, goblinTargeted, goblinCreatureType,
        goblinSavingThrowSucceeded, heightenedTarget,
      )
    else if (invocation == HoldMonsterSaveGate)
      resolveHoldMonsterWithHeightenedTarget(
        state, slotLevel, fighterTargeted, fighterCreatureType,
        fighterSavingThrowSucceeded, goblinTargeted, goblinCreatureType,
        goblinSavingThrowSucceeded, heightenedTarget,
      )
    else if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      not(match saveGatedConditionTargeting(invocation) { | TargetListSaveTargets(_) => true | _ => false }) or
      saveGatedConditionRequiresConditionChoice(invocation) or
      not(saveGatedConditionTargetCountIsLegal(invocation, slotLevel, fighterTargeted, goblinTargeted)) or
      (fighterTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(invocation, fighterCreatureType))) or
      (goblinTargeted and not(saveGatedConditionTargetCreatureTypeIsLegal(invocation, goblinCreatureType)))
    )
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (fighterTargeted) saveGatedConditionTarget(invocation, state, state.fighter, fighterSavingThrowSucceeded, Fighter, Fighter, HumanoidCreature) else state.fighter,
        goblin: if (goblinTargeted) saveGatedConditionTarget(invocation, state, state.goblin, goblinSavingThrowSucceeded, Fighter, Goblin, HumanoidCreature) else state.goblin,
        actionAvailable: false,
      }, Fighter)
}
