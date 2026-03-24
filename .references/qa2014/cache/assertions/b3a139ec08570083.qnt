// Source: https://rpg.stackexchange.com/q/154192
module _qa_b3a139ec08570083 {
  import dnd.* from "./dnd"

  // Is a Centaur PC considered an animal when calculating carrying capacity for vehicles?
  // Accepted answer: yes; Equine Build (counts as one size larger) applies to vehicle-pulling rule (5× carrying capacity)
  run qa_centaur_vehicle_pulling_capacity = {
    val strScore = 18
    // Equine Build (GGtR p.16): Medium Centaur counts as Large for carrying capacity
    val centaurEffectiveCarry = carryingCapacity(strScore, Large)
    // PHB p.155: animal pulling vehicle = 5 × base carrying capacity
    val centaurVehiclePull = centaurEffectiveCarry * 5
    // 18 × 15 = 270 (Medium base), × 2 (Large multiplier) = 540, × 5 = 2700 lbs
    val normalMediumVehiclePull = carryingCapacity(strScore, Medium) * 5
    assert(
      centaurEffectiveCarry == 540 and       // Large: base × 2
      centaurVehiclePull == 2700 and         // 5× the Equine-Build-adjusted capacity
      centaurVehiclePull == normalMediumVehiclePull * 2  // double a normal Medium creature
    )
  }
}
