// -*- mode: Bluespec; -*-

// Reachability model for the generic identity relation shared by persistent
// and movable areas. The transition system deliberately retains the active
// effect identity and projected-zone identity as separate facts; each action
// constructs or preserves them through the identity-free rule core.
//
// Runtime area identities remain unrestricted strings. This finite proof uses
// two distinct representatives because the transition relation and invariant
// observe identities only by copying them and testing equality. The two values
// therefore cover both equality classes relevant to coherence: equal and
// unequal. The model does not impose a two-value runtime domain or rely on
// string contents, ordering, or any other string operation.
module battleRuntimePersistentAreaIdentityProof {
  import battleRuntimePersistentAreaCore.* from "./battle-runtime-persistent-area-core"

  pure val firstProofAreaIdentity: str = "area-a"
  pure val replacementProofAreaIdentity: str = "area-b"
  pure val proofAreaIdentitiesAreDistinct: bool =
    firstProofAreaIdentity != replacementProofAreaIdentity

  var qAreaIdentity: PersistentAreaIdentityState[str]

  action init =
    qAreaIdentity' = PersistentAreaAbsent

  action installFirstArea =
    qAreaIdentity' = installPersistentAreaIdentity(firstProofAreaIdentity)

  action retainArea =
    qAreaIdentity' = retainPersistentAreaIdentity(qAreaIdentity)

  action replaceArea =
    qAreaIdentity' = replacePersistentAreaIdentity(qAreaIdentity, replacementProofAreaIdentity)

  action endArea =
    qAreaIdentity' = endPersistentAreaIdentity(qAreaIdentity)

  action step = any {
    installFirstArea,
    retainArea,
    replaceArea,
    endArea,
  }

  val persistentAreaIdentityInvariant = all {
    qAreaIdentity.in(Set(
      PersistentAreaAbsent,
      installPersistentAreaIdentity(firstProofAreaIdentity),
      installPersistentAreaIdentity(replacementProofAreaIdentity),
      PersistentAreaPresent({
        activeEffectAreaId: firstProofAreaIdentity,
        projectedZoneAreaId: replacementProofAreaIdentity,
      }),
      PersistentAreaPresent({
        activeEffectAreaId: replacementProofAreaIdentity,
        projectedZoneAreaId: firstProofAreaIdentity,
      }),
    )),
    proofAreaIdentitiesAreDistinct,
    persistentAreaIdentityCoherent(qAreaIdentity),
  }

  run test_persistent_area_identity_transition_targets_are_coherent = {
    val installed = installPersistentAreaIdentity(firstProofAreaIdentity)
    val retained = retainPersistentAreaIdentity(installed)
    val replaced = replacePersistentAreaIdentity(retained, replacementProofAreaIdentity)
    all {
      assert(proofAreaIdentitiesAreDistinct),
      assert(persistentAreaIdentityCoherent(installed)),
      assert(persistentAreaIdentityCoherent(retained)),
      assert(persistentAreaIdentityCoherent(replaced)),
      assert(persistentAreaIdentityCoherent(endPersistentAreaIdentity(replaced))),
    }
  }
}
