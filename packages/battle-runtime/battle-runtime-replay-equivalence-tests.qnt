// -*- mode: Bluespec; -*-

module battleRuntimeReplayEquivalenceTests {
  import battleRuntimeReplayEquivalence.* from "./battle-runtime-replay-equivalence"
  import battleRuntimeFillKinds.* from "./battle-runtime-fill-kinds"

  run test_replay_equivalent = {
    val root = recordedWeaponAttackReplayRoot(12)
    val continuation = recordedWeaponAttackReplayContinuation
    val resumed = List(RolledDiceFillKind)
    val independent = independentRecordedWeaponAttackReplayProjection(7)
    assert(
      battleRuntimeReplayFromRootEquivalent(
        independent,
        root,
        continuation,
        resumed,
        7,
      ),
    )
  }

  run test_replay_changed_order = {
    val root = recordedWeaponAttackReplayRoot(12)
    val continuation = recordedWeaponAttackReplayContinuation
    val reordered = List(AttackRollFillKind, TargetChoiceFillKind, RolledDiceFillKind)
    val independent = independentRecordedWeaponAttackReplayProjection(7)
    assert(
      not(
        battleRuntimeReplayFromRootEquivalent(
          independent,
          root,
          continuation,
          reordered,
          7,
        ),
      ),
    )
  }
}
