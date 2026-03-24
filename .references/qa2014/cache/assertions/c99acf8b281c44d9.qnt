// Source: https://rpg.stackexchange.com/q/194808
module _qa_c99acf8b281c44d9 {
  import dnd.* from "./dnd"

  // Steel Wind Strike + Forcecage: cage mode has bars but does NOT block spell targeting (no TotalCover effect)
  run qa_forcecage_cage_mode_allows_spell_targeting = {
    // Cage mode ≠ total cover; creatures inside cage-mode Forcecage remain valid spell targets
    assert(canBeTargeted(NoCover) == true)
  }
  
  // Steel Wind Strike + Forcecage: box mode IS a solid barrier blocking all spells (TotalCover)
  run qa_forcecage_box_mode_blocks_targeting = {
    // Box mode is a solid barrier blocking any spells cast into or out of the area
    assert(canBeTargeted(TotalCover) == false)
  }
  
  // Steel Wind Strike + Forcecage: caster inside cage teleporting out must succeed a CHA save vs Forcecage DC
  run qa_forcecage_teleport_exit_cha_save_success = {
    // Roll 14, CHA mod +2, not proficient in CHA saves, DC 15: 14+2=16 >= 15 → succeeds → can exit
    val chaMod = abilityModifier(14)
    val profBonus = proficiencyBonus(5)
    val forcecageDC = 15
    val canExit = saveSucceeds(14, chaMod, false, profBonus, 0, forcecageDC)
    assert(canExit)
  }
  
  // Steel Wind Strike + Forcecage: on a failed CHA save the spell fails totally — caster stays inside
  run qa_forcecage_teleport_exit_cha_save_failure = {
    // Roll 5, CHA mod +2, not proficient in CHA saves, DC 15: 5+2=7 < 15 → fails → spell wasted, stays in cage
    val chaMod = abilityModifier(14)
    val profBonus = proficiencyBonus(5)
    val forcecageDC = 15
    val canExit = saveSucceeds(5, chaMod, false, profBonus, 0, forcecageDC)
    assert(not(canExit))
  }
}
