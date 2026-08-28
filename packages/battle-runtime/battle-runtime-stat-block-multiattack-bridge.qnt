// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: bridge-owner BATTLE.STAT_BLOCK.MULTIATTACK

module battleRuntimeStatBlockMultiattackBridge {
  import statBlockMultiattack.* from "../shared-algebras/proofs/rule-core/stat-block-multiattack"

  pure def battleRuntimeSyntheticMultiattackDispatchCountAfterActivation: int =
    statBlockMultiattackPendingProcedureRefs(
      activateStatBlockMultiattack(
        initialStatBlockMultiattackState,
        { dispatchProcedureRefs: List(0, 0, 0) }
      )
    ).length()

  // The legacy battle slice stores only the number of pending dispatches. This
  // is its canonical projection of one successful dispatch from the focused
  // Multiattack state machine.
  pure def battleRuntimeStatBlockMultiattackDispatchCountAfterDispatch(
    pendingDispatchCount: int
  ): int =
    if (pendingDispatchCount > 0) pendingDispatchCount - 1 else 0
}
