// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-grease-ground-hazard

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE
module battleRuntimeGreaseGroundHazard {
  import battleRuntimeSavingThrowRollMode.* from "./battle-runtime-saving-throw-roll-mode"
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"
  import battleRuntimePersistentAreaCore.* from "./battle-runtime-persistent-area-core"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  pure val greaseDurationTicks = 10
  pure val greaseLifecycle: PersistentAreaLifecycle = StationaryPersistentArea
  pure val greaseAreaId = 1
  pure val noHeightenedSpellTarget = NoHeightenedSpellTarget

  pure def greaseGroundHazardActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect { | GreaseGroundHazard(data) => data.areaId == areaId | _ => false })

  pure def greaseGroundDifficultTerrainMovementCost(state: BattleState, areaId: int, totalDistanceFeet: int, difficultTerrainDistanceFeet: int): int =
    battleRuntimeDifficultTerrainMovementCost(greaseGroundHazardActive(state, areaId), totalDistanceFeet, difficultTerrainDistanceFeet)

  type GreaseGroundHazardSaveTrigger =
    | GreaseGroundHazardAppears
    | GreaseGroundHazardCreatureEntersArea
    | GreaseGroundHazardCreatureEndsTurnInArea

  pure def greaseGroundHazardSaveTriggerTiming(trigger: GreaseGroundHazardSaveTrigger): AreaEffectTriggerTiming =
    match trigger {
      | GreaseGroundHazardAppears => AreaAppearsInSpace
      | GreaseGroundHazardCreatureEntersArea => CreatureEntersArea
      | GreaseGroundHazardCreatureEndsTurnInArea => CreatureEndsTurnInArea
    }

  pure def activeEffectsWithoutGreaseGroundHazard(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | GreaseGroundHazard(data) => data.areaId != areaId
      | _ => true
    })

  pure def combatantAfterGreaseSave(target: Combatant, savingThrowSucceeded: bool): Combatant =
    if (savingThrowSucceeded)
      target
    else
      { ...target, prone: true }

  pure def greaseGroundHazard(
    areaId: int,
    heightenedTarget: AreaSpellEffectHeightenedTarget,
  ): ActiveEffect =
    GreaseGroundHazard({
      areaId: areaId,
      heightenedTarget: heightenedTarget,
      durationTicks: greaseDurationTicks,
    })

  pure def resolveGrease(
    state: BattleState,
    goblinIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    resolveGreaseWithHeightenedTarget(state, goblinIncludedInArea, goblinSavingThrowSucceeded, noHeightenedSpellTarget)

  pure def resolveGreaseWithHeightenedTarget(
    state: BattleState,
    goblinIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
    heightenedTarget: AreaSpellEffectHeightenedTarget,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutGreaseGroundHazard(state.fighter.activeEffects, greaseAreaId)
            .union(Set(greaseGroundHazard(greaseAreaId, heightenedTarget))),
        },
        goblin: if (goblinIncludedInArea) combatantAfterGreaseSave(state.goblin, goblinSavingThrowSucceeded) else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def greaseGroundHazardHeightenedTarget(state: BattleState, areaId: int): AreaSpellEffectHeightenedTarget =
    state.fighter.activeEffects
      .map(effect => match effect {
        | GreaseGroundHazard(data) => if (data.areaId == areaId) data.heightenedTarget else noHeightenedSpellTarget
        | _ => noHeightenedSpellTarget
      })
      .fold(noHeightenedSpellTarget, (selected, candidate) =>
        match selected {
          | HeightenedSpellTarget(_) => selected
          | NoHeightenedSpellTarget => candidate
        }
      )

  pure def greaseGroundHazardSaveRollMode(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
  ): SavingThrowRollMode =
    match greaseGroundHazardHeightenedTarget(state, areaId) {
      | HeightenedSpellTarget(data) => if (data.target == targetActor) DisadvantageSavingThrow else NormalSavingThrow
      | NoHeightenedSpellTarget => NormalSavingThrow
    }

  pure def moveFighterThroughGreaseGroundDifficultTerrain(state: BattleState, areaId: int, totalDistanceFeet: int, greaseDistanceFeet: int, provokedByTable: bool): BattleState = {
    val movementCost = greaseGroundDifficultTerrainMovementCost(state, areaId, totalDistanceFeet, greaseDistanceFeet)
    if (movementCost == 0)
      state
    else
      moveFighter(state, movementCost, provokedByTable)
  }

  pure def resolveGreaseGroundHazardSaveForTrigger(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    trigger: GreaseGroundHazardSaveTrigger,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (not(areaEffectTriggerCanResolve(
      greaseGroundHazardActive(state, areaId),
      true,
      everyQualifiedAreaTriggerProfile(Set(
        AreaAppearsInSpace,
        CreatureEntersArea,
        CreatureEndsTurnInArea,
      )),
      greaseGroundHazardSaveTriggerTiming(trigger),
    )))
      state
    else {
      match targetActor {
        | Fighter => { ...state, fighter: combatantAfterGreaseSave(state.fighter, savingThrowSucceeded) }
        | Goblin => { ...state, goblin: combatantAfterGreaseSave(state.goblin, savingThrowSucceeded) }
      }
    }

  pure def resolveGreaseGroundHazardSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
  ): BattleState =
    resolveGreaseGroundHazardSaveForTrigger(state, targetActor, areaId, GreaseGroundHazardCreatureEntersArea, savingThrowSucceeded)

  pure def endTurnWithGreaseGroundHazardSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
  ): BattleState =
    endTurn(resolveGreaseGroundHazardSaveForTrigger(state, targetActor, areaId, GreaseGroundHazardCreatureEndsTurnInArea, savingThrowSucceeded))

}
