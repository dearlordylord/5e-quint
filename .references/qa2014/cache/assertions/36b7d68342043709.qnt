// Source: https://rpg.stackexchange.com/q/64893
module _qa_36b7d68342043709 {
  import dnd.* from "./dnd"

  // Alert feat's "can't be surprised" only governs the combat TurnState.surprised flag, not out-of-combat skill contests like pickpocketing
  run qa_alert_surprised_does_not_prevent_pickpocket = {
    // Alert benefit: not surprised in combat — modeled by surprised = false in TurnState
    val alertTurn = FRESH_TURN // FRESH_TURN has surprised: false
  
    // Pickpocket = attacker's Sleight of Hand vs target's passive Perception
    // Target (TEST_CONFIG): Wis 13 → mod 1, level 5 → prof +3, Perception proficient → passive = 14
    val targetWisMod = abilityModifier(13)
    val targetProfBonus = proficiencyBonus(5)
    val targetPassivePerc = passiveCheck(targetWisMod, Proficient, targetProfBonus, false, false)
  
    // Attacker Sleight of Hand: roll 10 + Dex mod 4 + prof 3 = 17
    val pickpocketTotal = 17
  
    // Contest resolves purely via skill totals — TurnState.surprised is irrelevant
    val result = contestWinner(pickpocketTotal, targetPassivePerc)
  
    assert(
      alertTurn.surprised == false  // Alert: cannot be surprised in combat
      and result == AWins           // yet the pickpocket contest still succeeds
    )
  }
}
