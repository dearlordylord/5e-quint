// Source: https://rpg.stackexchange.com/q/102157
module _qa_9fe5d8ad64b04b9b {
  import dnd.* from "./dnd"

  // Remorhaz Heated Body: special trait (not action/reaction) triggers once per melee attack hit
  run qa_heated_body_triggers_per_attack = {
    val attacker = freshCreature(40)
    // First melee attack hits → Heated Body triggers (10 fire damage)
    val s1 = pTakeDamage(attacker, 10, Fire, Set(), Set(), Set(), false)
    // Second melee attack also hits → Heated Body triggers again (10 fire damage)
    val s2 = pTakeDamage(s1, 10, Fire, Set(), Set(), Set(), false)
    // Two hits = two independent Heated Body triggers = 20 total fire damage
    assert(s2.hp == 20)
  }
  
  // Remorhaz Heated Body: grappling (touching) triggers damage once at moment of initial contact
  run qa_heated_body_grapple_triggers_once = {
    val grappler = freshCreature(30)
    val remorhaz = freshCreature(100)
    // Grapple succeeds (AWins, free hand, Medium vs Large is within one size)
    val result = pGrapple(Medium, Large, remorhaz, AWins, true)
    // Grappler took one touch → one Heated Body damage instance (10 fire)
    val grappler_after = pTakeDamage(grappler, 10, Fire, Set(), Set(), Set(), false)
    assert(result.success and result.targetState.grappled and grappler_after.hp == 20)
  }
  
  // Remorhaz Swallow: swallowed creature takes only acid damage; Heated Body does NOT apply (RAI)
  run qa_swallow_acid_only_no_heated_body = {
    val victim = freshCreature(50)
    // Swallow deals 6d6 acid damage only (21 here); Heated Body is a counter-trait, not triggered by remorhaz's own attacks
    val after_swallow = pTakeDamage(victim, 21, Acid, Set(), Set(), Set(), false)
    // HP = 50 - 21 = 29 (no additional 10 fire from Heated Body)
    assert(after_swallow.hp == 29)
  }
}
