// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
module battleRuntimeFlamingSphereDamageCore {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeFlamingSphereFacts.* from "./battle-runtime-flaming-sphere-facts"

  pure def flamingSphereAdjustedDamage(rolledDamage: int, savingThrowSucceeded: bool): int =
    damageAfterAdjustments(
      flamingSphereDamageAfterSave(rolledDamage, savingThrowSucceeded),
      Fire,
      Set(),
      Set(),
      Set(),
    )

  pure def combatantWithFlamingSphereDamage(
    target: Combatant,
    rolledDamage: int,
    savingThrowSucceeded: bool,
  ): Combatant =
    applyDamageFromSource(
      target,
      flamingSphereAdjustedDamage(rolledDamage, savingThrowSucceeded),
      1,
      true,
      OrdinaryDamage,
      Fighter,
    )

}
