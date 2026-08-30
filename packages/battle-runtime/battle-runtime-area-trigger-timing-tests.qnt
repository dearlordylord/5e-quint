// -*- mode: Bluespec; -*-

module battleRuntimeAreaTriggerTimingTests {
  import battleRuntimeAreaTriggerTiming.* from "./battle-runtime-area-trigger-timing"

  run test_area_trigger_first_entry_and_start_turn_profile_has_separate_ledgers = {
    val qualifiedTimings = Set(CreatureEntersArea, CreatureStartsTurnInArea)
    val entryResolved = firstPerTimingPerTurnAreaTriggerProfile(
      qualifiedTimings,
      Set(CreatureEntersArea),
    )
    val startTurnResolved = firstPerTimingPerTurnAreaTriggerProfile(
      qualifiedTimings,
      Set(CreatureStartsTurnInArea),
    )
    all {
      assert(not(areaEffectTriggerCanResolve(true, true, entryResolved, CreatureEntersArea))),
      assert(areaEffectTriggerCanResolve(true, true, entryResolved, CreatureStartsTurnInArea)),
      assert(areaEffectTriggerCanResolve(true, true, startTurnResolved, CreatureEntersArea)),
      assert(not(areaEffectTriggerCanResolve(true, true, startTurnResolved, CreatureStartsTurnInArea))),
    }
  }

  run test_area_trigger_once_per_turn_profile_shares_ledger_across_qualified_triggers = {
    val qualifiedTimings = Set(
      AreaAppearsInSpace,
      AreaMovesIntoSpace,
      CreatureEntersArea,
      CreatureEndsTurnInArea,
    )
    val openProfile = onceAcrossQualifiedAreaTriggersProfile(qualifiedTimings, false)
    val resolvedProfile = onceAcrossQualifiedAreaTriggersProfile(qualifiedTimings, true)
    all {
      assert(areaEffectTriggerCanResolve(true, true, openProfile, AreaAppearsInSpace)),
      assert(areaEffectTriggerCanResolve(true, true, openProfile, CreatureEntersArea)),
      assert(areaEffectTriggerCanResolve(true, true, openProfile, CreatureEndsTurnInArea)),
      assert(not(areaEffectTriggerCanResolve(true, true, openProfile, CreatureStartsTurnInArea))),
      assert(not(areaEffectTriggerCanResolve(true, true, resolvedProfile, AreaMovesIntoSpace))),
      assert(not(areaEffectTriggerCanResolve(true, false, openProfile, CreatureEndsTurnInArea))),
    }
  }

  run test_area_trigger_every_qualified_profile_requires_timing_membership = {
    val nearAreaProfile = everyQualifiedAreaTriggerProfile(Set(
      AreaMovesIntoSpace,
      CreatureEndsTurnNearArea,
    ))
    val groundHazardProfile = everyQualifiedAreaTriggerProfile(Set(
      AreaAppearsInSpace,
      CreatureEntersArea,
      CreatureEndsTurnInArea,
    ))
    all {
      assert(areaEffectTriggerCanResolve(true, true, nearAreaProfile, CreatureEndsTurnNearArea)),
      assert(areaEffectTriggerCanResolve(true, true, groundHazardProfile, CreatureEntersArea)),
      assert(not(areaEffectTriggerCanResolve(true, true, groundHazardProfile, CreatureStartsTurnInArea))),
      assert(not(areaEffectTriggerCanResolve(false, true, nearAreaProfile, CreatureEndsTurnNearArea))),
    }
  }
}
