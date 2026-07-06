// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.remarkable-athlete
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureRemarkableAthleteCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Fighter.md:140-144: Remarkable Athlete
  //   grants Advantage on Initiative and Strength (Athletics) checks, and
  //   immediate half-Speed movement after scoring a Critical Hit without
  //   provoking Opportunity Attacks.
  // - UBIQUITOUS_LANGUAGE.md: Initiative, Ability Check, Skill, Critical Hit,
  //   Speed, Movement, and Opportunity Attack.

  type RemarkableAthleteRollMode =
    | RemarkableAthleteNormalRoll
    | RemarkableAthleteAdvantageRoll

  type RemarkableAthleteAbility =
    | RemarkableAthleteStrength
    | RemarkableAthleteDexterity

  type RemarkableAthleteSkill =
    | RemarkableAthleteAthletics
    | RemarkableAthleteAcrobatics

  pure def remarkableAthleteInitiativeRollMode(selectedProfile: bool): RemarkableAthleteRollMode =
    if (selectedProfile) RemarkableAthleteAdvantageRoll else RemarkableAthleteNormalRoll

  pure def remarkableAthleteAbilityCheckRollMode(
    selectedProfile: bool,
    ability: RemarkableAthleteAbility,
    skill: RemarkableAthleteSkill,
  ): RemarkableAthleteRollMode =
    if (
      selectedProfile and
      ability == RemarkableAthleteStrength and
      skill == RemarkableAthleteAthletics
    ) RemarkableAthleteAdvantageRoll else RemarkableAthleteNormalRoll

  pure def remarkableAthleteCriticalMovementFeet(
    selectedProfile: bool,
    scoredCriticalHit: bool,
    speedFeet: int,
  ): int =
    if (selectedProfile and scoredCriticalHit) speedFeet / 2 else 0

  pure def remarkableAthleteCriticalMovementProvokesOpportunityAttacks: bool = false
}
