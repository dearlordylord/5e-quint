// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE

// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle

module battleRuntimeTimedEffects {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"

  pure def activeEffectsWithoutExpiredEndOfTurnRiders(
    effects: Set[ActiveEffect],
    actor: Actor,
    round: int
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | ChillTouchHitPointRegainPrevented(data) => data.source != actor or data.expiresAtRound != round
      | StarryWispInvisibleBenefitDenied(data) => data.source != actor or data.expiresAtRound != round
      | ColorSprayBlinded(data) => data.source != actor or data.expiresAtRound != round
      | _ => true
    })

  pure def activeEffectsWithoutExpiredSapStartOfTurnRiders(
    effects: Set[ActiveEffect],
    actor: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | WeaponMasterySapNextAttackDisadvantage(data) => data.source != actor
      | RayOfEnfeeblementNextAttackDisadvantage(data) => data.source != actor
      | HeatMetalHoldingWearingPenalty(data) => data.expiresAtActor != actor
      | _ => true
    })

  pure def expireEndOfTurnSpellEffects(state: BattleState): BattleState = {
    val actor = currentActor(state)
    val round = state.initiative.round
    {
      ...state,
      lightEmitters: lightEmittersWithoutExpiredEndOfTurnEmitters(state.lightEmitters, actor, round),
      fighter: {
        ...state.fighter,
        activeEffects: activeEffectsWithoutExpiredEndOfTurnRiders(state.fighter.activeEffects, actor, round),
      },
      goblin: {
        ...state.goblin,
        activeEffects: activeEffectsWithoutExpiredEndOfTurnRiders(state.goblin.activeEffects, actor, round),
      },
    }
  }

  pure def expireStartOfTurnEffectsForActiveActor(effects: Set[ActiveEffect]): Set[ActiveEffect] = {
    val resetEffects = resetWebSavedThisTurnEffects(resetResistanceDamageReductions(effects))
    if (battleRuntimeOneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn)
      resetEffects.exclude(Set(ShieldArmorClassBonus))
    else
      resetEffects
  }

  pure def expireStartOfTurnEffectsForNonActiveActor(effects: Set[ActiveEffect], actor: Actor): Set[ActiveEffect] =
    activeEffectsWithoutExpiredSapStartOfTurnRiders(resetWebSavedThisTurnEffects(effects), actor)

  pure def expireStartOfTurnSpellEffects(state: BattleState, nextActor: Actor): BattleState =
    match nextActor {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: activeEffectsWithoutExpiredSapStartOfTurnRiders(
              expireStartOfTurnEffectsForActiveActor(state.fighter.activeEffects),
              Fighter
            ),
          },
          goblin: {
            ...state.goblin,
            activeEffects: expireStartOfTurnEffectsForNonActiveActor(state.goblin.activeEffects, Fighter),
          },
        }
      | Goblin => {
          ...state,
          fighter: {
            ...state.fighter,
            activeEffects: expireStartOfTurnEffectsForNonActiveActor(state.fighter.activeEffects, Goblin),
          },
          goblin: {
            ...state.goblin,
            activeEffects: activeEffectsWithoutExpiredSapStartOfTurnRiders(
              expireStartOfTurnEffectsForActiveActor(state.goblin.activeEffects),
              Goblin
            ),
          },
        }
    }

  pure def resetResistanceDamageReductions(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | ResistanceDamageReduction(data) => ResistanceDamageReduction({
          ...data,
          usedThisTurn: battleRuntimeOncePerTurnSpellEffectUsedAtTurnStart,
        })
      | JumpMovementReplacement(data) => JumpMovementReplacement({
          ...data,
          usedThisTurn: battleRuntimeOncePerTurnSpellEffectUsedAtTurnStart,
        })
      | _ => effect
    })

  pure def resetWebSavedThisTurnEffects(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | WebRestraintHazard(data) => WebRestraintHazard({
          ...data,
          entrySavedThisTurn: Set(),
          startTurnSavedThisTurn: Set(),
        })
      | _ => effect
    })

  pure def applyStartOfTurnSpellEffects(state: BattleState, nextActor: Actor): BattleState =
    match nextActor {
      | Fighter => {
          val heroismTempHp = state.fighter.activeEffects
            .map(effect => match effect {
              | HeroismTurnStartTemporaryHitPoints(data) => data.amount
              | _ => 0
            })
            .fold(0, (highest, amount) => if (highest > amount) highest else amount)
          {
            ...state,
            fighter: {
              ...state.fighter,
              tempHp: battleRuntimeTurnStartTemporaryHitPoints(state.fighter.tempHp, heroismTempHp),
            },
          }
        }
      | Goblin => {
          val heroismTempHp = state.goblin.activeEffects
            .map(effect => match effect {
              | HeroismTurnStartTemporaryHitPoints(data) => data.amount
              | _ => 0
            })
            .fold(0, (highest, amount) => if (highest > amount) highest else amount)
          {
            ...state,
            goblin: {
              ...state.goblin,
              tempHp: battleRuntimeTurnStartTemporaryHitPoints(state.goblin.tempHp, heroismTempHp),
            },
          }
        }
    }

  pure def tickDurationActiveEffects(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects
      .map(effect => match effect {
        | MageArmor(data) => MageArmor({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | ProtectionFromPoisonSavingThrowAdvantage(data) => ProtectionFromPoisonSavingThrowAdvantage({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | ProtectionFromPoisonPoisonResistance(data) => ProtectionFromPoisonPoisonResistance({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | DivineFavorWeaponDamageRider(data) => DivineFavorWeaponDamageRider({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | HuntersMarkDamageRider(data) => HuntersMarkDamageRider({
            target: data.target,
            transfer: data.transfer,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | HexDamageRider(data) => HexDamageRider({
            target: data.target,
            ability: data.ability,
            transfer: data.transfer,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | MagicWeaponEnhancement(data) => MagicWeaponEnhancement({
            source: data.source,
            target: data.target,
            weaponItem: data.weaponItem,
            bonus: data.bonus,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | ThaumaturgyBoomingVoice(data) => ThaumaturgyBoomingVoice({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SearingSmiteBurning(data) => SearingSmiteBurning({
            damageDice: data.damageDice,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | ShiningSmiteIllumination(data) => ShiningSmiteIllumination({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SpiderClimbClimbSpeedGrant(data) => SpiderClimbClimbSpeedGrant({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | AnimalFriendshipCharmed(data) => AnimalFriendshipCharmed({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | CharmPersonCharmed(data) => CharmPersonCharmed({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | BlindnessDeafnessBlinded(data) => BlindnessDeafnessBlinded({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | BlindnessDeafnessDeafened(data) => BlindnessDeafnessDeafened({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | HoldPersonParalyzed(data) => HoldPersonParalyzed({
            source: data.source,
            hadIncapacitated: data.hadIncapacitated,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | AidHitPointMaximumIncrease(data) => AidHitPointMaximumIncrease({
            amount: data.amount,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | BarkskinArmorClassFloor(data) => BarkskinArmorClassFloor({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | DancingLightsEffect(data) => DancingLightsEffect({
            combined: data.combined,
            lightCount: data.lightCount,
            light1Position: data.light1Position,
            light2Position: data.light2Position,
            light3Position: data.light3Position,
            light4Position: data.light4Position,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | ProduceFlameHeldLight(data) => ProduceFlameHeldLight({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | FlameBladeEffect(data) => FlameBladeEffect({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
            slotLevel: data.slotLevel,
            spellcastingAbilityModifier: data.spellcastingAbilityModifier,
            objectState: data.objectState,
          })
        | ShillelaghWeaponAttackOverride(data) => ShillelaghWeaponAttackOverride({
            weapon: data.weapon,
            damageDice: data.damageDice,
            damageDieSize: data.damageDieSize,
            spellcastingAbilityModifier: data.spellcastingAbilityModifier,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | JumpMovementReplacement(data) => JumpMovementReplacement({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
            usedThisTurn: data.usedThisTurn,
          })
        | FeatherFallMitigation(data) => FeatherFallMitigation({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SanctuaryWard(data) => SanctuaryWard({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | MirrorImageDuplicates(data) => MirrorImageDuplicates({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
            remainingDuplicates: data.remainingDuplicates,
          })
        | InvisibilityCondition(data) => InvisibilityCondition({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SeeInvisibleAndEthereal(data) => SeeInvisibleAndEthereal({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | MindSpikeConcentrationDuration(data) => MindSpikeConcentrationDuration({
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SelfTransformationModeEffect(data) => SelfTransformationModeEffect({
            source: data.source,
            mode: data.mode,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | DragonsBreathEffect(data) => DragonsBreathEffect({
            source: data.source,
            damageType: data.damageType,
            originalSlotLevel: data.originalSlotLevel,
            spellSaveDc: data.spellSaveDc,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | HideousLaughterEffect(data) => HideousLaughterEffect({
            source: data.source,
            target: data.target,
            hadProne: data.hadProne,
            hadIncapacitated: data.hadIncapacitated,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | GreaseGroundHazard(data) => GreaseGroundHazard({
            areaId: data.areaId,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SpikeGrowthMovementHazard(data) => SpikeGrowthMovementHazard({
            areaId: data.areaId,
            damageDice: data.damageDice,
            damagePerFeet: data.damagePerFeet,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | FogCloudObscurement(data) => FogCloudObscurement({
            areaId: data.areaId,
            radiusFeet: data.radiusFeet,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | MagicalDarknessPointOrigin(data) => MagicalDarknessPointOrigin({
            areaId: data.areaId,
            radiusFeet: data.radiusFeet,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | AntimagicFieldOngoingSpellSuppression(data) => AntimagicFieldOngoingSpellSuppression({
            areaId: data.areaId,
            radiusFeet: data.radiusFeet,
            suppressedOngoingSpellEffects: data.suppressedOngoingSpellEffects,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | FlamingSphere(data) => FlamingSphere({
            areaId: data.areaId,
            damageDice: data.damageDice,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
            ramMaxMoveFeet: data.ramMaxMoveFeet,
          })
        | MoonbeamMovableZone(data) => MoonbeamMovableZone({
            areaId: data.areaId,
            damageDice: data.damageDice,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
            repositionMaxMoveFeet: data.repositionMaxMoveFeet,
            savedThisTurn: data.savedThisTurn,
          })
        | WebRestraintHazard(data) => WebRestraintHazard({
            areaId: data.areaId,
            sideFeet: data.sideFeet,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
            entrySavedThisTurn: data.entrySavedThisTurn,
            startTurnSavedThisTurn: data.startTurnSavedThisTurn,
          })
        | WebRestrained(data) => WebRestrained({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | HeatMetalObjectContactDamage(data) => HeatMetalObjectContactDamage({
            effectId: data.effectId,
            objectId: data.objectId,
            sourceSpellLevel: data.sourceSpellLevel,
            damageDice: data.damageDice,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
            startedRound: data.startedRound,
          })
        | BardicInspirationDie(data) => BardicInspirationDie({
            source: data.source,
            dieSize: data.dieSize,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | _ => effect
      })
      .filter(effect => match effect {
        | MageArmor(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ProtectionFromPoisonSavingThrowAdvantage(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ProtectionFromPoisonPoisonResistance(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | DivineFavorWeaponDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HuntersMarkDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HexDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | MagicWeaponEnhancement(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ThaumaturgyBoomingVoice(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SearingSmiteBurning(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ShiningSmiteIllumination(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SpiderClimbClimbSpeedGrant(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | AnimalFriendshipCharmed(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | CharmPersonCharmed(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | BlindnessDeafnessBlinded(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | BlindnessDeafnessDeafened(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HoldPersonParalyzed(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | AidHitPointMaximumIncrease(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | BarkskinArmorClassFloor(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | DancingLightsEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ProduceFlameHeldLight(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | FlameBladeEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ShillelaghWeaponAttackOverride(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | JumpMovementReplacement(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | FeatherFallMitigation(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SanctuaryWard(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | MirrorImageDuplicates(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | InvisibilityCondition(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SeeInvisibleAndEthereal(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | MindSpikeConcentrationDuration(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SelfTransformationModeEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | DragonsBreathEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HideousLaughterEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | GreaseGroundHazard(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SpikeGrowthMovementHazard(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | FogCloudObscurement(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | MagicalDarknessPointOrigin(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | AntimagicFieldOngoingSpellSuppression(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | FlamingSphere(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | MoonbeamMovableZone(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | WebRestraintHazard(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | WebRestrained(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HeatMetalObjectContactDamage(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | BardicInspirationDie(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | _ => true
      })

  pure def activeEffectsContainHideousLaughterFrom(effects: Set[ActiveEffect], source: Actor): bool =
    effects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.source == source
      | _ => false
    })

  pure def hideousLaughterEffectsExpiringAfterRoundTick(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HideousLaughterEffect(data) =>
          not(battleRuntimeTimedSpellEffectRemainsActive(battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks)))
      | _ => false
    })

  pure def holdPersonEffectsExpiringAfterRoundTick(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HoldPersonParalyzed(data) =>
          not(battleRuntimeTimedSpellEffectRemainsActive(battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks)))
      | _ => false
    })

  pure def combatantAfterAidDurationTick(target: Combatant, tickedEffects: Set[ActiveEffect]): Combatant = {
    val activeAmount = aidHitPointMaximumIncreaseAppliedAmount(target.activeEffects)
    val nextActiveAmount = aidHitPointMaximumIncreaseAppliedAmount(tickedEffects)
    val expiringAmount = activeAmount - nextActiveAmount
    val nextHp = target.hp - expiringAmount
    {
      ...target,
      hp: if (nextHp > 0) nextHp else 0,
      maxHp: target.maxHp - expiringAmount,
    }
  }

  pure def combatantAfterHideousLaughterDurationTick(target: Combatant, tickedEffects: Set[ActiveEffect]): Combatant = {
    val expiring = hideousLaughterEffectsExpiringAfterRoundTick(target.activeEffects)
    val hasExpiring = expiring.size() > 0
    val remainingHideous = tickedEffects.exists(effect => match effect {
      | HideousLaughterEffect(_) => true
      | _ => false
    })
    val expiringHadProne = expiring.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.hadProne
      | _ => false
    })
    val expiringHadIncapacitated = expiring.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.hadIncapacitated
      | _ => false
    })
    {
      ...target,
      prone: if (hasExpiring and not(remainingHideous)) expiringHadProne else target.prone,
      incapacitated: if (hasExpiring and not(remainingHideous)) expiringHadIncapacitated else target.incapacitated,
      activeEffects: tickedEffects,
    }
  }

  pure def combatantAfterHoldPersonDurationTick(target: Combatant, tickedEffects: Set[ActiveEffect]): Combatant = {
    val expiring = holdPersonEffectsExpiringAfterRoundTick(target.activeEffects)
    val hasExpiring = expiring.size() > 0
    val remainingHoldPerson = tickedEffects.exists(effect => match effect {
      | HoldPersonParalyzed(_) => true
      | _ => false
    })
    val expiringHadIncapacitated = expiring.exists(effect => match effect {
      | HoldPersonParalyzed(data) => data.hadIncapacitated
      | _ => false
    })
    {
      ...target,
      incapacitated: if (hasExpiring and not(remainingHoldPerson)) expiringHadIncapacitated else target.incapacitated,
      activeEffects: tickedEffects,
    }
  }

  pure def combatantAfterConditionDurationTick(target: Combatant, tickedEffects: Set[ActiveEffect]): Combatant = {
    val afterAid = combatantAfterAidDurationTick(target, tickedEffects)
    val afterHideousLaughter = combatantAfterHideousLaughterDurationTick(afterAid, tickedEffects)
    val afterHoldPerson = combatantAfterHoldPersonDurationTick(afterAid, tickedEffects)
    val holdPersonExpired = holdPersonEffectsExpiringAfterRoundTick(target.activeEffects).size() > 0
    {
      ...afterHideousLaughter,
      incapacitated: if (holdPersonExpired) afterHoldPerson.incapacitated else afterHideousLaughter.incapacitated,
      activeEffects: tickedEffects,
    }
  }

  pure def tickRoundDurationSpellEffects(state: BattleState): BattleState = {
    val fighterEffects = tickDurationActiveEffects(state.fighter.activeEffects)
    val goblinEffects = tickDurationActiveEffects(state.goblin.activeEffects)
    val fighterTimedConcentrationBefore =
      activeEffectsContainTimedConcentrationSpellEffect(state.fighter.activeEffects)
        or activeEffectsContainHideousLaughterFrom(state.fighter.activeEffects, Fighter)
        or activeEffectsContainHideousLaughterFrom(state.goblin.activeEffects, Fighter)
        or activeEffectsContainHoldPersonFrom(state.fighter.activeEffects, Fighter)
        or activeEffectsContainHoldPersonFrom(state.goblin.activeEffects, Fighter)
    val fighterTimedConcentrationAfter =
      activeEffectsContainTimedConcentrationSpellEffect(fighterEffects)
        or activeEffectsContainHideousLaughterFrom(fighterEffects, Fighter)
        or activeEffectsContainHideousLaughterFrom(goblinEffects, Fighter)
        or activeEffectsContainHoldPersonFrom(fighterEffects, Fighter)
        or activeEffectsContainHoldPersonFrom(goblinEffects, Fighter)
    val goblinTimedConcentrationBefore =
      activeEffectsContainTimedConcentrationSpellEffect(state.goblin.activeEffects)
        or activeEffectsContainHideousLaughterFrom(state.fighter.activeEffects, Goblin)
        or activeEffectsContainHideousLaughterFrom(state.goblin.activeEffects, Goblin)
        or activeEffectsContainHoldPersonFrom(state.fighter.activeEffects, Goblin)
        or activeEffectsContainHoldPersonFrom(state.goblin.activeEffects, Goblin)
    val goblinTimedConcentrationAfter =
      activeEffectsContainTimedConcentrationSpellEffect(goblinEffects)
        or activeEffectsContainHideousLaughterFrom(fighterEffects, Goblin)
        or activeEffectsContainHideousLaughterFrom(goblinEffects, Goblin)
        or activeEffectsContainHoldPersonFrom(fighterEffects, Goblin)
        or activeEffectsContainHoldPersonFrom(goblinEffects, Goblin)
    {
      ...state,
      lightEmitters: tickDurationLightEmitters(state.lightEmitters),
      fighter: {
        ...combatantWithSpellCreatedHeldObjectHandStateFromActiveEffects(
          combatantAfterConditionDurationTick(state.fighter, fighterEffects),
        ),
        concentrating: state.fighter.concentrating
          and (not(fighterTimedConcentrationBefore) or fighterTimedConcentrationAfter),
      },
      goblin: {
        ...combatantWithSpellCreatedHeldObjectHandStateFromActiveEffects(
          combatantAfterConditionDurationTick(state.goblin, goblinEffects),
        ),
        concentrating: state.goblin.concentrating
          and (not(goblinTimedConcentrationBefore) or goblinTimedConcentrationAfter),
      },
    }
  }
}
