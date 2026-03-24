// Source: https://rpg.stackexchange.com/q/206898
module _qa_6a2c0def7350b85a {
  import dnd.* from "./dnd"

  // With the Chef feat, can I cook more treats if I spend more hours cooking?
  run qa_chef_treat_grants_prof_bonus_temp_hp = {
    // Core mechanic: eating one Chef treat grants temp HP equal to caster's proficiency bonus
    val lvl = 5
    val pb = proficiencyBonus(lvl)   // (5-1)/4 + 2 = 3
    val eater = freshCreature(20)
    val afterEat = pGrantTempHp(eater, pb, false)
    assert(afterEat.tempHp == pb)
  }
  
  // With the Chef feat, can I cook more treats if I spend more hours cooking?
  run qa_chef_multiple_hours_multiply_batches = {
    // Accepted answer: one batch (= profBonus treats) per hour of work; long rest always one batch
    // 2 hours of work yields 2 batches; long rest yields exactly 1 batch regardless of duration
    val lvl = 5
    val pb = proficiencyBonus(lvl)   // 3
    val treatsFrom1Hour = 1 * pb     // 3
    val treatsFrom2Hours = 2 * pb    // 6
    val treatsFromLongRest = 1 * pb  // always 1 batch = 3, never scaled by rest hours
    assert(
      treatsFrom2Hours == treatsFrom1Hour * 2 and
      treatsFromLongRest == treatsFrom1Hour and
      treatsFrom2Hours > treatsFromLongRest
    )
  }
  
  // With the Chef feat, can I cook more treats if I spend more hours cooking?
  run qa_chef_temp_hp_not_additive = {
    // Accepted answer: temp HP are not additive; eating a second treat of same value never doubles it
    val lvl = 5
    val pb = proficiencyBonus(lvl)   // 3
    // Creature already has temp HP from first treat
    val creature = freshCreature(20).with("tempHp", pb)
    // Player may keep old (same value) or replace (same value) — neither produces 2*pb
    val afterKeepOld = pGrantTempHp(creature, pb, true)
    val afterReplace  = pGrantTempHp(creature, pb, false)
    assert(
      afterKeepOld.tempHp == pb and
      afterReplace.tempHp  == pb and
      afterKeepOld.tempHp != pb * 2
    )
  }
}
