// Source: https://rpg.stackexchange.com/q/184124
module _qa_816305c9eabedc5d {
  import dnd.* from "./dnd"

  // Summon Greater Demon: Can I summon a specific demon for which I know the true name?
  // True name known → disadvantage on the demon's Charisma saving throw (PHB spell description).
  // Disadvantage: roll 2d20 and take the lower. Without true name: single straight roll.
  run qa_true_name_disadvantage_on_charisma_save = {
    val dc       = 13  // example caster spell save DC (8 + spellcasting bonus 5)
    val chaMod   = 0   // demon's Charisma modifier
    val profBonus = 2  // demon's proficiency bonus (CR-based)
    // No true name: straight roll of 15 — 15 + 0 >= 13, save succeeds
    val noTrueName = saveSucceeds(15, chaMod, false, profBonus, 0, dc)
    // True name known: disadvantage → take min(15, 8) = 8 — 8 + 0 < 13, save fails
    val withTrueName = saveSucceeds(8, chaMod, false, profBonus, 0, dc)
    assert(noTrueName and not(withTrueName))
  }
}
