// Source: https://rpg.stackexchange.com/q/83467
module _qa_3839f4cfee591266 {
  import dnd.* from "./dnd"

  // Can Scrying target a newly undead PC?
  run qa_scrying_zombie_is_valid_creature_target = {
    // Undead (animated zombie) is not dead=true in spec; a plain inert corpse is.
    // Scrying requires a creature — zombie qualifies, bare corpse does not.
    val zombie = freshCreature(30)
    val corpse  = freshCreature(30).with("dead", true).with("hp", 0)
    assert(not(zombie.dead) and corpse.dead)
  }
  
  // Can Scrying target a newly undead PC? — blood vial gives -10 to Wisdom save
  run qa_scrying_blood_sample_minus10_penalty = {
    // PHB Scrying: "body part, lock of hair, bit of nail, or the like" -> -10 to save.
    // Blood from original creature counts even after creature became undead.
    // Target: Wis mod +2, non-proficient; caster spell save DC 15; d20 roll = 14.
    //   with blood vial (-10 misc): 14 + 2 - 10 = 6 < 15  => fails save (Scrying succeeds)
    //   without blood vial (0 misc): 14 + 2 + 0 = 16 >= 15 => passes save (Scrying blocked)
    val wisMod  = 2
    val profBon = 3
    val dc      = 15
    val roll    = 14
    val withBlood    = saveSucceeds(roll, wisMod, false, profBon, -10, dc)
    val withoutBlood = saveSucceeds(roll, wisMod, false, profBon,   0, dc)
    assert(not(withBlood) and withoutBlood)
  }
}
