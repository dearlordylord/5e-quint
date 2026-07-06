// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.stunning-strike
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module unitFeatureStunningStrikeCore {
  // RAW anchors:
  // - .references/srd-5.2.1/Classes/Monk.md:124-126: Stunning Strike
  //   once-per-turn hit gate, 1 Focus Point cost, Constitution save, failed-save
  //   Stunned until the start of the Monk's next turn, and successful-save Speed
  //   halving plus next attack roll Advantage.
  // - UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition, Stunned, Speed,
  //   Advantage, Attack Roll, and Spend.

  type StunningStrikeHitKind =
    | StunningStrikeMonkWeaponHit
    | StunningStrikeUnarmedStrikeHit
    | StunningStrikeOtherHit

  type StunningStrikeSaveAbility =
    | StunningStrikeConstitutionSave

  type StunningStrikeOutcome =
    | StunningStrikeDeclined
    | StunningStrikeFailedSave
    | StunningStrikeSuccessfulSave

  pure def stunningStrikeFocusCost: int = 1

  pure def stunningStrikeAttemptAvailable(
    hitKind: StunningStrikeHitKind,
    usedThisTurn: bool,
    focusUsesRemaining: int,
  ): bool =
    all {
      hitKind != StunningStrikeOtherHit,
      not(usedThisTurn),
      focusUsesRemaining >= stunningStrikeFocusCost,
    }

  pure def stunningStrikeAppliesStunned(outcome: StunningStrikeOutcome): bool =
    outcome == StunningStrikeFailedSave

  pure def stunningStrikeHalvesSpeed(outcome: StunningStrikeOutcome): bool =
    outcome == StunningStrikeSuccessfulSave

  pure def stunningStrikeNextAttackAdvantage(outcome: StunningStrikeOutcome): bool =
    outcome == StunningStrikeSuccessfulSave
}
