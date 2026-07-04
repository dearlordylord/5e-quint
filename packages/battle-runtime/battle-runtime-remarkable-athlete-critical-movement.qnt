// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.remarkable-athlete

module battleRuntimeRemarkableAthleteCriticalMovement {
  // RAW trace:
  // - .references/srd-5.2.1/Classes/Fighter.md#Level 3: Remarkable Athlete:
  //   immediately after scoring a Critical Hit, move up to half Speed without
  //   provoking Opportunity Attacks.
  // - .references/srd-5.2.1/Rules-Glossary.md#Critical Hit: Critical Hit is
  //   scored from an attack roll.
  // - .references/srd-5.2.1/Playing-the-Game.md#Opportunity Attacks: movement
  //   can provoke unless a rule says otherwise.
  // UBIQUITOUS_LANGUAGE.md: Critical Hit, Speed, Movement, Opportunity Attack.
  type RemarkableAthleteCriticalMovementProfile = {
    selected: bool,
    grantsCriticalHitMovement: bool,
  }

  type RemarkableAthleteCriticalMovementProjection = {
    offered: bool,
    maxMovementFeet: int,
    provokesOpportunityAttacks: bool,
  }

  pure def remarkableAthleteCriticalMovementProjection(
    profile: RemarkableAthleteCriticalMovementProfile,
    attackScoredCriticalHit: bool,
    speedFeet: int,
  ): RemarkableAthleteCriticalMovementProjection = {
    offered:
      profile.selected and
      profile.grantsCriticalHitMovement and
      attackScoredCriticalHit and
      speedFeet / 2 > 0,
    maxMovementFeet:
      if (
        profile.selected and
        profile.grantsCriticalHitMovement and
        attackScoredCriticalHit and
        speedFeet / 2 > 0
      ) speedFeet / 2 else 0,
    provokesOpportunityAttacks: false,
  }

  pure def admittedRemarkableAthleteProfile: RemarkableAthleteCriticalMovementProfile = {
    selected: true,
    grantsCriticalHitMovement: true,
  }

  pure def unselectedRemarkableAthleteProfile: RemarkableAthleteCriticalMovementProfile = {
    selected: false,
    grantsCriticalHitMovement: true,
  }

}
