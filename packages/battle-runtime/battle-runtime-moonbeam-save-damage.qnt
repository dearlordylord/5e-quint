// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
module battleRuntimeMoonbeamSaveDamage {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"
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
    if (not(areaEffectTriggerCanResolve(
      moonbeamActive(state, areaId),
      true,
      moonbeamOnceAcrossQualifiedTriggersProfile(moonbeamSavedThisTurn(state, targetActor, areaId)),
      CreatureEndsTurnInArea,
    )))
      state
    else {
      val marked = markMoonbeamSavedThisTurn(state, targetActor, areaId)
      match targetActor {
        | Fighter => { ...marked, fighter: combatantWithMoonbeamDamage(marked.fighter, rolledDamage, savingThrowSucceeded) }
        | Goblin => { ...marked, goblin: combatantWithMoonbeamDamage(marked.goblin, rolledDamage, savingThrowSucceeded) }
      }
    }
}
