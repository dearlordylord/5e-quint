// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE

module battleRuntimeProneMovement {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeSleepHideousLaughter.* from "./battle-runtime-sleep-hideous-laughter"

  pure def standFighterFromProneUnlessHideousLaughter(state: BattleState): BattleState =
    if (combatantHasHideousLaughter(state.fighter))
      state
    else {
      val step = battleRuntimeStandFromProne(movementProjectionForFighter(state, WalkSpeedKind))
      stateWithFighterMovementStep(state, step)
    }
}
