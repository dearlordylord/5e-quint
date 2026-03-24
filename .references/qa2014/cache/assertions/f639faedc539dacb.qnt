// Source: https://rpg.stackexchange.com/q/114387
module _qa_f639faedc539dacb {
  import dnd.* from "./dnd"

  // How combat Hide mechanic works on multiple enemies present?
  // Stealth result is the effective DC for enemy Passive Perception to spot you.
  run qa_hide_low_wis_enemy_cannot_spot = {
    // WIS 8 (mod -1), no Perception proficiency: PP = 10 - 1 = 9 < stealth roll 13
    val stealthResult = 13
    val enemyPP = passiveCheck(-1, NoneProf, 2, false, false)
    assert(enemyPP < stealthResult)
  }
  
  // How combat Hide mechanic works on multiple enemies present?
  // Attacker who cannot see the hidden target rolls with disadvantage.
  run qa_hide_unseen_target_gives_attacker_disadvantage = {
    // Skeleton cannot see hidden player (attackerCanSeeTarget = false)
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: false,  // hidden creature — attacker can't see target
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // How combat Hide mechanic works on multiple enemies present?
  // Enemy with PP exactly matching stealth result CAN see the hidden creature.
  run qa_hide_high_wis_enemy_spots = {
    // WIS 16 (mod +3), no prof: PP = 10 + 3 = 13 >= stealth roll 13 → spotted
    val stealthResult = 13
    val enemyPP = passiveCheck(3, NoneProf, 2, false, false)
    assert(enemyPP >= stealthResult)
  }
  
  // How combat Hide mechanic works on multiple enemies present?
  // Advantage on Passive Perception (+5) lets even a WIS 8 enemy spot stealth roll 13.
  run qa_hide_advantage_pp_spots_low_wis_enemy = {
    // WIS 8 (mod -1) with advantage: PP = 10 - 1 + 5 = 14 >= 13 → spots hidden creature
    val stealthResult = 13
    val enemyPPWithAdv = passiveCheck(-1, NoneProf, 2, true, false)
    assert(enemyPPWithAdv >= stealthResult)
  }
  
  // How combat Hide mechanic works on multiple enemies present?
  // Active Search (Perception check) beating the stealth roll reveals the hidden creature.
  run qa_hide_active_search_reveals_on_success = {
    // Enemy rolls Perception (d20=15, WIS mod -1, no prof): total 14 >= DC 13 → found
    val stealthResult = 13
    assert(checkSucceeds(15, -1, NoneProf, 2, 0, stealthResult))
  }
  
  // How combat Hide mechanic works on multiple enemies present?
  // Active Search that fails (roll too low) does not reveal the hidden creature.
  run qa_hide_active_search_fails_below_stealth = {
    // Enemy rolls Perception (d20=5, WIS mod -1, no prof): total 4 < DC 13 → not found
    val stealthResult = 13
    assert(not(checkSucceeds(5, -1, NoneProf, 2, 0, stealthResult)))
  }
  
  // How combat Hide mechanic works on multiple enemies present?
  // Once attacker CAN see the target, no disadvantage from visibility applies.
  run qa_hide_spotted_enemy_attacks_normally = {
    // WIS 16 enemy spotted the player; attackerCanSeeTarget = true → no visibility disadv
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,  // high-PP enemy spotted the hidden player
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasDisadvantage) and not(mods.hasAdvantage))
  }
}
