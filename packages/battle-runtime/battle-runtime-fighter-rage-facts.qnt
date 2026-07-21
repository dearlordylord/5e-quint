// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module battleRuntimeFighterRageFacts {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def fighterRageOccurrence(state: BattleState): ActiveOngoingFeatureOccurrence =
    state.fighter.activeOngoingFeatureOccurrences.rage

  pure def fighterHasRage(state: BattleState): bool =
    fighterRageOccurrence(state) != NoActiveOngoingFeatureOccurrence
}
