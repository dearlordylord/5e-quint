// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.CONCENTRATION_BREAK_TEARDOWN
// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION

// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ray-of-enfeeblement-d20-lifecycle

module battleRuntimeConcentration {
  import reactionsContinuationsConcentration as RC from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"

  pure def concentrationSavingThrowDc(damage: int): int = {
    RC::concentrationSavingThrowDc(damage)
  }

  pure def eldritchMindConcentrationSavingThrowMode(hasEldritchMind: bool): SavingThrowRollMode =
    if (hasEldritchMind)
      AdvantageSavingThrow
    else
      NormalSavingThrow

  pure def dangerSenseSavingThrowMode(ability: Ability, incapacitated: bool): SavingThrowRollMode =
    if (ability == DexAbility and not(incapacitated))
      AdvantageSavingThrow
    else
      NormalSavingThrow

  pure def activeEffectsWithoutSpellEffectConcentration(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects
      .filter(effect => match effect {
        | ShieldOfFaithArmorClassBonus => false
        | HeroismFrightenedImmunity => false
        | CalmEmotionsCharmedImmunity => false
        | CalmEmotionsFrightenedImmunity => false
        | BaneD20RollPenalty => false
        | BlessD20RollBonus => false
        | PassWithoutTraceStealthBonus => false
        | EntangleRestrained => false
        | FaerieFireOutline => false
        | ProtectionFromEvilAndGoodCreatureTypeProtection => false
        | Blurred => false
        | ExpeditiousRetreatDashBonusAction => false
        | HeroismTurnStartTemporaryHitPoints(_) => false
        | SpiderClimbClimbSpeedGrant(_) => false
        | FlySpeedHoverGrant(_) => false
        | GuidanceAbilityCheckBonus(_) => false
        | EnhanceAbilityCheckAdvantage(_) => false
        | EnthrallPerceptionPenalty => false
        | EnsnaringStrikeRestrained(_) => false
        | SearingSmiteBurning(_) => false
        | ShiningSmiteIllumination(_) => false
        | FogCloudObscurement(_) => false
        | MagicalDarknessPointOrigin(_) => false
        | AntimagicFieldOngoingSpellSuppression(_) => false
        | FlamingSphere(_) => false
        | SpikeGrowthMovementHazard(_) => false
        | MoonbeamMovableZone(_) => false
        | WebRestraintHazard(_) => false
        | SleetStormAreaHazard(_) => false
        | WebRestrained(_) => false
        | HeatMetalObjectContactDamage(_) => false
        | HeatMetalHoldingWearingPenalty(_) => false
        | ResistanceDamageReduction(_) => false
        | SleepPendingRepeatSave(_) => false
        | SleepUnconscious(_) => false
        | HideousLaughterEffect(_) => false
        | HypnoticPatternEffect(_) => false
        | HoldPersonParalyzed(_) => false
        | DancingLightsEffect(_) => false
        | FlameBladeEffect(_) => false
        | InvisibilityCondition(_) => false
        | SeeInvisibleAndEthereal(_) => true
        | MindSpikeConcentrationDuration(_) => false
        | RayOfEnfeeblementNextAttackDisadvantage(_) => false
        | RayOfEnfeeblementD20Lifecycle(_) => false
        | CreatureSizeChange(_) => false
        | LevitatedCreature(_) => false
        | RayOfEnfeeblementDamageRollPenalty(_) => false
        | SpiritualWeapon(_) => false
        | SelfTransformationModeEffect(_) => false
        | DragonsBreathEffect(_) => false
        | _ => true
      })

  pure def activeEffectsWithoutSleepEffects(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SleepPendingRepeatSave(_) => false
      | SleepUnconscious(_) => false
      | _ => true
    })

