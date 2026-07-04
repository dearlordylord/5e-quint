module battleRuntimeRemarkableAthleteRollModesTests {
  import battleRuntimeRemarkableAthleteRollModes.* from "./battle-runtime-remarkable-athlete-roll-modes"

  run test_remarkable_athlete_projects_initiative_advantage = {
    assert(
      remarkableAthleteInitiativeRollMode(admittedRemarkableAthleteProfile) ==
      AdvantageRoll
    )
  }

  run test_remarkable_athlete_projects_strength_athletics_advantage = {
    assert(
      remarkableAthleteAbilityCheckRollMode(
        admittedRemarkableAthleteProfile,
        Strength,
        AthleticsSkill,
      ) == AdvantageRoll
    )
  }

  run test_remarkable_athlete_does_not_project_adjacent_ability_check_modes = {
    all {
      assert(
        remarkableAthleteAbilityCheckRollMode(
          admittedRemarkableAthleteProfile,
          Strength,
          AcrobaticsSkill,
        ) == NormalRoll
      ),
      assert(
        remarkableAthleteAbilityCheckRollMode(
          admittedRemarkableAthleteProfile,
          Dexterity,
          AthleticsSkill,
        ) == NormalRoll
      ),
      assert(
        remarkableAthleteAbilityCheckRollMode(
          unselectedRemarkableAthleteProfile,
          Strength,
          AthleticsSkill,
        ) == NormalRoll
      ),
    }
  }

}
