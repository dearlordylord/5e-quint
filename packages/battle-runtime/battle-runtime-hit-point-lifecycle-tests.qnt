// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-make-stable

module battleRuntimeHitPointLifecycleTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeSpellSlotClassification.* from "./battle-runtime-spell-slot-classification"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"

  run test_temporary_hp_absorbs_damage_before_hp = {
    val result = resolveAttack(withGoblinHp(initialState, 10, 5), 15, 10, fighterWeaponAttackDamageRoll(4), true)
    all {
      assert(result.goblin.tempHp == 0),
      assert(result.goblin.hp == 8),
    }
  }
  run test_hp_clamps_to_zero_and_monster_dies = {
    val result = resolveAttack(withGoblinHp(initialState, 3, 0), 15, 10, fighterWeaponAttackDamageRoll(8), true)
    all {
      assert(result.goblin.hp == 0),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }
  run test_character_drop_to_zero_uses_death_saving_throw_lifecycle = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 11, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 0),
      assert(result.lifecycle == UsesDeathSavingThrows),
    }
  }
  run test_melee_knock_out_leaves_stat_block_at_one_hp_unconscious = {
    val result = resolveAttackKnockOut(withGoblinHp(initialState, 3, 0), 15, 10, fighterWeaponAttackDamageRoll(8), true)
    all {
      assert(result.goblin.hp == 1),
      assert(result.goblin.unconscious),
      assert(result.goblin.knockedOut),
      assert(result.goblin.lifecycle == DiesAtZeroHp),
    }
  }
  run test_melee_knock_out_leaves_character_at_one_hp_unconscious = {
    val result = applyDamageWithDisposition(withFighterHp(initialState, 3, 0).fighter, 8, 1, true, KnockOut)
    all {
      assert(result.hp == 1),
      assert(result.unconscious),
      assert(result.knockedOut),
      assert(result.lifecycle == UsesDeathSavingThrows),
      assert(result.deathFailures == 0),
    }
  }
  run test_healing_knock_out_recovery_ends_unconscious = {
    val knockedOut = applyDamageWithDisposition(withFighterHp(initialState, 3, 0).fighter, 8, 1, true, KnockOut)
    val result = applyHealing(knockedOut, 4)
    all {
      assert(result.hp == 5),
      assert(not(result.unconscious)),
      assert(not(result.knockedOut)),
    }
  }
  run test_massive_damage_kills_character_on_drop_to_zero = {
    val result = applyDamage(withFighterHp(initialState, 3, 0).fighter, 19, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }
  run test_character_damage_at_zero_adds_one_death_failure = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 1, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 1),
    }
  }
  run test_character_critical_damage_at_zero_adds_two_death_failures = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 7, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 2),
    }
  }
  run test_character_temporary_hp_at_zero_absorbs_damage_before_death_failures = {
    val absorbed = applyDamage(withFighterHp(initialState, 0, 5).fighter, 4, 2, true)
    val overflow = applyDamage(withFighterHp(initialState, 0, 5).fighter, 7, 2, true)
    all {
      assert(absorbed.hp == 0),
      assert(absorbed.tempHp == 1),
      assert(absorbed.deathFailures == 0),
      assert(absorbed.unconscious),
      assert(overflow.hp == 0),
      assert(overflow.tempHp == 0),
      assert(overflow.deathFailures == 2),
      assert(overflow.unconscious),
    }
  }
  run test_massive_damage_at_zero_kills_character = {
    val result = applyDamage(withFighterHp(initialState, 0, 0).fighter, 13, 2, true)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.deathFailures == 3),
    }
  }
  run test_spare_the_dying_makes_zero_hp_non_dead_character_stable = {
    val fighter = { ...withFighterHp(initialState, 0, 0).fighter, unconscious: true, deathSuccesses: 2, deathFailures: 1 }
    val result = applySpareTheDying(fighter)
    all {
      assert(result.hp == 0),
      assert(result.unconscious),
      assert(result.stable),
      assert(result.deathSuccesses == 0),
      assert(result.deathFailures == 0),
      assert(spellInvocationSpendsSpellSlot(SpareTheDying) == false),
    }
  }
  run test_spare_the_dying_rejects_dead_and_nonzero_targets = {
    val dead = { ...withFighterHp(initialState, 0, 0).fighter, deathFailures: 3 }
    all {
      assert(not(spareTheDyingTargetAdmitted(withFighterHp(initialState, 5, 0).fighter))),
      assert(not(spareTheDyingTargetAdmitted(dead))),
      assert(not(spareTheDyingTargetAdmitted(withGoblinHp(initialState, 0, 0).goblin))),
      assert(applySpareTheDying(dead) == dead),
    }
  }
  run test_spare_the_dying_range_scales_by_character_level = {
    all {
      assert(spareTheDyingRangeFeet(1) == 15),
      assert(spareTheDyingRangeFeet(5) == 30),
      assert(spareTheDyingRangeFeet(11) == 60),
      assert(spareTheDyingRangeFeet(17) == 120),
    }
  }
}
