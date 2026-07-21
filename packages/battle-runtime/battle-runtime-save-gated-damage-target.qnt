// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE

module battleRuntimeSaveGatedDamageTarget {
  import battleRuntimeSaveGatedFacts.* from "./battle-runtime-save-gated-facts"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  pure def saveGatedDamageTarget(
    invocation: SaveGatedDamageInvocation,
    target: Combatant,
    savingThrowSucceeded: bool,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
    damageSource: Actor,
  ): Combatant =
    if (saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded) == 0)
      target
    else
      applyDamageFromSource(
        target,
        damageAfterAdjustments(
          saveGatedDamageAmount(invocation, damageRoll, savingThrowSucceeded),
          saveGatedDamageType(invocation),
          Set(),
          Set(),
          Set()
        ),
        1,
        concentrationSaveSucceeded,
        OrdinaryDamage,
        damageSource,
      )
}
