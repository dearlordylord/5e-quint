// Source: https://rpg.stackexchange.com/q/199160
module _qa_fdd0ee3062dcc3ba {
  import dnd.* from "./dnd"

  // Can a Battle Smith use Replicate Magical Item to grant their Steel Defender Plate Armor?
  run qa_steel_defender_plate_lacks_proficiency = {
    // Steel Defenders have no armor proficiency — wearing plate imposes disadvantage on STR/DEX checks, saves, and attack rolls
    val armorState = WearingArmor(PLATE)
    val noProfs: Set[ArmorCategory] = Set()
    assert(lacksArmorProficiency(armorState, noProfs))
  }
  
  // Can a Battle Smith use Replicate Magical Item to grant their Steel Defender Plate Armor?
  run qa_steel_defender_plate_str_requirement_speed_penalty = {
    // Plate requires STR 15; Steel Defender has STR 14, so it suffers the 10ft speed penalty
    val armorState = WearingArmor(PLATE)
    val strScore = 14
    assert(armorSpeedPenalty(armorState, strScore) == 10)
  }
  
  // Can a Battle Smith use Replicate Magical Item to grant their Steel Defender Plate Armor?
  run qa_plate_still_grants_ac18_without_prof = {
    // Even without proficiency, plate still calculates to AC 18 (heavy armor ignores DEX)
    val armorState = WearingArmor(PLATE)
    val dexMod = 2
    assert(calculateAC(armorState, dexMod, false, NoUnarmoredDefense, 0, 0) == 18)
  }
  
  // Can a Battle Smith use Replicate Magical Item to grant their Steel Defender Plate Armor?
  run qa_proficient_wearer_plate_no_penalty = {
    // A creature actually proficient in heavy armor wearing plate incurs no proficiency penalty
    val armorState = WearingArmor(PLATE)
    val profsWithHeavy: Set[ArmorCategory] = Set(HeavyArmor)
    assert(not(lacksArmorProficiency(armorState, profsWithHeavy)))
  }
}
