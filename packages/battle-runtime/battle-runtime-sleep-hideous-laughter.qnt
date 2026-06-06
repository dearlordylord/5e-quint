// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-hideous-laughter-repeat-save-lifecycle spell.invocation-hypnotic-pattern-control spell.invocation-sleep-repeat-save-lifecycle spell.invocation-sleep-target-admission

module battleRuntimeSleepHideousLaughter {
  import battleRuntimeSpellBridge.* from "./battle-runtime-spell-bridge"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeMetamagic.* from "./battle-runtime-metamagic"

  pure def actorHasTurnLaterThisRound(state: BattleState, actor: Actor): bool =
    actor != currentActor(state) and initiativeStillToActCount(state.initiative) > 1

  pure def sleepRepeatAtRound(state: BattleState, target: Actor): int =
    if (actorHasTurnLaterThisRound(state, target))
      state.initiative.round
    else
      state.initiative.round + 1

  pure def sleepPendingRepeatSaveEffect(
    state: BattleState,
    target: Actor,
    source: Actor,
    hadIncapacitated: bool,
  ): ActiveEffect =
    SleepPendingRepeatSave({
      source: source,
      repeatAtActor: target,
      repeatAtRound: sleepRepeatAtRound(state, target),
      hadIncapacitated: hadIncapacitated,
    })

  pure def sleepInitialSaveTarget(
    state: BattleState,
    target: Combatant,
    targetActor: Actor,
    savingThrowSucceeded: bool,
    targetDoesNotSleep: bool,
    targetHasExhaustionImmunity: bool,
    source: Actor,
  ): Combatant = {
    val automaticallySucceeded = battleRuntimeSleepSavingThrowAutomaticallySucceeds(
      targetDoesNotSleep,
      targetHasExhaustionImmunity,
    )
    match battleRuntimeSleepInitialSaveLifecycle(savingThrowSucceeded or automaticallySucceeded, target.incapacitated) {
      | BattleRuntimeNoSleepRepeatSaveLifecycle => target
      | BattleRuntimePendingSleepRepeatSaveLifecycle(data) => {
          val slept = {
            ...target,
            incapacitated: true,
            activeEffects: target.activeEffects
              .filter(effect => match effect {
                | SleepPendingRepeatSave(existing) => existing.source != source
                | SleepUnconscious(existing) => existing.source != source
                | _ => true
              })
              .union(Set(sleepPendingRepeatSaveEffect(state, targetActor, source, data.hadIncapacitated))),
          }
          breakConcentrationFromSleepAppliedIncapacitated(slept, targetActor)
        }
      | BattleRuntimeUnconsciousSleepRepeatSaveLifecycle(_) => target
    }
  }

