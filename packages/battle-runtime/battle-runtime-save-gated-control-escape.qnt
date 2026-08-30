// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-hypnotic-pattern-control

module battleRuntimeSaveGatedControlEscape {
  type PhysicalShakeActionWitness = {
    actionAvailable: bool,
    actorIsAffectedCreature: bool,
    actorCanAct: bool,
    actorCanPhysicallyShakeAffectedCreature: bool,
  }

  type ControlEscapeEvent =
    | NoEscapeEvent
    | TargetDamaged
    | PhysicalShakeAction(PhysicalShakeActionWitness)

  pure def physicalShakeActionEndsControl(
    witness: PhysicalShakeActionWitness
  ): bool =
    witness.actionAvailable
      and not(witness.actorIsAffectedCreature)
      and witness.actorCanAct
      and witness.actorCanPhysicallyShakeAffectedCreature

  pure def controlEffectRemainsAfter(
    event: ControlEscapeEvent
  ): bool =
    match event {
      | NoEscapeEvent => true
      | TargetDamaged => false
      | PhysicalShakeAction(witness) => not(physicalShakeActionEndsControl(witness))
    }

  pure def controlProjectionIsActive(
    charmed: bool,
    incapacitated: bool,
    speedFeet: int
  ): bool =
    charmed and incapacitated and speedFeet == 0
}
