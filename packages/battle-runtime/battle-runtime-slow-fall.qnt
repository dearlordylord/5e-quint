// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.reaction-roll-or-damage-reduction
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.reaction-roll-or-damage-reduction

module battleRuntimeSlowFall {
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import unitFeatureReactionReductionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-reaction-reduction-core"

  pure def battleRuntimeSlowFallDamageAfterReaction(
    reactionAvailable: bool,
    incomingFallDamage: int,
    monkLevel: int
  ): SlowFallReductionResult =
    resolveSlowFallReaction(
      initialTurnProcedureState.with("reactionAvailable", reactionAvailable),
      {
        incomingFallDamage: incomingFallDamage,
        monkLevel: monkLevel,
      }
    )

}
