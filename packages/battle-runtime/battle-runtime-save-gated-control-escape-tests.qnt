// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-hypnotic-pattern-control

module battleRuntimeSaveGatedControlEscapeTests {
  import battleRuntimeSaveGatedControlEscape.* from "./battle-runtime-save-gated-control-escape"

  run test_save_gated_control_ends_on_damage_or_witnessed_physical_shake_action = {
    val witnessedPhysicalShake = PhysicalShakeAction({
      actionAvailable: true,
      actorIsAffectedCreature: false,
      actorCanAct: true,
      actorCanPhysicallyShakeAffectedCreature: true,
    })
    val unreachablePhysicalShake = PhysicalShakeAction({
      actionAvailable: true,
      actorIsAffectedCreature: false,
      actorCanAct: true,
      actorCanPhysicallyShakeAffectedCreature: false,
    })
    val affectedCreatureSelfShake = PhysicalShakeAction({
      actionAvailable: true,
      actorIsAffectedCreature: true,
      actorCanAct: true,
      actorCanPhysicallyShakeAffectedCreature: true,
    })
    val unavailableAction = PhysicalShakeAction({
      actionAvailable: false,
      actorIsAffectedCreature: false,
      actorCanAct: true,
      actorCanPhysicallyShakeAffectedCreature: true,
    })
    val ineligibleActor = PhysicalShakeAction({
      actionAvailable: true,
      actorIsAffectedCreature: false,
      actorCanAct: false,
      actorCanPhysicallyShakeAffectedCreature: true,
    })
    all {
      assert(controlProjectionIsActive(true, true, 0)),
      assert(not(controlEffectRemainsAfter(TargetDamaged))),
      assert(not(controlEffectRemainsAfter(witnessedPhysicalShake))),
      assert(controlEffectRemainsAfter(unreachablePhysicalShake)),
      assert(controlEffectRemainsAfter(affectedCreatureSelfShake)),
      assert(controlEffectRemainsAfter(unavailableAction)),
      assert(controlEffectRemainsAfter(ineligibleActor)),
      assert(controlEffectRemainsAfter(NoEscapeEvent)),
    }
  }
}
