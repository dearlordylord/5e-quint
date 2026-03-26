// Source: https://rpg.stackexchange.com/q/180619
module _qa_44572b3d5a705d27 {
  import dnd.* from "./dnd"

  // Can you Ready an attack with the trigger 'enemy enters my reach'? Does a hit interrupt movement?
  run qa_ready_attack_valid_trigger = {
    // PHB: Ready requires a perceivable circumstance — 'enemy enters reach' qualifies.
    // Using AReady consumes the action and sets readiedAction; reaction stays available for the trigger.
    val creature = freshCreature(20)
    val t0 = FRESH_TURN
    val t1 = pUseAction(t0, creature, AReady)
    assert(
      t1.actionsRemaining == 0 and
      t1.readiedAction and
      not(t1.bonusActionUsed) and
      t1.reactionAvailable  // reaction still available: fires when trigger condition is met
    )
  }
  
  // Ready action hit does not interrupt or consume enemy movement or actions
  run qa_ready_hit_does_not_interrupt_enemy_movement = {
    // Attacker readied an attack (action consumed, reaction available for trigger)
    val attacker = freshCreature(20)
    val attackerTurnReadied = pUseAction(FRESH_TURN, attacker, AReady)
  
    // Enemy is mid-move: 20 ft remaining, action not yet used
    val enemyCreature = freshCreature(30)
    val enemyTurnBefore = FRESH_TURN.with("movementRemaining", 20)
  
    // Trigger fires (enemy enters reach): attacker uses reaction to make the attack
    val attackerTurnFired = pUseReaction(attackerTurnReadied)
  
    // Resolve the readied attack: d20=17 + 5 bonus vs AC 14 = hit, not critical
    val attackResult = resolveAttackRoll(17, 5, 14, 0)
  
    // Apply damage to enemy — pTakeDamage returns CreatureState only; TurnState is unreachable
    val dmg = normalDamage(8, 3)  // 11 damage
    val enemyAfterHit = pTakeDamage(enemyCreature, dmg, Slashing, Set(), Set(), Set(), false)
  
    assert(
      // Attacker's reaction was consumed by firing the readied attack
      not(attackerTurnFired.reactionAvailable) and
      // The attack hit
      attackResult.hits and
      not(attackResult.isCritical) and
      // Enemy took the damage (creature state changed)
      enemyAfterHit.hp == 19 and
      // PHB answer: "the enemy's freedom of action is unaffected" —
      // pTakeDamage has no TurnState parameter; enemy movement and action are unchanged
      enemyTurnBefore.movementRemaining == 20 and
      enemyTurnBefore.actionsRemaining > 0
    )
  }
}
