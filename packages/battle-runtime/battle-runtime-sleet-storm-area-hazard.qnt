// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-sleet-storm-area-hazard

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
module battleRuntimeSleetStormAreaHazard {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"
  import battleRuntimePersistentAreaCore.* from "./battle-runtime-persistent-area-core"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure val sleetStormDurationTicks = 10
  pure val sleetStormLifecycle: PersistentAreaLifecycle = StationaryPersistentArea
  pure val sleetStormAreaId = 8
  pure val sleetStormRadiusFeet = 20
  pure val sleetStormHeightFeet = 40
  type SleetStormAreaMembershipTriggerFact =
    | SleetStormFirstEntryOnTurn({ areaId: int })
    | SleetStormTurnStartInArea({ areaId: int })
  pure def sleetStormAreaHazardActiveForTerrain(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect { | SleetStormAreaHazard(data) => data.areaId == areaId | _ => false })

  pure def sleetStormDifficultTerrainMovementCost(state: BattleState, areaId: int, totalDistanceFeet: int, difficultTerrainDistanceFeet: int): int =
    battleRuntimeDifficultTerrainMovementCost(sleetStormAreaHazardActiveForTerrain(state, areaId), totalDistanceFeet, difficultTerrainDistanceFeet)
  pure def activeEffectsWithoutSleetStormAreaHazard(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SleetStormAreaHazard(data) => data.areaId != areaId
      | _ => true
    })

  pure def sleetStormAreaHazardActive(state: BattleState, areaId: int): bool =
    sleetStormAreaHazardActiveForTerrain(state, areaId)

  pure def sleetStormAreaHazardSightObscurement(state: BattleState, areaId: int): SightObscurement =
    if (sleetStormAreaHazardActive(state, areaId))
      HeavilyObscuredSight
    else
      UnobscuredSight

  pure def sleetStormSaveAlreadyResolved(state: BattleState, targetActor: Actor, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | SleetStormAreaHazard(data) => data.areaId == areaId and data.savedThisTurn.contains(targetActor)
      | _ => false
    })

  pure def sleetStormAreaHazardTriggerAreaId(triggerFact: SleetStormAreaMembershipTriggerFact): int =
    match triggerFact {
      | SleetStormFirstEntryOnTurn(data) => data.areaId
      | SleetStormTurnStartInArea(data) => data.areaId
    }

  pure def sleetStormAreaHazardSaveTriggerTiming(triggerFact: SleetStormAreaMembershipTriggerFact): AreaEffectTriggerTiming =
    match triggerFact {
      | SleetStormFirstEntryOnTurn(_) => CreatureEntersArea
      | SleetStormTurnStartInArea(_) => CreatureStartsTurnInArea
    }

  pure def markSleetStormSavedThisTurn(state: BattleState, targetActor: Actor, triggerFact: SleetStormAreaMembershipTriggerFact): BattleState = {
    val areaId = sleetStormAreaHazardTriggerAreaId(triggerFact)
    {
      ...state,
      fighter: {
        ...state.fighter,
        activeEffects: state.fighter.activeEffects.map(effect => match effect {
          | SleetStormAreaHazard(data) =>
              if (data.areaId == areaId)
                SleetStormAreaHazard({ ...data, savedThisTurn: data.savedThisTurn.union(Set(targetActor)) })
              else
                effect
          | _ => effect
        }),
      },
    }
  }

  pure def sleetStormAreaHazard(areaId: int): ActiveEffect =
    SleetStormAreaHazard({
      areaId: areaId,
      radiusFeet: sleetStormRadiusFeet,
      heightFeet: sleetStormHeightFeet,
      durationTicks: sleetStormDurationTicks,
      savedThisTurn: Set(),
    })

  pure def resolveSleetStorm(
    state: BattleState,
    areaId: int,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 3)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutSleetStormAreaHazard(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(sleetStormAreaHazard(areaId))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def combatantAfterSleetStormAreaHazardSave(
    target: Combatant,
    savingThrowSucceeded: bool,
  ): Combatant =
    if (persistentAreaConditionApplies(savingThrowSucceeded))
      { ...breakConcentration(target), prone: true }
    else
      target

  pure def resolveSleetStormAreaHazardSave(
    state: BattleState,
    targetActor: Actor,
    triggerFact: SleetStormAreaMembershipTriggerFact,
    savingThrowSucceeded: bool,
  ): BattleState = {
    val areaId = sleetStormAreaHazardTriggerAreaId(triggerFact)
    val saved = sleetStormSaveAlreadyResolved(state, targetActor, areaId)
    if (not(areaEffectTriggerCanResolve(
      sleetStormAreaHazardActive(state, areaId),
      true,
      firstPerTimingPerTurnAreaTriggerProfile(
        Set(CreatureEntersArea, CreatureStartsTurnInArea),
        if (saved)
          Set(CreatureEntersArea, CreatureStartsTurnInArea)
        else
          Set(),
      ),
      sleetStormAreaHazardSaveTriggerTiming(triggerFact),
    )))
      state
    else {
      val marked = markSleetStormSavedThisTurn(state, targetActor, triggerFact)
      match targetActor {
        | Fighter => { ...marked, fighter: combatantAfterSleetStormAreaHazardSave(marked.fighter, savingThrowSucceeded) }
        | Goblin => { ...marked, goblin: combatantAfterSleetStormAreaHazardSave(marked.goblin, savingThrowSucceeded) }
      }
    }
  }

  pure def removeSleetStormArea(state: BattleState, areaId: int): BattleState =
    if (sleetStormAreaHazardActive(state, areaId))
      breakConcentrationSpellEffects(state, Fighter)
    else
      state

}
