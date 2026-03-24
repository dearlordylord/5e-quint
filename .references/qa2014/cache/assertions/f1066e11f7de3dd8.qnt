// Source: https://rpg.stackexchange.com/q/173790
module _qa_f1066e11f7de3dd8 {
  import dnd.* from "./dnd"

  // Is there a minimum intelligence score needed to make use of non-natural abilities?
  run qa_fly_speed_works_regardless_of_intelligence = {
    // Accepted answer: things do what they say they do — a granted fly speed (e.g. Potion of Flying)
    // requires no minimum INT; pUseMovement has no ability-score gate, only movement budget.
    // Ant-polymorphed character has fly 60ft from potion; can consume all of it.
    val flyTurn: TurnState = FRESH_TURN
      .with("movementRemaining", 60)
      .with("effectiveSpeed", 60)
    val afterMove = pUseMovement(flyTurn, 60, 1)
    assert(afterMove.movementRemaining == 0)
  }
}
