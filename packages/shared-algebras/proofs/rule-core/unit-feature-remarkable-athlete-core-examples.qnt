// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.remarkable-athlete

module unitFeatureRemarkableAthleteCoreExamples {
  import unitFeatureRemarkableAthleteCore.* from "./unit-feature-remarkable-athlete-core"

  run test_remarkable_athlete_projects_roll_modes_and_critical_movement = {
    all {
      assert(remarkableAthleteInitiativeRollMode(true) == RemarkableAthleteAdvantageRoll),
      assert(remarkableAthleteAbilityCheckRollMode(
        true,
        RemarkableAthleteStrength,
        RemarkableAthleteAthletics,
      ) == RemarkableAthleteAdvantageRoll),
      assert(remarkableAthleteAbilityCheckRollMode(
        true,
        RemarkableAthleteDexterity,
        RemarkableAthleteAcrobatics,
      ) == RemarkableAthleteNormalRoll),
      assert(remarkableAthleteCriticalMovementFeet(true, true, 30) == 15),
      assert(remarkableAthleteCriticalMovementFeet(true, false, 30) == 0),
      assert(not(remarkableAthleteCriticalMovementProvokesOpportunityAttacks)),
    }
  }
}
