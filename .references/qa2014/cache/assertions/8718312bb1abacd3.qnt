// Source: https://rpg.stackexchange.com/q/108695
module _qa_8718312bb1abacd3 {
  import dnd.* from "./dnd"

  // In D&D 5e is it possible to add a breastplate to leather armor for an AC bonus?
  run qa_leather_armor_sets_ac_not_bonus = {
    // Leather grants AC 11 — a fixed value, not an additive bonus
    val dexMod = 1
    assert(calculateAC(WearingArmor(LEATHER), dexMod, false, NoUnarmoredDefense, 0, 0) == 12)
  }
  
  // In D&D 5e is it possible to add a breastplate to leather armor for an AC bonus?
  run qa_breastplate_sets_ac_not_bonus = {
    // Breastplate grants AC 14 — a fixed value, dex capped at +2 for medium armor
    val dexMod = 3
    assert(calculateAC(WearingArmor(BREASTPLATE), dexMod, false, NoUnarmoredDefense, 0, 0) == 16)
  }
  
  // In D&D 5e is it possible to add a breastplate to leather armor for an AC bonus?
  run qa_only_one_armor_applies_no_stacking = {
    // ArmorState is a single value; armor pieces cannot be combined for additive AC
    // Breastplate alone (15) beats leather alone (12); they are exclusive choices
    val dexMod = 1
    val leatherAC    = calculateAC(WearingArmor(LEATHER),     dexMod, false, NoUnarmoredDefense, 0, 0)
    val breastplateAC = calculateAC(WearingArmor(BREASTPLATE), dexMod, false, NoUnarmoredDefense, 0, 0)
    assert(
      leatherAC == 12
      and breastplateAC == 15
      // Combined naive sum (11+14+dex) would be 27 — that value is never produced
      and breastplateAC != leatherAC + 15
      and breastplateAC > leatherAC
    )
  }
}
