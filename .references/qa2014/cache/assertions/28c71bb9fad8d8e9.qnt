// Source: https://rpg.stackexchange.com/q/78773
module _qa_28c71bb9fad8d8e9 {
  import dnd.* from "./dnd"

  // How does Relentless Endurance interact with reduction of maximum hitpoints?
  // Killed outright (damage overflow >= maxHp) yields dead=true, not unconscious — Relentless Endurance only triggers when NOT killed outright
  run qa_killed_outright_is_dead_not_unconscious = {
    val creature = freshCreature(10)
    // 21 damage on 10 HP creature: overflow = 11 >= maxHp(10) → killed outright
    val after = pTakeDamage(creature, 21, Slashing, Set(), Set(), Set(), false)
    assert(after.dead and not(after.unconscious) and after.hp == 0)
  }
  
  // How does Relentless Endurance interact with reduction of maximum hitpoints?
  // Contrast: damage that drops to exactly 0 without overflow → unconscious/dying (NOT killed outright), the only case where Relentless Endurance would legally apply
  run qa_reduced_to_0_not_killed_outright_is_unconscious = {
    val creature = freshCreature(10)
    // 10 damage on 10 HP creature: newHp = 0, overflow = 0, 0 < maxHp(10) → unconscious, not dead
    val after = pTakeDamage(creature, 10, Slashing, Set(), Set(), Set(), false)
    assert(not(after.dead) and after.unconscious and after.hp == 0)
  }
}
