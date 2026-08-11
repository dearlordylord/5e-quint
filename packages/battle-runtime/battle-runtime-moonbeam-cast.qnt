// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-moonbeam-movable-zone

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
module battleRuntimeMoonbeamCast {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeMoonbeamState.* from "./battle-runtime-moonbeam-state"
  import battleRuntimeMoonbeamFacts.* from "./battle-runtime-moonbeam-facts"

  pure def resolveMoonbeam(
    state: BattleState,
    areaId: int,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < moonbeamMinimumSlotLevel)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutMoonbeamMovableZone(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(MoonbeamMovableZone({
              areaId: areaId,
              damageDice: moonbeamDamageDice(slotLevel),
              durationTicks: moonbeamDurationTicks,
              repositionMaxMoveFeet: moonbeamRepositionMaxMoveFeet,
              savedThisTurn: Set(),
              shapeShiftSuppressed: Set(),
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

}
