// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS

module battleRuntimeFighterRageResistances {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFeatureBridge.* from "./battle-runtime-feature-bridge"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def fighterRageResistances(state: BattleState): Set[DamageType] =
    {
      val projection = battleRuntimeRageResistanceProjection(fighterHasRage(state))
      Set()
        .union(if (projection.bludgeoning) Set(Bludgeoning) else Set())
        .union(if (projection.piercing) Set(Piercing) else Set())
        .union(if (projection.slashing) Set(Slashing) else Set())
    }
}
