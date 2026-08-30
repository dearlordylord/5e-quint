// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SANCTUARY.TARGETING_INTERDICTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-sanctuary-targeting-interdiction

module battleRuntimeSanctuary {
  import battleRuntimeTargetingSaveInterdiction.* from "./battle-runtime-targeting-save-interdiction"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeTargetActionEffectEarlyEnd.* from "./battle-runtime-target-action-effect-early-end"

  pure def sanctuaryWardActiveEffect(source: Actor): ActiveEffect =
    SanctuaryWard({ source: source, durationTicks: 10 })

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

  pure def battleStateAfterSanctuaryEarlyEndForActor(state: BattleState, actor: Actor): BattleState =
    battleStateAfterTargetActionEarlyEndForActor(state, actor)

  pure def wardTargetingInterdictionApplies(
    trigger: SanctuaryTargetingTrigger,
  ): bool =
    targetingSaveInterdictionApplies(match trigger {
      | SanctuaryAttackRollTargeting => TargetingSaveInterdictionAttackRoll
      | SanctuaryDamagingSpellTargeting => TargetingSaveInterdictionDamagingSpell
      | SanctuaryAreaOfEffectTargeting => TargetingSaveInterdictionAreaOfEffect
    })

  pure def wardInterdictionLosesAttackOrSpell(
    outcome: SanctuaryInterdictionOutcome,
  ): bool =
    targetingSaveInterdictionLosesAttackOrSpell(match outcome {
      | SanctuarySaveSucceeded => TargetingSaveInterdictionSaveSucceeded
      | SanctuaryLoseAttackOrSpell => TargetingSaveInterdictionLoseAttackOrSpell
      | SanctuaryChooseNewTarget(_) => TargetingSaveInterdictionChooseNewTarget
    })

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
