// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: bridge-owner BATTLE.STAT_BLOCK.MULTIATTACK

module battleRuntimeStatBlockMultiattackBridge {
  import statBlockMultiattack.* from "../shared-algebras/proofs/rule-core/stat-block-multiattack"

  pure def battleRuntimeSyntheticMultiattackDispatchesAfterFirstAttack: int =
    multiattackPendingProcedureRefsAfterFirstDispatch({
      dispatchProcedureRefs: List(0, 0, 0),
    }).length()

  pure def battleRuntimeSyntheticMultiattackDispatchesAfterDispatch(
    pendingProcedureRefs: List[StatBlockProcedureRef],
    procedureRef: StatBlockProcedureRef
  ): int =
    removeFirstStatBlockProcedureRef(
      pendingProcedureRefs,
      procedureRef
    ).length()
}
