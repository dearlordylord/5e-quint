// Source: https://rpg.stackexchange.com/q/177646
module _qa_1931335c913e570d {
  import dnd.* from "./dnd"

  // Arcane Armor + Encumbrance variant: STR req removal only affects speed penalty, not encumbrance weight
  run qa_arcane_armor_str_req_speed_penalty = {
    // Without Arcane Armor: heavy armor with STR 15 req reduces speed by 10 if STR < 15
    val strScore = 10
    val armorState = WearingArmor(PLATE) // STR 15 req, base AC 18
    val penalty = armorSpeedPenalty(armorState, strScore)
    assert(penalty == 10)
  }
  
  // Arcane Armor removes the STR requirement: no speed penalty regardless of STR score
  run qa_arcane_armor_no_speed_penalty_without_str = {
    // Arcane Armor: treat strRequirement as 0 (requirement removed for wearer)
    val arcaneArmor: Armor = PLATE.with("strRequirement", 0)
    val armorState = WearingArmor(arcaneArmor)
    val strScore = 10 // well below normal STR 15 req
    val penalty = armorSpeedPenalty(armorState, strScore)
    assert(penalty == 0)
  }
  
  // Encumbrance variant replaces STR column; carrying capacity is still STR-based
  // A Medium creature with STR 10 can carry 150 lbs (10 * 15)
  run qa_encumbrance_carrying_capacity_str10 = {
    val cap = carryingCapacity(10, Medium)
    assert(cap == 150)
  }
  
  // Encumbrance variant: carrying capacity scales with STR, not armor type
  // STR 15 creature has 225 lb capacity — Arcane Armor (65 lb plate) fits within limit
  run qa_encumbrance_capacity_covers_plate_weight = {
    val cap = carryingCapacity(15, Medium)
    // Plate armor weighs 65 lbs (PHB table); well within 225 lb limit
    assert(cap == 225 and 65 < 225)
  }
  
  // Even STR 10 (low for plate) still has 150 lb capacity; plate at 65 lbs fits
  // DM ruling: if Arcane Armor doesn't count toward encumbrance, STR req is irrelevant
  run qa_arcane_armor_low_str_still_within_base_capacity = {
    val cap = carryingCapacity(10, Medium)
    // Plate is 65 lbs; even without the Arcane Armor exception, STR 10 can carry it
    assert(cap == 150 and 65 < 150)
  }
}
