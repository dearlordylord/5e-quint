// Source: https://rpg.stackexchange.com/q/101645
module _qa_0c89d2e5de873ae2 {
  import dnd.* from "./dnd"

  // For a creature affected by the spell See Invisibility, can they see air?
  // Accepted answer: invisibility (CInvisible condition) and transparency are distinct mechanics;
  // See Invisibility interacts only with the game-mechanical CInvisible condition, not physical transparency.
  run qa_see_invisibility_vs_transparent = {
    // "Air" analogy: a thing that is physically transparent but has NO CInvisible condition
    val transparent_thing = freshCreature(10)
    // A creature that actually has the game-mechanical invisible condition
    val invisible_creature = pApplyCondition(freshCreature(10), CInvisible)
    // See Invisibility negates CInvisible — modelled as pRemoveCondition(CInvisible)
    val seen_through_spell = pRemoveCondition(invisible_creature, CInvisible)
    assert(
      // Transparent-but-not-invisible thing has no CInvisible condition (air is not affected)
      not(transparent_thing.invisible)
      // CInvisible is what grants game-mechanical invisibility
      and invisible_creature.invisible
      // CInvisible also grants attacker advantage; transparent things do not
      and pOwnAttackModifiers(invisible_creature, false).hasAdvantage
      and not(pOwnAttackModifiers(transparent_thing, false).hasAdvantage)
      // See Invisibility removes the condition; the transparent thing never had it to remove
      and not(seen_through_spell.invisible)
      and not(pRemoveCondition(transparent_thing, CInvisible).invisible)
    )
  }
}
