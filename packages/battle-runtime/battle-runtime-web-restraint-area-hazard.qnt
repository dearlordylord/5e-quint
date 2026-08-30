// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-web-restraint-hazard

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE
module battleRuntimeWebRestraintAreaHazard {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"
  import battleRuntimePersistentAreaCore.* from "./battle-runtime-persistent-area-core"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure val webDurationTicks = 600
  pure val webLifecycle: PersistentAreaLifecycle = StationaryPersistentArea
  pure val webAreaId = 4
  pure val webSideFeet = 20

  pure def webAreaHazardActiveForTerrain(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect { | WebRestraintHazard(data) => data.areaId == areaId | _ => false })

  pure def webDifficultTerrainMovementCost(state: BattleState, areaId: int, totalDistanceFeet: int, difficultTerrainDistanceFeet: int): int =
    battleRuntimeDifficultTerrainMovementCost(webAreaHazardActiveForTerrain(state, areaId), totalDistanceFeet, difficultTerrainDistanceFeet)

  pure def activeEffectsWithoutWebRestraintHazard(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | WebRestraintHazard(data) => data.areaId != areaId
      | _ => true
    })

  pure def activeEffectsWithoutWebRestrainedFrom(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | WebRestrained(data) => data.source != source
      | _ => true
    })

  pure def webRestraintHazardActive(state: BattleState, areaId: int): bool =
    webAreaHazardActiveForTerrain(state, areaId)

  pure def webRestraintHazardSightObscurement(state: BattleState, areaId: int): SightObscurement =
    if (webRestraintHazardActive(state, areaId))
      LightlyObscuredSight
    else
      UnobscuredSight

  pure def webRestraintHazardDurationTicks(state: BattleState, areaId: int): int =
    state.fighter.activeEffects
      .map(effect => match effect {
        | WebRestraintHazard(data) => if (data.areaId == areaId) data.durationTicks else 0
        | _ => 0
      })
      .fold(0, (highest, durationTicks) => if (highest > durationTicks) highest else durationTicks)

  pure def webEntrySaveAlreadyResolved(state: BattleState, targetActor: Actor, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | WebRestraintHazard(data) => data.areaId == areaId and data.entrySavedThisTurn.contains(targetActor)
      | _ => false
    })

  pure def webStartTurnSaveAlreadyResolved(state: BattleState, targetActor: Actor, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | WebRestraintHazard(data) => data.areaId == areaId and data.startTurnSavedThisTurn.contains(targetActor)
      | _ => false
    })

  pure def webRestraintSaveTriggerTiming(triggerIsEntry: bool): AreaEffectTriggerTiming =
    if (triggerIsEntry)
      CreatureEntersArea
    else
      CreatureStartsTurnInArea

  pure def markWebSavedThisTurn(state: BattleState, targetActor: Actor, areaId: int, triggerIsEntry: bool): BattleState =
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeEffects: state.fighter.activeEffects.map(effect => match effect {
          | WebRestraintHazard(data) =>
              if (data.areaId == areaId)
                if (triggerIsEntry)
                  WebRestraintHazard({ ...data, entrySavedThisTurn: data.entrySavedThisTurn.union(Set(targetActor)) })
                else
                  WebRestraintHazard({ ...data, startTurnSavedThisTurn: data.startTurnSavedThisTurn.union(Set(targetActor)) })
              else
                effect
          | _ => effect
        }),
      },
    }

  pure def resolveWeb(
    state: BattleState,
    areaId: int,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 2)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutWebRestraintHazard(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(WebRestraintHazard({
              areaId: areaId,
              sideFeet: webSideFeet,
              durationTicks: webDurationTicks,
              entrySavedThisTurn: Set(),
              startTurnSavedThisTurn: Set(),
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def combatantAfterWebRestraintSave(
    state: BattleState,
    target: Combatant,
    savingThrowSucceeded: bool,
    areaId: int,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else {
      val durationTicks = webRestraintHazardDurationTicks(state, areaId)
      {
        ...target,
        activeEffects: activeEffectsWithoutWebRestrainedFrom(target.activeEffects, Fighter)
          .union(Set(WebRestrained({ source: Fighter, durationTicks: durationTicks }))),
      }
    }

  pure def resolveWebRestraintSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    triggerIsEntry: bool,
    savingThrowSucceeded: bool,
  ): BattleState = {
    val resolvedTimings = Set(
      CreatureEntersArea,
      CreatureStartsTurnInArea,
    ).filter(timing =>
      if (timing == CreatureEntersArea)
        webEntrySaveAlreadyResolved(state, targetActor, areaId)
      else
        webStartTurnSaveAlreadyResolved(state, targetActor, areaId)
    )
    if (not(areaEffectTriggerCanResolve(
      webRestraintHazardActive(state, areaId),
      true,
      firstPerTimingPerTurnAreaTriggerProfile(
        Set(CreatureEntersArea, CreatureStartsTurnInArea),
        resolvedTimings,
      ),
      webRestraintSaveTriggerTiming(triggerIsEntry),
    )))
      state
    else {
      val marked = markWebSavedThisTurn(state, targetActor, areaId, triggerIsEntry)
      match targetActor {
        | Fighter => { ...marked, fighter: combatantAfterWebRestraintSave(marked, marked.fighter, savingThrowSucceeded, areaId) }
        | Goblin => { ...marked, goblin: combatantAfterWebRestraintSave(marked, marked.goblin, savingThrowSucceeded, areaId) }
      }
    }
  }

  pure def escapeWebRestrained(state: BattleState, targetActor: Actor, checkSucceeded: bool): BattleState =
    if (currentActor(state) != targetActor or not(state.actionAvailable))
      state
    else {
      match targetActor {
        | Fighter => {
            ...state,
            fighter: if (checkSucceeded) { ...state.fighter, activeEffects: activeEffectsWithoutWebRestrainedFrom(state.fighter.activeEffects, Fighter) } else state.fighter,
            actionAvailable: false,
          }
        | Goblin => {
            ...state,
            goblin: if (checkSucceeded) { ...state.goblin, activeEffects: activeEffectsWithoutWebRestrainedFrom(state.goblin.activeEffects, Fighter) } else state.goblin,
            actionAvailable: false,
          }
      }
    }

  pure def webRestrainedNoLongerInArea(state: BattleState, targetActor: Actor, areaId: int): BattleState =
    if (not(webRestraintHazardActive(state, areaId)))
      state
    else {
      match targetActor {
        | Fighter => { ...state, fighter: { ...state.fighter, activeEffects: activeEffectsWithoutWebRestrainedFrom(state.fighter.activeEffects, Fighter) } }
        | Goblin => { ...state, goblin: { ...state.goblin, activeEffects: activeEffectsWithoutWebRestrainedFrom(state.goblin.activeEffects, Fighter) } }
      }
    }

  pure def removeWebArea(state: BattleState, areaId: int): BattleState =
    if (webRestraintHazardActive(state, areaId))
      breakConcentrationSpellEffects(state, Fighter)
    else
      state

}
