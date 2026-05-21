// -*- mode: Bluespec; -*-

module battleRuntimeObjectContactDamage {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  pure val heatMetalDurationTicks = 10
  pure val heatMetalObjectId = 4

  pure def heatMetalDamageDice(slotLevel: int): int =
    2 + (slotLevel - 2)

  pure def heatMetalObjectContactDamageEffect(
    state: BattleState,
    objectId: int,
    slotLevel: int,
  ): ActiveEffect =
    HeatMetalObjectContactDamage({
      objectId: objectId,
      damageDice: heatMetalDamageDice(slotLevel),
      durationTicks: heatMetalDurationTicks,
      startedRound: state.initiative.round,
    })

  pure def activeEffectsWithoutHeatMetalObjectContactDamage(
    effects: Set[ActiveEffect],
    objectId: int,
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HeatMetalObjectContactDamage(data) => data.objectId != objectId
      | _ => true
    })

  pure def heatMetalObjectContactDamageActiveForCombatant(combatant: Combatant, objectId: int): bool =
    combatant.activeEffects.exists(effect => match effect {
      | HeatMetalObjectContactDamage(data) => data.objectId == objectId
      | _ => false
    })

  pure def heatMetalObjectContactDamageActive(state: BattleState, objectId: int): bool =
    heatMetalObjectContactDamageActiveForCombatant(state.fighter, objectId)

  pure def heatMetalObjectContactDamageActiveDamageDice(state: BattleState, objectId: int): int =
    state.fighter.activeEffects
      .map(effect => match effect {
        | HeatMetalObjectContactDamage(data) => if (data.objectId == objectId) data.damageDice else 0
        | _ => 0
      })
      .fold(0, (highest, damageDice) => if (highest > damageDice) highest else damageDice)

  pure def heatMetalObjectContactDamageStartedRound(state: BattleState, objectId: int): int =
    state.fighter.activeEffects
      .map(effect => match effect {
        | HeatMetalObjectContactDamage(data) => if (data.objectId == objectId) data.startedRound else 0
        | _ => 0
      })
      .fold(0, (highest, round) => if (highest > round) highest else round)

  pure def heatMetalAdjustedDamage(rolledDamage: int): int =
    damageAfterAdjustments(
      rolledDamage,
      Fire,
      Set(),
      Set(),
      Set(),
    )

  pure def combatantWithHeatMetalDamage(
    target: Combatant,
    rolledDamage: int,
    concentrationSaveSucceeded: bool,
  ): Combatant =
    applyDamageFromSource(
      target,
      heatMetalAdjustedDamage(rolledDamage),
      1,
      concentrationSaveSucceeded,
      OrdinaryDamage,
      Fighter,
    )

  pure def heatMetalHoldingWearingPenaltyEffect(source: Actor, objectId: int): ActiveEffect =
    HeatMetalHoldingWearingPenalty({
      source: source,
      objectId: objectId,
      expiresAtActor: source,
    })

  pure def heatMetalFailedHoldingWearingSaveTargets(
    contactTargets: Set[Actor],
    holdingOrWearingTargets: Set[Actor],
    saveSucceededTargets: Set[Actor],
  ): Set[Actor] =
    contactTargets
      .filter(target => holdingOrWearingTargets.contains(target))
      .filter(target => not(saveSucceededTargets.contains(target)))

  pure def heatMetalDropWitnessesValid(
    failedTargets: Set[Actor],
    canDropTargets: Set[Actor],
    droppedTargets: Set[Actor],
  ): bool =
    droppedTargets.forall(target => failedTargets.contains(target) and canDropTargets.contains(target)) and
      failedTargets.forall(target =>
        if (canDropTargets.contains(target))
          droppedTargets.contains(target)
        else
          not(droppedTargets.contains(target))
      )

  pure def heatMetalDroppedTargets(
    contactTargets: Set[Actor],
    holdingOrWearingTargets: Set[Actor],
    saveSucceededTargets: Set[Actor],
    canDropTargets: Set[Actor],
    droppedTargets: Set[Actor],
  ): Set[Actor] = {
    val failedTargets = heatMetalFailedHoldingWearingSaveTargets(contactTargets, holdingOrWearingTargets, saveSucceededTargets)
    if (heatMetalDropWitnessesValid(failedTargets, canDropTargets, droppedTargets))
      droppedTargets
    else
      Set()
  }

  pure def heatMetalPenaltyTargets(
    contactTargets: Set[Actor],
    holdingOrWearingTargets: Set[Actor],
    saveSucceededTargets: Set[Actor],
    canDropTargets: Set[Actor],
    droppedTargets: Set[Actor],
  ): Set[Actor] = {
    val failedTargets = heatMetalFailedHoldingWearingSaveTargets(contactTargets, holdingOrWearingTargets, saveSucceededTargets)
    if (heatMetalDropWitnessesValid(failedTargets, canDropTargets, droppedTargets))
      failedTargets.filter(target => not(droppedTargets.contains(target)))
    else
      Set()
  }

  pure def stateAfterHeatMetalContactDamage(
    state: BattleState,
    objectId: int,
    contactTargets: Set[Actor],
    holdingOrWearingTargets: Set[Actor],
    saveSucceededTargets: Set[Actor],
    canDropTargets: Set[Actor],
    droppedTargets: Set[Actor],
    rolledDamage: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState = {
    val penaltyTargets = heatMetalPenaltyTargets(
      contactTargets,
      holdingOrWearingTargets,
      saveSucceededTargets,
      canDropTargets,
      droppedTargets,
    )
    val penalty = heatMetalHoldingWearingPenaltyEffect(Fighter, objectId)
    val damagedFighter =
      if (contactTargets.contains(Fighter))
        combatantWithHeatMetalDamage(state.fighter, rolledDamage, fighterConcentrationSaveSucceeded)
      else
        state.fighter
    val sourceEffectStillActive = heatMetalObjectContactDamageActiveForCombatant(damagedFighter, objectId)
    val damagedGoblin =
      if (contactTargets.contains(Goblin))
        combatantWithHeatMetalDamage(state.goblin, rolledDamage, goblinConcentrationSaveSucceeded)
      else
        state.goblin
    val penalizedFighter =
      if (penaltyTargets.contains(Fighter) and sourceEffectStillActive)
        { ...damagedFighter, activeEffects: damagedFighter.activeEffects.exclude(Set(penalty)).union(Set(penalty)) }
      else
        damagedFighter
    val penalizedGoblin =
      if (penaltyTargets.contains(Goblin) and sourceEffectStillActive)
        { ...damagedGoblin, activeEffects: damagedGoblin.activeEffects.exclude(Set(penalty)).union(Set(penalty)) }
      else
        damagedGoblin
    {
      ...state,
      fighter: penalizedFighter,
      goblin: penalizedGoblin,
    }
  }

  pure def resolveHeatMetal(
    state: BattleState,
    objectId: int,
    contactTargets: Set[Actor],
    holdingOrWearingTargets: Set[Actor],
    saveSucceededTargets: Set[Actor],
    canDropTargets: Set[Actor],
    droppedTargets: Set[Actor],
    slotLevel: int,
    rolledDamage: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 2)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val cast = commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutHeatMetalObjectContactDamage(withoutPrior.fighter.activeEffects, objectId)
            .union(Set(heatMetalObjectContactDamageEffect(withoutPrior, objectId, slotLevel))),
        },
        actionAvailable: false,
      }, Fighter)
      stateAfterHeatMetalContactDamage(
        cast,
        objectId,
        contactTargets,
        holdingOrWearingTargets,
        saveSucceededTargets,
        canDropTargets,
        droppedTargets,
        rolledDamage,
        fighterConcentrationSaveSucceeded,
        goblinConcentrationSaveSucceeded,
      )
    }

  pure def heatMetalRepeatAvailable(
    state: BattleState,
    objectId: int,
    objectWithinRange: bool,
  ): bool =
    currentActor(state) == Fighter and
      state.bonusActionAvailable and
      objectWithinRange and
      heatMetalObjectContactDamageActive(state, objectId) and
      heatMetalObjectContactDamageStartedRound(state, objectId) != state.initiative.round

  pure def resolveHeatMetalRepeat(
    state: BattleState,
    objectId: int,
    objectWithinRange: bool,
    contactTargets: Set[Actor],
    holdingOrWearingTargets: Set[Actor],
    saveSucceededTargets: Set[Actor],
    canDropTargets: Set[Actor],
    droppedTargets: Set[Actor],
    rolledDamage: int,
    fighterConcentrationSaveSucceeded: bool,
    goblinConcentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(heatMetalRepeatAvailable(state, objectId, objectWithinRange)))
      state
    else {
      val damaged = stateAfterHeatMetalContactDamage(
        state,
        objectId,
        contactTargets,
        holdingOrWearingTargets,
        saveSucceededTargets,
        canDropTargets,
        droppedTargets,
        rolledDamage,
        fighterConcentrationSaveSucceeded,
        goblinConcentrationSaveSucceeded,
      )
      { ...damaged, bonusActionAvailable: false }
    }
}
