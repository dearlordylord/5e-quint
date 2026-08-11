// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
module battleRuntimeMoonbeamSaveDamage {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"
  import battleRuntimeMoonbeamDamageCore.* from "./battle-runtime-moonbeam-damage-core"

  pure def resolveMoonbeamSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): BattleState =
    // This BattleState procedure is entered only with the caller's qualified
    // Moonbeam area-trigger witness; active-area and once-per-turn state are
    // the remaining admission facts at this boundary.
    if (not(moonbeamActive(state, areaId)) or moonbeamSavedThisTurn(state, targetActor, areaId))
      state
    else {
      val marked = markMoonbeamSavedThisTurn(state, targetActor, areaId)
      match targetActor {
        | Fighter => { ...marked, fighter: combatantWithMoonbeamDamage(marked.fighter, rolledDamage, savingThrowSucceeded) }
        | Goblin => { ...marked, goblin: combatantWithMoonbeamDamage(marked.goblin, rolledDamage, savingThrowSucceeded) }
      }
    }
}
