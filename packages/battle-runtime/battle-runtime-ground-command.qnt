// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel spell.invocation-fog-cloud-obscurement spell.invocation-grease-ground-hazard spell.invocation-magical-darkness-point-origin spell.invocation-spike-growth-movement-hazard spell.invocation-web-restraint-hazard

// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE
module battleRuntimeGroundCommand {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeCommandChoice.* from "./battle-runtime-command-choice"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeShapeShifting.* from "./battle-runtime-shape-shifting"
  import battleRuntimeFlamingSphereHazardRam.* from "./battle-runtime-flaming-sphere-hazard-ram"

  pure val greaseDurationTicks = 10
  pure val greaseAreaId = 1
  pure val spikeGrowthDurationTicks = 100
  pure val spikeGrowthAreaId = 7
  pure val spikeGrowthDamagePerFeet = 5
  pure val fogCloudDurationTicks = 600
  pure val fogCloudAreaId = 2
  pure val fogCloudBaseRadiusFeet = 20
  pure val fogCloudRadiusFeetPerSlotAboveFirst = 20
  pure val darknessDurationTicks = 100
  pure val darknessAreaId = 5
  pure val darknessRadiusFeet = 15
  pure val flamingSphereAreaId = 3
  pure val moonbeamDurationTicks = 10
  pure val moonbeamAreaId = 6
  pure val moonbeamRadiusFeet = 5
  pure val moonbeamHeightFeet = 40
  pure val moonbeamRepositionMaxMoveFeet = 60
  pure val webDurationTicks = 600
  pure val webAreaId = 4
  pure val webSideFeet = 20
  pure val noHeightenedSpellTarget = NoHeightenedSpellTarget

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

