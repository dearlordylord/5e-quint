// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS

module battleRuntimeTemporaryAbilityCheckRollMode {
  type TemporaryAbilityCheckRollMode =
    | TemporaryAbilityCheckNormalRoll
    | TemporaryAbilityCheckAdvantageRoll

  pure def activeOccurrenceCountAfterReplacement(
    occurrenceAlreadyActive: bool,
    activeOccurrenceCount: int,
  ): int =
    if (occurrenceAlreadyActive)
      activeOccurrenceCount
    else
      activeOccurrenceCount + 1

  pure def temporaryAbilityCheckOccurrenceAdmitted(
    activeOccurrenceCount: int,
    maximumActiveOccurrences: int,
    occurrenceAlreadyActive: bool,
  ): bool =
    activeOccurrenceCount >= 0 and
      activeOccurrenceCountAfterReplacement(
        occurrenceAlreadyActive,
        activeOccurrenceCount,
      ) <= maximumActiveOccurrences

  pure def temporaryAbilityCheckRollMode(
    occurrenceActive: bool,
    abilityMatches: bool,
    skillMatches: bool,
  ): TemporaryAbilityCheckRollMode =
    if (occurrenceActive and abilityMatches and skillMatches)
      TemporaryAbilityCheckAdvantageRoll
    else
      TemporaryAbilityCheckNormalRoll
}
