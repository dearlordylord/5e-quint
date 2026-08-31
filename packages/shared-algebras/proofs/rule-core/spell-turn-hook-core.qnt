// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS

module spellTurnHookCore {
  import triggeredArmorDefense.* from "./triggered-armor-defense"
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

  pure def oneRoundTriggeredDefenseExpiresAtStartOfNextTurn: bool =
    triggeredArmorDefenseDurationRounds == 1

  pure def timedSpellEffectDurationAfterRoundTick(durationTicks: int): int =
    durationTicks - 1

  pure def timedSpellEffectRemainsActive(durationTicks: int): bool =
    durationTicks > 0
}
