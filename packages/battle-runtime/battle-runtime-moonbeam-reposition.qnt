// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

module battleRuntimeMoonbeamReposition {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"

  pure def resolveMoonbeamReposition(
    state: BattleState,
    areaId: int,
    moveFeet: int,
  ): BattleState =
    if (
      not(moonbeamActive(state, areaId)) or
      currentActor(state) != Fighter or
      not(state.actionAvailable) or
      moveFeet <= 0 or
      moveFeet > moonbeamActiveRepositionMaxMoveFeet(state, areaId)
    )
      state
    else
      { ...state, actionAvailable: false }

}
