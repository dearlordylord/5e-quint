// Source: https://rpg.stackexchange.com/q/158372
module _qa_8f193751aba9266a {
  import dnd.* from "./dnd"

  // Does an Oath of Vengeance paladin require concentration when using Vow of Enmity (Channel Divinity)?
  run qa_channel_divinity_does_not_break_concentration = {
    // Hunter's mark is active and requires concentration
    val creature = freshCreature(20)
    val ss = FRESH_SPELL_SLOTS.with("concentrationSpellId", "hunters_mark")
    val turn = FRESH_TURN
    // Vow of Enmity is a bonus action Channel Divinity option — not a spell, no concentration requirement
    val turnAfter = pUseBonusAction(turn, creature)
    // Using the bonus action (Channel Divinity) must not disturb concentration on hunter's mark
    assert(
      turnAfter.bonusActionUsed
      and ss.concentrationSpellId == "hunters_mark"
    )
  }
}
