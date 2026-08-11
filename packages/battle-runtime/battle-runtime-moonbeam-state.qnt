// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

module battleRuntimeMoonbeamState {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure val moonbeamAreaId = 6

  pure def activeEffectsWithoutMoonbeamMovableZone(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | MoonbeamMovableZone(data) => data.areaId != areaId
      | _ => true
    })

  pure def moonbeamActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | MoonbeamMovableZone(data) => data.areaId == areaId
      | _ => false
    })

  pure def moonbeamActiveDamageDice(state: BattleState, areaId: int): int =
    state.fighter.activeEffects
      .map(effect => match effect {
        | MoonbeamMovableZone(data) => if (data.areaId == areaId) data.damageDice else 0
        | _ => 0
      })
      .fold(0, (highest, damageDice) => if (highest > damageDice) highest else damageDice)

  pure def moonbeamActiveRepositionMaxMoveFeet(state: BattleState, areaId: int): int =
    state.fighter.activeEffects
      .map(effect => match effect {
        | MoonbeamMovableZone(data) => if (data.areaId == areaId) data.repositionMaxMoveFeet else 0
        | _ => 0
      })
      .fold(0, (highest, moveFeet) => if (highest > moveFeet) highest else moveFeet)

  pure def moonbeamSavedThisTurn(state: BattleState, targetActor: Actor, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | MoonbeamMovableZone(data) => data.areaId == areaId and data.savedThisTurn.contains(targetActor)
      | _ => false
    })

  pure def moonbeamShapeShiftSuppressed(state: BattleState, targetActor: Actor, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | MoonbeamMovableZone(data) => data.areaId == areaId and data.shapeShiftSuppressed.contains(targetActor)
      | _ => false
    })

  pure def markMoonbeamSavedThisTurn(state: BattleState, targetActor: Actor, areaId: int): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeEffects: state.fighter.activeEffects.map(effect => match effect {
          | MoonbeamMovableZone(data) =>
              if (data.areaId == areaId)
                MoonbeamMovableZone({ ...data, savedThisTurn: data.savedThisTurn.union(Set(targetActor)) })
              else
                effect
          | _ => effect
        }),
      },
    }

  pure def markMoonbeamShapeShiftSuppressed(state: BattleState, targetActor: Actor, areaId: int): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeEffects: state.fighter.activeEffects.map(effect => match effect {
          | MoonbeamMovableZone(data) =>
              if (data.areaId == areaId)
                MoonbeamMovableZone({ ...data, shapeShiftSuppressed: data.shapeShiftSuppressed.union(Set(targetActor)) })
              else
                effect
          | _ => effect
        }),
      },
    }

  pure def clearMoonbeamShapeShiftSuppressed(state: BattleState, targetActor: Actor, areaId: int): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeEffects: state.fighter.activeEffects.map(effect => match effect {
          | MoonbeamMovableZone(data) =>
              if (data.areaId == areaId)
                MoonbeamMovableZone({ ...data, shapeShiftSuppressed: data.shapeShiftSuppressed.exclude(Set(targetActor)) })
              else
                effect
          | _ => effect
        }),
      },
    }

  pure def resetMoonbeamSavedThisTurn(state: BattleState): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeEffects: state.fighter.activeEffects.map(effect => match effect {
          | MoonbeamMovableZone(data) => MoonbeamMovableZone({ ...data, savedThisTurn: Set() })
          | _ => effect
        }),
      },
    }

}
