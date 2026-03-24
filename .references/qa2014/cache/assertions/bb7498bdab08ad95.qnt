// Source: https://rpg.stackexchange.com/q/165592
module _qa_bb7498bdab08ad95 {
  import dnd.* from "./dnd"

  // If an artillerist-artificer has 2 protectors, does the temporary hp given by the protectors stack?
  run qa_protector_temp_hp_no_stack_takes_new = {
    // Two Protector cannons each create a separate temp HP pool; recipient picks one — never sums them.
    val cannon1Roll = 6  // first cannon: 1d8 + Int = 6
    val cannon2Roll = 9  // second cannon: 1d8 + Int = 9
    val creature = freshCreature(20)
    val after1 = pGrantTempHp(creature, cannon1Roll, false)
    // Second cannon fires; creature chooses the larger new pool (replaces old)
    val after2 = pGrantTempHp(after1, cannon2Roll, false)
    assert(
      after2.tempHp == cannon2Roll and
      after2.tempHp != cannon1Roll + cannon2Roll
    )
  }
  
  // If an artillerist-artificer has 2 protectors, does the temporary hp given by the protectors stack?
  run qa_protector_temp_hp_no_stack_keeps_old = {
    // When first cannon's pool is larger, creature keeps it rather than replacing with smaller second pool.
    val cannon1Roll = 9  // first cannon: 1d8 + Int = 9
    val cannon2Roll = 4  // second cannon: 1d8 + Int = 4
    val creature = freshCreature(20)
    val after1 = pGrantTempHp(creature, cannon1Roll, false)
    // Second cannon fires lower value; creature keeps the better (old) pool
    val after2 = pGrantTempHp(after1, cannon2Roll, true)
    assert(
      after2.tempHp == cannon1Roll and
      after2.tempHp != cannon1Roll + cannon2Roll
    )
  }
  
  // If an artillerist-artificer has 2 protectors, does the temporary hp given by the protectors stack?
  run qa_protector_temp_hp_never_sum = {
    // Regardless of which pool the creature picks, the result is always one pool, never both summed.
    val cannon1Roll = 7
    val cannon2Roll = 7  // equal rolls: either way, result is 7, never 14
    val creature = freshCreature(20)
    val after1 = pGrantTempHp(creature, cannon1Roll, false)
    val afterKeepOld = pGrantTempHp(after1, cannon2Roll, true)
    val afterTakeNew = pGrantTempHp(after1, cannon2Roll, false)
    assert(
      afterKeepOld.tempHp == cannon1Roll and
      afterTakeNew.tempHp == cannon2Roll and
      afterKeepOld.tempHp != cannon1Roll + cannon2Roll and
      afterTakeNew.tempHp != cannon1Roll + cannon2Roll
    )
  }
}
