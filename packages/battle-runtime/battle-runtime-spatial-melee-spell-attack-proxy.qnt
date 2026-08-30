// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SPIRITUAL_WEAPON_ATTACK_PROXY

module battleRuntimeSpatialMeleeSpellAttackProxy {
  pure def spatialMeleeSpellAttackProxyDurationTicks: int = 10
  pure def spatialMeleeSpellAttackProxyCastRangeFeet: int = 60
  pure def spatialMeleeSpellAttackProxyReachFeet: int = 5
  pure def spatialMeleeSpellAttackProxyRepeatMoveMaxFeet: int = 20

  pure def spatialMeleeSpellAttackProxyDamageDice(
    slotLevel: int,
    baseSlotLevel: int,
  ): int =
    if (slotLevel < baseSlotLevel) 0 else 1 + (slotLevel - baseSlotLevel)

  pure def spatialMeleeSpellAttackProxyPositionValid(
    actualModeIsCast: bool,
    expectedModeIsCast: bool,
    distanceFeet: int,
    maximumDistanceFeet: int,
  ): bool =
    actualModeIsCast == expectedModeIsCast and
      distanceFeet >= 0 and
      distanceFeet <= maximumDistanceFeet

  pure def spatialMeleeSpellAttackProxyTargetInReach(
    factTargetMatches: bool,
    factPositionMatches: bool,
    reachFeet: int,
    requiredReachFeet: int,
  ): bool =
    factTargetMatches and factPositionMatches and reachFeet == requiredReachFeet

  pure def spatialMeleeSpellAttackProxyCastAdmitted(
    correctTurn: bool,
    bonusActionAvailable: bool,
    casterCanAct: bool,
    castingAvailable: bool,
    slotLevel: int,
    baseSlotLevel: int,
    positionValid: bool,
    targetInReach: bool,
  ): bool =
    correctTurn and bonusActionAvailable and casterCanAct and castingAvailable and
      slotLevel >= baseSlotLevel and positionValid and targetInReach

  pure def spatialMeleeSpellAttackProxyRepeatAdmitted(
    correctTurn: bool,
    bonusActionAvailable: bool,
    ongoingEffectAvailable: bool,
    positionValid: bool,
    targetInReach: bool,
  ): bool =
    correctTurn and bonusActionAvailable and ongoingEffectAvailable and positionValid and targetInReach
}
