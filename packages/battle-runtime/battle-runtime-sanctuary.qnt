// -*- mode: Bluespec; -*-

module battleRuntimeSanctuary {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"

  pure def sanctuaryWardActiveEffect(source: Actor): ActiveEffect =
    SanctuaryWard({ source: source, durationTicks: 10 })

  pure def activeEffectsWithoutSanctuaryWard(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SanctuaryWard(_) => false
      | _ => true
    })

  pure def activeEffectsContainSanctuaryWard(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | SanctuaryWard(_) => true
      | _ => false
    })

  pure def activeEffectsSanctuaryWardDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | SanctuaryWard(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def combatantWithSanctuaryWard(target: Combatant, source: Actor): Combatant =
    {
      ...target,
      activeEffects: activeEffectsWithoutSanctuaryWard(target.activeEffects).union(Set(sanctuaryWardActiveEffect(source))),
    }

  pure def battleStateAfterSanctuaryEarlyEndForActor(state: BattleState, actor: Actor): BattleState = {
    val combatant = combatantForActor(state, actor)
    stateWithActorCombatant(state, actor, {
      ...combatant,
      activeEffects: activeEffectsWithoutSanctuaryWard(combatant.activeEffects),
    })
  }

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
