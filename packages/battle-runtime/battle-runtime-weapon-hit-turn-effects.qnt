// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save

module battleRuntimeWeaponHitTurnEffects {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeWeaponHitSpellRiders.* from "./battle-runtime-weapon-hit-spell-riders"

  pure def endTurnWithEnsnaringStrikeOngoingDamage(
    state: BattleState,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val advanced = endTurn(state)
    val damageDice = ensnaringStrikeDamageDice(advanced.goblin.activeEffects)
    if (currentActor(advanced) == Goblin and damageDice > 0)
      { ...advanced, goblin: applyDamageFromSource(advanced.goblin, damageRoll, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter) }
    else
      advanced
  }

  pure def endTurnWithSearingSmiteOngoingDamageAndSave(
    state: BattleState,
    damageRoll: int,
    saveSucceeded: bool,
    concentrationSaveSucceeded: bool,
  ): BattleState = {
    val advanced = endTurn(state)
    val damageDice = searingSmiteDamageDice(advanced.goblin.activeEffects)
    if (currentActor(advanced) == Goblin and damageDice > 0)
      {
        val damagedGoblin = applyDamageFromSource(advanced.goblin, damageRoll, 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
        {
          ...advanced,
          goblin: if (saveSucceeded)
            { ...damagedGoblin, activeEffects: activeEffectsWithoutSearingSmite(damagedGoblin.activeEffects) }
          else
            damagedGoblin,
        }
      }
    else
      advanced
  }
}
