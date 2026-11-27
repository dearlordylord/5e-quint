// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING

module battleRuntimeTurnAdvancement {
  import attackActionAdditionalAttacks.* from "../shared-algebras/proofs/rule-core/attack-action-additional-attacks"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeFighterOngoingFeatureLifecycle.* from "./battle-runtime-fighter-ongoing-feature-lifecycle"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"

  pure def actorIsDead(state: BattleState, actor: Actor): bool =
    match actor {
      | Fighter => combatantIsDead(state.fighter)
      | Goblin => combatantIsDead(state.goblin)
    }

  // ASSUMPTIONS.md A71: a dead creature takes no turn. Its turn passes with
  // only what ends at its start and end, and nothing asked of it. `state` has
  // the Initiative order on the passed turn.
  pure def passDeadActorTurn(state: BattleState): BattleState = {
    val passedActor = currentActor(state)
    expireFighterEndOfTurnOngoingFeatures(expireEndOfTurnSpellEffects(
      expireStartOfTurnSpellEffects(expireFighterStartOfTurnOngoingFeatures(state, passedActor), passedActor)
    ))
  }

  // With nobody alive, the order stays where it is (A71).
  pure def endTurn(state: BattleState): BattleState =
    if (actorIsDead(state, Fighter) and actorIsDead(state, Goblin)) state
    else endTurnToNextLivingActor(state)

  pure def endTurnToNextLivingActor(state: BattleState): BattleState = {
    val outgoing = normalizeFighterEarlyEndedOngoingFeatures(expireFighterEndOfTurnOngoingFeatures(expireEndOfTurnSpellEffects(state)))
    val followingInitiative = nextInitiative(outgoing.initiative)
    // Two participants: when the following one is dead, the turn passes back
    // to the one ending its turn.
    val passesDeadTurn = actorIsDead(outgoing, followingInitiative.stillToAct.actor)
    val featureChecked =
      if (passesDeadTurn) passDeadActorTurn({ ...outgoing, initiative: followingInitiative }).with("initiative", outgoing.initiative)
      else outgoing
    val advancedInitiative =
      if (passesDeadTurn) nextInitiative(followingInitiative)
      else followingInitiative
    val nextActor = advancedInitiative.stillToAct.actor
    val featureAdvanced = applyStartOfTurnSpellEffects(expireStartOfTurnSpellEffects(expireFighterStartOfTurnOngoingFeatures(featureChecked, nextActor), nextActor), nextActor)
    val spellDurationAdvanced = if (advancedInitiative.round > featureChecked.initiative.round)
      tickRoundDurationSpellEffects(featureAdvanced)
    else
      featureAdvanced
    val turnAdvanced = { ...spellDurationAdvanced, initiative: advancedInitiative }
    val nextActorStep =
      if (nextActor == Fighter)
        battleRuntimeStartTurn(movementProjectionForFighter(turnAdvanced, WalkSpeedKind))
      else
        battleRuntimeStartTurn(movementProjectionForGrappledGoblin(turnAdvanced))
    val advancedFighter = if (nextActor == Fighter)
      { ...spellDurationAdvanced.fighter, reactionAvailable: nextActorStep.reactionAvailable, movementSpent: nextActorStep.movementSpentFeet, dodging: nextActorStep.dodging }
    else
      spellDurationAdvanced.fighter
    val advancedGoblin = if (nextActor == Goblin)
      { ...spellDurationAdvanced.goblin, reactionAvailable: nextActorStep.reactionAvailable, movementSpent: nextActorStep.movementSpentFeet, dodging: nextActorStep.dodging }
    else
      spellDurationAdvanced.goblin
    {
      ...spellDurationAdvanced,
      initiative: advancedInitiative,
      actionAvailable: nextActorStep.actionAvailable,
      bonusActionAvailable: nextActorStep.bonusActionAvailable,
      spellSlotUsesThisTurn: Set(),
      levelOnePlusSpellCastsThisTurn: Set(),
      quickenedLevelOnePlusSpellCastsThisTurn: Set(),
      attackRollMadeThisTurn: false,
      dashMovementBonus: nextActorStep.dashMovementBonus,
      jumpDistanceMultiplier: 1,
      disengaged: nextActorStep.disengaged,
      lightWeaponAttackMade: false,
      fighterHelpAttackGoblinForGoblin: if (nextActor == Fighter) nextActorStep.helpAttackHeld else spellDurationAdvanced.fighterHelpAttackGoblinForGoblin,
      fighter: {
        ...advancedFighter,
        readiedSpellHeld: if (spellDurationAdvanced.fighter.readiedSpellHeld and nextActor == Fighter) false else spellDurationAdvanced.fighter.readiedSpellHeld,
        readiedMovementHeld: if (nextActor == Fighter) nextActorStep.readiedMovementHeld else spellDurationAdvanced.fighter.readiedMovementHeld,
        sneakAttackUsedThisTurn: false,
        // Extra Attack grants attacks only within the current Attack action;
        // unspent slots cannot cross the canonical End Turn boundary.
        extraAttackSlotsRemaining: NoAdditionalAttacks,
        cleaveExtraAttackUsedThisTurn: false,
      },
      goblin: {
        ...advancedGoblin,
        legendaryUsesRemaining: if (nextActor == Goblin) 2 else spellDurationAdvanced.goblin.legendaryUsesRemaining,
        multiattackDispatchesRemaining: 0,
      },
      lastTurnActor: if (currentActor(featureChecked) == Fighter) LastTurnFighter else LastTurnGoblin,
      legendaryActionWindowConsumed: false,
    }
  }

}
