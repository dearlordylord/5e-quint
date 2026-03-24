module _qa_7b03b56687f5f422 {
  import dnd.* from "./dnd"

  // How to swap a class level for another class — no RAW swap mechanism; PHB Ch6 multiclassing only adds new class levels, prereqs still apply
  run qa_no_class_level_swap = {
    // PHB Ch6: there is no mechanism to replace already-taken class levels.
    // The only RAW option is to ADD Paladin as a third class, which requires
    // meeting both Sorcerer (CHA >= 13) and Paladin (STR >= 13 AND CHA >= 13) prereqs.
    // A typical CHA-focused Sorcerer/Bard with low STR fails Paladin's prereq entirely.
    val sorc_bard_low_str  = Map(Str -> 10, Dex -> 12, Con -> 12, Int_ -> 10, Wis -> 8, Cha -> 16)
    val sorc_bard_meet_str = Map(Str -> 13, Dex -> 12, Con -> 12, Int_ -> 10, Wis -> 8, Cha -> 16)
    assert(
      not(pCanMulticlass(sorc_bard_low_str,  Sorcerer, Paladin)) and
          pCanMulticlass(sorc_bard_meet_str, Sorcerer, Paladin)
    )
  }
}
