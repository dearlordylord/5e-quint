// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-spike-growth-movement-hazard

module battleRuntimeSpikeGrowthMovementHazardTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeSpikeGrowthMovementHazard.* from "./battle-runtime-spike-growth-movement-hazard"

  run test_spike_growth_records_hazard_and_spends_spell_slot = {
    val resolved = resolveSpikeGrowth(initialState, spikeGrowthAreaId, 2)
    all {
      assert(resolved.fighter.activeEffects.contains(SpikeGrowthMovementHazard({
        areaId: spikeGrowthAreaId,
        damageDice: 2,
        damagePerFeet: spikeGrowthDamageIntervalFeet,
        durationTicks: spikeGrowthDurationTicks,
      }))),
      assert(resolved.fighter.concentrating),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_spike_growth_difficult_terrain_movement_cost_adds_extra_distance = {
    val resolved = resolveSpikeGrowth(initialState, spikeGrowthAreaId, 2)
    val moved = moveFighterThroughSpikeGrowthDifficultTerrain(resolved, spikeGrowthAreaId, 10, 5, false)
    val expired = { ...resolved, fighter: { ...resolved.fighter, activeEffects: Set() } }
    all {
      assert(spikeGrowthDifficultTerrainMovementCost(resolved, spikeGrowthAreaId, 10, 5) == 15),
      assert(moved.fighter.movementSpent == 15),
      assert(spikeGrowthDifficultTerrainMovementCost(expired, spikeGrowthAreaId, 10, 5) == 0),
    }
  }

  run test_spike_growth_movement_damage_scales_per_five_feet = {
    val resolved = resolveSpikeGrowth(initialState, spikeGrowthAreaId, 2)
    val damaged = resolveSpikeGrowthMovementDamage(resolved, Goblin, spikeGrowthAreaId, 4, 10)
    val unchanged = resolveSpikeGrowthMovementDamage(resolved, Goblin, spikeGrowthAreaId, 4, 0)
    all {
      assert(damaged.goblin.hp == initialState.goblin.hp - 8),
      assert(unchanged.goblin.hp == initialState.goblin.hp),
    }
  }

  run test_spike_growth_concentration_break_removes_hazard = {
    val resolved = resolveSpikeGrowth(initialState, spikeGrowthAreaId, 2)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(spikeGrowthMovementHazardActive(broken, spikeGrowthAreaId))),
      assert(not(broken.fighter.concentrating)),
    }
  }

  run test_spike_growth_duration_expiration_removes_hazard_and_concentration = {
    val expiring = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(SpikeGrowthMovementHazard({
          areaId: spikeGrowthAreaId,
          damageDice: 2,
          damagePerFeet: spikeGrowthDamageIntervalFeet,
          durationTicks: 1,
        })),
      },
    }
    val ticked = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(spikeGrowthMovementHazardActive(ticked, spikeGrowthAreaId))),
      assert(not(ticked.fighter.concentrating)),
    }
  }

}
