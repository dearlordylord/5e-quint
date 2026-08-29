// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-hypnotic-pattern-control

module battleRuntimeSaveGatedControlEscape {
  type ControlEscapeEvent =
    | NoEscapeEvent
    | TargetDamaged
    | OtherCreatureAction

  pure def controlEffectRemainsAfter(
    event: ControlEscapeEvent,
    actionWitnessSatisfied: bool
  ): bool =
    match event {
      | NoEscapeEvent => true
      | TargetDamaged => false
      | OtherCreatureAction => not(actionWitnessSatisfied)
    }

  pure def controlProjectionIsActive(
    charmed: bool,
    incapacitated: bool,
    speedFeet: int
  ): bool =
    charmed and incapacitated and speedFeet == 0
}
