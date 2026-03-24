module _qa_8a5f92d4fd5fcfb0 {
  import dnd.* from "./dnd"

  // Grapple + Totemic Attunement (Eagle): grappler's speed halved when dragging a grappled creature
  run qa_grapple_fly_speed_halved_when_dragging = {
    val t = pStartTurn(TEST_CONFIG, freshCreature(20), Unarmored, false, 0, true, false)
    assert(t.movementRemaining == 15)
  }
  
  // Grapple + Totemic Attunement (Eagle): 15ft height yields only 1d6 fall damage die (floor(15/10)=1)
  run qa_grapple_fly_fall_dice_count_15ft = {
    assert(pFallingDamageDice(15) == 1)
  }
  
  // Grapple + Totemic Attunement (Eagle): falling creature (grappled target) takes damage and lands prone
  run qa_grapple_fly_target_takes_fall_damage_and_prone = {
    val target = freshCreature(20)
    val s1 = pApplyFall(target, 5, Set(), Set(), Set())
    assert(s1.prone and s1.hp == 15)
  }
  
  // Grapple + Totemic Attunement (Eagle): grappler also takes fall damage and lands prone
  run qa_grapple_fly_grappler_takes_fall_damage_and_prone = {
    val grappler = freshCreature(20)
    val s1 = pApplyFall(grappler, 5, Set(), Set(), Set())
    assert(s1.prone and s1.hp == 15)
  }
  
  // Grapple + Totemic Attunement (Eagle): successful grapple applies Grappled condition to target
  run qa_grapple_fly_successful_grapple_applies_condition = {
    val target = freshCreature(20)
    val result = pGrapple(Medium, Medium, target, AWins, true)
    assert(result.success and result.targetState.grappled)
  }
  
  // Grapple + Totemic Attunement (Eagle): grappled creature's own speed is 0 (cannot move itself)
  run qa_grapple_fly_grappled_victim_speed_zero = {
    val victim = freshCreature(20).with("grappled", true)
    val t = pStartTurn(TEST_CONFIG, victim, Unarmored, false, 0, false, false)
    assert(t.movementRemaining == 0)
  }
}
