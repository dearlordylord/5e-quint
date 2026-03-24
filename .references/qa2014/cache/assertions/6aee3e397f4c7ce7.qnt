// Source: https://rpg.stackexchange.com/q/190849
module _qa_6aee3e397f4c7ce7 {
  import dnd.* from "./dnd"

  // What happens to breastplate Armor when chosen as Armorer Artificer's Arcane Armor?
  run qa_arcane_armor_breastplate_retains_medium_category = {
    // Arcane Armor only applies its listed benefits; breastplate is still MediumArmor, not HeavyArmor
    assert(BREASTPLATE.category == MediumArmor)
  }
  
  // What happens to breastplate Armor when chosen as Armorer Artificer's Arcane Armor?
  run qa_arcane_armor_breastplate_no_stealth_disadvantage = {
    // Breastplate retains its original stealthDisadvantage: false — Arcane Armor does not add it
    assert(BREASTPLATE.stealthDisadvantage == false)
  }
  
  // What happens to breastplate Armor when chosen as Armorer Artificer's Arcane Armor?
  run qa_arcane_armor_breastplate_retains_base_ac = {
    // Breastplate baseAC stays 14, not 18 (full plate); Arcane Armor does not change the AC value
    assert(BREASTPLATE.baseAC == 14)
  }
  
  // What happens to breastplate Armor when chosen as Armorer Artificer's Arcane Armor?
  run qa_arcane_armor_breastplate_uses_dex_capped_at_2 = {
    // MediumArmor adds DEX mod capped at +2; breastplate does NOT become HeavyArmor (which ignores DEX)
    val dexMod = 3 // e.g. DEX 16
    val acBreastplate = calculateAC(WearingArmor(BREASTPLATE), dexMod, false, NoUnarmoredDefense, 0, 0)
    val acPlate      = calculateAC(WearingArmor(PLATE),       dexMod, false, NoUnarmoredDefense, 0, 0)
    // breastplate: 14 + min(3,2) = 16; full plate (HeavyArmor): 18 + 0 = 18
    assert(acBreastplate == 16 and acPlate == 18)
  }
}
