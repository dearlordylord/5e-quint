// -*- mode: Bluespec; -*-

module battleRuntimeLight {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeDamageAdjustments.* from "./battle-runtime-damage-adjustments"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"

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

  pure def shiningSmiteLightEmitterBrightRadiusFeet: int =
    battleRuntimeShiningSmiteBrightLightRadiusFeet

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
          expiresAt: ConcentrationLightEmitterExpiration({ actor: data.source }),
        })
    })

  pure def battleRuntimeLightEmitters(state: BattleState): Set[LightEmitter] =
    state.lightEmitters
      .union(produceFlameHeldLightEmitters(state.fighter.activeEffects))
      .union(dancingLightsActiveEffectEmitters(state.fighter.activeEffects))
      .union(faerieFireCombatantDimLightEmitters(Fighter, state.fighter.activeEffects))
      .union(faerieFireCombatantDimLightEmitters(Goblin, state.goblin.activeEffects))
      .union(shiningSmiteCombatantBrightLightEmitters(Fighter, state.fighter.activeEffects))
      .union(shiningSmiteCombatantBrightLightEmitters(Goblin, state.goblin.activeEffects))
      .union(faerieFireObjectDimLightEmitters(state.objectOutlines))

  pure def fighterWithoutProduceFlameHeldLight(state: BattleState): Combatant =
    {
      ...state.fighter,
      activeEffects: activeEffectsWithoutProduceFlameHeldLight(state.fighter.activeEffects),
    }

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

  pure def shillelaghDurationTicks: int = 10

  pure def shillelaghDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 2 else 1

  pure def shillelaghDamageDieSize(characterLevel: int): int =
    if (characterLevel >= 17) 6
    else if (characterLevel >= 11) 12
    else if (characterLevel >= 5) 10
    else 8

  pure def heldWeaponForShillelaghEffect(heldWeapon: HeldWeaponForShillelagh): Set[ShillelaghWeapon] =
    match heldWeapon {
      | HeldClub => Set(ShillelaghClub)
      | HeldQuarterstaff => Set(ShillelaghQuarterstaff)
      | HeldOtherWeapon => Set()
      | HeldNoWeapon => Set()
    }

  pure def shillelaghHeldWeaponIsEligible(heldWeapon: HeldWeaponForShillelagh): bool =
    heldWeaponForShillelaghEffect(heldWeapon).size() == 1

  pure def shillelaghDamageTypeChoiceIsLegal(selected: DamageType, weaponNormal: DamageType): bool =
    selected == Force or selected == weaponNormal

  pure def shillelaghAttackModifier(
    spellcastingAbilityModifier: int,
    proficiencyBonus: int,
  ): int =
    spellcastingAbilityModifier + proficiencyBonus

  pure def activeEffectsWithoutShillelagh(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ShillelaghWeaponAttackOverride(_) => false
      | _ => true
    })

  pure def shillelaghEffect(
    weapon: ShillelaghWeapon,
    spellcastingAbilityModifier: int,
    characterLevel: int,
  ): ActiveEffect =
    ShillelaghWeaponAttackOverride({
      weapon: weapon,
      damageDice: shillelaghDamageDice(characterLevel),
      damageDieSize: shillelaghDamageDieSize(characterLevel),
      spellcastingAbilityModifier: spellcastingAbilityModifier,
      durationTicks: shillelaghDurationTicks,
    })

  pure def resolveShillelagh(
    state: BattleState,
    heldWeapon: HeldWeaponForShillelagh,
    spellcastingAbilityModifier: int,
    characterLevel: int,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      shillelaghHeldWeaponIsEligible(heldWeapon)
    ) {
      val weapons = heldWeaponForShillelaghEffect(heldWeapon)
      val effect = weapons.map(weapon => shillelaghEffect(weapon, spellcastingAbilityModifier, characterLevel))
      {
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutShillelagh(state.fighter.activeEffects)
            .union(effect),
        },
        bonusActionAvailable: false,
      }
    } else {
      state
    }

  pure def shillelaghEffectsMatchingHeldWeapon(
    effects: Set[ActiveEffect],
    heldWeapon: HeldWeaponForShillelagh,
  ): Set[ActiveEffect] = {
    val heldWeapons = heldWeaponForShillelaghEffect(heldWeapon)
    effects.filter(effect => match effect {
      | ShillelaghWeaponAttackOverride(data) => heldWeapons.contains(data.weapon)
      | _ => true
    })
  }

  pure def produceFlameHurlDamageDice(characterLevel: int): int =
    if (characterLevel >= 17) 4
    else if (characterLevel >= 11) 3
    else if (characterLevel >= 5) 2
    else 1

  pure def resolveProduceFlameHurl(
    state: BattleState,
    attackTotal: int,
    naturalD20: int,
    damageRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(activeEffectsContainProduceFlameHeldLight(state.fighter.activeEffects))
    )
      state
    else if (not(attackHits(attackTotal, naturalD20, combatantArmorClass(state.goblin), 20))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      { ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled), actionAvailable: false }
    }
    else if (state.goblin.reactionAvailable and not(state.goblin.activeEffects.contains(ShieldArmorClassBonus))) {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      openReactionWindow({ ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled) }, {
        trigger: AttackHit,
        procedure: ShieldReactionProcedure,
        eligibleReactors: Set(Goblin),
        offeredReactors: Set(),
        continuation: ResumeProduceFlameHurl,
      })
    }
    else {
      val rolled = recordFighterAttackRoll(revealFighterHidden(state))
      val adjustedDamage = damageAfterAdjustments(damageRoll, Fire, Set(), Set(), Set())
      val damaged = applyDamageFromSource(state.goblin, adjustedDamage, if (attackIsCritical(naturalD20, 20)) 2 else 1, concentrationSaveSucceeded, OrdinaryDamage, Fighter)
      { ...rolled, fighter: fighterWithoutProduceFlameHeldLight(rolled), goblin: damaged, actionAvailable: false }
    }
}
