// Source: https://rpg.stackexchange.com/q/170874
module _qa_d2f84ef4aaf1fecf {
  import dnd.* from "./dnd"

  // Sprite familiar: Help action is the primary combat contribution per accepted answer
  run qa_sprite_familiar_help_action = {
    val creature = freshCreature(20)
    val t = FRESH_TURN
    val t1 = pUseAction(t, creature, AHelp)
    assert(t1.actionUsed and not(t.actionUsed))
  }
  
  // Sprite stays invisible: target cannot see it, granting advantage on its ranged attacks
  run qa_sprite_invisible_unseen_attacker_advantage = {
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: false,
      attackerCanSeeTarget: true,
      isRangedAttack: true,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: true,
      squeezing: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
  
  // Sprite with healer's kit stabilizes a downed ally without costing a PC their action
  run qa_sprite_stabilize_downed_ally = {
    val downed = freshCreature(10)
                   .with("hp", 0)
                   .with("unconscious", true)
                   .with("prone", true)
                   .with("incapacitatedSources", Set(ISUnconscious))
    val stabilized = pStabilize(downed)
    assert(stabilized.stable
      and stabilized.deathSaves.successes == 0
      and stabilized.deathSaves.failures == 0)
  }
  
  // Sprite shortbow poison: poisoned enemy suffers disadvantage on its own attack rolls
  run qa_sprite_poison_victim_attack_disadv = {
    val poisonedEnemy = freshCreature(20).with("poisoned", true)
    val mods = pOwnAttackModifiers(poisonedEnemy, false)
    assert(mods.hasDisadvantage)
  }
  
  // Sprite sleep (unconscious via poison): adjacent attackers get advantage and auto-crit
  run qa_sprite_sleep_victim_auto_crit = {
    val asleepTarget = freshCreature(20)
                         .with("unconscious", true)
                         .with("prone", true)
                         .with("incapacitatedSources", Set(ISUnconscious))
    val defMods = pDefenseModifiers(asleepTarget, true)
    assert(defMods.autoCrit and defMods.attackerAdvantage)
  }
}
