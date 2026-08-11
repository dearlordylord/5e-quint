// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-spike-growth-movement-hazard

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
module battleRuntimeSpikeGrowthMovementHazard {
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  pure val spikeGrowthDurationTicks = 100
  pure val spikeGrowthAreaId = 7
  pure val spikeGrowthDamageIntervalFeet = 5

  pure def spikeGrowthMovementHazardActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect { | SpikeGrowthMovementHazard(data) => data.areaId == areaId | _ => false })

  pure def spikeGrowthDifficultTerrainMovementCost(state: BattleState, areaId: int, totalDistanceFeet: int, difficultTerrainDistanceFeet: int): int =
    battleRuntimeDifficultTerrainMovementCost(spikeGrowthMovementHazardActive(state, areaId), totalDistanceFeet, difficultTerrainDistanceFeet)
  pure def activeEffectsWithoutSpikeGrowthMovementHazard(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SpikeGrowthMovementHazard(data) => data.areaId != areaId
      | _ => true
    })

  pure def moveFighterThroughSpikeGrowthDifficultTerrain(state: BattleState, areaId: int, totalDistanceFeet: int, difficultTerrainDistanceFeet: int, provokedByTable: bool): BattleState = {
    val movementCost = spikeGrowthDifficultTerrainMovementCost(state, areaId, totalDistanceFeet, difficultTerrainDistanceFeet)
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
              damagePerFeet: spikeGrowthDamageIntervalFeet,
              durationTicks: spikeGrowthDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def spikeGrowthMovementDamageAmount(rolledDamage: int, movementFeet: int): int =
    rolledDamage * (movementFeet / spikeGrowthDamageIntervalFeet)

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

}
