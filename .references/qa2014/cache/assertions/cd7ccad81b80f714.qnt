// Source: https://rpg.stackexchange.com/q/211649
module _qa_cd7ccad81b80f714 {
  import dnd.* from "./dnd"

  // A cart plows into a Monster. What damage was done to the Monster?
  // Seagoing vessel crash (GoS p.199): Large ship = 4d10 bludgeoning, DC 10 + ship STR mod.
  // Failed DEX save → creature takes full damage.
  run qa_vehicle_crash_failed_save_full_damage = {
    val shipStrMod = 4
    val crashDC = 10 + shipStrMod        // DC 14
    val dexMod = 2
    val d20Roll = 8                      // 8 + 2 = 10, fails DC 14
    val crashDamage = 22                 // pre-resolved 4d10
    val creature = freshCreature(50)
    val savePassed = saveSucceeds(d20Roll, dexMod, false, 2, 0, crashDC)
    val actualDamage = if (savePassed) crashDamage / 2 else crashDamage
    val s1 = pTakeDamage(creature, actualDamage, Bludgeoning, Set(), Set(), Set(), false)
    assert(not(savePassed) and s1.hp == 50 - 22)
  }
  
  // A cart plows into a Monster. What damage was done to the Monster?
  // Seagoing vessel crash (GoS p.199): Large ship = 4d10 bludgeoning, DC 14.
  // Successful DEX save → creature takes half damage.
  run qa_vehicle_crash_passed_save_half_damage = {
    val crashDC = 14
    val dexMod = 4
    val d20Roll = 15                     // 15 + 4 = 19, succeeds DC 14
    val crashDamage = 22                 // pre-resolved 4d10
    val creature = freshCreature(50)
    val savePassed = saveSucceeds(d20Roll, dexMod, false, 2, 0, crashDC)
    val actualDamage = if (savePassed) crashDamage / 2 else crashDamage
    val s1 = pTakeDamage(creature, actualDamage, Bludgeoning, Set(), Set(), Set(), false)
    assert(savePassed and s1.hp == 50 - 11)
  }
  
  // A cart plows into a Monster. What damage was done to the Monster?
  // Infernal War Machine Tormentor (BG:DiA p.218): DC 13 DEX save, 2d10 base;
  // already-prone target takes extra 2d10 on a failed save.
  run qa_vehicle_crushing_wheels_prone_extra_damage = {
    val crushDC = 13
    val dexMod = 1
    val d20Roll = 7                      // 7 + 1 = 8, fails DC 13
    val baseDamage = 11                  // pre-resolved 2d10
    val extraDamage = 11                 // pre-resolved extra 2d10 (already prone)
    val creature = pApplyCondition(freshCreature(50), CProne)
    val savePassed = saveSucceeds(d20Roll, dexMod, false, 2, 0, crushDC)
    val totalDamage = if (not(savePassed))
      (if (creature.prone) baseDamage + extraDamage else baseDamage)
    else
      (if (creature.prone) (baseDamage + extraDamage) / 2 else baseDamage / 2)
    val s1 = pTakeDamage(creature, totalDamage, Bludgeoning, Set(), Set(), Set(), false)
    assert(not(savePassed) and creature.prone and s1.hp == 50 - 22)
  }
}
