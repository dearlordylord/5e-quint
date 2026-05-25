// -*- mode: Bluespec; -*-

module battleRuntimeTurnAdvancement {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeStatBlockBridge.* from "./battle-runtime-stat-block-bridge"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeFeatureTurnEndEffects.* from "./battle-runtime-feature-turn-end-effects"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"

  pure def endTurn(state: BattleState): BattleState = {
    val featureChecked = normalizeFighterEarlyEndedOngoingFeatures(expireFighterEndOfTurnOngoingFeatures(expireEndOfTurnSpellEffects(state)))
    val advancedInitiative = nextInitiative(featureChecked.initiative)
    val nextActor = advancedInitiative.stillToAct[0]
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
      fighterReadiedSpellHeld: if (spellDurationAdvanced.fighterReadiedSpellHeld and nextActor == Fighter) false else spellDurationAdvanced.fighterReadiedSpellHeld,
      fighterReadiedMovementHeld: if (nextActor == Fighter) nextActorStep.readiedMovementHeld else spellDurationAdvanced.fighterReadiedMovementHeld,
      fighterHelpAttackGoblinForGoblin: if (nextActor == Fighter) nextActorStep.helpAttackHeld else spellDurationAdvanced.fighterHelpAttackGoblinForGoblin,
      fighter: if (nextActor == Fighter)
        { ...spellDurationAdvanced.fighter, reactionAvailable: nextActorStep.reactionAvailable, movementSpent: nextActorStep.movementSpentFeet, dodging: nextActorStep.dodging }
      else
        spellDurationAdvanced.fighter,
      goblin: if (nextActor == Goblin)
        { ...spellDurationAdvanced.goblin, reactionAvailable: nextActorStep.reactionAvailable, movementSpent: nextActorStep.movementSpentFeet, dodging: nextActorStep.dodging }
      else
        spellDurationAdvanced.goblin,
      goblinLegendaryUsesRemaining: if (nextActor == Goblin) 2 else spellDurationAdvanced.goblinLegendaryUsesRemaining,
      goblinMultiattackDispatchesRemaining: 0,
      lastTurnActor: if (currentActor(featureChecked) == Fighter) LastTurnFighter else LastTurnGoblin,
      legendaryActionWindowConsumed: false,
      fighterSneakAttackUsedThisTurn: false,
      fighterExtraAttackSlotsRemaining: battleRuntimeExtraAttackSlotsAfterEndTurn(spellDurationAdvanced.fighterExtraAttackSlotsRemaining),
      fighterCleaveExtraAttackUsedThisTurn: false,
    }
  }

  pure def endTurnWithGoblinRechargeRoll(state: BattleState, roll: int): BattleState = {
    val advanced = endTurn(state)
    if (currentActor(advanced) == Goblin and not(advanced.goblinRechargeAvailable))
      { ...advanced, goblinRechargeAvailable: battleRuntimeRechargeAvailableAfterRoll(advanced.goblinRechargeAvailable, 5, roll) }
    else
      advanced
  }

  pure def endTurnWithDeathSave(state: BattleState, deathSaveRoll: int): BattleState = {
    val advanced = endTurn(state)

    if (currentActor(advanced) == Fighter)
      { ...advanced, fighter: applyStartTurnDeathSave(advanced.fighter, deathSaveRoll) }
    else
      advanced
  }
}
