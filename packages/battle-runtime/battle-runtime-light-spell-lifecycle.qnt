// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-dancing-lights-movable-dim-light spell.invocation-held-light-emitter spell.invocation-object-light spell.invocation-spell-created-held-object

module battleRuntimeLightSpellLifecycle {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeLightEmitters.* from "./battle-runtime-light-emitters"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeSpellLifecycleBridge.* from "./battle-runtime-spell-lifecycle-bridge"
  pure def resolveDancingLightsSeparateCast(
    state: BattleState,
    lightCount: int,
    distanceFromCasterFeet: int,
    nearestSiblingDistanceFeet: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      dancingLightsCastPlacementAllowed(lightCount, distanceFromCasterFeet, nearestSiblingDistanceFeet)
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      {
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutDancingLights(withoutPrior.fighter.activeEffects)
            .union(Set(dancingLightsActiveEffect(false, lightCount, 1, 2, 3, 4, dancingLightsDurationTicks))),
        },
        actionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveDancingLightsCombinedCast(state: BattleState, distanceFromCasterFeet: int): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      distanceFromCasterFeet <= dancingLightsRangeFeet
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      {
        ...withoutPrior,
        fighter: {
          ...withoutPrior.fighter,
          concentrating: true,
          activeEffects: activeEffectsWithoutDancingLights(withoutPrior.fighter.activeEffects)
            .union(Set(dancingLightsActiveEffect(true, 1, 1, 0, 0, 0, dancingLightsDurationTicks))),
        },
        actionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveDancingLightsReposition(
    state: BattleState,
    combined: bool,
    lightCount: int,
    moveDistanceFeet: int,
    nearestSiblingDistanceFeet: int,
    distanceFromCasterFeet: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      activeEffectsContainDancingLights(state.fighter.activeEffects) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      dancingLightsRepositionAllowed(moveDistanceFeet, nearestSiblingDistanceFeet, lightCount)
    ) {
      val remainingLightCount = if (dancingLightSurvivesRange(distanceFromCasterFeet)) lightCount else 0
      val remainingDurationTicks = dancingLightsRemainingDurationTicks(state.fighter.activeEffects)
      val nextEffects =
        if (remainingLightCount == 0)
          activeEffectsWithoutDancingLights(state.fighter.activeEffects)
        else
          activeEffectsWithoutDancingLights(state.fighter.activeEffects)
            .union(Set(dancingLightsActiveEffect(combined, remainingLightCount, 11, 12, 13, 14, remainingDurationTicks)))
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: nextEffects,
        },
        bonusActionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveLightObject(
    state: BattleState,
    objectTarget: ObjectTarget,
    objectSize: ObjectSize,
    wornOrCarried: ObjectWearCarry,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      lightObjectTargetAllowed(objectSize, wornOrCarried)
    ) {
      {
        ...state,
        lightEmitters: lightEmittersWithoutLightFromSource(state.lightEmitters, Fighter)
          .union(Set(lightObjectEmitter(objectTarget))),
        actionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveContinualFlameObject(
    state: BattleState,
    objectTarget: ObjectTarget,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.actionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      commitActorSpellSlotUse({
        ...state,
        lightEmitters: state.lightEmitters.union(Set(continualFlameObjectEmitter(objectTarget))),
        actionAvailable: false,
      }, Fighter)
    } else {
      state
    }

  pure def resolveProduceFlameHeldLight(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutProduceFlameHeldLight(state.fighter.activeEffects)
            .union(Set(ProduceFlameHeldLight({ durationTicks: produceFlameDurationTicks }))),
        },
        bonusActionAvailable: false,
      }
    } else {
      state
    }

  pure def resolveFlameBlade(
    state: BattleState,
    slotLevel: int,
    spellcastingAbilityModifier: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      combatantHasFreeHand(state.fighter) and
      slotLevel >= flameBladeBaseSlotLevel and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: {
          ...combatantWithSpellCreatedHeldObjectHand(withoutPrior.fighter),
          concentrating: true,
          activeEffects: activeEffectsWithoutFlameBlade(withoutPrior.fighter.activeEffects)
            .union(Set(flameBladeActiveEffect(slotLevel, spellcastingAbilityModifier, FlameBladeHeldObject))),
        },
        bonusActionAvailable: false,
      }, Fighter)
    } else {
      state
    }

  pure def releaseFlameBlade(state: BattleState): BattleState =
    if (currentActor(state) == Fighter and activeEffectsContainHeldFlameBlade(state.fighter.activeEffects))
      {
        ...state,
        fighter: {
          ...combatantWithoutSpellCreatedHeldObjectHand(state.fighter),
          activeEffects: activeEffectsWithFlameBladeObjectState(
            state.fighter.activeEffects,
            FlameBladeReleasedObject,
          ),
        },
      }
    else
      state

  pure def reEvokeFlameBlade(state: BattleState): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      combatantHasFreeHand(state.fighter) and
      activeEffectsContainReleasedFlameBlade(state.fighter.activeEffects) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    )
      {
        ...state,
        fighter: {
          ...combatantWithSpellCreatedHeldObjectHand(state.fighter),
          activeEffects: activeEffectsWithFlameBladeObjectState(
            state.fighter.activeEffects,
            FlameBladeHeldObject,
          ),
        },
        bonusActionAvailable: false,
      }
    else
      state

}
