// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-direct-condition-removal

module battleRuntimeDirectConditionRemoval {
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  // SRD 5.2.1, Spells/Descriptions-E-L.md Lesser Restoration: Bonus Action,
  // Touch, Instantaneous; end one of Blinded, Deafened, Paralyzed, or Poisoned.
  type DirectConditionRemovalChoice =
    | DirectConditionRemovalBlinded
    | DirectConditionRemovalDeafened
    | DirectConditionRemovalParalyzed
    | DirectConditionRemovalPoisoned

  pure def activeEffectDirectlyAppliesRemovedCondition(
    effect: ActiveEffect,
    choice: DirectConditionRemovalChoice,
  ): bool =
    match choice {
      | DirectConditionRemovalBlinded => match effect {
          | ColorSprayBlinded(_) => true
          | BlindnessDeafnessBlinded(_) => true
          | _ => false
        }
      | DirectConditionRemovalDeafened => match effect {
          | BlindnessDeafnessDeafened(_) => true
          | _ => false
        }
      | DirectConditionRemovalParalyzed => match effect {
          | HoldPersonParalyzed(_) => true
          | _ => false
        }
      | DirectConditionRemovalPoisoned => match effect {
          | RayOfSicknessPoisoned => true
          | _ => false
        }
    }

  pure def activeEffectsWithoutRemovedCondition(
    effects: Set[ActiveEffect],
    choice: DirectConditionRemovalChoice,
  ): Set[ActiveEffect] =
    effects.filter(effect => not(activeEffectDirectlyAppliesRemovedCondition(effect, choice)))

  pure def removedHoldPersonHadIncapacitated(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HoldPersonParalyzed(data) => data.hadIncapacitated
      | _ => false
    })

  pure def removedHoldPersonParalyzed(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | HoldPersonParalyzed(_) => true
      | _ => false
    })

  pure def combatantAfterDirectConditionRemoval(
    combatant: Combatant,
    choice: DirectConditionRemovalChoice,
  ): Combatant = {
    val activeEffects = activeEffectsWithoutRemovedCondition(combatant.activeEffects, choice)
    {
      ...combatant,
      activeEffects: activeEffects,
      incapacitated: match choice {
        | DirectConditionRemovalParalyzed =>
            if (removedHoldPersonParalyzed(combatant.activeEffects))
              removedHoldPersonHadIncapacitated(combatant.activeEffects)
            else
              combatant.incapacitated
        | _ => combatant.incapacitated
      },
    }
  }

  pure def directConditionRemovalTargetedState(
    state: BattleState,
    target: Actor,
    choice: DirectConditionRemovalChoice,
  ): BattleState = {
    val targeted = {
      ...state,
      fighter: if (target == Fighter) combatantAfterDirectConditionRemoval(state.fighter, choice) else state.fighter,
      goblin: if (target == Goblin) combatantAfterDirectConditionRemoval(state.goblin, choice) else state.goblin,
    }
    val removedFighterHoldPerson =
      choice == DirectConditionRemovalParalyzed and
      match target {
        | Fighter => activeEffectsContainHoldPersonFrom(state.fighter.activeEffects, Fighter)
        | Goblin => activeEffectsContainHoldPersonFrom(state.goblin.activeEffects, Fighter)
      }
    val removedGoblinHoldPerson =
      choice == DirectConditionRemovalParalyzed and
      match target {
        | Fighter => activeEffectsContainHoldPersonFrom(state.fighter.activeEffects, Goblin)
        | Goblin => activeEffectsContainHoldPersonFrom(state.goblin.activeEffects, Goblin)
      }
    val afterFighterConcentrationCleanup =
      if (removedFighterHoldPerson)
        stateWithHoldPersonConcentrationClearedIfNoEffects(targeted, Fighter)
      else
        targeted
    if (removedGoblinHoldPerson)
      stateWithHoldPersonConcentrationClearedIfNoEffects(afterFighterConcentrationCleanup, Goblin)
    else
      afterFighterConcentrationCleanup
  }

  pure def resolveLesserRestorationSpell(
    state: BattleState,
    target: Actor,
    choice: DirectConditionRemovalChoice,
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      canSpendFighterSpellActionCost(state, SpellBonusAction) and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state))
    ) {
      val afterCasterEarlyEnd = battleStateAfterTargetActionEarlyEndForActor(state, Fighter)
      commitActorSpellSlotUse(
        spendFighterSpellActionCost(directConditionRemovalTargetedState(afterCasterEarlyEnd, target, choice), SpellBonusAction),
        Fighter,
      )
    } else {
      state
    }

}
