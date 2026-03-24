// Source: https://rpg.stackexchange.com/q/196851
module _qa_e4e0f176b8fa20ae {
  import dnd.* from "./dnd"

  // What happens when a creature drops to 0 hit points without taking damage?
  run qa_drop_to_0_hp_no_damage_falls_unconscious = {
    // Accepted answer: non-damage HP reduction to 0 (e.g. Aid expiry) → falls unconscious, not dead
    val creature = freshCreature(20)
    val at0 = pApplyCondition(creature.with("hp", 0), CUnconscious)
    assert(and {
      at0.hp == 0,
      at0.unconscious,
      at0.prone,
      not(at0.dead),
      isIncapacitated(at0),
      at0.incapacitatedSources.contains(ISUnconscious),
    })
  }
  
  // Death saving throws proceed from 0 HP unconscious state reached via non-damage source
  run qa_death_saves_proceed_after_non_damage_drop = {
    // Once unconscious at 0 HP (however reached), death saves apply on subsequent turns
    val creature = freshCreature(20)
    val at0 = pApplyCondition(creature.with("hp", 0), CUnconscious)
    // Roll a 15 → counts as a success (>= 10, not nat20, not nat1)
    val afterSave = pDeathSave(at0, 15)
    assert(and {
      afterSave.deathSaves.successes == 1,
      afterSave.deathSaves.failures == 0,
      not(afterSave.dead),
      not(afterSave.stable),
      afterSave.hp == 0,
    })
  }
  
  // Three successful death saves stabilize the creature regardless of how 0 HP was reached
  run qa_three_death_save_successes_stabilize = {
    val creature = freshCreature(20)
    val at0 = pApplyCondition(creature.with("hp", 0), CUnconscious)
    val s1 = pDeathSave(at0, 15)
    val s2 = pDeathSave(s1, 12)
    val s3 = pDeathSave(s2, 11)
    assert(and {
      s3.stable,
      s3.hp == 0,
      not(s3.dead),
      s3.deathSaves.successes == 0,  // reset on stabilize
      s3.deathSaves.failures == 0,
    })
  }
  
  // Nat-20 death save from non-damage 0 HP: regain 1 HP and consciousness
  run qa_nat20_death_save_revives_from_non_damage_drop = {
    val creature = freshCreature(20)
    val at0 = pApplyCondition(creature.with("hp", 0), CUnconscious)
    val revived = pDeathSave(at0, 20)
    assert(and {
      revived.hp == 1,
      not(revived.unconscious),
      not(revived.dead),
      revived.deathSaves.successes == 0,
      revived.deathSaves.failures == 0,
    })
  }
}
