// Source: https://rpg.stackexchange.com/q/136670
module _qa_ee2f3ae47bc612fe {
  import dnd.* from "./dnd"

  // Is there any visible "signature" at the destination of a Teleport spell?
  // Accepted answer: no defined cue; use Intelligence (Arcana) to identify the magical effect.
  run qa_arcana_identifies_teleport_success = {
    // Arcana maps to Intelligence; a proficient character at level 5 can meet DC 15
    val intMod   = abilityModifier(16) // +3
    val pb       = proficiencyBonus(5) // +3
    val roll     = 12                  // 12 + 3 + 3 = 18 >= 15
    val dc       = 15
    assert(
      skillAbility(Arcana) == Int_
      and checkSucceeds(roll, intMod, Proficient, pb, 0, dc)
    )
  }
  
  // Is there any visible "signature" at the destination of a Teleport spell?
  // Without Arcana proficiency and low Intelligence the same check fails.
  run qa_arcana_identifies_teleport_failure = {
    val intMod = abilityModifier(10) // +0
    val pb     = proficiencyBonus(5) // +3 (unused: NoneProf)
    val roll   = 8                   // 8 + 0 + 0 = 8 < 15
    val dc     = 15
    assert(
      skillAbility(Arcana) == Int_
      and not(checkSucceeds(roll, intMod, NoneProf, pb, 0, dc))
    )
  }
}
