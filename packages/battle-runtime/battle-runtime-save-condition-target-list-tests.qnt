// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-save
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.creature-type-protection-and-charm

module battleRuntimeSaveConditionTargetListTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSaveConditionTargetList.* from "./battle-runtime-save-condition-target-list"
  import battleRuntimeSaveConditionTargetListResolution.* from "./battle-runtime-save-condition-target-list-resolution"

  run test_charm_person_target_list_slot_scaling_and_damage_break = {
    val failed = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      1,
      false,
      HumanoidCreature,
      true,
      true,
      HumanoidCreature,
      false,
    )
    val damaged = resolveAttack({ ...failed, actionAvailable: true }, 15, 10, fighterWeaponAttackDamageRoll(1), true)
    val twoTargets = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      2,
      true,
      HumanoidCreature,
      false,
      true,
      HumanoidCreature,
      false,
    )
    val illegalTwoTargets = resolveTargetListSaveGatedCondition(
      initialState,
      CharmPersonSaveGate,
      1,
      true,
      HumanoidCreature,
      false,
      true,
      HumanoidCreature,
      false,
    )
    all {
      assert(failed.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(not(damaged.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks })))),
      assert(twoTargets.fighter.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(twoTargets.goblin.activeEffects.contains(CharmPersonCharmed({ source: Fighter, durationTicks: charmPersonCharmedDurationTicks }))),
      assert(illegalTwoTargets == initialState),
    }
  }

}
