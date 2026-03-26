// Source: https://rpg.stackexchange.com/q/150355
module _qa_62e98f5b6a2c6085 {
  import dnd.* from "./dnd"

  // Q: How often can a PC check with passive perception during a combat turn?
  // A: Passive Perception is a static formula (10 + mod + prof), not a rollable check; active Perception requires the Search action and is limited to once per turn.
  
  // Passive Perception is a fixed baseline — same value every time, no dice involved
  run qa_passive_perception_is_static_baseline = {
    val dexMod    = abilityModifier(12)     // score 12 → +1
    val profBonus = proficiencyBonus(5)     // level 5  → +3
    val pp = passiveCheck(dexMod, Proficient, profBonus, false, false)
    assert(pp == 14)                        // 10 + 1 + 3 = 14, identical on every "check"
  }
  
  // Active Perception (Search action) consumes the creature's one action for the turn
  run qa_active_perception_search_uses_action = {
    val creature = freshCreature(10)
    val t1 = pUseAction(FRESH_TURN, creature, ASearch)
    assert(t1.actionsRemaining == 0)
  }
  
  // Once the action is spent, a second Search attempt is silently blocked — only one per turn
  run qa_active_perception_only_once_per_turn = {
    val creature = freshCreature(10)
    val t1 = pUseAction(FRESH_TURN, creature, ASearch)
    val t2 = pUseAction(t1, creature, ASearch)  // second attempt with action already used
    assert(t1 == t2)
  }
  
  // Passive Perception advantage adds exactly +5 (PHB rule), still no dice — it's a fixed modifier
  run qa_passive_perception_advantage_adds_5 = {
    val dexMod    = abilityModifier(14)     // score 14 → +2
    val profBonus = proficiencyBonus(5)     // level 5  → +3
    val ppNormal    = passiveCheck(dexMod, Proficient, profBonus, false, false)  // 15
    val ppAdvantage = passiveCheck(dexMod, Proficient, profBonus, true,  false)  // 20
    assert(ppAdvantage == ppNormal + 5)
  }
}
