// -*- mode: Bluespec; -*-

module battleRuntimePersistentAreaCoreTests {
  import battleRuntimePersistentAreaCore.* from "./battle-runtime-persistent-area-core"

  run test_persistent_area_identity_is_installed_as_two_coherent_facts = {
    val installed = installPersistentAreaIdentity("area-a")
    all {
      assert(persistentAreaIdentityCoherent(installed)),
      assert(persistentAreaIdentityRetains(installed, retainPersistentAreaIdentity(installed))),
    }
  }

  run test_persistent_area_identity_replacement_and_cleanup_preserve_coherence = {
    val installed = installPersistentAreaIdentity("area-a")
    val replaced = replacePersistentAreaIdentity(installed, "area-b")
    val ended = endPersistentAreaIdentity(replaced)
    all {
      assert(persistentAreaIdentityCoherent(replaced)),
      assert(not(persistentAreaIdentityRetains(installed, replaced))),
      assert(persistentAreaIdentityCoherent(ended)),
      assert(ended == PersistentAreaAbsent),
    }
  }

  run test_persistent_area_generic_damage_movement_and_scaling_facts = {
    all {
      assert(persistentAreaScaledDamageDice(6, 5, 5) == 6),
      assert(persistentAreaDamageRollAccepted(21, 6, 8)),
      assert(persistentAreaDamageAfterSave(21, true) == 10),
      assert(persistentAreaMoveDistanceAccepted(30, 60)),
      assert(persistentAreaMovementDamageAmount(4, 15, 5) == 12),
      assert(directionalPersistentAreaMovementCost(20, 10) == 30),
      assert(persistentAreaConditionApplies(false)),
      assert(persistentAreaSlotScaledDistanceFeet(3, 1, 20, 20) == 60),
    }
  }
}
