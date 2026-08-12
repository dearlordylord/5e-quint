// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-dancing-lights-movable-dim-light spell.invocation-held-light-emitter spell.invocation-object-light spell.invocation-spell-created-held-object

module battleRuntimeLightEmitters {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAntimagicSuppression.* from "./battle-runtime-antimagic-suppression"
  import battleRuntimeOngoingSpellDispel.* from "./battle-runtime-ongoing-spell-dispel"
  import battleRuntimeSpellRiderBridge.* from "./battle-runtime-spell-rider-bridge"
  pure def produceFlameBrightLightRadiusFeet: int = 20

  pure def produceFlameDimLightAdditionalFeet: int = 20

  pure def produceFlameDurationTicks: int = 100

  pure def flameBladeBrightLightRadiusFeet: int = 10

  pure def flameBladeDimLightAdditionalFeet: int = 10

  pure def flameBladeDurationTicks: int = 100

  pure def flameBladeBaseSlotLevel: int = 2

  pure def faerieFireDimLightRadiusFeet: int = 10

  pure def shiningSmiteLightEmitterBrightRadiusFeet: int =
    battleRuntimeShiningSmiteBrightLightRadiusFeet

  pure def lightBrightLightRadiusFeet: int = 20

  pure def lightDimLightAdditionalFeet: int = 20

  pure def lightDurationTicks: int = 600

  pure def lightObjectSourceEffectId: int = 1

  pure def lightSpellLevel: int = 0

  pure def continualFlameBrightLightRadiusFeet: int = 20

  pure def continualFlameDimLightAdditionalFeet: int = 20

  pure def continualFlameSourceEffectId: int = 2

  pure def alternateContinualFlameSourceEffectId: int = 3

  pure def continualFlameSpellLevel: int = 2

  pure def dancingLightsDimLightRadiusFeet: int = 10

  pure def dancingLightsDurationTicks: int = 600

  pure def dancingLightsRangeFeet: int = 120

  pure def dancingLightsMaxMoveFeet: int = 60

  pure def dancingLightsSpacingFeet: int = 20

  pure def dancingLightsSeparateLightCountAllowed(lightCount: int): bool =
    lightCount >= 1 and lightCount <= 4

  pure def dancingLightsCastPlacementAllowed(lightCount: int, distanceFromCasterFeet: int, nearestSiblingDistanceFeet: int): bool =
    dancingLightsSeparateLightCountAllowed(lightCount) and
    distanceFromCasterFeet <= dancingLightsRangeFeet and
    (lightCount == 1 or nearestSiblingDistanceFeet <= dancingLightsSpacingFeet)

  pure def dancingLightsRepositionAllowed(moveDistanceFeet: int, nearestSiblingDistanceFeet: int, lightCount: int): bool =
    moveDistanceFeet <= dancingLightsMaxMoveFeet and
    (lightCount == 1 or nearestSiblingDistanceFeet <= dancingLightsSpacingFeet)

  pure def dancingLightSurvivesRange(distanceFromCasterFeet: int): bool =
    distanceFromCasterFeet <= dancingLightsRangeFeet

  pure def dancingLightsEmitter(light: int, position: int, combined: bool): LightEmitter =
    SpellLightEmitter({
      source: Fighter,
      sourceSpell: DancingLightsSpell,
      attachment: DancingLightEmitter({ light: light, position: position, combined: combined }),
      emission: DimLightEmission({ radiusFeet: dancingLightsDimLightRadiusFeet }),
      opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
      ongoingSpellTracking: UntrackedSpellLightEmitter,
      expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
    })

  pure def dancingLightsEmitters(combined: bool, lightCount: int): Set[LightEmitter] =
    if (combined) {
      Set(dancingLightsEmitter(1, 1, true))
    } else if (lightCount == 1) {
      Set(dancingLightsEmitter(1, 1, false))
    } else if (lightCount == 2) {
      Set(dancingLightsEmitter(1, 1, false), dancingLightsEmitter(2, 2, false))
    } else if (lightCount == 3) {
      Set(dancingLightsEmitter(1, 1, false), dancingLightsEmitter(2, 2, false), dancingLightsEmitter(3, 3, false))
    } else if (lightCount == 4) {
      Set(dancingLightsEmitter(1, 1, false), dancingLightsEmitter(2, 2, false), dancingLightsEmitter(3, 3, false), dancingLightsEmitter(4, 4, false))
    } else {
      Set()
    }