  pure def activeEffectsWithoutHoldPersonFrom(
    effects: Set[ActiveEffect],
    source: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HoldPersonParalyzed(data) => data.source != source
      | _ => true
    })

  pure def activeEffectsContainHoldPersonFrom(effects: Set[ActiveEffect], source: Actor): bool =
    effects.exists(effect => match effect {
      | HoldPersonParalyzed(data) => data.source == source
      | _ => false
    })

  pure def holdPersonStillActiveFrom(state: BattleState, source: Actor): bool =
    activeEffectsContainHoldPersonFrom(state.fighter.activeEffects, source) or
      activeEffectsContainHoldPersonFrom(state.goblin.activeEffects, source)

  pure def stateWithHoldPersonConcentrationClearedIfNoEffects(state: BattleState, source: Actor): BattleState =
    if (holdPersonStillActiveFrom(state, source))
      state
    else
      match source {
        | Fighter => { ...state, fighter: { ...state.fighter, concentrating: false } }
        | Goblin => { ...state, goblin: { ...state.goblin, concentrating: false } }
      }

  pure def holdPersonEffectHadIncapacitated(effects: Set[ActiveEffect], source: Actor): bool =
    effects.exists(effect => match effect {
      | HoldPersonParalyzed(data) => data.source == source and data.hadIncapacitated
      | _ => false
    })

  pure def combatantWithoutHoldPersonFrom(target: Combatant, source: Actor): Combatant =
    if (activeEffectsContainHoldPersonFrom(target.activeEffects, source))
      {
        ...target,
        incapacitated: holdPersonEffectHadIncapacitated(target.activeEffects, source),
        activeEffects: activeEffectsWithoutHoldPersonFrom(target.activeEffects, source),
      }
    else
      target

  pure def combatantWithSleepEffectsRemoved(target: Combatant, activeEffects: Set[ActiveEffect]): Combatant = {
    val hadSleepPending = target.activeEffects.exists(effect => match effect {
      | SleepPendingRepeatSave(_) => true
      | _ => false
    })
    val hadSleepUnconscious = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(_) => true
      | _ => false
    })
    val sleepPendingHadIncapacitated = target.activeEffects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.hadIncapacitated
      | _ => false
    })
    val sleepUnconsciousHadIncapacitated = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(data) => data.hadIncapacitated
      | _ => false
    })
    val sleepUnconsciousHadUnconscious = target.activeEffects.exists(effect => match effect {
      | SleepUnconscious(data) => data.hadUnconscious
      | _ => false
    })
    {
      ...target,
      activeEffects: activeEffects,
      incapacitated:
        if (hadSleepUnconscious) sleepUnconsciousHadIncapacitated
        else if (hadSleepPending) sleepPendingHadIncapacitated
        else target.incapacitated,
      unconscious: if (hadSleepUnconscious) sleepUnconsciousHadUnconscious else target.unconscious,
      prone: if (hadSleepUnconscious and not(sleepUnconsciousHadUnconscious)) true else target.prone,
    }
  }

  pure def combatantWithHoldPersonEffectsRemoved(target: Combatant, activeEffects: Set[ActiveEffect]): Combatant = {
    val hadHoldPerson = target.activeEffects.exists(effect => match effect {
      | HoldPersonParalyzed(_) => true
      | _ => false
    })
    val remainingHoldPerson = activeEffects.exists(effect => match effect {
      | HoldPersonParalyzed(_) => true
      | _ => false
    })
    val holdPersonHadIncapacitated = target.activeEffects.exists(effect => match effect {
      | HoldPersonParalyzed(data) => data.hadIncapacitated
      | _ => false
    })
    {
      ...target,
      activeEffects: activeEffects,
      incapacitated: if (hadHoldPerson and not(remainingHoldPerson)) holdPersonHadIncapacitated else target.incapacitated,
    }
  }

  pure def combatantWithoutSpellEffectConcentrationEffects(target: Combatant): Combatant = {
    val activeEffects = activeEffectsWithoutSpellEffectConcentration(target.activeEffects)
    val withoutSleep = combatantWithSleepEffectsRemoved(target, activeEffects)
    val withoutHoldPerson = combatantWithHoldPersonEffectsRemoved(target, activeEffects)
    val hadHoldPerson = target.activeEffects.exists(effect => match effect {
      | HoldPersonParalyzed(_) => true
      | _ => false
    })
    {
      ...withoutSleep,
      incapacitated: if (hadHoldPerson) withoutHoldPerson.incapacitated else withoutSleep.incapacitated,
      activeEffects: activeEffects,
    }
  }

  pure def breakConcentration(target: Combatant): Combatant = {
    val withoutSpellEffectConcentration = combatantWithoutSpellEffectConcentrationEffects(target)
    combatantWithSpellCreatedHeldObjectHandStateFromActiveEffects({
      ...withoutSpellEffectConcentration,
      concentrating: false,
      activeEffects: activeEffectsWithoutMarkedDamageRider(withoutSpellEffectConcentration.activeEffects),
    })
  }

  pure def sleepEffectFromOtherSource(effect: ActiveEffect, targetActor: Actor): bool =
    match effect {
      | SleepPendingRepeatSave(data) => data.source != targetActor
      | SleepUnconscious(data) => data.source != targetActor
      | _ => false
    }

  pure def holdPersonEffectFromOtherSource(effect: ActiveEffect, targetActor: Actor): bool =
    match effect {
      | HoldPersonParalyzed(data) => data.source != targetActor
      | _ => false
    }

  pure def breakConcentrationFromSleepAppliedIncapacitated(target: Combatant, targetActor: Actor): Combatant =
    if (not(target.concentrating))
      target
    else {
      val sleepEffectsFromOtherSources = target.activeEffects.filter(effect => sleepEffectFromOtherSource(effect, targetActor))
      val effectsSubjectToBreak = target.activeEffects.filter(effect => not(sleepEffectFromOtherSource(effect, targetActor)))
      val broken = breakConcentration({ ...target, activeEffects: effectsSubjectToBreak })
      { ...broken, activeEffects: broken.activeEffects.union(sleepEffectsFromOtherSources) }
    }

  pure def breakConcentrationFromHoldPersonAppliedIncapacitated(target: Combatant, targetActor: Actor): Combatant =
    if (not(target.concentrating))
      target
    else {
      val holdPersonEffectsFromOtherSources = target.activeEffects.filter(effect => holdPersonEffectFromOtherSource(effect, targetActor))
      val effectsSubjectToBreak = target.activeEffects.filter(effect => not(holdPersonEffectFromOtherSource(effect, targetActor)))
      val broken = breakConcentration({ ...target, activeEffects: effectsSubjectToBreak })
      val activeEffects = broken.activeEffects.union(holdPersonEffectsFromOtherSources)
      val stillHeld = holdPersonEffectsFromOtherSources.exists(effect => match effect {
        | HoldPersonParalyzed(_) => true
        | _ => false
      })
      { ...broken, activeEffects: activeEffects, incapacitated: if (stillHeld) true else broken.incapacitated }
    }

  pure def stateWithFighterDamage(state: BattleState, damagedFighter: Combatant): BattleState =
    if (state.fighter.concentrating and not(damagedFighter.concentrating))
      {
        ...state,
        fighter: damagedFighter,
        goblin: { ...state.goblin, activeEffects: activeEffectsWithoutSpellEffectConcentration(state.goblin.activeEffects) },
      }
    else
      { ...state, fighter: damagedFighter }

  pure def activeEffectsAfterTargetDamagedByCasterOrAlly(effects: Set[ActiveEffect], damageSource: DamageSourceActor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | AnimalFriendshipCharmed(data) => not(damageSourceIsCasterOrAlly(data.source, damageSource))
      | CharmPersonCharmed(data) => not(damageSourceIsCasterOrAlly(data.source, damageSource))
      | _ => true
    })

  pure def combatantWithoutSleepEffects(target: Combatant): Combatant =
    combatantWithSleepEffectsRemoved(target, activeEffectsWithoutSleepEffects(target.activeEffects))

  pure def breakConcentrationSpellEffects(state: BattleState, caster: Actor): BattleState =
    match caster {
      | Fighter =>
        {
          ...state,
          fighter: breakConcentration(state.fighter),
          goblin: combatantWithoutSpellEffectConcentrationEffects(state.goblin),
          objectOutlines: state.objectOutlines.filter(outline => match outline {
            | FaerieFireObjectOutline(data) => data.source != Fighter
          }),
        }
      | Goblin =>
        {
          ...state,
          goblin: breakConcentration(state.goblin),
          fighter: combatantWithoutSpellEffectConcentrationEffects(state.fighter),
          objectOutlines: state.objectOutlines.filter(outline => match outline {
            | FaerieFireObjectOutline(data) => data.source != Goblin
          }),
        }
    }
}
