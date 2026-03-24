// Source: https://rpg.stackexchange.com/q/191767
module _qa_b287295d2d0f6630 {
  import dnd.* from "./dnd"

  // Flying speed when under Etherealness spell?
  run qa_etherealness_vertical_movement_applies_to_flying = {
    // Etherealness imposes +1 extra foot for up/down movement on ALL locomotion types.
    // Modeled via pMovementCost: isClimbingOrSwimming=true captures the vertical-movement
    // extra-foot rule; hasRelevantSpeed=false because the spell restriction ignores speed
    // type (fly speed grants no exemption). Contrast: a climb/swim speed (hasRelevantSpeed=true)
    // normally waives the penalty — but under Etherealness the caller must pass false.
    val normallyExemptWithRelevantSpeed = pMovementCost(false, false, true, true, false)
    val etherealVerticalAnyLocomotion   = pMovementCost(false, false, true, false, false)
    assert(
      normallyExemptWithRelevantSpeed == 1  // relevant speed removes the extra-foot cost normally
      and etherealVerticalAnyLocomotion == 2 // Etherealness overrides: always costs extra foot up/down
    )
  }
}
