// Source: https://rpg.stackexchange.com/q/192068
module _qa_c2021cc92015cd7f {
  import dnd.* from "./dnd"

  // Can a Wild Magic Sorcerer use Tides of Chaos to give another character advantage?
  run qa_tides_of_chaos_self_only = {
    // PHB p.103: "you can ... gain advantage" — Tides of Chaos is self-only; another creature never gains advantage from it.
    val dc = 15
    val abilityMod = 0
    // Sorcerer applies Tides of Chaos to own ability check: rolls 7 and 16, takes max (advantage)
    val sorcEffectiveRoll = intMax(7, 16)
    // Ally makes a normal check — does NOT receive advantage from sorcerer's Tides of Chaos
    val allyRoll = 7
    assert(
      checkSucceeds(sorcEffectiveRoll, abilityMod, NoneProf, 0, 0, dc) and
      not(checkSucceeds(allyRoll, abilityMod, NoneProf, 0, 0, dc))
    )
  }
}
