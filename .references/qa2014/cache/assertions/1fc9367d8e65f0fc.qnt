// Source: https://rpg.stackexchange.com/q/124653
module _qa_1fc9367d8e65f0fc {
  import dnd.* from "./dnd"

  // Maximilian's Earthen Grasp - does the spell persist on a successful save?
  // Rule: a successful save only prevents the target being affected; the spell persists for its full duration.
  run qa_spell_persists_on_target_successful_save = {
    val target = freshCreature(20)
    val ss0 = FRESH_SPELL_SLOTS
    // Caster starts concentrating on Earthen Grasp
    val ss1 = pStartConcentration(ss0, "earthen_grasp")
    // Target succeeds on Strength save: roll 15 + STR mod +2, DC 14 → 17 >= 14
    val targetSaved = saveSucceeds(15, 2, false, 3, 0, 14)
    // On a successful save the target is NOT restrained and does NOT take damage;
    // on a failed save it would be restrained and take bludgeoning damage.
    val targetAfter =
      if (targetSaved) target
      else pApplyCondition(
        pTakeDamage(target, 7, Bludgeoning, Set(), Set(), Set(), false),
        CRestrained
      )
    assert(
      // Spell persists — concentration is NOT broken by the target's successful save
      ss1.concentrationSpellId == "earthen_grasp" and
      // Target's save succeeded: they avoided the restrained condition
      targetSaved == true and
      targetAfter.restrained == false
    )
  }
}
