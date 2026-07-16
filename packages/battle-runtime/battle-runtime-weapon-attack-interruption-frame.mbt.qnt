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
