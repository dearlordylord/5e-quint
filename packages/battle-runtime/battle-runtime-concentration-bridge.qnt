// -*- mode: Bluespec; -*-

module battleRuntimeConcentrationBridge {
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"

  pure def battleRuntimeConcentrationSavingThrowDc(damage: int): int =
    concentrationSavingThrowDc(damage)
}
