// Source: https://rpg.stackexchange.com/q/103503
module _qa_d327cb3f2dc01140 {
  import dnd.* from "./dnd"

  // War Caster: somatic components work with full hands, but material component access still requires a free hand (PHB 203)
  run qa_war_caster_somatic_not_material = {
    val creature = freshCreature(20)
    // Baseline: somatic with no free hand (no War Caster) — fails
    val noWarcasterFullHands = pCanProvideComponents(creature, false, true, false)
    // War Caster: model feat as hasFreeHand=true for somatic even with weapons/shield held
    val warcasterFullHands = pCanProvideComponents(creature, false, true, true)
    // Material components are NOT validated by pCanProvideComponents (caller responsibility per spec comment).
    // With no free hand and no V/S requirement the function still returns true,
    // demonstrating that M access is a separate caller-enforced concern — War Caster does not cover it.
    val materialIsCallerValidated = pCanProvideComponents(creature, false, false, false)
    assert(
      not(noWarcasterFullHands) and // somatic fails without free hand (no War Caster)
      warcasterFullHands and        // somatic succeeds when War Caster grants hasFreeHand for S
      materialIsCallerValidated     // M not blocked here; caller must still enforce free-hand rule for M
    )
  }
}
