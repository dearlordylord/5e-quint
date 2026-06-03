// -*- mode: Bluespec; -*-

module battleRuntimeSeeInvisibilityTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeSeeInvisibility.* from "./battle-runtime-see-invisibility"
  import battleRuntimeSeeInvisibilityConstants.* from "./battle-runtime-see-invisibility-constants"
  import battleRuntimeSanctuary.* from "./battle-runtime-sanctuary"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"

  run test_see_invisibility_spends_magic_action_and_spell_slot_for_timed_self_effect = {
    val result = resolveSeeInvisibilitySpell(initialState, 2)
    all {
      assert(not(result.actionAvailable)),
      assert(result.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(not(result.fighter.concentrating)),
      assert(activeEffectsContainSeeInvisibleAndEtherealFrom(result.fighter.activeEffects, Fighter)),
      assert(activeEffectsSeeInvisibleAndEtherealDurationTicks(result.fighter.activeEffects, Fighter) == seeInvisibilityDurationTicks),
    }
  }

  run test_see_invisibility_is_observer_scoped_and_does_not_remove_invisible_condition = {
    val invisibleTarget = {
      ...initialState,
      goblin: combatantWithInvisibilityCondition(initialState.goblin, Goblin),
    }
    val cast = resolveSeeInvisibilitySpell(invisibleTarget, 2)
    all {
      assert(not(combatantCanSeeTargetWithSeeInvisible(invisibleTarget.fighter, invisibleTarget.goblin, Fighter))),
      assert(not(combatantCanSeeTargetWithSeeInvisible(invisibleTarget.goblin, invisibleTarget.goblin, Goblin))),
      assert(combatantCanSeeTargetWithSeeInvisible(cast.fighter, cast.goblin, Fighter)),
      assert(not(combatantCanSeeTargetWithSeeInvisible(cast.goblin, cast.goblin, Goblin))),
      assert(activeEffectsContainInvisibilityCondition(cast.goblin.activeEffects)),
      assert(not(activeEffectsDenyInvisibleBenefit(cast.goblin.activeEffects))),
    }
  }

  run test_see_invisibility_does_not_bypass_hidden_and_requires_real_object_or_ethereal_witness_facts = {
    val hiddenInvisibleTarget = {
      ...initialState,
      goblin: {
        ...combatantWithInvisibilityCondition(initialState.goblin, Goblin),
        hidden: HiddenByDc(HiddenDc16),
      },
    }
    val cast = resolveSeeInvisibilitySpell(hiddenInvisibleTarget, 2)
    all {
      assert(not(combatantCanSeeTargetWithSeeInvisible(cast.fighter, cast.goblin, Fighter))),
      assert(seeInvisibleRevealsInvisibleObject(cast.fighter, Fighter, true, true, false)),
      assert(not(seeInvisibleRevealsInvisibleObject(cast.fighter, Fighter, false, true, false))),
      assert(not(seeInvisibleRevealsInvisibleObject(cast.fighter, Fighter, true, false, false))),
      assert(not(seeInvisibleRevealsInvisibleObject(cast.fighter, Fighter, true, true, true))),
      assert(seeInvisibleRevealsEtherealWitness(cast.fighter, Fighter, EtherealPlane, true, false)),
      assert(not(seeInvisibleRevealsEtherealWitness(cast.fighter, Fighter, MaterialPlane, true, false))),
      assert(not(seeInvisibleRevealsEtherealWitness(cast.fighter, Fighter, EtherealPlane, false, false))),
      assert(not(seeInvisibleRevealsEtherealWitness(cast.fighter, Fighter, EtherealPlane, true, true))),
      assert(not(seeInvisibleRevealsEtherealWitness(cast.goblin, Goblin, EtherealPlane, true, false))),
    }
  }

  run test_see_invisibility_duration_tick_expires_observer_effect = {
    val cast = resolveSeeInvisibilitySpell(initialState, 2)
    val expiring = {
      ...cast,
      fighter: {
        ...cast.fighter,
        activeEffects: Set(seeInvisibleAndEtherealActiveEffect(Fighter, 1)),
      },
    }
    val expiredEffects = tickDurationActiveEffects(expiring.fighter.activeEffects)
    all {
      assert(expiredEffects == Set()),
      assert(not(activeEffectsContainSeeInvisibleAndEtherealFrom(expiredEffects, Fighter))),
    }
  }
}
