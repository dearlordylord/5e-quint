// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-fog-cloud-obscurement spell.invocation-magical-darkness-point-origin

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
module battleRuntimeObscuringAreaEffects {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure val fogCloudDurationTicks = 600
  pure val fogCloudAreaId = 2
  pure val fogCloudBaseRadiusFeet = 20
  pure val fogCloudRadiusFeetPerSlotAboveFirst = 20
  pure val darknessDurationTicks = 100
  pure val darknessAreaId = 5
  pure val darknessRadiusFeet = 15

  pure def fogCloudRadiusFeet(slotLevel: int): int =
    fogCloudBaseRadiusFeet + ((slotLevel - 1) * fogCloudRadiusFeetPerSlotAboveFirst)

  pure def activeEffectsWithoutFogCloudObscurement(effects: Set[ActiveEffect], areaId: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FogCloudObscurement(data) => data.areaId != areaId
      | _ => true
    })

  pure def resolveFogCloud(
    state: BattleState,
    areaId: int,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or slotLevel < 1)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutFogCloudObscurement(withoutPrior.fighter.activeEffects, areaId)
            .union(Set(FogCloudObscurement({
              areaId: areaId,
              radiusFeet: fogCloudRadiusFeet(slotLevel),
              durationTicks: fogCloudDurationTicks,
            }))),
        },
        actionAvailable: false,
      }, Fighter)
    }

  pure def fogCloudObscurementActive(state: BattleState, areaId: int): bool =
    state.fighter.activeEffects.exists(effect => match effect {
      | FogCloudObscurement(data) => data.areaId == areaId
      | _ => false
    })

  pure def disperseFogCloudByStrongWind(state: BattleState, areaId: int): BattleState =
    if (fogCloudObscurementActive(state, areaId))
      breakConcentrationSpellEffects(state, Fighter)
    else
      state

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
