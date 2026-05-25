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

  pure def targetActiveEffects(state: BattleState, target: Actor): Set[ActiveEffect] =
    match target {
      | Fighter => state.fighter.activeEffects
      | Goblin => state.goblin.activeEffects
    }

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
        val displacedEffects = targetActiveEffects(state, target)
        val concentrationBase = breakConcentrationSpellEffects(state, Fighter)
        val effected = stateWithLevitatedCreatureTargetEffect(concentrationBase, target, Fighter, initialRiseFeet)
        val cleaned = stateWithDisplacedLevitatedCreatureConcentrationCleanup(effected, displacedEffects)
        commitActorSpellSlotUse({
          ...cleaned,
          fighter: { ...cleaned.fighter, concentrating: true },
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
}
