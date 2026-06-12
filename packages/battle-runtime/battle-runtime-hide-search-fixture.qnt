// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
module battleRuntimeHideSearchFixture {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeMovement.* from "./battle-runtime-movement"

  pure def hideFighter(state: BattleState, stealthTotal: int): BattleState =
    {
      val step = battleRuntimeHide(movementProjectionForFighter(state, WalkSpeedKind), state.fighter.hidePrerequisite, stealthTotal, 15)
      val advanced = stateWithFighterMovementStep(state, step)
      if (step.hidden)
      {
        ...advanced,
        fighter: { ...advanced.fighter, hidden: totalToHiddenState(stealthTotal) },
      }
      else
        { ...advanced, fighter: { ...advanced.fighter, hidden: NotHidden } }
    }

  pure def searchGoblinForFighter(state: BattleState, perceptionTotal: int): BattleState =
    match state.fighter.hidden {
      | NotHidden => {
          val step = battleRuntimeSearch(movementProjectionForGrappledGoblin(state), false, perceptionTotal, 0)
          { ...state, actionAvailable: step.actionAvailable, bonusActionAvailable: step.bonusActionAvailable }
        }
      | HiddenByDc(dc) => {
          val step = battleRuntimeSearch(
            movementProjectionForGrappledGoblin(state).with("hidden", true),
            true,
            perceptionTotal,
            hiddenDiscoveryDcValue(dc),
          )
          {
            ...state,
            actionAvailable: step.actionAvailable,
            bonusActionAvailable: step.bonusActionAvailable,
            fighter: {
              ...state.fighter,
              hidden: if (step.hidden) state.fighter.hidden else NotHidden,
            },
          }
        }
    }
}
