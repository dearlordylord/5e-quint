// Source: https://rpg.stackexchange.com/q/197040
module _qa_3c7711c15fc05377 {
  import dnd.* from "./dnd"

  // Can a level 6 draconic sorcerer add their Charisma modifier to Chaos Bolt?
  run qa_elemental_affinity_requires_matching_damage_type = {
    val chaMod       = 3                         // CHA 16 → +3 modifier
    val ancestryType: DamageType = Lightning      // Blue Dragon ancestry
    val diceRoll     = 8                          // 2d8 Chaos Bolt result
  
    // Elemental Affinity: bonus applies only when actual damage type equals ancestry type
    val affinityMod_lightning = if (Lightning == ancestryType) chaMod else 0
    val affinityMod_fire      = if (Fire      == ancestryType) chaMod else 0
  
    // Chaos Bolt deals lightning → affinity triggers, CHA mod added
    val dmgLightning = normalDamage(diceRoll, affinityMod_lightning)
    // Chaos Bolt deals fire → affinity does not trigger, no CHA mod
    val dmgFire      = normalDamage(diceRoll, affinityMod_fire)
  
    assert(
      dmgLightning == diceRoll + chaMod and  // matching type: bonus applied
      dmgFire      == diceRoll               // non-matching type: no bonus
    )
  }
}
