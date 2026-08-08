// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
module battleRuntimeWeaponAttackInterruptionFrameMbt {
  import battleRuntimeWeaponAttackInterruptionFrame.* from "./battle-runtime-weapon-attack-interruption-frame"

  var qDelivery: WeaponAttackInterruptionDelivery

  pure def canonicalFrame: WeaponAttackInterruptionFrame = {
    participant: WeaponAttacker,
    target: WeaponTarget,
    attackResult: WeaponAttackHit({ total: 15, naturalD20: 10 }),
    damageInput: RolledWeaponDamage({ amount: 8 }),
    criticalConsequence: OrdinaryHitDeathFailureConsequence,
    phase: WeaponAttackDamagePhase,
    continuation: ApplyWeaponAttackDamage,
  }

  pure def reconstructFrame(
    target: WeaponAttackTarget,
    attackTotal: int,
    naturalD20: int,
    damageAmount: int,
    phase: WeaponAttackInterruptionBoundaryPhase,
  ): WeaponAttackInterruptionFrameParseResult =
    parseWeaponAttackInterruptionFrame(
      WeaponAttacker,
      target,
      WeaponAttackHit({ total: attackTotal, naturalD20: naturalD20 }),
      RolledWeaponDamage({ amount: damageAmount }),
      OrdinaryHitDeathFailureConsequence,
      phase,
      ApplyWeaponAttackDamage,
    )

  val canonicalReconstruction = reconstructFrame(
    WeaponTarget,
    15,
    10,
    8,
    WeaponAttackDamageBoundaryPhase,
  )

  val primaryContinuation =
    ApplyPrimaryWeaponAttackDamage({ acceptedFillCount: 3 })

  val primaryFrame: WeaponAttackInterruptionFrame = {
    ...canonicalFrame,
    continuation: primaryContinuation,
  }

  val primaryReconstruction = parseWeaponAttackInterruptionFrame(
    WeaponAttacker,
    WeaponTarget,
    WeaponAttackHit({ total: 15, naturalD20: 10 }),
    RolledWeaponDamage({ amount: 8 }),
    OrdinaryHitDeathFailureConsequence,
    WeaponAttackDamageBoundaryPhase,
    primaryContinuation,
  )

  val reconstructionEvidence: bool = all {
    canonicalReconstruction == WeaponAttackInterruptionFrameDecoded(canonicalFrame),
    primaryReconstruction == WeaponAttackInterruptionFrameDecoded(primaryFrame),
    reconstructFrame(
      AlternateWeaponTarget,
      15,
      10,
      8,
      WeaponAttackDamageBoundaryPhase,
    ) != canonicalReconstruction,
    reconstructFrame(
      WeaponTarget,
      16,
      11,
      8,
      WeaponAttackDamageBoundaryPhase,
    ) != canonicalReconstruction,
    reconstructFrame(
      WeaponTarget,
      15,
      10,
      7,
      WeaponAttackDamageBoundaryPhase,
    ) != canonicalReconstruction,
    reconstructFrame(
      WeaponTarget,
      15,
      10,
      8,
      WeaponAttackHitBoundaryPhase,
    ) == InvalidWeaponAttackInterruptionPhase,
  }

  val deliveryIsCanonical: bool =
    match qDelivery {
      | NoWeaponAttackInterruption => true
      | WeaponAttackInterruptionOffered(frame) => frame == canonicalFrame
      | WeaponAttackInterrupted(frame) => frame == canonicalFrame
      | WeaponAttackInterruptionHandedOff(outcome) => outcome == {
          target: canonicalFrame.target,
          damageInput: canonicalFrame.damageInput,
          continuation: canonicalFrame.continuation,
        }
    }

  action init = all {
    reconstructionEvidence,
    qDelivery' = NoWeaponAttackInterruption,
  }

  action doOfferWeaponAttackInterruption = all {
    qDelivery == NoWeaponAttackInterruption,
    qDelivery' = offerWeaponAttackInterruption(canonicalFrame),
  }

  action doInterruptWeaponAttack = all {
    qDelivery == WeaponAttackInterruptionOffered(canonicalFrame),
    qDelivery' = interruptWeaponAttack(qDelivery),
  }

  action doHandOffWeaponAttackInterruption = all {
    qDelivery == WeaponAttackInterrupted(canonicalFrame),
    qDelivery' = handOffWeaponAttackInterruption(qDelivery),
  }

  action step = any {
    doOfferWeaponAttackInterruption,
    doInterruptWeaponAttack,
    doHandOffWeaponAttackInterruption,
  }
}
