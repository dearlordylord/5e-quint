// Source: https://rpg.stackexchange.com/q/122676
module _qa_cac4566cadd5fb7a {
  import dnd.* from "./dnd"

  // How much control does an Unconscious caster maintain over his familiar? — unconscious implies incapacitated
  run qa_unconscious_caster_is_incapacitated = {
    val s = pApplyCondition(freshCreature(20), CUnconscious)
    assert(isIncapacitated(s))
  }
  
  // How much control does an Unconscious caster maintain over his familiar? — incapacitated creature cannot act (no spell casting, no familiar delivery)
  run qa_unconscious_caster_cannot_act = {
    val s = pApplyCondition(freshCreature(20), CUnconscious)
    assert(not(pCanAct(s)))
  }
  
  // How much control does an Unconscious caster maintain over his familiar? — unconscious creature cannot speak (telepathic bond one-sided: can't command familiar)
  run qa_unconscious_caster_cannot_speak = {
    val s = pApplyCondition(freshCreature(20), CUnconscious)
    assert(not(pCanSpeak(s)))
  }
  
  // How much control does an Unconscious caster maintain over his familiar? — unconscious implies prone (creature is physically passed out)
  run qa_unconscious_caster_is_prone = {
    val s = pApplyCondition(freshCreature(20), CUnconscious)
    assert(s.prone)
  }
}
