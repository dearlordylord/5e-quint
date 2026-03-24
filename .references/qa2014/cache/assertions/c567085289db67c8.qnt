// Source: https://rpg.stackexchange.com/q/209290
module _qa_c567085289db67c8 {
  import dnd.* from "./dnd"

  // Optimizing Animate Objects spell against nonmagical damage immunities: resistance halves BPS damage from non-silvered objects
  run qa_bps_resistance_halves_animate_objects_damage = {
    val c = freshCreature(20)
    // Animated (non-silvered) object slams creature with slashing resistance: damage halved
    val afterHit = pTakeDamage(c, 10, Slashing, Set(Slashing), Set(), Set(), false)
    assert(afterHit.hp == 15)
  }
  
  // Optimizing Animate Objects spell against nonmagical damage immunities: silvered object bypasses BPS resistance (full damage)
  run qa_silvered_animate_object_bypasses_bps_resistance = {
    val c = freshCreature(20)
    // Silvered animated dagger: resistance not in set → full damage lands
    val afterSilvered = pTakeDamage(c, 10, Slashing, Set(), Set(), Set(), false)
    assert(afterSilvered.hp == 10)
  }
  
  // Optimizing Animate Objects spell against nonmagical damage immunities: immunity blocks all damage (silvered does not help here)
  run qa_bps_immunity_negates_damage_entirely = {
    val c = freshCreature(20)
    val afterImmune = pTakeDamage(c, 10, Bludgeoning, Set(), Set(), Set(Bludgeoning), false)
    assert(afterImmune.hp == 20)
  }
  
  // Optimizing Animate Objects spell against nonmagical damage immunities: resistance vs no-resistance difference compounds across hits
  run qa_resistance_vs_silvered_cumulative_damage = {
    val c = freshCreature(100)
    // Three hits of 8 slashing, non-silvered (resistance applies): each hit = 4 damage
    val s1r = pTakeDamage(c,  8, Slashing, Set(Slashing), Set(), Set(), false)
    val s2r = pTakeDamage(s1r, 8, Slashing, Set(Slashing), Set(), Set(), false)
    val s3r = pTakeDamage(s2r, 8, Slashing, Set(Slashing), Set(), Set(), false)
    // Three hits of 8 slashing, silvered (no resistance): each hit = 8 damage
    val s1s = pTakeDamage(c,  8, Slashing, Set(), Set(), Set(), false)
    val s2s = pTakeDamage(s1s, 8, Slashing, Set(), Set(), Set(), false)
    val s3s = pTakeDamage(s2s, 8, Slashing, Set(), Set(), Set(), false)
    assert(
      s3r.hp == 88  // 100 - 3*4 = 88
      and s3s.hp == 76  // 100 - 3*8 = 76
      and s3s.hp < s3r.hp  // silvered strictly more effective
    )
  }
}
