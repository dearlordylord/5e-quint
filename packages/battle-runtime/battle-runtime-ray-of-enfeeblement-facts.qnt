// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle

module battleRuntimeRayOfEnfeeblementFacts {
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def rayOfEnfeeblementD20LifecycleDurationTicks: int = 10
  pure def rayOfEnfeeblementD20LifecycleTargeting: SaveGatedTargeting =
    TargetListSaveTargets({
      minTargets: 1,
      baseSlotLevel: 2,
      baseTargets: 1,
      additionalTargetsPerSlotLevel: 0,
    })
  pure def rayOfEnfeeblementD20LifecycleFailedSaveActiveEffects(source: Actor): Set[ActiveEffect] =
    Set(RayOfEnfeeblementD20Lifecycle({
      source: source,
      durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks,
    }), RayOfEnfeeblementDamageRollPenalty({
      source: source,
      durationTicks: rayOfEnfeeblementD20LifecycleDurationTicks,
    }))
}
