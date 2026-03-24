// Source: https://rpg.stackexchange.com/q/124764
module _qa_e2d0fdf3e35d60e4 {
  import dnd.* from "./dnd"

  // Maximilian's Earthen Grasp - can it attempt to restrain the same target multiple times?
  run qa_earthen_grasp_retarget_same_creature = {
    val strMod = abilityModifier(12)  // STR 12 -> +1
    val profBonus = proficiencyBonus(1)
    val dc = 14
  
    // Turn 1: creature succeeds STR save (roll 15: 15+1=16 >= 14) -> not restrained, unaffected
    val turn1SaveSucceeds = saveSucceeds(15, strMod, false, profBonus, 0, dc)
    val creatureAfterTurn1 = freshCreature(20)
  
    // Turn 2: same creature retargeted; fails STR save (roll 5: 5+1=6 < 14) -> 2d6 bludgeoning + restrained
    val turn2SaveFails = not(saveSucceeds(5, strMod, false, profBonus, 0, dc))
    val creatureAfterTurn2 = pApplyCondition(
      pTakeDamage(creatureAfterTurn1, 7, Bludgeoning, Set(), Set(), Set(), false),
      CRestrained
    )
  
    assert(
      turn1SaveSucceeds                    // first save succeeded
      and not(creatureAfterTurn1.restrained) // not restrained after successful save
      and turn2SaveFails                   // second attempt: save can independently fail
      and creatureAfterTurn2.restrained    // on second failure: restrained is applied
      and creatureAfterTurn2.hp == 13      // 2d6 (=7) bludgeoning damage applied
    )
  }
}
