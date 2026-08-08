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
  type WeaponAttackTarget =
    | WeaponTarget
    | AlternateWeaponTarget
  type WeaponAttackResult = WeaponAttackHit({ total: int, naturalD20: int })
  type WeaponAttackDamageInput = RolledWeaponDamage({ amount: int })
  type WeaponAttackCriticalConsequence =
    | OrdinaryHitDeathFailureConsequence
    | CriticalHitDeathFailureConsequence
  type WeaponAttackPhase = | WeaponAttackDamagePhase
  type WeaponAttackInterruptionBoundaryPhase =
    | WeaponAttackHitBoundaryPhase
    | WeaponAttackDamageBoundaryPhase
  // A primary Attack carries only the post-damage facts that cannot be
  // derived after an attack-damage Reaction resumes. The frame's participant
  // and target remain the canonical actor/first-target facts.
  type WeaponAttackPrimaryPostDamageContext = {
    acceptedFillCount: int,
  }
  type WeaponAttackContinuation =
    | ApplyWeaponAttackDamage
    | ApplyPrimaryWeaponAttackDamage(WeaponAttackPrimaryPostDamageContext)

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

  type WeaponAttackInterruptionFrameParseResult =
    | WeaponAttackInterruptionFrameDecoded(WeaponAttackInterruptionFrame)
    | InvalidWeaponAttackInterruptionPhase

  type WeaponAttackInterruptionDelivery =
    | NoWeaponAttackInterruption
    | WeaponAttackInterruptionOffered(WeaponAttackInterruptionFrame)
    | WeaponAttackInterrupted(WeaponAttackInterruptionFrame)
    | WeaponAttackInterruptionHandedOff(WeaponAttackInterruptionOutcome)

  pure def offerWeaponAttackInterruption(
    frame: WeaponAttackInterruptionFrame,
  ): WeaponAttackInterruptionDelivery =
    WeaponAttackInterruptionOffered(frame)

  pure def parseWeaponAttackInterruptionFrame(
    participant: WeaponAttackParticipant,
    target: WeaponAttackTarget,
    attackResult: WeaponAttackResult,
    damageInput: WeaponAttackDamageInput,
    criticalConsequence: WeaponAttackCriticalConsequence,
    phase: WeaponAttackInterruptionBoundaryPhase,
    continuation: WeaponAttackContinuation,
  ): WeaponAttackInterruptionFrameParseResult =
    match phase {
      | WeaponAttackHitBoundaryPhase => InvalidWeaponAttackInterruptionPhase
      | WeaponAttackDamageBoundaryPhase =>
          WeaponAttackInterruptionFrameDecoded({
            participant: participant,
            target: target,
            attackResult: attackResult,
            damageInput: damageInput,
            criticalConsequence: criticalConsequence,
            phase: WeaponAttackDamagePhase,
            continuation: continuation,
          })
    }

  pure def interruptWeaponAttack(
    delivery: WeaponAttackInterruptionDelivery,
  ): WeaponAttackInterruptionDelivery =
    match delivery {
      | WeaponAttackInterruptionOffered(frame) => WeaponAttackInterrupted(frame)
      | _ => delivery
    }

  pure def handOffWeaponAttackInterruptionFrame(
    frame: WeaponAttackInterruptionFrame,
  ): WeaponAttackInterruptionDelivery =
    WeaponAttackInterruptionHandedOff({
      target: frame.target,
      damageInput: frame.damageInput,
      continuation: frame.continuation,
    })

  pure def declineWeaponAttackInterruption(
    delivery: WeaponAttackInterruptionDelivery,
  ): WeaponAttackInterruptionDelivery =
    match delivery {
      | WeaponAttackInterruptionOffered(frame) =>
          handOffWeaponAttackInterruptionFrame(frame)
      | _ => delivery
    }

  pure def handOffWeaponAttackInterruption(
    delivery: WeaponAttackInterruptionDelivery,
  ): WeaponAttackInterruptionDelivery =
    match delivery {
      | WeaponAttackInterrupted(frame) =>
          handOffWeaponAttackInterruptionFrame(frame)
      | _ => delivery
    }
}
