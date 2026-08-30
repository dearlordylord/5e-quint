// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE

module battleRuntimeFixedCostMovementReplacement {
  type FixedCostMovementReplacementLanding =
    | FixedCostMovementReplacementLegalLanding
    | FixedCostMovementReplacementLegalLandingWithProne
    | FixedCostMovementReplacementIllegalLanding

  pure def fixedCostMovementReplacementMaximumTargets(
    slotLevel: int,
    baseSlotLevel: int,
    baseTargets: int,
    additionalTargetsPerSlotLevel: int,
  ): int =
    if (slotLevel < baseSlotLevel)
      0
    else
      baseTargets + ((slotLevel - baseSlotLevel) * additionalTargetsPerSlotLevel)

  pure def fixedCostMovementReplacementMaximumDistanceFeet(
    distanceFeet: int,
    distanceMultiplier: int,
  ): int =
    distanceFeet * distanceMultiplier

  pure def fixedCostMovementReplacementLandingIsLegal(
    landing: FixedCostMovementReplacementLanding,
  ): bool =
    landing != FixedCostMovementReplacementIllegalLanding

  pure def fixedCostMovementReplacementLandingAppliesProne(
    landing: FixedCostMovementReplacementLanding,
  ): bool =
    landing == FixedCostMovementReplacementLegalLandingWithProne

  pure def fixedCostMovementReplacementUseAdmitted(
    movementCost: int,
    requiredMovementCost: int,
    distanceFeet: int,
    maximumDistanceFeet: int,
    landingIsLegal: bool,
    replacementAvailable: bool,
    movementCanBeSpent: bool,
  ): bool =
    movementCost == requiredMovementCost and
      distanceFeet > 0 and
      distanceFeet <= maximumDistanceFeet and
      landingIsLegal and
      replacementAvailable and
      movementCanBeSpent
}
