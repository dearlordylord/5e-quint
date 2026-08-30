// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeRepeatedSaveConditionControl {
  pure def repeatedSaveConditionMaximumTargets(slotLevel: int, baseSlotLevel: int): int =
    if (slotLevel <= baseSlotLevel) 1 else slotLevel

  pure def repeatedSaveConditionDurationTicks: int = 10

  pure def repeatedSaveConditionApplies(
    savingThrowSucceeded: bool,
    conditionPrevented: bool,
  ): bool =
    not(savingThrowSucceeded) and not(conditionPrevented)

  pure def repeatedSaveConditionEndsAfterDamage(
    damage: int,
    savingThrowSucceeded: bool,
  ): bool =
    damage > 0 and savingThrowSucceeded

  pure def damageEndedConditionControl(damage: int): bool = damage > 0

  pure def adjacentActionEndedConditionControl(
    actionAvailable: bool,
    actorWithinRequiredDistance: bool,
    actorIsTarget: bool,
    actorCanAct: bool,
  ): bool =
    actionAvailable and actorWithinRequiredDistance and not(actorIsTarget) and actorCanAct
}
