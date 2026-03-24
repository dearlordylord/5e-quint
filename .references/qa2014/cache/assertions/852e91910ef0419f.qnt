// Source: https://rpg.stackexchange.com/q/168379
module _qa_852e91910ef0419f {
  import dnd.* from "./dnd"

  // What ability check is most appropriate for disarming a weapon from a grappled/prone creature?
  
  // Prone target within 5ft gives attacker advantage on disarm attack roll (DMG p.271 + prone rules)
  run qa_disarm_prone_within5ft_grants_attacker_advantage = {
    val target = freshCreature(20).with("prone", true)
    val defMods = pDefenseModifiers(target, true)
    assert(defMods.attackerAdvantage == true)
  }
  
  // Grappled condition alone grants no advantage/disadvantage to the disarmer's attack roll
  run qa_disarm_grappled_alone_no_attack_modifier = {
    val target = freshCreature(20).with("grappled", true)
    val defMods = pDefenseModifiers(target, true)
    assert(defMods.attackerAdvantage == false and defMods.attackerDisadvantage == false)
  }
  
  // Exact Q&A scenario: prone+grappled within 5ft — advantage from prone, grappled adds nothing
  run qa_disarm_prone_and_grappled_advantage_from_prone_only = {
    val target = freshCreature(20).with("prone", true).with("grappled", true)
    val defMods = pDefenseModifiers(target, true)
    assert(defMods.attackerAdvantage == true and defMods.autoCrit == false)
  }
  
  // DMG p.271 contest: attacker's attack roll beats defender's Str(Athletics) -> disarm succeeds
  run qa_disarm_contest_attack_beats_athletics = {
    val attackTotal = 18   // d20 roll + attack bonus
    val athleticsTotal = 13  // d20 roll + Str mod + prof bonus
    assert(contestWinner(attackTotal, athleticsTotal) == AWins)
  }
  
  // DMG p.271 contest: defender's Dex(Acrobatics) beats attacker's roll -> disarm fails
  run qa_disarm_contest_acrobatics_beats_attack = {
    val attackTotal = 11
    val acrobaticsTotal = 16
    assert(contestWinner(attackTotal, acrobaticsTotal) == BWins)
  }
  
  // DMG p.271 contest: tie = status quo, disarm does not succeed
  run qa_disarm_contest_tie_no_disarm = {
    assert(contestWinner(14, 14) == Tie)
  }
}
