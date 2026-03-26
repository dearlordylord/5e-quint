// Source: https://rpg.stackexchange.com/q/93507
module _qa_9b8add2ac6c3144b {
  import dnd.* from "./dnd"

  // Can the Mage Slayer reaction attack be triggered by a cantrip?
  run qa_mage_slayer_cantrip_triggers_reaction = {
    val casterCreature = freshCreature(10)
    // Caster uses action to cast a cantrip (spell level 0): ACastSpell, no slot expended,
    // nonCantripActionSpellCast stays false because it is a cantrip
    val casterTurn = pUseAction(FRESH_TURN, casterCreature, ACastSpell)
    // Mage Slayer holder is within 5ft with reaction available
    val mageSlayerTurn = FRESH_TURN
    // A cantrip IS a spell (level 0) → Mage Slayer triggers → reaction consumed
    val afterReaction = pUseReaction(mageSlayerTurn)
    assert(
      // Caster did cast a spell (their action was used)
      casterTurn.actionsRemaining == 0 and
      // It was a cantrip: nonCantripActionSpellCast not set (level-0 spell)
      casterTurn.nonCantripActionSpellCast == false and
      // Reaction was available before Mage Slayer fires
      mageSlayerTurn.reactionAvailable == true and
      // Reaction is consumed after the Mage Slayer attack
      afterReaction.reactionAvailable == false
    )
  }
}