  pure def dancingLightsActiveEffect(
    combined: bool,
    lightCount: int,
    light1Position: int,
    light2Position: int,
    light3Position: int,
    light4Position: int,
    durationTicks: int,
  ): ActiveEffect =
    DancingLightsEffect({
      combined: combined,
      lightCount: lightCount,
      light1Position: light1Position,
      light2Position: light2Position,
      light3Position: light3Position,
      light4Position: light4Position,
      durationTicks: durationTicks,
    })

  pure def activeEffectsWithoutDancingLights(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | DancingLightsEffect(_) => false
      | _ => true
    })

  pure def activeEffectsContainDancingLights(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | DancingLightsEffect(_) => true
      | _ => false
    })

  pure def dancingLightsRemainingDurationTicks(effects: Set[ActiveEffect]): int =
    effects
      .map(effect => match effect {
        | DancingLightsEffect(data) => data.durationTicks
        | _ => 0
      })
      .fold(0, (left, right) => if (left > right) left else right)

  pure def dancingLightsEmittersFromEffect(effect: ActiveEffect): Set[LightEmitter] =
    match effect {
      | DancingLightsEffect(data) =>
          if (data.combined) {
            Set(dancingLightsEmitter(1, data.light1Position, true))
          } else if (data.lightCount == 1) {
            Set(dancingLightsEmitter(1, data.light1Position, false))
          } else if (data.lightCount == 2) {
            Set(dancingLightsEmitter(1, data.light1Position, false), dancingLightsEmitter(2, data.light2Position, false))
          } else if (data.lightCount == 3) {
            Set(dancingLightsEmitter(1, data.light1Position, false), dancingLightsEmitter(2, data.light2Position, false), dancingLightsEmitter(3, data.light3Position, false))
          } else if (data.lightCount == 4) {
            Set(dancingLightsEmitter(1, data.light1Position, false), dancingLightsEmitter(2, data.light2Position, false), dancingLightsEmitter(3, data.light3Position, false), dancingLightsEmitter(4, data.light4Position, false))
          } else {
            Set()
          }
      | _ => Set()
    }

  pure def dancingLightsActiveEffectEmitters(effects: Set[ActiveEffect]): Set[LightEmitter] =
    effects
      .map(effect => dancingLightsEmittersFromEffect(effect))
      .fold(Set(), (emitters, emitterSet) => emitters.union(emitterSet))

  pure def lightObjectTargetAllowed(objectSize: ObjectSize, wornOrCarried: ObjectWearCarry): bool =
    (
      objectSize == ObjectTiny or
      objectSize == ObjectSmall or
      objectSize == ObjectMedium or
      objectSize == ObjectLarge
    ) and (
      wornOrCarried == ObjectNotWornOrCarriedBySomeoneElse or
      wornOrCarried == ObjectWornOrCarriedByCaster
    )

  pure def lightObjectEmitter(objectTarget: ObjectTarget): LightEmitter =
    SpellLightEmitter({
      source: Fighter,
      sourceSpell: Light,
      attachment: ObjectLightEmitter({ object: objectTarget }),
      emission: BrightAndDimLightEmission({
        brightRadiusFeet: lightBrightLightRadiusFeet,
        dimAdditionalFeet: lightDimLightAdditionalFeet,
      }),
      opaqueCoverInteraction: LightEmitterBlocksOpaqueCover,
      ongoingSpellTracking: TrackedOngoingSpellLightEmitter({
        sourceEffectId: lightObjectSourceEffectId,
        sourceSpellLevel: lightSpellLevel,
      }),
      expiresAt: DurationLightEmitterExpiration({ durationTicks: lightDurationTicks }),
    })

  pure def continualFlameObjectEmitter(objectTarget: ObjectTarget): LightEmitter =
    SpellLightEmitter({
      source: Fighter,
      sourceSpell: ContinualFlame,
      attachment: ObjectLightEmitter({ object: objectTarget }),
      emission: BrightAndDimLightEmission({
        brightRadiusFeet: continualFlameBrightLightRadiusFeet,
        dimAdditionalFeet: continualFlameDimLightAdditionalFeet,
      }),
      opaqueCoverInteraction: LightEmitterBlocksOpaqueCover,
      ongoingSpellTracking: TrackedOngoingSpellLightEmitter({
        sourceEffectId: continualFlameSourceEffectId,
        sourceSpellLevel: continualFlameSpellLevel,
      }),
      expiresAt: UntilDispelledLightEmitterExpiration,
    })

  pure def lightEmitterAttachmentMatchesProjectionFact(
    attachment: LightEmitterAttachment,
    fact: LightEmitterProjectionFact,
  ): bool =
    match attachment {
      | CombatantLightEmitter(data) => match fact {
          | CombatantLightEmitterProjectionFact(factData) => data.actor == factData.actor
          | _ => false
        }
      | ObjectLightEmitter(data) => match fact {
          | ObjectLightEmitterProjectionFact(factData) => data.object == factData.object
          | _ => false
        }
      | DancingLightEmitter(data) => match fact {
          | DancingLightEmitterProjectionFact(factData) =>
              data.light == factData.light and
              data.position == factData.position and
              data.combined == factData.combined
          | _ => false
        }
    }

  pure def lightEmitterMatchesProjectionFact(emitter: LightEmitter, fact: LightEmitterProjectionFact): bool =
    match emitter {
      | SpellLightEmitter(data) => lightEmitterAttachmentMatchesProjectionFact(data.attachment, fact)
      | ObjectInvisibleRevealLightEmitter(data) => match fact {
          | ObjectLightEmitterProjectionFact(factData) => data.object == factData.object
          | _ => false
        }
    }

  pure def lightProjectionFactDistanceFeet(fact: LightEmitterProjectionFact): int =
    match fact {
      | CombatantLightEmitterProjectionFact(data) => data.distanceFeet
      | ObjectLightEmitterProjectionFact(data) => data.distanceFeet
      | DancingLightEmitterProjectionFact(data) => data.distanceFeet
    }

  pure def lightEmitterOpaqueCoverBlocksEmission(emitter: LightEmitter, fact: LightEmitterProjectionFact): bool =
    match fact {
      | ObjectLightEmitterProjectionFact(factData) =>
          factData.opaqueCover and match emitter {
            | SpellLightEmitter(data) =>
                data.opaqueCoverInteraction == LightEmitterBlocksOpaqueCover
            | ObjectInvisibleRevealLightEmitter(_) => false
          }
      | _ => false
    }

  pure def illuminationFromEmissionAtDistance(emission: LightEmission, distanceFeet: int): Illumination =
    match emission {
      | DimLightEmission(data) =>
          if (distanceFeet <= data.radiusFeet) DimLightIllumination else DarknessIllumination
      | BrightAndDimLightEmission(data) =>
          if (distanceFeet <= data.brightRadiusFeet) BrightLightIllumination
          else if (distanceFeet <= data.brightRadiusFeet + data.dimAdditionalFeet) DimLightIllumination
          else DarknessIllumination
    }

  pure def lightEmitterIllumination(emitter: LightEmitter, fact: LightEmitterProjectionFact): Illumination =
    if (
      lightEmitterMatchesProjectionFact(emitter, fact) and
      not(lightEmitterOpaqueCoverBlocksEmission(emitter, fact))
    )
      match emitter {
        | SpellLightEmitter(data) =>
            illuminationFromEmissionAtDistance(data.emission, lightProjectionFactDistanceFeet(fact))
        | ObjectInvisibleRevealLightEmitter(data) =>
            illuminationFromEmissionAtDistance(
              DimLightEmission({ radiusFeet: data.dimLightRadiusFeet }),
              lightProjectionFactDistanceFeet(fact)
            )
      }
    else
      DarknessIllumination

  pure def mergedIllumination(left: Illumination, right: Illumination): Illumination =
    match left {
      | BrightLightIllumination => BrightLightIllumination
      | DimLightIllumination => if (right == BrightLightIllumination) BrightLightIllumination else DimLightIllumination
      | DarknessIllumination => right
    }

  pure def battleIlluminationFromLightEmitters(
    emitters: Set[LightEmitter],
    facts: Set[LightEmitterProjectionFact],
  ): Illumination =
    emitters
      .map(emitter =>
        facts
          .map(fact => lightEmitterIllumination(emitter, fact))
          .fold(DarknessIllumination, mergedIllumination)
      )
      .fold(DarknessIllumination, mergedIllumination)

  pure def illuminationForObserver(illumination: Illumination, observer: SightObserver): Illumination =
    match observer {
      | OrdinarySight => illumination
      | DarkvisionSight(data) =>
          if (data.distanceFeet > data.rangeFeet)
            illumination
          else match illumination {
            | BrightLightIllumination => BrightLightIllumination
            | DimLightIllumination => BrightLightIllumination
            | DarknessIllumination => DimLightIllumination
          }
    }

  pure def sightObscurement(illumination: Illumination, observer: SightObserver): SightObscurement =
    match illuminationForObserver(illumination, observer) {
      | BrightLightIllumination => UnobscuredSight
      | DimLightIllumination => LightlyObscuredSight
      | DarknessIllumination => HeavilyObscuredSight
    }

  pure def lightEmittersWithoutLightFromSource(emitters: Set[LightEmitter], source: Actor): Set[LightEmitter] =
    emitters.filter(emitter => match emitter {
      | SpellLightEmitter(data) => data.source != source or data.sourceSpell != Light
      | ObjectInvisibleRevealLightEmitter(_) => true
    })

  pure def spellLightEmitterWithOngoingSpellTracking(
    emitter: LightEmitter,
    sourceEffectId: int,
    sourceSpellLevel: int,
  ): LightEmitter =
    match emitter {
      | SpellLightEmitter(data) => SpellLightEmitter({
          ...data,
          ongoingSpellTracking: TrackedOngoingSpellLightEmitter({
            sourceEffectId: sourceEffectId,
            sourceSpellLevel: sourceSpellLevel,
          }),
        })
      | ObjectInvisibleRevealLightEmitter(_) => emitter
    }

  pure def dispelMagicOngoingSpellTrackingHasSourceEffectId(
    tracking: OngoingSpellTracking,
    sourceEffectId: int,
  ): bool =
    match tracking {
      | UntrackedSpellLightEmitter => false
      | TrackedOngoingSpellLightEmitter(data) => data.sourceEffectId == sourceEffectId
    }

  pure def dispelMagicEndsOngoingSpellTracking(
    tracking: OngoingSpellTracking,
    slotLevel: int,
    successfulCheckEffectIds: Set[int],
  ): bool =
    match tracking {
      | UntrackedSpellLightEmitter => false
      | TrackedOngoingSpellLightEmitter(data) =>
          dispelMagicEndsTrackedOngoingSpell(
            slotLevel,
            successfulCheckEffectIds,
            data.sourceEffectId,
            data.sourceSpellLevel,
          )
    }

  pure def dispelMagicObjectTargetLightEmitters(
    emitters: Set[LightEmitter],
    objectTarget: ObjectTarget,
    slotLevel: int,
    successfulCheckEffectIds: Set[int],
  ): Set[LightEmitter] =
    emitters.filter(emitter => match emitter {
      | SpellLightEmitter(data) =>
          data.attachment != ObjectLightEmitter({ object: objectTarget })
          or not(dispelMagicEndsOngoingSpellTracking(
            data.ongoingSpellTracking,
            slotLevel,
            successfulCheckEffectIds,
          ))
      | ObjectInvisibleRevealLightEmitter(_) => true
    })

  pure def dispelMagicMagicalEffectTargetLightEmitters(
    emitters: Set[LightEmitter],
    sourceEffectId: int,
    slotLevel: int,
    successfulCheckEffectIds: Set[int],
  ): Set[LightEmitter] =
    emitters.filter(emitter => match emitter {
      | SpellLightEmitter(data) =>
          not(
            dispelMagicOngoingSpellTrackingHasSourceEffectId(data.ongoingSpellTracking, sourceEffectId) and
            dispelMagicEndsOngoingSpellTracking(data.ongoingSpellTracking, slotLevel, successfulCheckEffectIds)
          )
      | ObjectInvisibleRevealLightEmitter(_) => true
    })

  pure def ongoingSpellTrackingSourceEffectIdIn(
    tracking: OngoingSpellTracking,
    sourceEffectIds: Set[int],
  ): bool =
    match tracking {
      | UntrackedSpellLightEmitter => false
      | TrackedOngoingSpellLightEmitter(data) =>
          sourceEffectIds.contains(data.sourceEffectId)
    }

  pure def ongoingSpellTrackingSpellLevelAtMost(
    tracking: OngoingSpellTracking,
    maxSpellLevel: int,
  ): bool =
    match tracking {
      | UntrackedSpellLightEmitter => false
      | TrackedOngoingSpellLightEmitter(data) =>
          data.sourceSpellLevel <= maxSpellLevel
    }

  pure def darknessAreaDispelledSpellCreatedLightEmitters(
    emitters: Set[LightEmitter],
    overlappingSourceEffectIds: Set[int],
    maxSpellLevel: int,
  ): Set[LightEmitter] =
    emitters.filter(emitter => match emitter {
      | SpellLightEmitter(data) =>
          not(
            ongoingSpellTrackingSourceEffectIdIn(data.ongoingSpellTracking, overlappingSourceEffectIds) and
            ongoingSpellTrackingSpellLevelAtMost(data.ongoingSpellTracking, maxSpellLevel)
          )
      | ObjectInvisibleRevealLightEmitter(_) => true
    })

  pure def lightEmitterSuppressedByAntimagic(
    emitter: LightEmitter,
    suppressedOngoingSpellEffects: Set[OngoingSpellEffectRef],
  ): bool =
    match emitter {
      | SpellLightEmitter(data) =>
          match data.ongoingSpellTracking {
            | UntrackedSpellLightEmitter => false
            | TrackedOngoingSpellLightEmitter(tracking) =>
                suppressedOngoingSpellEffects.contains(
                  OngoingSpellLightEffectRef({ sourceEffectId: tracking.sourceEffectId })
                )
          }
      | ObjectInvisibleRevealLightEmitter(_) => false
    }

  pure def activeEffectsWithoutProduceFlameHeldLight(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ProduceFlameHeldLight(_) => false
      | _ => true
    })

  pure def activeEffectsContainProduceFlameHeldLight(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | ProduceFlameHeldLight(_) => true
      | _ => false
    })

  pure def produceFlameHeldLightEmitter(durationTicks: int): LightEmitter =
    SpellLightEmitter({
      source: Fighter,
      sourceSpell: ProduceFlame,
      attachment: CombatantLightEmitter({ actor: Fighter }),
      emission: BrightAndDimLightEmission({
        brightRadiusFeet: produceFlameBrightLightRadiusFeet,
        dimAdditionalFeet: produceFlameDimLightAdditionalFeet,
      }),
      opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
      ongoingSpellTracking: UntrackedSpellLightEmitter,
      expiresAt: DurationLightEmitterExpiration({ durationTicks: durationTicks }),
    })

  pure def produceFlameHeldLightEmitters(effects: Set[ActiveEffect]): Set[LightEmitter] =
    effects
      .map(effect => match effect {
        | ProduceFlameHeldLight(data) => Set(produceFlameHeldLightEmitter(data.durationTicks))
        | _ => Set()
      })
      .fold(Set(), (emitters, emitterSet) => emitters.union(emitterSet))

  pure def activeEffectsWithoutFlameBlade(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | FlameBladeEffect(_) => false
      | _ => true
    })

  pure def activeEffectsContainHeldFlameBlade(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | FlameBladeEffect(data) => data.objectState == FlameBladeHeldObject
      | _ => false
    })

  pure def activeEffectsContainReleasedFlameBlade(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | FlameBladeEffect(data) => data.objectState == FlameBladeReleasedObject
      | _ => false
    })

  pure def activeEffectsWithFlameBladeObjectState(
    effects: Set[ActiveEffect],
    objectState: FlameBladeObjectState,
  ): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | FlameBladeEffect(data) => FlameBladeEffect({ ...data, objectState: objectState })
      | _ => effect
    })

  pure def flameBladeDamageDice(slotLevel: int): int =
    if (slotLevel > flameBladeBaseSlotLevel) 3 + (slotLevel - flameBladeBaseSlotLevel) else 3

  pure def flameBladeDamage(diceRoll: int, spellcastingAbilityModifier: int): int =
    diceRoll + spellcastingAbilityModifier

  pure def flameBladeHeldDamage(effects: Set[ActiveEffect], diceRoll: int): int =
    effects
      .map(effect => match effect {
        | FlameBladeEffect(data) =>
            if (data.objectState == FlameBladeHeldObject)
              flameBladeDamage(diceRoll, data.spellcastingAbilityModifier)
            else
              0
        | _ => 0
      })
      .fold(0, (highest, damage) => if (highest > damage) highest else damage)

  pure def flameBladeActiveEffect(
    slotLevel: int,
    spellcastingAbilityModifier: int,
    objectState: FlameBladeObjectState,
  ): ActiveEffect =
    FlameBladeEffect({
      durationTicks: flameBladeDurationTicks,
      slotLevel: slotLevel,
      spellcastingAbilityModifier: spellcastingAbilityModifier,
      objectState: objectState,
    })

  pure def flameBladeHeldLightEmitter: LightEmitter =
    SpellLightEmitter({
      source: Fighter,
      sourceSpell: FlameBlade,
      attachment: CombatantLightEmitter({ actor: Fighter }),
      emission: BrightAndDimLightEmission({
        brightRadiusFeet: flameBladeBrightLightRadiusFeet,
        dimAdditionalFeet: flameBladeDimLightAdditionalFeet,
      }),
      opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
      ongoingSpellTracking: UntrackedSpellLightEmitter,
      expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
    })

  pure def flameBladeHeldLightEmitters(effects: Set[ActiveEffect]): Set[LightEmitter] =
    effects
      .map(effect => match effect {
        | FlameBladeEffect(data) =>
            if (data.objectState == FlameBladeHeldObject)
              Set(flameBladeHeldLightEmitter)
            else
              Set()
        | _ => Set()
      })
      .fold(Set(), (emitters, emitterSet) => emitters.union(emitterSet))

  pure def faerieFireCombatantDimLightEmitters(actor: Actor, effects: Set[ActiveEffect]): Set[LightEmitter] =
    effects
      .map(effect => match effect {
        | FaerieFireOutline => Set(SpellLightEmitter({
            source: Fighter,
            sourceSpell: FaerieFire,
            attachment: CombatantLightEmitter({ actor: actor }),
            emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
            opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
            ongoingSpellTracking: UntrackedSpellLightEmitter,
            expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
          }))
        | _ => Set()
      })
      .fold(Set(), (emitters, emitterSet) => emitters.union(emitterSet))

  pure def shiningSmiteBrightLightEmitter(actor: Actor): LightEmitter =
    SpellLightEmitter({
      source: Fighter,
      sourceSpell: ShiningSmite,
      attachment: CombatantLightEmitter({ actor: actor }),
      emission: BrightAndDimLightEmission({
        brightRadiusFeet: shiningSmiteLightEmitterBrightRadiusFeet,
        dimAdditionalFeet: 0,
      }),
      opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
      ongoingSpellTracking: UntrackedSpellLightEmitter,
      expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
    })

  pure def shiningSmiteCombatantBrightLightEmitters(actor: Actor, effects: Set[ActiveEffect]): Set[LightEmitter] =
    effects
      .map(effect => match effect {
        | ShiningSmiteIllumination(_) => Set(shiningSmiteBrightLightEmitter(actor))
        | _ => Set()
      })
      .fold(Set(), (emitters, emitterSet) => emitters.union(emitterSet))

  pure def faerieFireObjectDimLightEmitters(outlines: Set[ObjectOutline]): Set[LightEmitter] =
    outlines.map(outline => match outline {
      | FaerieFireObjectOutline(data) => SpellLightEmitter({
          source: data.source,
          sourceSpell: FaerieFire,
          attachment: ObjectLightEmitter({ object: data.object }),
          emission: DimLightEmission({ radiusFeet: faerieFireDimLightRadiusFeet }),
          opaqueCoverInteraction: LightEmitterDoesNotBlockOpaqueCover,
          ongoingSpellTracking: UntrackedSpellLightEmitter,
          expiresAt: ConcentrationLightEmitterExpiration({ actor: data.source }),
        })
    })

  pure def battleRuntimeLightEmitters(state: BattleState): Set[LightEmitter] = {
    val suppressedOngoingSpellEffects = antimagicSuppressedOngoingSpellEffects(state)
    state.lightEmitters
      .union(produceFlameHeldLightEmitters(state.fighter.activeEffects))
      .union(flameBladeHeldLightEmitters(state.fighter.activeEffects))
      .union(dancingLightsActiveEffectEmitters(state.fighter.activeEffects))
      .union(faerieFireCombatantDimLightEmitters(Fighter, state.fighter.activeEffects))
      .union(faerieFireCombatantDimLightEmitters(Goblin, state.goblin.activeEffects))
      .union(shiningSmiteCombatantBrightLightEmitters(Fighter, state.fighter.activeEffects))
      .union(shiningSmiteCombatantBrightLightEmitters(Goblin, state.goblin.activeEffects))
      .union(faerieFireObjectDimLightEmitters(state.objectOutlines))
      .filter(emitter => not(lightEmitterSuppressedByAntimagic(emitter, suppressedOngoingSpellEffects)))
  }

}
