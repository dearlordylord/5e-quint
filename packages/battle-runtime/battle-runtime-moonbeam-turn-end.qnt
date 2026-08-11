// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
module battleRuntimeMoonbeamTurnEnd {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"
  import battleRuntimeMoonbeamSaveDamage.* from "./battle-runtime-moonbeam-save-damage"

  pure def endTurnWithMoonbeamSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): BattleState =
    endTurn(resetMoonbeamSavedThisTurn(resolveMoonbeamSave(state, targetActor, areaId, savingThrowSucceeded, rolledDamage)))

}
