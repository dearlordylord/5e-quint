// Source: https://rpg.stackexchange.com/q/104204
module _qa_43274d280eff6c39 {
  import dnd.* from "./dnd"

  // Does the Wild Magic Sorcerer's surge casting of Fireball affect the Sorcerer as well?
  // Sphere AoE point of origin is included → caster takes Fireball damage. Failed save → instant death (7 HP).
  run qa_fireball_caster_in_aoe_fails_save_instant_death = {
    val sorcerer = freshCreature(7)
    // Level 1, DEX +2, not proficient in DEX saves, DC 13; roll 8 → 10, fails
    val saveRoll = 8
    val dexMod = 2
    val savePassed = saveSucceeds(saveRoll, dexMod, false, proficiencyBonus(1), 0, 13)
    val damage = if (savePassed) 28 / 2 else 28
    val afterDamage = pTakeDamage(sorcerer, damage, Fire, Set(), Set(), Set(), false)
    assert(
      not(savePassed)
      and damage == 28
      and afterDamage.dead
      and afterDamage.hp == 0
    )
  }
  
  // Does the Wild Magic Sorcerer's surge casting of Fireball affect the Sorcerer as well?
  // Caster in own sphere AoE: succeeds save → half damage (14) → 0 HP unconscious, making death saves (9 HP).
  run qa_fireball_caster_in_aoe_succeeds_save_death_saves = {
    val sorcerer = freshCreature(9)
    // Roll 15 → 17, succeeds DC 13
    val saveRoll = 15
    val dexMod = 2
    val savePassed = saveSucceeds(saveRoll, dexMod, false, proficiencyBonus(1), 0, 13)
    val damage = if (savePassed) 28 / 2 else 28
    val afterDamage = pTakeDamage(sorcerer, damage, Fire, Set(), Set(), Set(), false)
    assert(
      savePassed
      and damage == 14
      and afterDamage.hp == 0
      and afterDamage.unconscious
      and not(afterDamage.dead)
    )
  }
  
  // Does the Wild Magic Sorcerer's surge casting of Fireball affect the Sorcerer as well?
  // Fire resistance + successful save: 28 → half (save) → 14 → half (resist) → 7; 9 HP caster survives with 2 HP.
  run qa_fireball_caster_fire_resistant_succeeds_save_survives = {
    val sorcerer = freshCreature(9)
    val saveRoll = 15
    val dexMod = 2
    val savePassed = saveSucceeds(saveRoll, dexMod, false, proficiencyBonus(1), 0, 13)
    val damageAfterSave = if (savePassed) 28 / 2 else 28
    // resistance applied inside pTakeDamage
    val afterDamage = pTakeDamage(sorcerer, damageAfterSave, Fire, Set(Fire), Set(), Set(), false)
    assert(
      savePassed
      and afterDamage.hp == 2
      and not(afterDamage.dead)
      and not(afterDamage.unconscious)
    )
  }
}
