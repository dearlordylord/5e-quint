// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-sanctuary-targeting-interdiction

module battleRuntimeSanctuary {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"

  pure def sanctuaryWardActiveEffect(source: Actor): ActiveEffect =
    SanctuaryWard({ source: source, durationTicks: 10 })

  pure def invisibilityConditionActiveEffect(source: Actor): ActiveEffect =
    InvisibilityCondition({ source: source, durationTicks: 600 })

  pure def activeEffectsWithoutSanctuaryWard(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SanctuaryWard(_) => false
      | _ => true
    })

  pure def activeEffectsWithoutInvisibilityConditionFrom(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | InvisibilityCondition(data) => data.source != source
      | _ => true
    })

  pure def activeEffectsContainSanctuaryWard(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | SanctuaryWard(_) => true
      | _ => false
    })

  pure def activeEffectsContainSanctuaryWardFrom(effects: Set[ActiveEffect], source: Actor): bool =
    effects.exists(effect => match effect {
      | SanctuaryWard(data) => data.source == source
      | _ => false
    })

  pure def activeEffectsContainInvisibilityCondition(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | InvisibilityCondition(_) => true
      | _ => false
    })

  pure def activeEffectsSanctuaryWardDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | SanctuaryWard(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def activeEffectsInvisibilityDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | InvisibilityCondition(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def activeEffectsInvisibilitySources(effects: Set[ActiveEffect]): Set[Actor] =
    effects
      .filter(effect => match effect {
        | InvisibilityCondition(_) => true
        | _ => false
      })
      .map(effect => match effect {
        | InvisibilityCondition(data) => data.source
        | _ => Fighter
      })

  pure def combatantWithSanctuaryWard(target: Combatant, source: Actor): Combatant =
    {
      ...target,
      activeEffects: activeEffectsWithoutSanctuaryWard(target.activeEffects).union(Set(sanctuaryWardActiveEffect(source))),
    }

  pure def combatantWithInvisibilityCondition(target: Combatant, source: Actor): Combatant =
    {
      ...target,
      activeEffects: activeEffectsWithoutInvisibilityConditionFrom(target.activeEffects, source).union(Set(invisibilityConditionActiveEffect(source))),
    }

  pure def battleStateAfterInvisibilitySourceEarlyEnd(state: BattleState, source: Actor): BattleState =
    match source {
      | Fighter => {
          ...state,
          fighter: {
            ...state.fighter,
            concentrating: false,
            activeEffects: activeEffectsWithoutInvisibilityConditionFrom(state.fighter.activeEffects, Fighter),
          },
          goblin: {
            ...state.goblin,
            activeEffects: activeEffectsWithoutInvisibilityConditionFrom(state.goblin.activeEffects, Fighter),
          },
        }
      | Goblin => {
          ...state,
          goblin: {
            ...state.goblin,
            concentrating: false,
            activeEffects: activeEffectsWithoutInvisibilityConditionFrom(state.goblin.activeEffects, Goblin),
          },
          fighter: {
            ...state.fighter,
            activeEffects: activeEffectsWithoutInvisibilityConditionFrom(state.fighter.activeEffects, Goblin),
          },
        }
    }

  pure def battleStateAfterTargetActionEarlyEndForActor(state: BattleState, actor: Actor): BattleState = {
    val combatant = combatantForActor(state, actor)
    val invisibilitySources = activeEffectsInvisibilitySources(combatant.activeEffects)
    val afterSanctuary = stateWithActorCombatant(state, actor, {
      ...combatant,
      activeEffects: activeEffectsWithoutSanctuaryWard(combatant.activeEffects),
    })
    invisibilitySources.fold(afterSanctuary, (nextState, source) => battleStateAfterInvisibilitySourceEarlyEnd(nextState, source))
  }

  pure def battleStateAfterSanctuaryEarlyEndForActor(state: BattleState, actor: Actor): BattleState =
    battleStateAfterTargetActionEarlyEndForActor(state, actor)

  pure def wardTargetingInterdictionApplies(
    trigger: SanctuaryTargetingTrigger,
  ): bool =
    match trigger {
      | SanctuaryAttackRollTargeting => true
      | SanctuaryDamagingSpellTargeting => true
      | SanctuaryAreaOfEffectTargeting => false
    }

  pure def wardInterdictionLosesAttackOrSpell(
    outcome: SanctuaryInterdictionOutcome,
  ): bool =
    match outcome {
      | SanctuarySaveSucceeded => false
      | SanctuaryLoseAttackOrSpell => true
      | SanctuaryChooseNewTarget(_) => false
    }

  pure def wardInterdictionTarget(
    warded: Actor,
    outcome: SanctuaryInterdictionOutcome,
  ): Actor =
    match outcome {
      | SanctuarySaveSucceeded => warded
      | SanctuaryLoseAttackOrSpell => warded
      | SanctuaryChooseNewTarget(data) => data.target
    }

  pure def sanctuaryReplacementTargetAdmitted(warded: Actor, replacement: Actor, callerTargetLegal: bool): bool =
    replacement != warded and callerTargetLegal

  pure def sanctuaryTargetingInterdictionOutcomeApplies(
    state: BattleState,
    warded: Actor,
    trigger: SanctuaryTargetingTrigger,
    outcome: SanctuaryInterdictionOutcome,
  ): bool =
    activeEffectsContainSanctuaryWard(combatantForActor(state, warded).activeEffects) and
    wardTargetingInterdictionApplies(trigger) and
    not(wardInterdictionLosesAttackOrSpell(outcome))

  pure def sanctuaryTargetingInterdictionResolvedTarget(
    state: BattleState,
    warded: Actor,
    trigger: SanctuaryTargetingTrigger,
    outcome: SanctuaryInterdictionOutcome,
  ): Actor =
    if (
      activeEffectsContainSanctuaryWard(combatantForActor(state, warded).activeEffects) and
      wardTargetingInterdictionApplies(trigger)
    )
      wardInterdictionTarget(warded, outcome)
    else
      warded
}
