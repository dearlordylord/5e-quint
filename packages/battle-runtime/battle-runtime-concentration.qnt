// -*- mode: Bluespec; -*-

module battleRuntimeConcentration {
  import battleRuntimeConcentrationBridge.* from "./battle-runtime-concentration-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeCombatantSide.* from "./battle-runtime-combatant-side"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"

  pure def concentrationSavingThrowDc(damage: int): int = {
    battleRuntimeConcentrationSavingThrowDc(damage)
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

  pure def spellEffectConcentrationActiveEffects(): Set[ActiveEffect] =
    Set(ShieldOfFaithArmorClassBonus, HeroismFrightenedImmunity, BaneD20RollPenalty, BlessD20RollBonus, GuidanceAbilityCheckBonus, PassWithoutTraceStealthBonus, EntangleRestrained, FaerieFireOutline, ProtectionFromEvilAndGoodCreatureTypeProtection, Blurred, ExpeditiousRetreatDashBonusAction)

  pure def activeEffectsWithoutSpellEffectConcentration(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects
      .exclude(spellEffectConcentrationActiveEffects)
      .filter(effect => match effect {
        | HeroismTurnStartTemporaryHitPoints(_) => false
        | SpiderClimbClimbSpeedGrant(_) => false
        | EnhanceAbilityCheckAdvantage(_) => false
        | EnsnaringStrikeRestrained(_) => false
        | SearingSmiteBurning(_) => false
        | ShiningSmiteIllumination(_) => false
        | FogCloudObscurement(_) => false
        | FlamingSphere(_) => false
        | ResistanceDamageReduction(_) => false
        | SleepPendingRepeatSave(_) => false
        | SleepUnconscious(_) => false
        | HideousLaughterEffect(_) => false
        | DancingLightsEffect(_) => false
        | _ => true
      })

  pure def activeEffectsWithoutSleepEffects(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SleepPendingRepeatSave(_) => false
      | SleepUnconscious(_) => false
      | _ => true
    })

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

  pure def combatantWithoutSpellEffectConcentrationEffects(target: Combatant): Combatant =
    combatantWithSleepEffectsRemoved(target, activeEffectsWithoutSpellEffectConcentration(target.activeEffects))

  pure def breakConcentration(target: Combatant): Combatant = {
    val withoutSpellEffectConcentration = combatantWithoutSpellEffectConcentrationEffects(target)
    {
      ...withoutSpellEffectConcentration,
      concentrating: false,
      activeEffects: activeEffectsWithoutMarkedDamageRider(withoutSpellEffectConcentration.activeEffects),
    }
  }

  pure def sleepEffectFromOtherSource(effect: ActiveEffect, targetActor: Actor): bool =
    match effect {
      | SleepPendingRepeatSave(data) => data.source != targetActor
      | SleepUnconscious(data) => data.source != targetActor
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
