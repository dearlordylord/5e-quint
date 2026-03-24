// Source: https://rpg.stackexchange.com/q/210563
module _qa_f1edce4e63ad967f {
  import dnd.* from "./dnd"

  // Can you use Transmuted Spell on spells with a duration? (transmutation applies to all damage over full duration)
  run qa_transmuted_spell_full_duration = {
    // Flame Blade: concentration spell, normally deals Fire damage each time you attack with it.
    // Transmuted Spell is chosen at cast time; accepted answer confirms it applies
    // to ALL damage rolls over the full duration, not just the first hit.
    // Model: target has Fire immunity. Transmuting to Cold at cast time means
    // every attack during the concentration bypasses Fire immunity.
    val target = freshCreature(30)
    val fireImmune: Set[DamageType] = Set(Fire)
    val noMods: Set[DamageType] = Set()
  
    // Sanity: un-transmuted Flame Blade (Fire) is fully blocked by Fire immunity
    val afterFireHit = pTakeDamage(target, 9, Fire, noMods, noMods, fireImmune, false)
  
    // Transmuted at cast (Cold): hit 1 in round 1 of concentration
    val afterColdHit1 = pTakeDamage(target, 9, Cold, noMods, noMods, fireImmune, false)
    // Same concentration still active: hit 2 in round 2 — transmutation persists for full duration
    val afterColdHit2 = pTakeDamage(afterColdHit1, 9, Cold, noMods, noMods, fireImmune, false)
  
    assert(
      afterFireHit.hp == target.hp         // fire damage blocked by immunity (baseline)
      and afterColdHit1.hp < target.hp     // transmuted (cold) hit 1 bypasses fire immunity
      and afterColdHit2.hp < afterColdHit1.hp  // transmuted (cold) hit 2 also bypasses — full duration
    )
  }
}
