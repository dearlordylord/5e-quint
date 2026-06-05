// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.remarkable-athlete
module battleRuntimeRemarkableAthleteRollModes {
  // RAW trace:
  // - .references/srd-5.2.1/Classes/Fighter.md#Level 3: Remarkable Athlete:
  //   Advantage on Initiative rolls and Strength (Athletics) checks.
  // UBIQUITOUS_LANGUAGE.md: Initiative, Ability Check, Skill, Advantage.
  type RollMode = NormalRoll | AdvantageRoll | DisadvantageRoll
  type Ability = Strength | Dexterity
  type AbilityCheckSkill = AthleticsSkill | AcrobaticsSkill

  type RemarkableAthleteRollModeProfile = {
    initiativeAdvantage: bool,
    strengthAthleticsAdvantage: bool,
  }

  pure def remarkableAthleteInitiativeRollMode(
    profile: RemarkableAthleteRollModeProfile
  ): RollMode =
    if (profile.initiativeAdvantage) AdvantageRoll else NormalRoll

  pure def remarkableAthleteAbilityCheckRollMode(
    profile: RemarkableAthleteRollModeProfile,
    ability: Ability,
    skill: AbilityCheckSkill,
  ): RollMode =
    if (
      profile.strengthAthleticsAdvantage and
      ability == Strength and
      skill == AthleticsSkill
    ) AdvantageRoll else NormalRoll

  pure def admittedRemarkableAthleteProfile: RemarkableAthleteRollModeProfile = {
    initiativeAdvantage: true,
    strengthAthleticsAdvantage: true,
  }

  pure def unselectedRemarkableAthleteProfile: RemarkableAthleteRollModeProfile = {
    initiativeAdvantage: false,
    strengthAthleticsAdvantage: false,
  }

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
