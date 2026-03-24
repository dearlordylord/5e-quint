// Source: https://rpg.stackexchange.com/q/102081
module _qa_397be563f4f4ed5b {
  import dnd.* from "./dnd"

  // Great Weapon Master Critical Hit Resolution: nat 20 always crits regardless of attack modifiers
  run qa_gwm_nat20_crits_despite_penalty = {
    // PHB p.194: nat 20 always hits and crits regardless of any modifiers or target AC
    // GWM -5 penalty on the attack roll does not negate the critical hit
    val result = resolveAttackRoll(20, -5, 25, 0)
    assert(result.hits == true and result.isCritical == true)
  }
  
  // Great Weapon Master Critical Hit Resolution: flat +10 bonus is not doubled on a critical hit
  run qa_gwm_flat_bonus_not_doubled_on_crit = {
    // Only damage dice double on a crit; flat bonuses like GWM +10 are added once
    // normalDice=6, bonusDice=6 (extra crit die), modifier=10 (GWM flat bonus)
    val critDmg = criticalDamage(6, 6, 10)
    // 6 + 6 + 10 = 22, NOT 6 + 6 + 20 = 32
    assert(critDmg == 22)
  }
}
