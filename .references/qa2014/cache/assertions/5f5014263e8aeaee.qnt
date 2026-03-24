// Source: https://rpg.stackexchange.com/q/213750
module _qa_5f5014263e8aeaee {
  import dnd.* from "./dnd"

  // Is a Cleric multiclass the only way to gain Heavy Armor proficiency with a 1 level dip?
  run qa_fighter_multiclass_dip_no_heavy_armor = {
    // PHB 2024: multiclassing into Fighter grants only Light + Medium armor, not Heavy
    val sorcererFighterProfs = Set(LightArmor, MediumArmor)
    assert(lacksArmorProficiency(WearingArmor(PLATE), sorcererFighterProfs))
  }
  
  // Is a Cleric multiclass the only way to gain Heavy Armor proficiency with a 1 level dip?
  run qa_paladin_multiclass_dip_no_heavy_armor = {
    // PHB 2024: multiclassing into Paladin grants only Light + Medium armor + Shields, not Heavy
    val sorcererPaladinProfs = Set(LightArmor, MediumArmor)
    assert(lacksArmorProficiency(WearingArmor(PLATE), sorcererPaladinProfs))
  }
  
  // Is a Cleric multiclass the only way to gain Heavy Armor proficiency with a 1 level dip?
  run qa_cleric_protector_dip_grants_heavy_armor = {
    // PHB 2024: Cleric (Protector Divine Order) grants Heavy Armor proficiency at 1st level
    val sorcererClericProtectorProfs = Set(LightArmor, MediumArmor, HeavyArmor)
    assert(not(lacksArmorProficiency(WearingArmor(PLATE), sorcererClericProtectorProfs)))
  }
  
  // Is a Cleric multiclass the only way to gain Heavy Armor proficiency with a 1 level dip?
  run qa_cleric_multiclass_prereq_wis_13 = {
    // PHB 2024: Cleric multiclass requires WIS 13; a Sorcerer with WIS 13 can qualify
    val sorcererScores = Map(Str -> 10, Dex -> 8, Con -> 14, Int_ -> 10, Wis -> 13, Cha -> 16)
    assert(pMeetsMulticlassPrereq(sorcererScores, Cleric))
  }
}
