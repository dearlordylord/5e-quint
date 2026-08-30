// -*- mode: Bluespec; -*-

// Reachability model for the generic identity relation shared by persistent
// and movable areas. The transition system deliberately retains the active
// effect identity and projected-zone identity as separate facts; each action
// constructs or preserves them through the identity-free rule core.
module battleRuntimePersistentAreaIdentityProof {
  import battleRuntimePersistentAreaCore.* from "./battle-runtime-persistent-area-core"

  var qAreaIdentity: PersistentAreaIdentityState[str]

  action init =
    qAreaIdentity' = PersistentAreaAbsent

  action installFirstArea =
    qAreaIdentity' = installPersistentAreaIdentity("area-a")

  action retainArea =
    qAreaIdentity' = retainPersistentAreaIdentity(qAreaIdentity)

  action replaceArea =
    qAreaIdentity' = replacePersistentAreaIdentity(qAreaIdentity, "area-b")

  action endArea =
    qAreaIdentity' = endPersistentAreaIdentity(qAreaIdentity)

  action step = any {
    installFirstArea,
    retainArea,
    replaceArea,
    endArea,
  }

  val persistentAreaIdentityInvariant =
    persistentAreaIdentityCoherent(qAreaIdentity)

  run test_persistent_area_identity_transition_targets_are_coherent = {
    val installed = installPersistentAreaIdentity("area-a")
    val retained = retainPersistentAreaIdentity(installed)
    val replaced = replacePersistentAreaIdentity(retained, "area-b")
    all {
      assert(persistentAreaIdentityCoherent(installed)),
      assert(persistentAreaIdentityCoherent(retained)),
      assert(persistentAreaIdentityCoherent(replaced)),
      assert(persistentAreaIdentityCoherent(endPersistentAreaIdentity(replaced))),
    }
  }
}
