module battleRuntimeRemarkableAthleteCriticalMovementTests {
  import battleRuntimeRemarkableAthleteCriticalMovement.* from "./battle-runtime-remarkable-athlete-critical-movement"

  run test_remarkable_athlete_offers_half_speed_movement_after_critical_hit = {
    val projection = remarkableAthleteCriticalMovementProjection(
      admittedRemarkableAthleteProfile,
      true,
      30,
    )
    all {
      assert(projection.offered),
      assert(projection.maxMovementFeet == 15),
      assert(not(projection.provokesOpportunityAttacks)),
    }
  }

  run test_remarkable_athlete_rejects_non_critical_hits = {
    val projection = remarkableAthleteCriticalMovementProjection(
      admittedRemarkableAthleteProfile,
      false,
      30,
    )
    all {
      assert(not(projection.offered)),
      assert(projection.maxMovementFeet == 0),
      assert(not(projection.provokesOpportunityAttacks)),
    }
  }

  run test_remarkable_athlete_rejects_missing_selected_profile = {
    val projection = remarkableAthleteCriticalMovementProjection(
      unselectedRemarkableAthleteProfile,
      true,
      30,
    )
    all {
      assert(not(projection.offered)),
      assert(projection.maxMovementFeet == 0),
      assert(not(projection.provokesOpportunityAttacks)),
    }
  }

}
