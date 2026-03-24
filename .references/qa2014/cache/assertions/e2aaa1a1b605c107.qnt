// Source: https://rpg.stackexchange.com/q/179064
module _qa_e2aaa1a1b605c107 {
  import dnd.* from "./dnd"

  // Does forbiddance have a distance limitation? — tunnel 5ft×7920ft=39,600 sq ft fits within the 40,000 sq ft cap
  run qa_forbiddance_tunnel_area_fits = {
    val tunnelWidthFt  = 5
    val tunnelLengthFt = 7920   // 1.5 miles
    val tunnelArea     = tunnelWidthFt * tunnelLengthFt
    val forbMaxArea    = 40000
    assert(tunnelArea == 39600 and tunnelArea <= forbMaxArea)
  }
  
  // Does forbiddance have a distance limitation? — no LOS required; a capable caster provides V/S/M components without sight of the far end
  run qa_forbiddance_no_los_needed_for_components = {
    // Forbiddance requires verbal + somatic + material; caster is alive, unimpaired, has free hand.
    // pCanProvideComponents has no line-of-sight parameter — encoding the rule that LOS is irrelevant.
    val cleric = freshCreature(30)
    assert(pCanProvideComponents(cleric, true, true, true))
  }
  
  // Does forbiddance have a distance limitation? — a blinded caster can still provide spell components (LOS/sight irrelevant)
  run qa_forbiddance_blinded_caster_still_casts = {
    val cleric = pApplyCondition(freshCreature(30), CBlinded)
    // Blinded affects attacks/checks but pCanProvideComponents only checks speech and free hand
    assert(pCanProvideComponents(cleric, true, true, true))
  }
}
