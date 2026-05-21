// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
module battleRuntimeGroundCommand {
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

  pure val greaseDurationTicks = 10
  pure val greaseAreaId = 1
  pure val fogCloudDurationTicks = 600
  pure val fogCloudAreaId = 2
  pure val fogCloudBaseRadiusFeet = 20
  pure val fogCloudRadiusFeetPerSlotAboveFirst = 20
  pure val darknessDurationTicks = 100
  pure val darknessAreaId = 5
  pure val darknessRadiusFeet = 15
  pure val antimagicFieldDurationTicks = 600
  pure val antimagicFieldAreaId = 6
  pure val antimagicFieldRadiusFeet = 10
  pure val flamingSphereDurationTicks = 10
  pure val flamingSphereAreaId = 3
  pure val flamingSphereDiameterFeet = 5
  pure val flamingSphereRamMaxMoveFeet = 30
  pure val webDurationTicks = 600
  pure val webAreaId = 4
  pure val webSideFeet = 20

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

  pure def resolveGrease(
    state: BattleState,
    goblinIncludedInArea: bool,
    goblinSavingThrowSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutGreaseGroundHazard(state.fighter.activeEffects, greaseAreaId)
            .union(Set(GreaseGroundHazard({ areaId: greaseAreaId, durationTicks: greaseDurationTicks }))),
        },
        goblin: if (goblinIncludedInArea) combatantAfterGreaseSave(state.goblin, goblinSavingThrowSucceeded) else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def greaseGroundHazardActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | GreaseGroundHazard(data) => data.areaId == areaId
      | _ => false
    })

  pure def webAreaHazardActiveForTerrain(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | WebRestraintHazard(data) => data.areaId == areaId
      | _ => false
    })

  pure def areaDifficultTerrainActive(state: BattleState, areaId: int): bool =
    greaseGroundHazardActive(state, areaId) or webAreaHazardActiveForTerrain(state, areaId)

  pure def areaDifficultTerrainMovementCost(state: BattleState, areaId: int, totalDistanceFeet: int, difficultTerrainDistanceFeet: int): int =
    if (areaDifficultTerrainActive(state, areaId) and totalDistanceFeet > 0 and difficultTerrainDistanceFeet > 0 and difficultTerrainDistanceFeet <= totalDistanceFeet)
      totalDistanceFeet + difficultTerrainDistanceFeet
    else
      0

  pure def moveFighterThroughGreaseGroundDifficultTerrain(state: BattleState, areaId: int, totalDistanceFeet: int, greaseDistanceFeet: int, provokedByTable: bool): BattleState = {
    val movementCost = areaDifficultTerrainMovementCost(state, areaId, totalDistanceFeet, greaseDistanceFeet)
    if (movementCost == 0)
      state
    else
      moveFighter(state, movementCost, provokedByTable)
  }

  pure def resolveGreaseGroundHazardSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
  ): BattleState =
    if (not(greaseGroundHazardActive(state, areaId)))
      state
    else {
      match targetActor {
        | Fighter => { ...state, fighter: combatantAfterGreaseSave(state.fighter, savingThrowSucceeded) }
        | Goblin => { ...state, goblin: combatantAfterGreaseSave(state.goblin, savingThrowSucceeded) }
      }
    }

  pure def endTurnWithGreaseGroundHazardSave(
    state: BattleState,
    targetActor: Actor,
    areaId: int,
    savingThrowSucceeded: bool,
  ): BattleState =
    endTurn(resolveGreaseGroundHazardSave(state, targetActor, areaId, savingThrowSucceeded))

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

  pure def activeEffectsWithoutAntimagicFieldOngoingSpellSuppression(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | AntimagicFieldOngoingSpellSuppression(data) => data.areaId != areaId
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

  pure def resolveAntimagicFieldOngoingSpellSuppression(
    state: BattleState,
    areaId: int,
    suppressedSourceEffectIds: Set[int],
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 8)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutAntimagicFieldOngoingSpellSuppression(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(AntimagicFieldOngoingSpellSuppression({
              areaId: areaId,
              radiusFeet: antimagicFieldRadiusFeet,
              suppressedSourceEffectIds: suppressedSourceEffectIds,
              durationTicks: antimagicFieldDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def antimagicFieldOngoingSpellSuppressionActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | AntimagicFieldOngoingSpellSuppression(data) => data.areaId == areaId
      | _ => false
    })

  pure def flamingSphereDamageDice(slotLevel: int): int =
    2 + (slotLevel - 2)

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

  pure def flamingSphereDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded)
      rolledDamage / 2
    else
      rolledDamage

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
    if (triggerIsEntry)
      webEntrySaveAlreadyResolved(state, targetActor, areaId)
    else
      webStartTurnSaveAlreadyResolved(state, targetActor, areaId)

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
    if (not(webRestraintHazardActive(state, areaId)) or webRestraintSaveAlreadyResolved(state, targetActor, areaId, triggerIsEntry))
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
