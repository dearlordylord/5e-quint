// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
module battleRuntimeMoonbeamDamageCore {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"

  pure def moonbeamDamageAfterSave(rolledDamage: int, savingThrowSucceeded: bool): int =
    if (savingThrowSucceeded)
      rolledDamage / 2
    else
      rolledDamage

  pure def moonbeamAdjustedDamage(rolledDamage: int, savingThrowSucceeded: bool): int =
    damageAfterAdjustments(
      moonbeamDamageAfterSave(rolledDamage, savingThrowSucceeded),
      Radiant,
      Set(),
      Set(),
      Set(),
    )

  pure def combatantWithMoonbeamDamage(
    target: Combatant,
    rolledDamage: int,
    savingThrowSucceeded: bool,
  ): Combatant =
    applyDamageFromSource(
      target,
      moonbeamAdjustedDamage(rolledDamage, savingThrowSucceeded),
      1,
      true,
      OrdinaryDamage,
      Fighter,
    )

}

