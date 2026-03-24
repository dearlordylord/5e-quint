// Source: https://rpg.stackexchange.com/q/204658
module _qa_ff1ae501735a7db7 {
  import dnd.* from "./dnd"

  // Banishment as an escape route: incapacitation (Banishment) blocks actions but NOT movement — standing from prone costs movement, not an action
  run qa_banishment_incap_blocks_actions_not_movement = {
    // James in the demiplane: incapacitated by Banishment, prone (arrived prone from the table)
    val james = freshCreature(20)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISDirect))
  
    // pCanAct reflects incapacitation: James cannot take actions
    val cannotAct = not(pCanAct(james))
  
    // pStandFromProne is a movement operation (costs half speed), not gated on incapacitation
    val t0 = FRESH_TURN  // effectiveSpeed: 30, movementRemaining: 30
    val t1 = pStandFromProne(t0)
    val movementConsumed = t1.movementRemaining < t0.movementRemaining
  
    assert(cannotAct and movementConsumed)
  }
  
  // Banishment as an escape route: creature standing (not prone) in demiplane returns standing — condition state is preserved on reappearance
  run qa_banishment_standing_return_not_prone = {
    // James banished: incapacitated + prone
    val jamesInDemiplane = freshCreature(20)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISDirect))
  
    // In demiplane: spend movement to stand (half speed = 15ft of 30ft remaining)
    val t1 = pStandFromProne(FRESH_TURN)
    val standSucceeded = t1.movementRemaining < FRESH_TURN.movementRemaining
  
    // Standing removes prone; James remains incapacitated (banishment still active)
    val jamesStanding = pRemoveCondition(jamesInDemiplane, CProne)
    val stillIncap = isIncapacitated(jamesStanding)
  
    // Ally ends concentration — banishment ends, incapacitation source removed
    val jamesReturned = pRemoveCondition(jamesStanding, CIncapacitated)
  
    assert(
      standSucceeded
      and stillIncap
      and not(jamesReturned.prone)
      and not(isIncapacitated(jamesReturned))
    )
  }
}
