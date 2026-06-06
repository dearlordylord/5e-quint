// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-direct-condition-removal

module battleRuntimeDirectConditionRemovalTests {
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeDirectConditionRemoval.* from "./battle-runtime-direct-condition-removal"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"

  run test_lesser_restoration_cast_removes_selected_condition = {
    val targetEffects = Set(
      ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 }),
      BlindnessDeafnessDeafened({ source: Fighter, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 }),
      HoldPersonParalyzed({ source: Fighter, hadIncapacitated: false, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 }),
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
        HoldPersonParalyzed({ source: Fighter, hadIncapacitated: false, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 })
      ))),
      assert(result.goblin.activeEffects.contains(ColorSprayBlinded({ source: Fighter, expiresAtRound: 2 }))),
      assert(result.goblin.activeEffects.contains(BlindnessDeafnessDeafened({ source: Fighter, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 }))),
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
          heightenedRepeatSaveDisadvantage: false,
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
      BlindnessDeafnessBlinded({ source: Fighter, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 }),
      BlindnessDeafnessDeafened({ source: Fighter, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 })
    ), DirectConditionRemovalBlinded)
    val deafened = activeEffectsWithoutRemovedCondition(Set(
      BlindnessDeafnessBlinded({ source: Fighter, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 }),
      BlindnessDeafnessDeafened({ source: Fighter, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 })
    ), DirectConditionRemovalDeafened)
    all {
      assert(blinded == Set(BlindnessDeafnessDeafened({ source: Fighter, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 }))),
      assert(deafened == Set(BlindnessDeafnessBlinded({ source: Fighter, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 }))),
      assert(activeEffectsWithoutRemovedCondition(Set(RayOfSicknessPoisoned), DirectConditionRemovalPoisoned) == Set()),
      assert(activeEffectsWithoutRemovedCondition(Set(
        HoldPersonParalyzed({ source: Fighter, hadIncapacitated: true, heightenedRepeatSaveDisadvantage: false, durationTicks: 10 })
      ), DirectConditionRemovalParalyzed) == Set()),
    }
  }
}
