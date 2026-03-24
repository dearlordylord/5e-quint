// Source: https://rpg.stackexchange.com/q/211655
module _qa_8f123942f3042d07 {
  import dnd.* from "./dnd"

  // Do bards have to make sounds to cast spells? — only listed V component creates sound requirement
  run qa_bard_no_verbal_no_sound_required = {
    // Bard casting True Strike (S only) or Catnap (S+M): no V component = no sound required.
    // Bard flavor text is not a mechanical component; pCanProvideComponents only checks V/S/M flags.
    val bard = freshCreature(20)
    // S-only spell (no verbal): bard with free hand can cast silently
    val canCastSOnly = pCanProvideComponents(bard, false, true, true)
    // S-only spell without free hand: blocked by somatic, not by absence of sound
    val blockedByNoHand = not(pCanProvideComponents(bard, false, true, false))
    // V spell: requires ability to speak; paralyzed bard cannot cast it
    val bardParalyzed = freshCreature(20)
      .with("paralyzed", true)
      .with("incapacitatedSources", Set(ISParalyzed))
    val cantCastVerbalWhenParalyzed = not(pCanProvideComponents(bardParalyzed, true, false, true))
    // V spell: conscious bard can still cast it (speaking is fine)
    val canCastVerbalWhenConscious = pCanProvideComponents(bard, true, false, true)
    assert(canCastSOnly and blockedByNoHand and cantCastVerbalWhenParalyzed and canCastVerbalWhenConscious)
  }
}
