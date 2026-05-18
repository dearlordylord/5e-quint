// -*- mode: Bluespec; -*-

module battleRuntimeLight {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"

  pure def lightEmittersWithoutExpiredEndOfTurnEmitters(
    emitters: Set[LightEmitter],
    actor: Actor,
    round: int
  ): Set[LightEmitter] =
    emitters.filter(emitter => match emitter {
      | SpellLightEmitter(data) => match data.expiresAt {
          | EndOfTurnLightEmitterExpiration(expiresAt) => expiresAt.actor != actor or expiresAt.round != round
          | ConcentrationLightEmitterExpiration(_) => true
          | DurationLightEmitterExpiration(_) => true
        }
      | ObjectInvisibleRevealLightEmitter(data) => data.expiresAtActor != actor or data.expiresAtRound != round
    })

  pure def tickDurationLightEmitters(emitters: Set[LightEmitter]): Set[LightEmitter] =
    emitters
      .map(emitter => match emitter {
        | SpellLightEmitter(data) => match data.expiresAt {
          | DurationLightEmitterExpiration(expiresAt) =>
            if (expiresAt.durationTicks > 0)
              SpellLightEmitter({
                ...data,
                expiresAt: DurationLightEmitterExpiration({
                  durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(expiresAt.durationTicks),
                }),
              })
            else
              emitter
          | EndOfTurnLightEmitterExpiration(_) => emitter
          | ConcentrationLightEmitterExpiration(_) => emitter
        }
        | ObjectInvisibleRevealLightEmitter(_) => emitter
      })
      .filter(emitter => match emitter {
        | SpellLightEmitter(data) => match data.expiresAt {
          | DurationLightEmitterExpiration(expiresAt) =>
            battleRuntimeTimedSpellEffectRemainsActive(expiresAt.durationTicks)
          | EndOfTurnLightEmitterExpiration(_) => true
          | ConcentrationLightEmitterExpiration(_) => true
        }
        | ObjectInvisibleRevealLightEmitter(_) => true
      })

  pure def produceFlameBrightLightRadiusFeet: int = 20

  pure def produceFlameDimLightAdditionalFeet: int = 20

  pure def produceFlameDurationTicks: int = 100

  pure def faerieFireDimLightRadiusFeet: int = 10

  pure def lightBrightLightRadiusFeet: int = 20

  pure def lightDimLightAdditionalFeet: int = 20

  pure def lightDurationTicks: int = 600

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
      expiresAt: DurationLightEmitterExpiration({ durationTicks: lightDurationTicks }),
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
      expiresAt: DurationLightEmitterExpiration({ durationTicks: durationTicks }),
    })

  pure def produceFlameHeldLightEmitters(effects: Set[ActiveEffect]): Set[LightEmitter] =
    effects
      .map(effect => match effect {
        | ProduceFlameHeldLight(data) => Set(produceFlameHeldLightEmitter(data.durationTicks))
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
            expiresAt: ConcentrationLightEmitterExpiration({ actor: Fighter }),
          }))
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
          expiresAt: ConcentrationLightEmitterExpiration({ actor: data.source }),
        })
    })

  pure def battleRuntimeLightEmitters(state: BattleState): Set[LightEmitter] =
    state.lightEmitters
      .union(produceFlameHeldLightEmitters(state.fighter.activeEffects))
      .union(dancingLightsActiveEffectEmitters(state.fighter.activeEffects))
      .union(faerieFireCombatantDimLightEmitters(Fighter, state.fighter.activeEffects))
      .union(faerieFireCombatantDimLightEmitters(Goblin, state.goblin.activeEffects))
      .union(faerieFireObjectDimLightEmitters(state.objectOutlines))

  pure def fighterWithoutProduceFlameHeldLight(state: BattleState): Combatant =
    {
      ...state.fighter,
      activeEffects: activeEffectsWithoutProduceFlameHeldLight(state.fighter.activeEffects),
    }
}
