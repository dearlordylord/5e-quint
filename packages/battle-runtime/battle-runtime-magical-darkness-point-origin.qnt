// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-magical-darkness-point-origin

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
// Identity-free point-origin magical-darkness projection. The named SRD proof
// module supplies authored parameters and exercises this BattleState mechanic.
module battleRuntimeMagicalDarknessPointOrigin {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure val darknessDurationTicks = 100
  pure val darknessAreaId = 5
  pure val darknessRadiusFeet = 15

  pure def activeEffectsWithoutMagicalDarknessPointOrigin(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | MagicalDarknessPointOrigin(data) => data.areaId != areaId
      | _ => true
    })

  pure def resolveDarknessPointOrigin(
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
          activeEffects: activeEffectsWithoutMagicalDarknessPointOrigin(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(MagicalDarknessPointOrigin({
              areaId: areaId,
              radiusFeet: darknessRadiusFeet,
              durationTicks: darknessDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def magicalDarknessPointOriginActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | MagicalDarknessPointOrigin(data) => data.areaId == areaId
      | _ => false
    })

  pure def magicalDarknessPointOriginSightObscurement(state: BattleState, areaId: int, observer: SightObserver): SightObscurement =
    if (magicalDarknessPointOriginActive(state, areaId))
      HeavilyObscuredSight
    else
      UnobscuredSight

  pure def magicalDarknessPointOriginNonmagicalLightIllumination(state: BattleState, areaId: int, baseIllumination: Illumination): Illumination =
    if (magicalDarknessPointOriginActive(state, areaId))
      DarknessIllumination
    else
      baseIllumination
}
