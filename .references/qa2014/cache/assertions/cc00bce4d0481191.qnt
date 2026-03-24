// Source: https://rpg.stackexchange.com/q/167736
module _qa_cc00bce4d0481191 {
  import dnd.* from "./dnd"

  // How can I frighten my enemies besides using spells?
  // Frightened condition (from any source) imposes disadvantage on attacks while fear source is in LOS
  run qa_frightened_attack_disadv_with_source_in_los = {
    val creature = freshCreature(30)
    val frightened = pApplyCondition(creature, CFrightened)
    // frightSourceInLOS = true: creature can see what frightened it
    val mods = pOwnAttackModifiers(frightened, true)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
  
  // Frightened condition: no disadvantage on attacks if fear source is NOT in line of sight
  run qa_frightened_no_attack_disadv_without_los = {
    val creature = freshCreature(30)
    val frightened = pApplyCondition(creature, CFrightened)
    // frightSourceInLOS = false: the source is not visible (blocked or out of range)
    val mods = pOwnAttackModifiers(frightened, false)
    assert(not(mods.hasDisadvantage))
  }
  
  // Frightened condition: ability checks also suffer disadvantage while fear source is in LOS
  run qa_frightened_check_disadv_with_source_in_los = {
    val creature = freshCreature(30)
    val frightened = pApplyCondition(creature, CFrightened)
    // requiresSight/requiresHearing false; only testing fear-based disadv
    val mods = pCheckModifiers(frightened, false, false, true)
    assert(mods.hasDisadvantage and not(mods.autoFail))
  }
  
  // Frightened applied while already incapacitated: condition sets correctly (items/abilities work on incapacitated targets)
  run qa_frightened_applies_when_incapacitated = {
    val creature = freshCreature(20)
    val stunned = pApplyCondition(creature, CStunned)
    val frightened = pApplyCondition(stunned, CFrightened)
    assert(frightened.frightened and isIncapacitated(frightened))
  }
}
