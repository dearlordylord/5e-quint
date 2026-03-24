// Source: https://rpg.stackexchange.com/q/211798
module _qa_31f8c488e2df017c {
  import dnd.* from "./dnd"

  // Does target of Geas know the penalty for disobeying?
  // Geas: creature that fails Wisdom save becomes Charmed — the only mandatory mechanical state
  run qa_geas_failed_wis_save_applies_charmed = {
    val creature = freshCreature(30)
    // Wis 12 (mod +1), not proficient, rolls 8 vs DC 17 (level 9 caster, Int 18) — fails
    val savePassed = saveSucceeds(8, 1, false, 4, 0, 17)
    val after = if (not(savePassed)) pApplyCondition(creature, CCharmed) else creature
    assert(not(savePassed) and after.charmed)
  }
  
  // Does target of Geas know the penalty for disobeying?
  // Charmed does NOT incapacitate — target can still freely act contrary; compulsion is damage-threat only,
  // not direct mind control (unlike Suggestion's "carries out to best of ability")
  run qa_geas_charmed_does_not_incapacitate = {
    val creature = freshCreature(30)
    val charmed = pApplyCondition(creature, CCharmed)
    assert(charmed.charmed and not(isIncapacitated(charmed)))
  }
  
  // Does target of Geas know the penalty for disobeying?
  // Acting contrary to Geas instructions deals 5d10 Psychic damage; creature remains Charmed after
  run qa_geas_contrary_action_deals_psychic_damage = {
    val creature = freshCreature(30)
    val charmed = pApplyCondition(creature, CCharmed)
    // 5d10 psychic damage (dice pre-resolved: 5+4+6+7+5 = 27)
    val after = pTakeDamage(charmed, 27, Psychic, Set(), Set(), Set(), false)
    assert(after.hp == 3 and after.charmed)
  }
}
