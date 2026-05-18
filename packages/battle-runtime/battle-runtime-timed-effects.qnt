// -*- mode: Bluespec; -*-

module battleRuntimeTimedEffects {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"

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
    val resetEffects = resetResistanceDamageReductions(effects)
    if (battleRuntimeOneRoundShieldArmorClassBonusExpiresAtStartOfNextTurn)
      resetEffects.exclude(Set(ShieldArmorClassBonus))
    else
      resetEffects
  }

  pure def expireStartOfTurnEffectsForNonActiveActor(effects: Set[ActiveEffect], actor: Actor): Set[ActiveEffect] =
    activeEffectsWithoutExpiredSapStartOfTurnRiders(effects, actor)

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
        | ThaumaturgyBoomingVoice(data) => ThaumaturgyBoomingVoice({
            source: data.source,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
          })
        | SearingSmiteBurning(data) => SearingSmiteBurning({
            damageDice: data.damageDice,
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
        | AidHitPointMaximumIncrease(data) => AidHitPointMaximumIncrease({
            amount: data.amount,
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
        | FogCloudObscurement(data) => FogCloudObscurement({
            areaId: data.areaId,
            radiusFeet: data.radiusFeet,
            durationTicks: battleRuntimeTimedSpellEffectDurationAfterRoundTick(data.durationTicks),
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
        | DivineFavorWeaponDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HuntersMarkDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HexDamageRider(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ThaumaturgyBoomingVoice(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SearingSmiteBurning(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | AnimalFriendshipCharmed(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | CharmPersonCharmed(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | AidHitPointMaximumIncrease(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | DancingLightsEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ProduceFlameHeldLight(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | ShillelaghWeaponAttackOverride(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | JumpMovementReplacement(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | FeatherFallMitigation(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | SanctuaryWard(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | HideousLaughterEffect(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | GreaseGroundHazard(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
        | FogCloudObscurement(data) => battleRuntimeTimedSpellEffectRemainsActive(data.durationTicks)
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

  pure def tickRoundDurationSpellEffects(state: BattleState): BattleState = {
    val fighterEffects = tickDurationActiveEffects(state.fighter.activeEffects)
    val goblinEffects = tickDurationActiveEffects(state.goblin.activeEffects)
    val fighterTimedConcentrationBefore =
      activeEffectsContainTimedConcentrationSpellEffect(state.fighter.activeEffects)
        or activeEffectsContainHideousLaughterFrom(state.fighter.activeEffects, Fighter)
        or activeEffectsContainHideousLaughterFrom(state.goblin.activeEffects, Fighter)
    val fighterTimedConcentrationAfter =
      activeEffectsContainTimedConcentrationSpellEffect(fighterEffects)
        or activeEffectsContainHideousLaughterFrom(fighterEffects, Fighter)
        or activeEffectsContainHideousLaughterFrom(goblinEffects, Fighter)
    val goblinTimedConcentrationBefore =
      activeEffectsContainTimedConcentrationSpellEffect(state.goblin.activeEffects)
        or activeEffectsContainHideousLaughterFrom(state.fighter.activeEffects, Goblin)
        or activeEffectsContainHideousLaughterFrom(state.goblin.activeEffects, Goblin)
    val goblinTimedConcentrationAfter =
      activeEffectsContainTimedConcentrationSpellEffect(goblinEffects)
        or activeEffectsContainHideousLaughterFrom(fighterEffects, Goblin)
        or activeEffectsContainHideousLaughterFrom(goblinEffects, Goblin)
    {
      ...state,
      lightEmitters: tickDurationLightEmitters(state.lightEmitters),
      fighter: {
        ...combatantAfterHideousLaughterDurationTick(combatantAfterAidDurationTick(state.fighter, fighterEffects), fighterEffects),
        concentrating: state.fighter.concentrating
          and (not(fighterTimedConcentrationBefore) or fighterTimedConcentrationAfter),
      },
      goblin: {
        ...combatantAfterHideousLaughterDurationTick(combatantAfterAidDurationTick(state.goblin, goblinEffects), goblinEffects),
        concentrating: state.goblin.concentrating
          and (not(goblinTimedConcentrationBefore) or goblinTimedConcentrationAfter),
      },
    }
  }
}
