// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.passive-initiative-roll-mode unit-feature.ongoing-feature-activation-movement-rider
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
module unitFeatureInitiativeActivationMovementCore {
  // RAW: classes.md:298-305; playing-the-game.md:111-113 (Round Down).
  // Initiative is a start-combat Dexterity check. The selected passive fact
  // supplies Advantage; the caller owns the roll and fixed turn order.
  pure def passiveInitiativeAdvantage(selectedProfile: bool): bool = selectedProfile

  // Movement is additional only when entering the ongoing feature with its
  // Bonus Action. Current Speed is supplied by its canonical movement owner.
  pure def activationMovementBudget(
    selectedRider: bool,
    entersWithBonusAction: bool,
    currentSpeedFeet: int,
  ): int =
    if (selectedRider and entersWithBonusAction and currentSpeedFeet > 0)
      currentSpeedFeet / 2
    else 0

  // Path, terrain cost, occupied space, and Opportunity Attacks remain facts
  // admitted by the ordinary movement/table owners. No avoidance is granted.
  pure def activationMovementAdmitted(
    selectedRider: bool,
    entersWithBonusAction: bool,
    currentSpeedFeet: int,
    movementCostFeet: int,
    ordinaryMovementLegal: bool,
  ): bool = all {
    selectedRider,
    entersWithBonusAction,
    currentSpeedFeet > 0,
    movementCostFeet >= 0,
    movementCostFeet <= activationMovementBudget(selectedRider, entersWithBonusAction, currentSpeedFeet),
    ordinaryMovementLegal,
  }
}
