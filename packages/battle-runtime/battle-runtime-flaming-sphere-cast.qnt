// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-flaming-sphere-hazard-ram

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
module battleRuntimeFlamingSphereCast {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeFlamingSphereFacts.* from "./battle-runtime-flaming-sphere-facts"
  import battleRuntimeFlamingSphereSaveDamage.* from "./battle-runtime-flaming-sphere-save-damage"

  pure def resolveFlamingSphere(
    state: BattleState,
    areaId: int,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 2)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutFlamingSphere(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(FlamingSphere({
              areaId: areaId,
              damageDice: flamingSphereDamageDice(slotLevel),
              durationTicks: flamingSphereDurationTicks,
              ramMaxMoveFeet: flamingSphereRamMaxMoveFeet,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

}
