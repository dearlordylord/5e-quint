// -*- mode: Bluespec; -*-

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#reactions: an interrupting
//   Reaction is an immediate response and the interrupted turn resumes after it.
// - .references/srd-5.2.1/Playing-the-Game.md#making-an-attack and
//   #attack-rolls: the target and resolved Attack Roll determine the hit before
//   weapon damage advances.
// - .references/srd-5.2.1/Playing-the-Game.md#critical-hits and
//   #damage-at-0-hit-points: a Critical Hit doubles damage dice and damage at
//   0 Hit Points causes two Death Saving Throw failures instead of one.
// - UBIQUITOUS_LANGUAGE.md: Reaction, Attack Roll, Critical Hit, Resolve,
//   Apply, Advance, Offer, and Decline.
// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
module battleRuntimeWeaponAttackInterruptionFrame {
  type WeaponAttackParticipant = | WeaponAttacker
  type WeaponAttackTarget = | WeaponTarget
  type WeaponAttackResult = WeaponAttackHit({ total: int, naturalD20: int })
  type WeaponAttackDamageInput = RolledWeaponDamage({ amount: int })
  type WeaponAttackCriticalConsequence =
    | OrdinaryHitDeathFailureConsequence
    | CriticalHitDeathFailureConsequence
  type WeaponAttackPhase = | WeaponAttackDamagePhase
  type WeaponAttackContinuation = | ApplyWeaponAttackDamage

  type WeaponAttackInterruptionFrame = {
    participant: WeaponAttackParticipant,
    target: WeaponAttackTarget,
    attackResult: WeaponAttackResult,
    damageInput: WeaponAttackDamageInput,
    criticalConsequence: WeaponAttackCriticalConsequence,
    phase: WeaponAttackPhase,
    continuation: WeaponAttackContinuation,
  }

  type WeaponAttackInterruptionOutcome = {
    target: WeaponAttackTarget,
    damageInput: WeaponAttackDamageInput,
    continuation: WeaponAttackContinuation,
  }

  type WeaponAttackInterruptionDelivery =
    | NoWeaponAttackInterruption
    | WeaponAttackInterruptionOffered(WeaponAttackInterruptionFrame)
    | WeaponAttackInterrupted(WeaponAttackInterruptionFrame)
    | WeaponAttackInterruptionHandedOff(WeaponAttackInterruptionOutcome)

  pure def offerWeaponAttackInterruption(
    frame: WeaponAttackInterruptionFrame,
  ): WeaponAttackInterruptionDelivery =
    WeaponAttackInterruptionOffered(frame)

  pure def interruptWeaponAttack(
    delivery: WeaponAttackInterruptionDelivery,
  ): WeaponAttackInterruptionDelivery =
    match delivery {
      | WeaponAttackInterruptionOffered(frame) => WeaponAttackInterrupted(frame)
      | _ => delivery
    }

  pure def handOffWeaponAttackInterruption(
    delivery: WeaponAttackInterruptionDelivery,
  ): WeaponAttackInterruptionDelivery =
    match delivery {
      | WeaponAttackInterrupted(frame) =>
          WeaponAttackInterruptionHandedOff({
            target: frame.target,
            damageInput: frame.damageInput,
            continuation: frame.continuation,
          })
      | _ => delivery
    }
}
