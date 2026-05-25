// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-levitated-creature
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-levitated-creature
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE

module battleRuntimeLevitateCreature {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  pure val levitateInitialRiseMaxFeet = 20
  pure val levitateAltitudeChangeMaxFeet = 20
  pure val levitateRangeFeet = 60
  pure val levitateDurationTicks = 100

  pure def levitateInitialRiseIsLegal(distanceFeet: int): bool =
    distanceFeet >= 0 and distanceFeet <= levitateInitialRiseMaxFeet

  pure def levitateAltitudeChangeIsLegal(distanceFeet: int): bool =
    distanceFeet > 0 and distanceFeet <= levitateAltitudeChangeMaxFeet

  pure def levitatedClimbingMovementCost(speedKind: MovementSpeedKind, distanceFeet: int): int =
    if (speedKind == ClimbSpeedKind) distanceFeet else distanceFeet * 2

  pure def levitatedCreatureEffect(source: Actor, initialRiseFeet: int): ActiveEffect =
    LevitatedCreature({
      source: source,
      altitudeFeet: initialRiseFeet,
      maxAltitudeChangeFeet: levitateAltitudeChangeMaxFeet,
      rangeFeet: levitateRangeFeet,
      durationTicks: levitateDurationTicks,
    })

  pure def activeEffectsWithoutLevitatedCreature(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | LevitatedCreature(_) => false
      | _ => true
    })

  pure def activeEffectsContainLevitatedCreatureFrom(effects: Set[ActiveEffect], source: Actor): bool =
    effects.exists(effect => match effect {
      | LevitatedCreature(data) => data.source == source
      | _ => false
    })

  pure def levitatedCreatureStillActiveFrom(state: BattleState, source: Actor): bool =
    activeEffectsContainLevitatedCreatureFrom(state.fighter.activeEffects, source) or
      activeEffectsContainLevitatedCreatureFrom(state.goblin.activeEffects, source)

  pure def stateWithLevitatedCreatureConcentrationClearedIfNoEffects(state: BattleState, source: Actor): BattleState =
    if (levitatedCreatureStillActiveFrom(state, source))
      state
    else
      match source {
        | Fighter => { ...state, fighter: { ...state.fighter, concentrating: false } }
        | Goblin => { ...state, goblin: { ...state.goblin, concentrating: false } }
      }

  pure def stateWithDisplacedLevitatedCreatureConcentrationCleanup(
    state: BattleState,
    displacedEffects: Set[ActiveEffect],
  ): BattleState = {
    val afterFighterCleanup =
      if (activeEffectsContainLevitatedCreatureFrom(displacedEffects, Fighter))
        stateWithLevitatedCreatureConcentrationClearedIfNoEffects(state, Fighter)
      else
        state
    if (activeEffectsContainLevitatedCreatureFrom(displacedEffects, Goblin))
      stateWithLevitatedCreatureConcentrationClearedIfNoEffects(afterFighterCleanup, Goblin)
    else
      afterFighterCleanup
  }

  pure def levitatedCreatureAltitudeFrom(effects: Set[ActiveEffect], source: Actor): int =
    effects
      .map(effect => match effect {
        | LevitatedCreature(data) => if (data.source == source) data.altitudeFeet else -1
        | _ => -1
      })
      .fold(-1, (highest, altitude) => if (highest > altitude) highest else altitude)

  pure def shiftedLevitatedCreatureAltitude(altitudeFeet: int, directionUp: bool, distanceFeet: int): int =
    if (directionUp)
      altitudeFeet + distanceFeet
    else if (distanceFeet > altitudeFeet)
      0
    else
      altitudeFeet - distanceFeet

  pure def activeEffectsWithLevitatedCreatureAltitudeChanged(
    effects: Set[ActiveEffect],
    source: Actor,
    directionUp: bool,
    distanceFeet: int,
  ): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | LevitatedCreature(data) =>
        if (data.source == source)
          LevitatedCreature({ ...data, altitudeFeet: shiftedLevitatedCreatureAltitude(data.altitudeFeet, directionUp, distanceFeet) })
        else
          effect
      | _ => effect
    })

  pure def stateWithLevitatedCreatureTargetEffect(
    state: BattleState,
    target: Actor,
    source: Actor,
    initialRiseFeet: int,
  ): BattleState =
    match target {
      | Fighter => {
          val replaced = {
            ...state,
            fighter: {
              ...state.fighter,
              activeEffects: activeEffectsWithoutLevitatedCreature(state.fighter.activeEffects)
                .union(Set(levitatedCreatureEffect(source, initialRiseFeet))),
            },
          }
          stateWithDisplacedLevitatedCreatureConcentrationCleanup(replaced, state.fighter.activeEffects)
        }
      | Goblin => {
          val replaced = {
            ...state,
            goblin: {
              ...state.goblin,
              activeEffects: activeEffectsWithoutLevitatedCreature(state.goblin.activeEffects)
                .union(Set(levitatedCreatureEffect(source, initialRiseFeet))),
            },
          }
          stateWithDisplacedLevitatedCreatureConcentrationCleanup(replaced, state.goblin.activeEffects)
        }
    }

  pure def stateWithLevitatedCreatureAltitudeChanged(
    state: BattleState,
    target: Actor,
    source: Actor,
    directionUp: bool,
    distanceFeet: int,
  ): BattleState =
    match target {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: activeEffectsWithLevitatedCreatureAltitudeChanged(state.fighter.activeEffects, source, directionUp, distanceFeet),
          },
        }
      | Goblin => {
          ...state,
          goblin: {
            ...state.goblin,
            activeEffects: activeEffectsWithLevitatedCreatureAltitudeChanged(state.goblin.activeEffects, source, directionUp, distanceFeet),
          },
        }
    }

  pure def targetHasLevitatedCreatureFrom(state: BattleState, target: Actor, source: Actor): bool =
    match target {
      | Fighter => activeEffectsContainLevitatedCreatureFrom(state.fighter.activeEffects, source)
      | Goblin => activeEffectsContainLevitatedCreatureFrom(state.goblin.activeEffects, source)
    }

  pure def targetLevitatedCreatureAltitudeFrom(state: BattleState, target: Actor, source: Actor): int =
    match target {
      | Fighter => levitatedCreatureAltitudeFrom(state.fighter.activeEffects, source)
      | Goblin => levitatedCreatureAltitudeFrom(state.goblin.activeEffects, source)
    }

  pure def resolveLevitateCreature(
    state: BattleState,
    target: Actor,
    targetIsWilling: bool,
    constitutionSaveSucceeded: bool,
    initialRiseFeet: int,
    slotLevel: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      slotLevel >= 2 and
      state.actionAvailable and
      canExpendSpellSlotThisTurn(state) and
      levitateInitialRiseIsLegal(initialRiseFeet) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      if (not(targetIsWilling) and constitutionSaveSucceeded)
        commitActorSpellSlotUse({ ...state, actionAvailable: false }, Fighter)
      else {
        val concentrationBase = breakConcentrationSpellEffects(state, Fighter)
        val effected = stateWithLevitatedCreatureTargetEffect(concentrationBase, target, Fighter, initialRiseFeet)
        commitActorSpellSlotUse({
          ...effected,
          fighter: { ...effected.fighter, concentrating: true },
          actionAvailable: false,
        }, Fighter)
      }
    } else
      state

  pure def controlLevitatedCreatureAltitude(
    state: BattleState,
    target: Actor,
    source: Actor,
    targetWithinRange: bool,
    directionUp: bool,
    distanceFeet: int,
  ): BattleState =
    if (
      currentActor(state) == source and
      target != source and
      state.actionAvailable and
      targetWithinRange and
      targetHasLevitatedCreatureFrom(state, target, source) and
      levitateAltitudeChangeIsLegal(distanceFeet)
    )
      { ...stateWithLevitatedCreatureAltitudeChanged(state, target, source, directionUp, distanceFeet), actionAvailable: false }
    else
      state

  pure def moveLevitatedTargetWithWitness(
    state: BattleState,
    target: Actor,
    source: Actor,
    fixedObjectOrSurfaceWithinReach: bool,
    speedKind: MovementSpeedKind,
    movementCostFeet: int,
    directionUp: bool,
    distanceFeet: int,
  ): BattleState =
    if (
      currentActor(state) == target and
      fixedObjectOrSurfaceWithinReach and
      targetHasLevitatedCreatureFrom(state, target, source) and
      levitateAltitudeChangeIsLegal(distanceFeet) and
      movementCostFeet == levitatedClimbingMovementCost(speedKind, distanceFeet)
    )
      stateWithLevitatedCreatureAltitudeChanged(state, target, source, directionUp, distanceFeet)
    else
      state

  run levitateCreatureInitialRiseIsCallerSelected = {
    val resolved = resolveLevitateCreature(initialState, Goblin, true, false, 5, 2)
    val tooHigh = resolveLevitateCreature(initialState, Goblin, true, false, 25, 2)
    all {
      assert(targetLevitatedCreatureAltitudeFrom(resolved, Goblin, Fighter) == 5),
      assert(not(targetHasLevitatedCreatureFrom(tooHigh, Goblin, Fighter))),
      assert(not(resolved.actionAvailable)),
      assert(resolved.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(resolved.fighter.concentrating),
    }
  }

  run levitateCreatureSuccessfulSaveSpendsOnly = {
    val resolved = resolveLevitateCreature(initialState, Goblin, false, true, 10, 2)
    all {
      assert(not(resolved.actionAvailable)),
      assert(resolved.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(not(targetHasLevitatedCreatureFrom(resolved, Goblin, Fighter))),
      assert(not(resolved.fighter.concentrating)),
    }
  }

  run levitateCreatureMovementWitnessAndCasterControl = {
    val cast = resolveLevitateCreature(initialState, Goblin, true, false, 10, 2)
    val goblinTurn = { ...cast, initiative: { ...cast.initiative, alreadyActed: [Fighter], stillToAct: [Goblin] }, actionAvailable: true }
    val missingWitness = moveLevitatedTargetWithWitness(goblinTurn, Goblin, Fighter, false, WalkSpeedKind, 10, true, 5)
    val underpaidClimb = moveLevitatedTargetWithWitness(goblinTurn, Goblin, Fighter, true, WalkSpeedKind, 5, true, 5)
    val witnessedMove = moveLevitatedTargetWithWitness(goblinTurn, Goblin, Fighter, true, WalkSpeedKind, 10, true, 5)
    val fighterTurn = { ...witnessedMove, initiative: { ...witnessedMove.initiative, alreadyActed: [], stillToAct: [Fighter, Goblin] }, actionAvailable: true }
    val outOfRange = controlLevitatedCreatureAltitude(fighterTurn, Goblin, Fighter, false, true, 5)
    val controlled = controlLevitatedCreatureAltitude(fighterTurn, Goblin, Fighter, true, false, 10)
    all {
      assert(targetLevitatedCreatureAltitudeFrom(missingWitness, Goblin, Fighter) == 10),
      assert(targetLevitatedCreatureAltitudeFrom(underpaidClimb, Goblin, Fighter) == 10),
      assert(targetLevitatedCreatureAltitudeFrom(witnessedMove, Goblin, Fighter) == 15),
      assert(targetLevitatedCreatureAltitudeFrom(outOfRange, Goblin, Fighter) == 15),
      assert(targetLevitatedCreatureAltitudeFrom(controlled, Goblin, Fighter) == 5),
      assert(not(controlled.actionAvailable)),
    }
  }

  run levitateCreatureSelfTargetUsesMovementOnlyForAltitude = {
    val cast = resolveLevitateCreature(initialState, Fighter, true, false, 10, 2)
    val fighterTurn = { ...cast, actionAvailable: true }
    val magicActionControl = controlLevitatedCreatureAltitude(fighterTurn, Fighter, Fighter, true, true, 5)
    val witnessedMove = moveLevitatedTargetWithWitness(fighterTurn, Fighter, Fighter, true, WalkSpeedKind, 10, true, 5)
    all {
      assert(targetLevitatedCreatureAltitudeFrom(magicActionControl, Fighter, Fighter) == 10),
      assert(magicActionControl.actionAvailable),
      assert(targetLevitatedCreatureAltitudeFrom(witnessedMove, Fighter, Fighter) == 15),
    }
  }

  run levitateCreatureReplacementClearsDisplacedSourceConcentration = {
    val goblinLevitatingItself = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        concentrating: true,
        activeEffects: Set(levitatedCreatureEffect(Goblin, 8)),
      },
    }
    val replaced = resolveLevitateCreature(goblinLevitatingItself, Goblin, true, false, 10, 2)
    all {
      assert(not(replaced.goblin.concentrating)),
      assert(replaced.fighter.concentrating),
      assert(not(targetHasLevitatedCreatureFrom(replaced, Goblin, Goblin))),
      assert(targetHasLevitatedCreatureFrom(replaced, Goblin, Fighter)),
    }
  }

  run levitateCreatureConcentrationCleanupRemovesTargetEffect = {
    val resolved = resolveLevitateCreature(initialState, Goblin, true, false, 10, 2)
    val cleaned = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(cleaned.fighter.concentrating)),
      assert(not(targetHasLevitatedCreatureFrom(cleaned, Goblin, Fighter))),
    }
  }

  run levitateCreatureDurationCleanupRemovesTargetEffect = {
    val resolved = resolveLevitateCreature(initialState, Goblin, true, false, 10, 2)
    val expiring = {
      ...resolved,
      goblin: {
        ...resolved.goblin,
        activeEffects: Set(LevitatedCreature({
          source: Fighter,
          altitudeFeet: 10,
          maxAltitudeChangeFeet: levitateAltitudeChangeMaxFeet,
          rangeFeet: levitateRangeFeet,
          durationTicks: 1,
        })),
      },
    }
    val cleaned = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(cleaned.fighter.concentrating)),
      assert(not(targetHasLevitatedCreatureFrom(cleaned, Goblin, Fighter))),
    }
  }
}
