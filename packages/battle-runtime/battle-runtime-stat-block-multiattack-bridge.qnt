// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: bridge-owner BATTLE.STAT_BLOCK.MULTIATTACK

module battleRuntimeStatBlockMultiattackBridge {
  import statBlockMultiattack.* from "../shared-algebras/proofs/rule-core/stat-block-multiattack"

  pure def battleRuntimeSyntheticMultiattackDispatchesAfterFirstAttack: int =
    multiattackDispatchesRemaining(multiattackDispatchesAfterFirstAttack({
      firstAttackName: PrimaryStatBlockAttack,
      primaryAttackCount: 3,
      secondaryAttackCount: 0,
    }))

  pure def battleRuntimeSyntheticMultiattackDispatchesAfterDispatch(remaining: int): int =
    multiattackDispatchesRemaining(decrementDispatch({
      primaryRemaining: remaining,
      secondaryRemaining: 0,
    }, PrimaryStatBlockAttack))
}
