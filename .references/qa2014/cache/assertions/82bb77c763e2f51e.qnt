// Source: https://rpg.stackexchange.com/q/91356
module _qa_82bb77c763e2f51e {
  import dnd.* from "./dnd"

  // Melee with AOE-impacted enemy: only creature in Moonbeam AOE takes radiant damage; adjacent melee attacker outside AOE takes none
  run qa_aoe_melee_attacker_outside_takes_no_damage = {
    // Creature inside Moonbeam starts its turn in the AOE - takes radiant damage (failed CON save, 2d10=10)
    val insideCreature = freshCreature(20)
    val insideAfterAoe = pTakeDamage(insideCreature, 10, Radiant, Set(), Set(), Set(), false)
  
    // Creature outside Moonbeam is adjacent but NOT in the AOE area - takes zero radiant damage
    // (AOE triggers on entering/starting turn in the area, not on being adjacent or swinging a weapon in)
    val outsideCreature = freshCreature(20)
    val outsideTurn = FRESH_TURN
    val outsideTurnAfterAttack = pUseAction(outsideTurn, outsideCreature, AAttack)
  
    // Resolve melee attack from outside-AOE attacker against inside-AOE target: d20=15 + STR mod +2 = 17 vs AC 13 → hits
    val attackResult = resolveAttackRoll(15, 2, 13, 0)
  
    assert(
      insideAfterAoe.hp == 10              // Inside creature: 20 - 10 = 10 HP after AOE radiant damage
      and outsideCreature.hp == 20         // Outside attacker: full HP, melee reach into AOE does not trigger damage
      and outsideTurnAfterAttack.attackActionUsed  // Outside attacker can act and attack normally
      and attackResult.hits                // Melee attack against AOE-affected target still resolves normally
    )
  }
}
