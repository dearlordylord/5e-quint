// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION

module battleRuntimeDuplicateHitInterception {
  pure def duplicateHitInterceptionDurationTicks: int = 10
  pure def duplicateHitInterceptionInitialDuplicates: int = 3
  pure def duplicateHitInterceptionSuccessAtLeast: int = 3

  pure def duplicateRollInterposes(
    remainingDuplicates: int,
    highestRoll: int,
    successAtLeast: int,
  ): bool =
    remainingDuplicates > 0 and highestRoll >= successAtLeast

  pure def duplicateRollRequired(
    remainingDuplicates: int,
    attackerUnaffected: bool,
  ): bool =
    remainingDuplicates > 0 and not(attackerUnaffected)

  pure def duplicateRedirectsHit(
    remainingDuplicates: int,
    attackerUnaffected: bool,
    highestRoll: int,
    successAtLeast: int,
  ): bool =
    duplicateRollRequired(remainingDuplicates, attackerUnaffected) and
      duplicateRollInterposes(remainingDuplicates, highestRoll, successAtLeast)

  pure def remainingDuplicatesAfterIntercept(remainingDuplicates: int): int =
    if (remainingDuplicates < 2) 0 else remainingDuplicates - 1
}
