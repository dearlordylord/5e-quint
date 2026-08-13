// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE BATTLE.SANCTUARY.TARGETING_INTERDICTION

module battleRuntimeTargetActionEffectEarlyEnd {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"

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

  pure def activeEffectsInvisibilitySources(effects: Set[ActiveEffect]): Set[Actor] =
    effects.fold(Set(), (sources, effect) =>
      match effect {
        | InvisibilityCondition(data) => sources.union(Set(data.source))
        | _ => sources
      }
    )

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
}
