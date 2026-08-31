// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE

module battleRuntimeControlledVerticalSuspension {
  pure def controlledVerticalSuspensionInitialRiseMaxFeet: int = 20
  pure def controlledVerticalSuspensionAltitudeChangeMaxFeet: int = 20
  pure def controlledVerticalSuspensionControlRangeFeet: int = 60
  pure def controlledVerticalSuspensionDurationTicks: int = 100

  pure def controlledVerticalSuspensionInitialRiseIsLegal(distanceFeet: int, maximumFeet: int): bool =
    distanceFeet >= 0 and distanceFeet <= maximumFeet

  pure def controlledVerticalSuspensionChangeIsLegal(distanceFeet: int, maximumFeet: int): bool =
    distanceFeet > 0 and distanceFeet <= maximumFeet

  pure def controlledVerticalSuspensionClimbingMovementCost(
    hasClimbSpeed: bool,
    distanceFeet: int,
  ): int =
    if (hasClimbSpeed) distanceFeet else distanceFeet * 2

  pure def controlledVerticalSuspensionShiftedAltitude(
    altitudeFeet: int,
    directionUp: bool,
    distanceFeet: int,
  ): int =
    if (directionUp)
      altitudeFeet + distanceFeet
    else if (distanceFeet > altitudeFeet)
      0
    else
      altitudeFeet - distanceFeet
}