  pure def resolveSleepTargetAdmission(
    state: BattleState,
    goblinSavingThrowSucceeded: bool,
    goblinDoesNotSleep: bool,
    goblinHasExhaustionImmunity: bool,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: sleepInitialSaveTarget(
          withoutPrior,
          withoutPrior.goblin,
          Goblin,
          goblinSavingThrowSucceeded,
          goblinDoesNotSleep,
          goblinHasExhaustionImmunity,
          Fighter,
        ),
        actionAvailable: false,
      }, Fighter)
    }

  pure def sleepRepeatSaveDue(effects: Set[ActiveEffect], actor: Actor, round: int): bool =
    effects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.repeatAtActor == actor and data.repeatAtRound == round
      | _ => false
    })

  pure def sleepPendingHadIncapacitated(effects: Set[ActiveEffect], actor: Actor, round: int): bool =
    effects.exists(effect => match effect {
      | SleepPendingRepeatSave(data) => data.repeatAtActor == actor and data.repeatAtRound == round and data.hadIncapacitated
      | _ => false
    })

  pure def activeEffectsWithoutSleepPendingRepeatSave(effects: Set[ActiveEffect], actor: Actor, round: int): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SleepPendingRepeatSave(data) => not(data.repeatAtActor == actor and data.repeatAtRound == round)
      | _ => true
    })

  pure def sleepRepeatSaveHoles(state: BattleState): Set[Hole] =
    match currentActor(state) {
      | Fighter =>
        if (sleepRepeatSaveDue(state.fighter.activeEffects, Fighter, state.initiative.round))
          Set(SavingThrowOutcome)
        else
          Set()
      | Goblin =>
        if (sleepRepeatSaveDue(state.goblin.activeEffects, Goblin, state.initiative.round))
          Set(SavingThrowOutcome)
        else
          Set()
    }

  pure def sleepRepeatSaveTarget(
    target: Combatant,
    targetActor: Actor,
    round: int,
    savingThrowSucceeded: bool,
  ): Combatant = {
    val activeEffectsWithoutPending = activeEffectsWithoutSleepPendingRepeatSave(target.activeEffects, targetActor, round)
    val hadIncapacitated = sleepPendingHadIncapacitated(target.activeEffects, targetActor, round)
    val lifecycle = battleRuntimeSleepRepeatSaveLifecycleAfterSave(
      BattleRuntimePendingSleepRepeatSaveLifecycle({ hadIncapacitated: hadIncapacitated }),
      savingThrowSucceeded,
      target.unconscious,
    )
    match lifecycle {
      | BattleRuntimeNoSleepRepeatSaveLifecycle =>
          { ...target, incapacitated: hadIncapacitated, activeEffects: activeEffectsWithoutPending }
      | BattleRuntimeUnconsciousSleepRepeatSaveLifecycle(data) => {
          val slept = {
            ...target,
            incapacitated: data.hadIncapacitated,
            unconscious: true,
            prone: true,
            activeEffects: activeEffectsWithoutPending.union(Set(SleepUnconscious({
              source: Fighter,
              hadUnconscious: data.hadUnconscious,
              hadIncapacitated: data.hadIncapacitated,
            }))),
          }
          breakConcentrationFromSleepAppliedIncapacitated(slept, targetActor)
        }
      | BattleRuntimePendingSleepRepeatSaveLifecycle(_) => target
    }
  }

  pure def combatantHasSleepEffect(target: Combatant): bool =
    target.activeEffects.exists(effect => match effect {
      | SleepPendingRepeatSave(_) => true
      | SleepUnconscious(_) => true
      | _ => false
    })

  pure def shakeAwakeFromSleep(state: BattleState, targetActor: Actor, actorWithin5Feet: bool): BattleState =
    if (not(battleRuntimeSleepEffectEndsOnAdjacentShakeAwakeAction) or not(state.actionAvailable) or not(actorWithin5Feet) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      match targetActor {
        | Fighter =>
          if (combatantHasSleepEffect(state.fighter))
            { ...state, fighter: combatantWithoutSleepEffects(state.fighter), actionAvailable: false }
          else
            state
        | Goblin =>
          if (combatantHasSleepEffect(state.goblin))
            { ...state, goblin: combatantWithoutSleepEffects(state.goblin), actionAvailable: false }
          else
            state
      }
    }

  pure def hideousLaughterMaxTargets(slotLevel: int): int =
    if (slotLevel <= 1) 1 else slotLevel

  pure def hideousLaughterDurationTicks: int = 10

  pure def activeEffectsWithoutHideousLaughter(effects: Set[ActiveEffect], source: Actor, targetActor: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HideousLaughterEffect(data) => not(data.source == source and data.target == targetActor)
      | _ => true
    })

  pure def hideousLaughterEffect(source: Actor, targetActor: Actor, target: Combatant, heightenedRepeatSaveDisadvantage: bool): ActiveEffect =
    HideousLaughterEffect({
      source: source,
      target: targetActor,
      hadProne: target.prone,
      hadIncapacitated: target.incapacitated,
      heightenedRepeatSaveDisadvantage: heightenedRepeatSaveDisadvantage,
      durationTicks: hideousLaughterDurationTicks,
    })

  pure def combatantWithoutHideousLaughter(target: Combatant, source: Actor, targetActor: Actor): Combatant = {
    val hadHideousLaughter = target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.source == source and data.target == targetActor
      | _ => false
    })
    val hadProne = target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.source == source and data.target == targetActor and data.hadProne
      | _ => false
    })
    val hadIncapacitated = target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.source == source and data.target == targetActor and data.hadIncapacitated
      | _ => false
    })
    {
      ...target,
      prone: if (hadHideousLaughter) hadProne else target.prone,
      incapacitated: if (hadHideousLaughter) hadIncapacitated else target.incapacitated,
      activeEffects: activeEffectsWithoutHideousLaughter(target.activeEffects, source, targetActor),
    }
  }

  pure def hideousLaughterTarget(
    target: Combatant,
    targetActor: Actor,
    savingThrowSucceeded: bool,
    source: Actor,
    heightenedTarget: Actor,
  ): Combatant =
    if (savingThrowSucceeded)
      target
    else {
      val withoutPrior = combatantWithoutHideousLaughter(target, source, targetActor)
      val laughed = {
        ...withoutPrior,
        prone: true,
        incapacitated: true,
        activeEffects: withoutPrior.activeEffects.union(Set(hideousLaughterEffect(source, targetActor, withoutPrior, targetActor == heightenedTarget))),
      }
      breakConcentrationFromSleepAppliedIncapacitated(laughed, targetActor)
    }

  pure def resolveHideousLaughter(
    state: BattleState,
    goblinSavingThrowSucceeded: bool,
    slotLevel: int,
  ): BattleState =
    if (not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)) or hideousLaughterMaxTargets(slotLevel) < 1)
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: true },
        goblin: hideousLaughterTarget(withoutPrior.goblin, Goblin, goblinSavingThrowSucceeded, Fighter, Fighter),
        actionAvailable: false,
      }, Fighter)
    }

  pure def hideousLaughterRepeatSaveDue(effects: Set[ActiveEffect], actor: Actor): bool =
    effects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.target == actor
      | _ => false
    })

  pure def hideousLaughterRepeatSaveHoles(state: BattleState): Set[Hole] =
    match currentActor(state) {
      | Fighter => if (hideousLaughterRepeatSaveDue(state.fighter.activeEffects, Fighter)) Set(SavingThrowOutcome) else Set()
      | Goblin => if (hideousLaughterRepeatSaveDue(state.goblin.activeEffects, Goblin)) Set(SavingThrowOutcome) else Set()
    }

  pure def hideousLaughterDamageRepeatSaveRollMode(target: Combatant): SavingThrowRollMode =
    if (target.activeEffects.exists(effect => match effect { | HideousLaughterEffect(_) => true | _ => false }))
      AdvantageSavingThrow
    else
      NormalSavingThrow

  pure def hideousLaughterEndTurnRepeatSaveRollMode(target: Combatant): SavingThrowRollMode =
    if (target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.heightenedRepeatSaveDisadvantage
      | _ => false
    }))
      DisadvantageSavingThrow
    else
      NormalSavingThrow

  pure def hideousLaughterDamageRepeatSaveRollModeWithHeightened(target: Combatant): SavingThrowRollMode =
    if (target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(data) => data.heightenedRepeatSaveDisadvantage
      | _ => false
    }))
      combineSavingThrowRollModes(hideousLaughterDamageRepeatSaveRollMode(target), DisadvantageSavingThrow)
    else
      hideousLaughterDamageRepeatSaveRollMode(target)

  pure def combatantAfterHideousLaughterDamageRepeatSave(target: Combatant, source: Actor, targetActor: Actor, damage: int, savingThrowSucceeded: bool): Combatant =
    if (damage > 0 and savingThrowSucceeded)
      combatantWithoutHideousLaughter(target, source, targetActor)
    else
      target

  pure def combatantHasHideousLaughter(target: Combatant): bool =
    target.activeEffects.exists(effect => match effect {
      | HideousLaughterEffect(_) => true
      | _ => false
    })

  pure def hypnoticPatternDurationTicks: int = 10

  pure def activeEffectsWithoutHypnoticPattern(effects: Set[ActiveEffect], source: Actor, targetActor: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | HypnoticPatternEffect(data) => not(data.source == source and data.target == targetActor)
      | _ => true
    })

  pure def hypnoticPatternEffect(source: Actor, targetActor: Actor, target: Combatant): ActiveEffect =
    HypnoticPatternEffect({
      source: source,
      target: targetActor,
      hadCharmed: target.activeEffects.exists(effect => match effect {
        | AnimalFriendshipCharmed(_) => true
        | CharmPersonCharmed(_) => true
        | ProtectionRelevantCharmed(_) => true
        | HypnoticPatternEffect(_) => true
        | _ => false
      }),
      hadIncapacitated: target.incapacitated,
      durationTicks: hypnoticPatternDurationTicks,
    })

  pure def combatantHasHypnoticPattern(target: Combatant): bool =
    target.activeEffects.exists(effect => match effect {
      | HypnoticPatternEffect(_) => true
      | _ => false
    })

  pure def combatantHasHypnoticPatternFrom(target: Combatant, source: Actor, targetActor: Actor): bool =
    target.activeEffects.exists(effect => match effect {
      | HypnoticPatternEffect(data) => data.source == source and data.target == targetActor
      | _ => false
    })

  pure def combatantHasHypnoticPatternCharmedProjection(target: Combatant): bool =
    combatantHasHypnoticPattern(target)

  pure def combatantHasCharmedImmunity(target: Combatant): bool =
    target.activeEffects.contains(CalmEmotionsCharmedImmunity)

  pure def hypnoticPatternEffectiveSpeed(target: Combatant): int =
    if (combatantHasHypnoticPattern(target)) 0 else target.speed

  pure def combatantWithoutHypnoticPattern(target: Combatant, source: Actor, targetActor: Actor): Combatant = {
    val expiring = target.activeEffects.filter(effect => match effect {
      | HypnoticPatternEffect(data) => data.source == source and data.target == targetActor
      | _ => false
    })
    val hadHypnoticPattern = expiring.size() > 0
    val hadIncapacitated = expiring.exists(effect => match effect {
      | HypnoticPatternEffect(data) => data.hadIncapacitated
      | _ => false
    })
    {
      ...target,
      incapacitated: if (hadHypnoticPattern) hadIncapacitated else target.incapacitated,
      activeEffects: activeEffectsWithoutHypnoticPattern(target.activeEffects, source, targetActor),
    }
  }

  pure def hypnoticPatternTarget(
    target: Combatant,
    targetActor: Actor,
    savingThrowSucceeded: bool,
    source: Actor,
  ): Combatant =
    hypnoticPatternTargetWithCharmedPrevention(target, targetActor, savingThrowSucceeded, false, source)

  pure def hypnoticPatternTargetWithCharmedPrevention(
    target: Combatant,
    targetActor: Actor,
    savingThrowSucceeded: bool,
    charmedPrevented: bool,
    source: Actor,
  ): Combatant =
    if (savingThrowSucceeded or charmedPrevented or combatantHasCharmedImmunity(target))
      target
    else {
      val withoutPrior = combatantWithoutHypnoticPattern(target, source, targetActor)
      val controlled = {
        ...withoutPrior,
        incapacitated: true,
        activeEffects: withoutPrior.activeEffects.union(Set(hypnoticPatternEffect(source, targetActor, withoutPrior))),
      }
      breakConcentrationFromSleepAppliedIncapacitated(controlled, targetActor)
    }

  pure def resolveHypnoticPattern(
    state: BattleState,
    goblinSavingThrowSucceeded: bool,
    slotLevel: int,
  ): BattleState =
    resolveHypnoticPatternWithCharmedPrevention(state, goblinSavingThrowSucceeded, false, slotLevel)

  pure def resolveHypnoticPatternWithCharmedPrevention(
    state: BattleState,
    goblinSavingThrowSucceeded: bool,
    goblinCharmedPrevented: bool,
    slotLevel: int,
  ): BattleState =
    if (slotLevel < 3 or not(state.actionAvailable) or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated or fighterHasRage(state) or not(canExpendSpellSlotThisTurn(state)))
      state
    else {
      val withoutPrior = breakConcentrationSpellEffects(state, Fighter)
      val goblin = hypnoticPatternTargetWithCharmedPrevention(withoutPrior.goblin, Goblin, goblinSavingThrowSucceeded, goblinCharmedPrevented, Fighter)
      val appliedControl = combatantHasHypnoticPatternFrom(goblin, Fighter, Goblin)
      commitActorSpellSlotUse({
        ...withoutPrior,
        fighter: { ...withoutPrior.fighter, concentrating: appliedControl },
        goblin: goblin,
        actionAvailable: false,
      }, Fighter)
    }

  pure def combatantAfterHypnoticPatternDamage(target: Combatant, source: Actor, targetActor: Actor, damage: int): Combatant =
    if (damage > 0)
      combatantWithoutHypnoticPattern(target, source, targetActor)
    else
      target

  pure def shakeAwakeFromHypnoticPattern(state: BattleState, targetActor: Actor, actorWithin5Feet: bool): BattleState =
    if (not(state.actionAvailable) or not(actorWithin5Feet) or currentActor(state) == targetActor or currentActor(state) != Fighter or state.fighter.unconscious or state.fighter.incapacitated)
      state
    else {
      match targetActor {
        | Fighter => state
        | Goblin =>
          if (combatantHasHypnoticPattern(state.goblin))
            { ...state, goblin: combatantWithoutHypnoticPattern(state.goblin, Fighter, Goblin), actionAvailable: false }
          else
            state
      }
    }

  pure def endTurnWithSleepRepeatSave(state: BattleState, savingThrowSucceeded: bool): BattleState =
    match currentActor(state) {
      | Fighter =>
        if (sleepRepeatSaveDue(state.fighter.activeEffects, Fighter, state.initiative.round))
          endTurn({ ...state, fighter: sleepRepeatSaveTarget(state.fighter, Fighter, state.initiative.round, savingThrowSucceeded) })
        else
          endTurn(state)
      | Goblin =>
        if (sleepRepeatSaveDue(state.goblin.activeEffects, Goblin, state.initiative.round))
          endTurn({ ...state, goblin: sleepRepeatSaveTarget(state.goblin, Goblin, state.initiative.round, savingThrowSucceeded) })
        else
          endTurn(state)
    }

  pure def endTurnWithHideousLaughterRepeatSave(state: BattleState, savingThrowSucceeded: bool): BattleState =
    match currentActor(state) {
      | Fighter =>
        if (hideousLaughterRepeatSaveDue(state.fighter.activeEffects, Fighter) and savingThrowSucceeded)
          endTurn({ ...state, fighter: combatantWithoutHideousLaughter(state.fighter, Goblin, Fighter) })
        else
          endTurn(state)
      | Goblin =>
        if (hideousLaughterRepeatSaveDue(state.goblin.activeEffects, Goblin) and savingThrowSucceeded)
          endTurn({ ...state, goblin: combatantWithoutHideousLaughter(state.goblin, Fighter, Goblin) })
        else
          endTurn(state)
    }
}
