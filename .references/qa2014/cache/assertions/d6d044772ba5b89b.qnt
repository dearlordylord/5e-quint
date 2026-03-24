// Source: https://rpg.stackexchange.com/q/129161
module _qa_d6d044772ba5b89b {
  import dnd.* from "./dnd"

  // Do attacks from Bag of Tricks creatures count as magical?
  run qa_bag_of_tricks_attack_is_nonmagical = {
    // Giant Boar summoned by Bag of Tricks is not a magic item; its Tusk
    // (slashing) attack is nonmagical. Ghost's resistance to nonmagical
    // slashing therefore applies and halves the damage.
    val ghost = freshCreature(45)
    val rawDamage = 10  // pre-resolved 2d6+3 tusk damage
    // Nonmagical attack: Ghost's slashing resistance applies (Set(Slashing))
    val ghostAfter = pTakeDamage(ghost, rawDamage, Slashing, Set(Slashing), Set(), Set(), false)
    assert(ghostAfter.hp == 40)  // 45 - (10 / 2) = 40; resistance halves nonmagical slashing
  }
}
