// Source: https://rpg.stackexchange.com/q/94004
module _qa_b0ff12835209f24d {
  import dnd.* from "./dnd"

  // Is a Rakshasa immune to Animate Objects? — nonmagical damage immunity blocks Animated Objects bludgeoning hits
  run qa_rakshasa_animated_objects_bludgeoning_immune = {
    // Animated Objects deal nonmagical damage; Rakshasa has immunity to
    // nonmagical bludgeoning/piercing/slashing (MM p.257).
    // Model the immunity set accordingly and verify 0 damage reaches the creature.
    val result = applyDamageModifiers(20, Bludgeoning, Set(Bludgeoning), Set(), Set())
    assert(result == 0)
  }
  
  // Is a Rakshasa immune to Animate Objects? — same immunity applies to piercing/slashing animated objects
  run qa_rakshasa_animated_objects_piercing_slashing_immune = {
    val piercingResult = applyDamageModifiers(15, Piercing, Set(Piercing), Set(), Set())
    val slashingResult = applyDamageModifiers(10, Slashing, Set(Slashing), Set(), Set())
    assert(piercingResult == 0 and slashingResult == 0)
  }
  
  // Is a Rakshasa immune to Animate Objects? — immune creature's HP is unchanged after a bludgeoning hit
  run qa_rakshasa_hp_unchanged_after_animated_objects_attack = {
    val startHp = 50
    val rakshasa = freshCreature(startHp)
    // Animated Objects attack roll hits, deals bludgeoning; immunity absorbs it all
    val s1 = pTakeDamage(rakshasa, 18, Bludgeoning, Set(), Set(), Set(Bludgeoning), false)
    assert(s1.hp == startHp)
  }
  
  // Is a Rakshasa immune to Animate Objects? — without immunity a non-Rakshasa creature DOES take the damage
  run qa_nonrakshasa_takes_animated_objects_damage = {
    val startHp = 50
    val commoner = freshCreature(startHp)
    // No immunity set: bludgeoning damage applies normally
    val s1 = pTakeDamage(commoner, 18, Bludgeoning, Set(), Set(), Set(), false)
    assert(s1.hp == startHp - 18)
  }
}
