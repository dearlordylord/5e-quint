// Source: https://rpg.stackexchange.com/q/62415
module _qa_3a539f22a54b4ca0 {
  import dnd.* from "./dnd"

  // Multiattack is an action comprising multiple individual attack rolls, each independent
  run qa_multiattack_each_attack_rolled_independently = {
    // Same multiattack: atk1 hits (14+5=19 vs AC 15), atk2 misses (5+5=10 vs AC 15), atk3 hits (11+5=16)
    val atk1 = resolveAttackRoll(14, 5, 15, 0)
    val atk2 = resolveAttackRoll(5,  5, 15, 0)
    val atk3 = resolveAttackRoll(11, 5, 15, 0)
    assert(atk1.hits and not(atk2.hits) and atk3.hits)
  }
  
  // Uncanny Dodge halves damage from one specific attack only, not the whole multiattack
  run qa_uncanny_dodge_single_attack_only = {
    val dmgPerAttack = normalDamage(8, 2)  // 10 per hit
    // Rogue spends reaction on attack 1: halves only that one hit (modeled as resistance)
    val dmg1_dodged = applyDamageModifiers(dmgPerAttack, Slashing, Set(), Set(Slashing), Set())  // 5
    val total_with_ud = dmg1_dodged + dmgPerAttack + dmgPerAttack  // 5+10+10 = 25
    // Incorrect reading: UD halves the entire multiattack total
    val wrong_all_halved = (dmgPerAttack + dmgPerAttack + dmgPerAttack) / 2  // 30/2 = 15
    assert(total_with_ud == 25 and wrong_all_halved == 15 and total_with_ud != wrong_all_halved)
  }
  
  // Sanctuary: monster must pass a WIS save before EACH individual attack in a multiattack
  run qa_sanctuary_save_required_per_attack = {
    val saveDC    = 13
    val atkWisMod = 1
    // Three separate saves, one per attack — not a single save for the whole multiattack
    val save_atk1 = saveSucceeds(7,  atkWisMod, false, 0, 0, saveDC)  // 8  < 13: fails → loses attack
    val save_atk2 = saveSucceeds(13, atkWisMod, false, 0, 0, saveDC)  // 14 >= 13: passes → can attack
    val save_atk3 = saveSucceeds(3,  atkWisMod, false, 0, 0, saveDC)  // 4  < 13: fails → loses attack
    assert(not(save_atk1) and save_atk2 and not(save_atk3))
  }
}
