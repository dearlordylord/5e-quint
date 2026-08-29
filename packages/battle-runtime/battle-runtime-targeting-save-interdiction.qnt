// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION

module battleRuntimeTargetingSaveInterdiction {
  type TargetingSaveInterdictionTrigger =
    | TargetingSaveInterdictionAttackRoll
    | TargetingSaveInterdictionDamagingSpell
    | TargetingSaveInterdictionAreaOfEffect

  type TargetingSaveInterdictionOutcome =
    | TargetingSaveInterdictionSaveSucceeded
    | TargetingSaveInterdictionLoseAttackOrSpell
    | TargetingSaveInterdictionChooseNewTarget

  pure def targetingSaveInterdictionApplies(
    trigger: TargetingSaveInterdictionTrigger,
  ): bool =
    match trigger {
      | TargetingSaveInterdictionAttackRoll => true
      | TargetingSaveInterdictionDamagingSpell => true
      | TargetingSaveInterdictionAreaOfEffect => false
    }

  pure def targetingSaveInterdictionLosesAttackOrSpell(
    outcome: TargetingSaveInterdictionOutcome,
  ): bool =
    outcome == TargetingSaveInterdictionLoseAttackOrSpell

  pure def targetingSaveInterdictionContinues(
    wardActive: bool,
    trigger: TargetingSaveInterdictionTrigger,
    outcome: TargetingSaveInterdictionOutcome,
  ): bool =
    wardActive and
      targetingSaveInterdictionApplies(trigger) and
      not(targetingSaveInterdictionLosesAttackOrSpell(outcome))
}
