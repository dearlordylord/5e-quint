// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY

module battleRuntimeRayOfEnfeeblementDamageResolution {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeRayOfEnfeeblement.* from "./battle-runtime-ray-of-enfeeblement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"

  pure def saveGatedDamageTargetAfterRayPenaltyLifecycle(
    invocation: SaveGatedDamageInvocation,
    target: Combatant,
    sourceEffects: Set[ActiveEffect],
    source: Actor,
    rolledDamage: int,
    penaltyRoll: int,
    savingThrowSucceeded: bool,
    resistances: Set[DamageType],
    vulnerabilities: Set[DamageType],
    immunities: Set[DamageType],
    reductionRoll: int,
    concentrationSaveSucceeded: bool,
  ): Combatant = {
    val reducedDamage = saveGatedDamageAfterRayPenaltyResistanceSpellReduction(
      invocation,
      sourceEffects,
      target.activeEffects,
      source,
      rolledDamage,
      penaltyRoll,
      savingThrowSucceeded,
      resistances,
      vulnerabilities,
      immunities,
      reductionRoll,
    )
    applyDamageFromSource(target, reducedDamage, 1, concentrationSaveSucceeded, OrdinaryDamage, source)
  }
}
