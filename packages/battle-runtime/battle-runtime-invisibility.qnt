// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DIRECT_CONDITION_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-direct-condition

module battleRuntimeInvisibility {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTargetActionEffectEarlyEnd.* from "./battle-runtime-target-action-effect-early-end"

  pure def invisibilityConditionActiveEffect(source: Actor): ActiveEffect =
    InvisibilityCondition({ source: source, durationTicks: 600 })

  pure def activeEffectsContainInvisibilityCondition(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | InvisibilityCondition(_) => true
      | _ => false
    })

  pure def activeEffectsInvisibilityDurationTicks(effects: Set[ActiveEffect]): int =
    effects.map(effect => match effect {
      | InvisibilityCondition(data) => data.durationTicks
      | _ => 0
    }).fold(0, (highest, ticks) => if (highest > ticks) highest else ticks)

  pure def combatantWithInvisibilityCondition(target: Combatant, source: Actor): Combatant =
    {
      ...target,
      activeEffects: activeEffectsWithoutInvisibilityConditionFrom(target.activeEffects, source).union(Set(invisibilityConditionActiveEffect(source))),
    }

  pure def invisibilityConditionMaxTargets(slotLevel: int): int =
    if (slotLevel >= 2) 1 + (slotLevel - 2) else 0

  pure def resolveInvisibilityConditionSpell(state: BattleState, targets: Set[Actor], slotLevel: int): BattleState =
    if (
      currentActor(state) != Fighter or
      not(state.actionAvailable) or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      slotLevel < 2 or
      targets.size() < 1 or
      targets.size() > invisibilityConditionMaxTargets(slotLevel)
    )
      state
    else {
      val afterCasterEarlyEnd = battleStateAfterTargetActionEarlyEndForActor(state, Fighter)
      val withoutPrior = breakConcentrationSpellEffects(afterCasterEarlyEnd, Fighter)
      val withTargets = {
        ...withoutPrior,
        fighter: if (targets.contains(Fighter))
          combatantWithInvisibilityCondition(withoutPrior.fighter, Fighter)
        else
          withoutPrior.fighter,
        goblin: if (targets.contains(Goblin))
          combatantWithInvisibilityCondition(withoutPrior.goblin, Fighter)
        else
          withoutPrior.goblin,
        actionAvailable: false,
      }
      commitActorSpellSlotUse({
        ...withTargets,
        fighter: { ...withTargets.fighter, concentrating: true },
      }, Fighter)
    }
}
