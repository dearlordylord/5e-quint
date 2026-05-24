// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS

module spellTurnHookCore {
  // RAW anchors:
  // - Spells/Gaining-and-Casting.md: Duration.
  // - Playing-the-Game.md: Temporary Hit Points.
  // - Spells/Descriptions-E-L.md: Heroism.
  // - Spells/Descriptions-S-Z.md: Shield.
  // - UBIQUITOUS_LANGUAGE.md: Boundary Crossing, Timer, Duration, and
  //   Temporary Hit Points.

  pure def turnStartTemporaryHitPoints(
    existingTemporaryHitPoints: int,
    grantedTemporaryHitPoints: int
  ): int =
    if (existingTemporaryHitPoints > grantedTemporaryHitPoints)
      existingTemporaryHitPoints
    else
      grantedTemporaryHitPoints

  pure def oncePerTurnSpellEffectUsedAtTurnStart: bool = false

  pure def oneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn: bool = true

  pure def timedSpellEffectDurationAfterRoundTick(durationTicks: int): int =
    durationTicks - 1

  pure def timedSpellEffectRemainsActive(durationTicks: int): bool =
    durationTicks > 0
}
