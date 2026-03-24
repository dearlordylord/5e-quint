// Source: https://rpg.stackexchange.com/q/73177
module _qa_895d88fc1bcb6fbc {
  import dnd.* from "./dnd"

  // Q: "What happens when a PC is attacked while unconscious in 5e?" — attacker gets advantage against unconscious target
  run qa_unconscious_target_grants_attacker_advantage = {
    val creature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val defMods = pDefenseModifiers(creature, true)
    assert(defMods.attackerAdvantage)
  }
  
  // Q: "What happens when a PC is attacked while unconscious in 5e?" — hit within 5 ft is automatically a critical
  run qa_unconscious_autocrit_within_5ft = {
    val creature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val defMods = pDefenseModifiers(creature, true)
    assert(defMods.autoCrit)
  }
  
  // Q: "What happens when a PC is attacked while unconscious in 5e?" — no autocrit beyond 5 ft
  run qa_unconscious_no_autocrit_beyond_5ft = {
    val creature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val defMods = pDefenseModifiers(creature, false)
    assert(not(defMods.autoCrit))
  }
  
  // Q: "What happens when a PC is attacked while unconscious in 5e?" — normal damage at 0 HP adds 1 death save failure
  run qa_damage_at_0hp_adds_one_death_save_failure = {
    val creature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pTakeDamage(creature, 5, Slashing, Set(), Set(), Set(), false)
    assert(after.deathSaves.failures == 1)
  }
  
  // Q: "What happens when a PC is attacked while unconscious in 5e?" — critical hit at 0 HP adds 2 death save failures
  run qa_critical_hit_at_0hp_adds_two_death_save_failures = {
    val creature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pTakeDamage(creature, 5, Slashing, Set(), Set(), Set(), true)
    assert(after.deathSaves.failures == 2)
  }
  
  // Q: "What happens when a PC is attacked while unconscious in 5e?" — massive damage (>= maxHp) at 0 HP is instant death
  run qa_massive_damage_at_0hp_is_instant_death = {
    val creature = freshCreature(20)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    val after = pTakeDamage(creature, 20, Slashing, Set(), Set(), Set(), false)
    assert(after.dead)
  }
  
  // Q: "What happens when a PC is attacked while unconscious in 5e?" — advantage from unconscious cancels with disadvantage from prone+beyond5ft
  run qa_unconscious_prone_beyond_5ft_advantage_cancels = {
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: true, targetRestrained: false,
      targetProne: true,
      attackerWithin5ft: false,
      targetDodging: false, targetCanSeeAttacker: true, attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Q: "What happens when a PC is attacked while unconscious in 5e?" — full multiattack sequence: first hit drops to 0 (unconscious), second critical causes 2 failures
  run qa_multiattack_second_critical_on_just_downed_creature = {
    val alive = freshCreature(25)
    // First hit drops to 0 HP → creature goes unconscious
    val downed = pTakeDamage(alive, 25, Slashing, Set(), Set(), Set(), false)
    // Verify intermediate state: 0 HP, unconscious, prone
    val downed_ok = downed.hp == 0 and downed.unconscious and downed.prone
    // Second hit: critical (attacker within 5ft → autocrit), causes 2 death save failures
    val after = pTakeDamage(downed, 5, Slashing, Set(), Set(), Set(), true)
    assert(downed_ok and after.deathSaves.failures == 2 and not(after.dead))
  }
}
