// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
module battleRuntimeFlamingSphereSaveDamage {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFlamingSphereDamageCore.* from "./battle-runtime-flaming-sphere-damage-core"
  import battleRuntimeFlamingSphereFacts.* from "./battle-runtime-flaming-sphere-facts"

  pure val flamingSphereAreaId = 3
  pure def activeEffectsWithoutFlamingSphere(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FlamingSphere(data) => data.areaId != areaId
      | _ => true
    })

  pure def flamingSphereActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | FlamingSphere(data) => data.areaId == areaId
      | _ => false
    })

  pure def flamingSphereActiveDamageDice(state: BattleState, areaId: int): int =
    state.fighter.activeEffects
      .map(effect => match effect {
        | FlamingSphere(data) => if (data.areaId == areaId) data.damageDice else 0
        | _ => 0
      })
      .fold(0, (highest, damageDice) => if (highest > damageDice) highest else damageDice)

  pure def flamingSphereActiveRamMaxMoveFeet(state: BattleState, areaId: int): int =
    state.fighter.activeEffects
      .map(effect => match effect {
        | FlamingSphere(data) => if (data.areaId == areaId) data.ramMaxMoveFeet else 0
        | _ => 0
      })
      .fold(0, (highest, moveFeet) => if (highest > moveFeet) highest else moveFeet)


  pure def resolveFlamingSphereEndWithinFiveFeetSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): BattleState =
    if (not(flamingSphereActive(state, areaId)))
      state
    else {
      match targetActor {
        | Fighter => { ...state, fighter: combatantWithFlamingSphereDamage(state.fighter, rolledDamage, savingThrowSucceeded) }
        | Goblin => { ...state, goblin: combatantWithFlamingSphereDamage(state.goblin, rolledDamage, savingThrowSucceeded) }
      }
    }

}
