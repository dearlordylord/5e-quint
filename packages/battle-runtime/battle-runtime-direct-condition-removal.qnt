// -*- mode: Bluespec; -*-

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

  run test_lesser_restoration_cast_removes_selected_condition = {
    val targetEffects = Set(
      ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 }),
      BlindnessDeafnessDeafened({ source: Fighter, durationTicks: 10 }),
      HoldPersonParalyzed({ source: Fighter, hadIncapacitated: false, durationTicks: 10 }),
      RayOfSicknessPoisoned,
    )
    val affected = {
      ...initialState,
      goblin: { ...initialState.goblin, activeEffects: targetEffects, incapacitated: true },
    }
    val result = resolveLesserRestorationSpell(affected, Goblin, DirectConditionRemovalParalyzed)
    all {
      assert(result.actionAvailable),
      assert(not(result.bonusActionAvailable)),
      assert(result.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(not(result.goblin.incapacitated)),
      assert(not(result.goblin.activeEffects.contains(
        HoldPersonParalyzed({ source: Fighter, hadIncapacitated: false, durationTicks: 10 })
      ))),
      assert(result.goblin.activeEffects.contains(ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 }))),
      assert(result.goblin.activeEffects.contains(BlindnessDeafnessDeafened({ source: Fighter, durationTicks: 10 }))),
      assert(result.goblin.activeEffects.contains(RayOfSicknessPoisoned)),
    }
  }

  run test_lesser_restoration_cast_triggers_spell_cast_early_end = {
    val protected = {
      ...initialState,
      fighter: combatantWithInvisibilityCondition(
        combatantWithSanctuaryWard({ ...initialState.fighter, concentrating: true }, Fighter),
        Fighter,
      ),
      goblin: combatantWithInvisibilityCondition(initialState.goblin, Fighter),
    }
    val result = resolveLesserRestorationSpell(protected, Fighter, DirectConditionRemovalPoisoned)
    all {
      assert(not(activeEffectsContainSanctuaryWard(result.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(result.fighter.activeEffects))),
      assert(not(activeEffectsContainInvisibilityCondition(result.goblin.activeEffects))),
      assert(not(result.fighter.concentrating)),
      assert(not(result.bonusActionAvailable)),
      assert(result.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
    }
  }

  run test_lesser_restoration_paralyzed_choice_preserves_independent_incapacitated = {
    val affected = {
      ...initialState,
      goblin: { ...initialState.goblin, incapacitated: true },
    }
    val result = resolveLesserRestorationSpell(affected, Goblin, DirectConditionRemovalParalyzed)
    all {
      assert(result.goblin.incapacitated),
      assert(not(result.bonusActionAvailable)),
      assert(result.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
    }
  }

  run test_lesser_restoration_removing_hold_person_clears_source_concentration = {
    val held = {
      ...initialState,
      fighter: { ...initialState.fighter, concentrating: true },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(HoldPersonParalyzed({
          source: Fighter,
          hadIncapacitated: false,
          durationTicks: 10,
        })),
        incapacitated: true,
      },
    }
    val result = resolveLesserRestorationSpell(held, Goblin, DirectConditionRemovalParalyzed)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.goblin.incapacitated)),
      assert(not(activeEffectsContainHoldPersonFrom(result.goblin.activeEffects, Fighter))),
      assert(not(result.bonusActionAvailable)),
      assert(result.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
    }
  }

  run test_lesser_restoration_choice_removes_each_srd_condition_family = {
    val blinded = activeEffectsWithoutRemovedCondition(Set(
      ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 }),
      BlindnessDeafnessBlinded({ source: Fighter, durationTicks: 10 }),
      BlindnessDeafnessDeafened({ source: Fighter, durationTicks: 10 })
    ), DirectConditionRemovalBlinded)
    val deafened = activeEffectsWithoutRemovedCondition(Set(
      BlindnessDeafnessBlinded({ source: Fighter, durationTicks: 10 }),
      BlindnessDeafnessDeafened({ source: Fighter, durationTicks: 10 })
    ), DirectConditionRemovalDeafened)
    all {
      assert(blinded == Set(BlindnessDeafnessDeafened({ source: Fighter, durationTicks: 10 }))),
      assert(deafened == Set(BlindnessDeafnessBlinded({ source: Fighter, durationTicks: 10 }))),
      assert(activeEffectsWithoutRemovedCondition(Set(RayOfSicknessPoisoned), DirectConditionRemovalPoisoned) == Set()),
      assert(activeEffectsWithoutRemovedCondition(Set(
        HoldPersonParalyzed({ source: Fighter, hadIncapacitated: true, durationTicks: 10 })
      ), DirectConditionRemovalParalyzed) == Set()),
    }
  }
}