  pure def activeEffectsWithoutSpikeGrowthMovementHazard(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SpikeGrowthMovementHazard(data) => data.areaId != areaId
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

  pure def greaseGroundHazardActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | GreaseGroundHazard(data) => data.areaId == areaId
      | _ => false
    })

  pure def spikeGrowthMovementHazardActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | SpikeGrowthMovementHazard(data) => data.areaId == areaId
      | _ => false
    })

  pure def webAreaHazardActiveForTerrain(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | WebRestraintHazard(data) => data.areaId == areaId
      | _ => false
    })

  pure def areaDifficultTerrainActive(state: BattleState, areaId: int): bool =
    greaseGroundHazardActive(state, areaId) or spikeGrowthMovementHazardActive(state, areaId) or webAreaHazardActiveForTerrain(state, areaId)

  pure def areaDifficultTerrainMovementCost(state: BattleState, areaId: int, totalDistanceFeet: int, difficultTerrainDistanceFeet: int): int =
    if (areaDifficultTerrainActive(state, areaId) and totalDistanceFeet > 0 and difficultTerrainDistanceFeet > 0 and difficultTerrainDistanceFeet <= totalDistanceFeet)
      totalDistanceFeet + difficultTerrainDistanceFeet
    else
      0

  pure def moveFighterThroughSpikeGrowthDifficultTerrain(state: BattleState, areaId: int, totalDistanceFeet: int, difficultTerrainDistanceFeet: int, provokedByTable: bool): BattleState = {
    val movementCost = areaDifficultTerrainMovementCost(state, areaId, totalDistanceFeet, difficultTerrainDistanceFeet)
    if (movementCost == 0)
      state
    else
      moveFighter(state, movementCost, provokedByTable)
  }

  pure def resolveSpikeGrowth(
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
          activeEffects: activeEffectsWithoutSpikeGrowthMovementHazard(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(SpikeGrowthMovementHazard({
              areaId: areaId,
              damageDice: 2,
              damagePerFeet: spikeGrowthDamagePerFeet,
              durationTicks: spikeGrowthDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def spikeGrowthMovementDamageAmount(rolledDamage: int, movementFeet: int): int =
    rolledDamage * (movementFeet / spikeGrowthDamagePerFeet)

  pure def combatantWithSpikeGrowthDamage(
    target: Combatant,
    rolledDamage: int,
    movementFeet: int,
  ): Combatant =
    applyDamageFromSource(
      target,
      damageAfterAdjustments(
        spikeGrowthMovementDamageAmount(rolledDamage, movementFeet),
        Piercing,
        Set(),
        Set(),
        Set(),
      ),
      1,
      true,
      OrdinaryDamage,
      Fighter,
    )

  pure def resolveSpikeGrowthMovementDamage(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    rolledDamage: int,
    movementFeet: int,
  ): BattleState =
    if (not(spikeGrowthMovementHazardActive(state, areaId)) or movementFeet <= 0)
      state
    else {
      match targetActor {
        | Fighter => { ...state, fighter: combatantWithSpikeGrowthDamage(state.fighter, rolledDamage, movementFeet) }
        | Goblin => { ...state, goblin: combatantWithSpikeGrowthDamage(state.goblin, rolledDamage, movementFeet) }
      }
    }

  pure def moveFighterThroughGreaseGroundDifficultTerrain(state: BattleState, areaId: int, totalDistanceFeet: int, greaseDistanceFeet: int, provokedByTable: bool): BattleState = {
    val movementCost = areaDifficultTerrainMovementCost(state, areaId, totalDistanceFeet, greaseDistanceFeet)
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
      GreaseGroundHazardEveryTriggerProfile,
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

  pure def fogCloudRadiusFeet(slotLevel: int): int =
    fogCloudBaseRadiusFeet + ((slotLevel - 1) * fogCloudRadiusFeetPerSlotAboveFirst)

  pure def activeEffectsWithoutFogCloudObscurement(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FogCloudObscurement(data) => data.areaId != areaId
      | _ => true
    })

  pure def resolveFogCloud(
    state: BattleState,
    areaId: int,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 1)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutFogCloudObscurement(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(FogCloudObscurement({
              areaId: areaId,
              radiusFeet: fogCloudRadiusFeet(slotLevel),
              durationTicks: fogCloudDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def fogCloudObscurementActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | FogCloudObscurement(data) => data.areaId == areaId
      | _ => false
    })

  pure def disperseFogCloudByStrongWind(state: BattleState, areaId: int): BattleState =
    if (fogCloudObscurementActive(state, areaId))
      breakConcentrationSpellEffects(state, Fighter)
    else
      state

  pure def activeEffectsWithoutMagicalDarknessPointOrigin(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | MagicalDarknessPointOrigin(data) => data.areaId != areaId
      | _ => true
    })

  pure def resolveDarknessPointOrigin(
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
          activeEffects: activeEffectsWithoutMagicalDarknessPointOrigin(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(MagicalDarknessPointOrigin({
              areaId: areaId,
              radiusFeet: darknessRadiusFeet,
              durationTicks: darknessDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def magicalDarknessPointOriginActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | MagicalDarknessPointOrigin(data) => data.areaId == areaId
      | _ => false
    })

  pure def magicalDarknessPointOriginSightObscurement(state: BattleState, areaId: int, observer: SightObserver): SightObscurement =
    if (magicalDarknessPointOriginActive(state, areaId))
      HeavilyObscuredSight
    else
      UnobscuredSight

  pure def magicalDarknessPointOriginNonmagicalLightIllumination(state: BattleState, areaId: int, baseIllumination: Illumination): Illumination =
    if (magicalDarknessPointOriginActive(state, areaId))
      DarknessIllumination
    else
      baseIllumination

  pure def activeEffectsWithoutFlamingSphere(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FlamingSphere(data) => data.areaId != areaId
      | _ => true
    })

  pure def resolveFlamingSphere(
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
          activeEffects: activeEffectsWithoutFlamingSphere(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(FlamingSphere({
              areaId: areaId,
              damageDice: flamingSphereDamageDice(slotLevel),
              durationTicks: flamingSphereDurationTicks,
              ramMaxMoveFeet: flamingSphereRamMaxMoveFeet,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

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

  pure def flamingSphereAdjustedDamage(rolledDamage: int, savingThrowSucceeded: bool): int =
    damageAfterAdjustments(
      flamingSphereDamageAfterSave(rolledDamage, savingThrowSucceeded),
      Fire,
      Set(),
      Set(),
      Set(),
    )

  pure def combatantWithFlamingSphereDamage(
    target: Combatant,
    rolledDamage: int,
    savingThrowSucceeded: bool,
  ): Combatant =
    applyDamageFromSource(
      target,
      flamingSphereAdjustedDamage(rolledDamage, savingThrowSucceeded),
      1,
      true,
      OrdinaryDamage,
      Fighter,
    )

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

  pure def endTurnWithFlamingSphereEndWithinFiveFeetSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): BattleState =
    endTurn(resolveFlamingSphereEndWithinFiveFeetSave(state, targetActor, areaId, savingThrowSucceeded, rolledDamage))

  pure def resolveFlamingSphereRam(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
    moveFeet: int,
  ): BattleState =
    if (
      not(flamingSphereActive(state, areaId)) or
      currentActor(state) != Fighter or
      not(state.bonusActionAvailable) or
      moveFeet <= 0 or
      moveFeet > flamingSphereActiveRamMaxMoveFeet(state, areaId)
    )
      state
    else {
      val damaged = resolveFlamingSphereEndWithinFiveFeetSave(state, targetActor, areaId, savingThrowSucceeded, rolledDamage)
      { ...damaged, bonusActionAvailable: false }
    }

  pure def resolveFlamingSphereReposition(
    state: BattleState,
    areaId: int,
    moveFeet: int,
  ): BattleState =
    if (
      not(flamingSphereActive(state, areaId)) or
      currentActor(state) != Fighter or
      not(state.bonusActionAvailable) or
      moveFeet <= 0 or
      moveFeet > flamingSphereActiveRamMaxMoveFeet(state, areaId)
    )
      state
    else
      { ...state, bonusActionAvailable: false }

  pure def moonbeamDamageDice(slotLevel: int): int =
    2 + (slotLevel - 2)

  pure def activeEffectsWithoutMoonbeamMovableZone(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | MoonbeamMovableZone(data) => data.areaId != areaId
      | _ => true
    })

  pure def resolveMoonbeam(
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
          activeEffects: activeEffectsWithoutMoonbeamMovableZone(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(MoonbeamMovableZone({
              areaId: areaId,
              damageDice: moonbeamDamageDice(slotLevel),
              durationTicks: moonbeamDurationTicks,
              repositionMaxMoveFeet: moonbeamRepositionMaxMoveFeet,
              savedThisTurn: Set(),
              shapeShiftSuppressed: Set(),
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

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

  type MoonbeamShapeShiftRiderResult = {
    state: BattleState,
    targetShapeShiftState: ShapeShiftedRuntimeState,
  }

  pure def resolveMoonbeamShapeShiftRider(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    targetShapeShiftState: ShapeShiftedRuntimeState,
  ): MoonbeamShapeShiftRiderResult =
    if (savingThrowSucceeded)
      { state: state, targetShapeShiftState: targetShapeShiftState }
    else
      match revertShapeShiftedRuntimeState(targetShapeShiftState) {
        | ShapeShiftAlreadyTrueForm =>
            { state: state, targetShapeShiftState: TrueForm }
        | ShapeShiftRevertedToTrueForm =>
            {
              state: markMoonbeamShapeShiftSuppressed(state, targetActor, areaId),
              targetShapeShiftState: TrueForm,
            }
      }

  pure def moonbeamDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded)
      rolledDamage / 2
    else
      rolledDamage

  pure def moonbeamAdjustedDamage(rolledDamage: int, savingThrowSucceeded: bool): int =
    damageAfterAdjustments(
      moonbeamDamageAfterSave(rolledDamage, savingThrowSucceeded),
      Radiant,
      Set(),
      Set(),
      Set(),
    )

  pure def combatantWithMoonbeamDamage(
    target: Combatant,
    rolledDamage: int,
    savingThrowSucceeded: bool,
  ): Combatant =
    applyDamageFromSource(
      target,
      moonbeamAdjustedDamage(rolledDamage, savingThrowSucceeded),
      1,
      true,
      OrdinaryDamage,
      Fighter,
    )

  pure def resolveMoonbeamSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): BattleState =
    resolveMoonbeamSaveWithShapeShift(state, targetActor, areaId, savingThrowSucceeded, rolledDamage, TrueForm).state

  pure def resolveMoonbeamSaveWithShapeShift(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
    targetShapeShiftState: ShapeShiftedRuntimeState,
  ): MoonbeamShapeShiftRiderResult =
    if (not(areaEffectTriggerCanResolve(
      moonbeamActive(state, areaId),
      true,
      moonbeamOnceAcrossQualifiedTriggersProfile(moonbeamSavedThisTurn(state, targetActor, areaId)),
      CreatureEndsTurnInArea,
    )))
      { state: state, targetShapeShiftState: targetShapeShiftState }
    else {
      val marked = markMoonbeamSavedThisTurn(state, targetActor, areaId)
      val damaged = match targetActor {
        | Fighter => { ...marked, fighter: combatantWithMoonbeamDamage(marked.fighter, rolledDamage, savingThrowSucceeded) }
        | Goblin => { ...marked, goblin: combatantWithMoonbeamDamage(marked.goblin, rolledDamage, savingThrowSucceeded) }
      }
      val reverted = resolveMoonbeamShapeShiftRider(damaged, targetActor, areaId, savingThrowSucceeded, targetShapeShiftState)
      reverted
    }

  pure def endTurnWithMoonbeamSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
    rolledDamage: int,
  ): BattleState =
    endTurn(resetMoonbeamSavedThisTurn(resolveMoonbeamSave(state, targetActor, areaId, savingThrowSucceeded, rolledDamage)))

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

  pure def webRestraintSaveAlreadyResolved(state: BattleState, targetActor: Actor, areaId: int, triggerIsEntry: bool): bool =
    areaEffectTriggerAlreadyResolved(
      webRestraintFirstEntryAndStartTurnProfile(
        webEntrySaveAlreadyResolved(state, targetActor, areaId),
        webStartTurnSaveAlreadyResolved(state, targetActor, areaId),
      ),
      webRestraintSaveTriggerTiming(triggerIsEntry),
    )

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
  ): BattleState =
    if (not(areaEffectTriggerCanResolve(
      webRestraintHazardActive(state, areaId),
      true,
      webRestraintFirstEntryAndStartTurnProfile(
        webEntrySaveAlreadyResolved(state, targetActor, areaId),
        webStartTurnSaveAlreadyResolved(state, targetActor, areaId),
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

  pure def commandMaxTargets(slotLevel: int): int =
    slotLevel

  pure def commandPendingEffectFor(state: BattleState, targetActor: Actor, option: CommandOption): ActiveEffect =
    CommandPending({
      source: Fighter,
      option: option,
      expiresAtActor: targetActor,
      expiresAtRound: if (currentActor(state) == targetActor) state.initiative.round + 1 else state.initiative.round,
    })

  pure def activeEffectsWithoutCommandPending(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | CommandPending(data) => data.source != source
      | _ => true
    })

  pure def resolveCommand(
    state: BattleState,
    targets: Set[Actor],
    failedTargets: Set[Actor],
    slotLevel: int,
    option: CommandOption,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      targets.size() < 1 or
      targets.size() > commandMaxTargets(slotLevel) or
      not(failedTargets.forall(target => targets.contains(target)))
    )
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (failedTargets.contains(Fighter)) {
          ...state.fighter,
          activeEffects: activeEffectsWithoutCommandPending(state.fighter.activeEffects, Fighter)
            .union(Set(commandPendingEffectFor(state, Fighter, option))),
        } else state.fighter,
        goblin: if (failedTargets.contains(Goblin)) {
          ...state.goblin,
          activeEffects: activeEffectsWithoutCommandPending(state.goblin.activeEffects, Fighter)
            .union(Set(commandPendingEffectFor(state, Goblin, option))),
        } else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def commandPendingEffectsForActor(state: BattleState, actor: Actor, option: CommandOption): Set[ActiveEffect] =
    match actor {
      | Fighter => state.fighter.activeEffects
      | Goblin => state.goblin.activeEffects
    }
      .filter(effect => match effect {
        | CommandPending(data) =>
            data.option == option and data.expiresAtActor == actor and data.expiresAtRound == state.initiative.round
        | _ => false
      })

  pure def followCommandGrovel(state: BattleState): BattleState =
    match commandGrovelFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandGrovelOption).size() > 0) {
      | CommandGrovelAppliesProneEndsTurn =>
          match currentActor(state) {
            | Fighter => endTurn({
                ...state,
                fighter: {
                  ...state.fighter,
                  prone: true,
                  activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandGrovelOption)),
                },
              })
            | Goblin => endTurn({
                ...state,
                goblin: {
                  ...state.goblin,
                  prone: true,
                  activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandGrovelOption)),
                },
              })
          }
      | CommandGrovelIgnored => state
    }

  pure def commandDropOutcomeCount(state: BattleState, heldObjectCount: int): int =
    match commandDropFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandDropOption).size() > 0, heldObjectCount) {
      | CommandDropObjectsAndEndsTurn(outcome) => outcome.droppedObjectCount
      | CommandDropIgnored => 0
    }

  pure def followCommandDrop(state: BattleState, heldObjectCount: int): BattleState =
    match commandDropFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandDropOption).size() > 0, heldObjectCount) {
      | CommandDropObjectsAndEndsTurn(_) =>
          match currentActor(state) {
            | Fighter => endTurn({
                ...state,
                fighter: {
                  ...state.fighter,
                  activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandDropOption)),
                },
              })
            | Goblin => endTurn({
                ...state,
                goblin: {
                  ...state.goblin,
                  activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandDropOption)),
                },
              })
          }
      | CommandDropIgnored => state
    }

  pure def commandApproachFighterHasMovementAvailable(state: BattleState): bool =
    battleRuntimeCanSpendMovement(movementProjectionForFighter(state, WalkSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForFighter(state, ClimbSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForFighter(state, SwimSpeedKind), 1)

  pure def commandApproachGoblinHasMovementAvailable(state: BattleState): bool =
    battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, WalkSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, ClimbSpeedKind), 1)
      or battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, SwimSpeedKind), 1)

  pure def followCommandApproach(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
    movedWithinFiveFeetOfCaster: bool,
  ): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandApproachOption).size() > 0)
      match currentActor(state) {
        | Fighter => {
            val withoutPending = {
              ...state,
              fighter: {
                ...state.fighter,
                activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandApproachOption)),
              },
            }
            match commandApproachFollowOutcome(
              commandApproachFighterHasMovementAvailable(state),
              battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
              movedWithinFiveFeetOfCaster,
            ) {
              | CommandApproachNoMovement => withoutPending
              | CommandApproachMovementRejected => state
              | CommandApproachMovementContinues =>
                  stateWithFighterMovementStep(
                    withoutPending,
                    battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
                  )
              | CommandApproachMovementEndsTurn =>
                  endTurn(stateWithFighterMovementStep(
                    withoutPending,
                    battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
                  ))
            }
          }
        | Goblin => {
            val withoutPending = {
              ...state,
              goblin: {
                ...state.goblin,
                activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandApproachOption)),
              },
            }
            match commandApproachFollowOutcome(
              commandApproachGoblinHasMovementAvailable(state),
              battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
              movedWithinFiveFeetOfCaster,
            ) {
              | CommandApproachNoMovement => withoutPending
              | CommandApproachMovementRejected => state
              | CommandApproachMovementContinues =>
                  stateWithGoblinMovementStep(
                    withoutPending,
                    battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
                  )
              | CommandApproachMovementEndsTurn =>
                  endTurn(stateWithGoblinMovementStep(
                    withoutPending,
                    battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
                  ))
            }
          }
      }
    else
      state

  pure def commandFleeMovementRemaining(state: BattleState, actor: Actor, speedKind: MovementSpeedKind): int =
    match actor {
      | Fighter => battleRuntimeMovementRemaining(movementProjectionForFighter(state, speedKind))
      | Goblin => battleRuntimeMovementRemaining(movementProjectionForGoblin(state, speedKind))
    }

  pure def commandFleeCanSpendMovement(
    state: BattleState,
    actor: Actor,
    speedKind: MovementSpeedKind,
    movementCost: int,
  ): bool =
    match actor {
      | Fighter => battleRuntimeCanSpendMovement(movementProjectionForFighter(state, speedKind), movementCost)
      | Goblin => battleRuntimeCanSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost)
    }

  pure def commandFleeActorHasMovementAvailable(state: BattleState, actor: Actor): bool =
    commandFleeCanSpendMovement(state, actor, WalkSpeedKind, 1)
      or commandFleeCanSpendMovement(state, actor, ClimbSpeedKind, 1)
      or commandFleeCanSpendMovement(state, actor, SwimSpeedKind, 1)

  pure def stateWithoutCommandFleePending(state: BattleState, actor: Actor): BattleState =
    match actor {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandFleeOption)),
          },
        }
      | Goblin => {
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandFleeOption)),
          },
        }
    }

  pure def stateWithCommandFleeMovement(state: BattleState, actor: Actor, speedKind: MovementSpeedKind, movementCost: int): BattleState =
    match actor {
      | Fighter =>
          stateWithFighterMovementStep(
            state,
            battleRuntimeSpendMovement(movementProjectionForFighter(state, speedKind), movementCost),
          )
      | Goblin =>
          stateWithGoblinMovementStep(
            state,
            battleRuntimeSpendMovement(movementProjectionForGoblin(state, speedKind), movementCost),
          )
    }

  pure def followCommandFlee(
    state: BattleState,
    speedKind: MovementSpeedKind,
    movementCost: int,
    provokesOpportunityAttack: bool,
  ): BattleState =
    if (commandPendingEffectsForActor(state, currentActor(state), CommandFleeOption).size() > 0) {
      val actor = currentActor(state)
      val withoutPending = stateWithoutCommandFleePending(state, actor)
      match commandFleeFollowOutcome(
        commandFleeActorHasMovementAvailable(state, actor),
        movementCost,
        commandFleeMovementRemaining(state, actor, speedKind),
        commandFleeCanSpendMovement(state, actor, speedKind, movementCost),
        provokesOpportunityAttack,
      ) {
        | CommandFleeNoMovementEndsTurn => endTurn(withoutPending)
        | CommandFleeMovementRejected => state
        | CommandFleeOpportunityAttackContinuation =>
            openReactionWindow(state, {
              trigger: OpportunityAttack,
              procedure: OpportunityAttackReactionProcedure,
              eligibleReactors: if (actor == Fighter) Set(Goblin) else Set(Fighter),
              offeredReactors: Set(),
              continuation: ResumeCommandFleeMovement({
                speedKind: speedKind,
                movementCost: movementCost,
              }),
            })
        | CommandFleeMovementEndsTurn =>
            endTurn(stateWithCommandFleeMovement(withoutPending, actor, speedKind, movementCost))
      }
    } else {
      state
    }

  pure def followCommandHalt(state: BattleState): BattleState =
    match commandHaltFollowOutcome(commandPendingEffectsForActor(state, currentActor(state), CommandHaltOption).size() > 0) {
      | CommandHaltSuppressesActionBonusAndMovement =>
          match currentActor(state) {
            | Fighter => {
                ...state,
                actionAvailable: false,
                bonusActionAvailable: false,
                fighter: { ...state.fighter, movementSpent: state.fighter.speed },
              }
            | Goblin => {
                ...state,
                actionAvailable: false,
                bonusActionAvailable: false,
                goblin: { ...state.goblin, movementSpent: state.goblin.speed },
              }
          }
      | CommandHaltIgnored => state
    }

  pure def endCommandHaltTurn(state: BattleState): BattleState =
    match currentActor(state) {
      | Fighter => endTurn({
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: state.fighter.activeEffects.exclude(commandPendingEffectsForActor(state, Fighter, CommandHaltOption)),
          },
        })
      | Goblin => endTurn({
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: state.goblin.activeEffects.exclude(commandPendingEffectsForActor(state, Goblin, CommandHaltOption)),
          },
        })
    }
}
