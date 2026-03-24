// Source: https://rpg.stackexchange.com/q/201921
module _qa_76d6ddef117e6a83 {
  import dnd.* from "./dnd"

  // Can Pact of the Chain Warlocks forgo one of their attacks to not break Invisibility?
  run qa_attack_action_does_not_break_invisibility = {
    // Invisibility ends when a target *attacks*, not when they take the Attack action.
    // Taking AAttack (then forgoing the attack) must not remove CInvisible from the creature.
    val invisibleCreature = freshCreature(20).with("invisible", true)
    val t0 = FRESH_TURN
    // Warlock takes the Attack action but foregos their own attack (e.g. grants familiar)
    val t1 = pUseAction(t0, invisibleCreature, AAttack)
    assert(
      // Attack action was consumed ...
      t1.attackActionUsed
      // ... but the creature's invisible flag is untouched — no attack was made
      and invisibleCreature.invisible
    )
  }
}
