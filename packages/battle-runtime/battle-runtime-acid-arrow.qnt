// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING

// RAW anchors:
// - Spells/Descriptions-A-D.md lines 13-16: Acid Arrow hit damage, target end
//   of next turn later damage, miss half initial damage only, and upcast dice.
// - UBIQUITOUS_LANGUAGE.md entries for Attack Roll, Damage, Turn, and Boundary
//   Crossing.

module battleRuntimeAcidArrow {
  type AcidArrowTurnRole =
    | AcidArrowCasterTurn
    | AcidArrowTargetTurn

  type AcidArrowDelayedDamageAnchor =
    | AcidArrowTargetEndOfNextTurn

  type AcidArrowDelayedDamageTiming =
    | NoAcidArrowDelayedDamage
    | AcidArrowDelayedDamageAt(AcidArrowDelayedDamageAnchor)

  pure def acidArrowInitialDamageDice(slotLevel: int): int =
    4 + (slotLevel - 2)

  pure def acidArrowLaterDamageDice(slotLevel: int): int =
    2 + (slotLevel - 2)

  pure def acidArrowMissDamage(initialDamageRoll: int): int =
    initialDamageRoll / 2

  pure def acidArrowLaterDamageAnchor: AcidArrowDelayedDamageAnchor =
    AcidArrowTargetEndOfNextTurn

  pure def acidArrowDelayedDamageTiming(
    delayedDamageActive: bool,
  ): AcidArrowDelayedDamageTiming =
    if (delayedDamageActive) {
      AcidArrowDelayedDamageAt(acidArrowLaterDamageAnchor)
    } else {
      NoAcidArrowDelayedDamage
    }

  pure def acidArrowDelayedDamageIsActive(
    timing: AcidArrowDelayedDamageTiming,
  ): bool =
    match timing {
      | NoAcidArrowDelayedDamage => false
      | AcidArrowDelayedDamageAt(_) => true
    }
}
