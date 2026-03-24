// Source: https://rpg.stackexchange.com/q/206592
module _qa_82c49cb01e86eb8f {
  import dnd.* from "./dnd"

  // Beast Barbarian Call the Hunt: 5 temp HP per accepting creature, capped at CON mod creatures (min 1)
  run qa_call_the_hunt_temp_hp_three_creatures = {
    val conScore = 16 // CON mod = +3
    val conMod = abilityModifier(conScore) // 3
    val creaturesAccepting = intMax(1, conMod) // 3
    val tempHpGained = creaturesAccepting * 5 // 15
    val s0 = freshCreature(30)
    val s1 = pGrantTempHp(s0, tempHpGained, false)
    assert(s1.tempHp == 15)
  }
  
  // Beast Barbarian Call the Hunt: minimum 1 creature accepted even when CON mod is negative
  run qa_call_the_hunt_min_one_creature = {
    val conScore = 8 // CON mod = -1, but feature says minimum of one creature
    val conMod = abilityModifier(conScore) // -1
    val creaturesAccepting = intMax(1, conMod) // 1
    val tempHpGained = creaturesAccepting * 5 // 5
    val s0 = freshCreature(30)
    val s1 = pGrantTempHp(s0, tempHpGained, false)
    assert(s1.tempHp == 5)
  }
  
  // Beast Barbarian Call the Hunt: CON mod cap means extra willing creatures do not add more temp HP
  run qa_call_the_hunt_cap_at_con_mod = {
    val conScore = 14 // CON mod = +2; suppose 5 willing creatures are present
    val conMod = abilityModifier(conScore) // 2
    val willingCreatures = 5
    // Only CON mod creatures can accept; extra willing ones beyond the cap yield nothing
    val creaturesAccepting = intMin(willingCreatures, intMax(1, conMod)) // 2
    val tempHpGained = creaturesAccepting * 5 // 10, not 25
    val s0 = freshCreature(30)
    val s1 = pGrantTempHp(s0, tempHpGained, false)
    assert(s1.tempHp == 10)
  }
  
  // Beast Barbarian Call the Hunt: maximum possible temp HP at CON 20 is 25 (5 creatures × 5)
  run qa_call_the_hunt_max_temp_hp = {
    val conScore = 20 // CON mod = +5, the typical attainable cap
    val conMod = abilityModifier(conScore) // 5
    val creaturesAccepting = intMax(1, conMod) // 5
    val tempHpGained = creaturesAccepting * 5 // 25
    val s0 = freshCreature(200)
    val s1 = pGrantTempHp(s0, tempHpGained, false)
    assert(s1.tempHp == 25)
  }
}
