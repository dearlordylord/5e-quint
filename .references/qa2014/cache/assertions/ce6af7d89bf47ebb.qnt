// Source: https://rpg.stackexchange.com/q/161223
module _qa_ce6af7d89bf47ebb {
  import dnd.* from "./dnd"

  // Do trolls appear to be dead after reaching 0 HP from non-fire/acid damage?
  run qa_zero_hp_non_lethal_causes_unconscious_and_prone = {
    // PHB: damage reduces to 0 HP but fails to kill -> fall unconscious (and prone per unconscious condition)
    val creature = freshCreature(20)
    val after_damage = pTakeDamage(creature, 20, Slashing, Set(), Set(), Set(), false)
    assert(
      after_damage.hp == 0
      and not(after_damage.dead)
      and after_damage.unconscious
      and after_damage.prone
      and after_damage.incapacitatedSources.contains(ISUnconscious)
    )
  }
  
  // Do trolls appear to be dead after reaching 0 HP from non-fire/acid damage? (regeneration recovery)
  run qa_zero_hp_heal_restores_consciousness = {
    // PHB: "This unconsciousness ends if you regain any hit points." (models troll regenerating)
    val creature = freshCreature(20)
    val after_damage = pTakeDamage(creature, 20, Slashing, Set(), Set(), Set(), false)
    val after_regen = pHeal(after_damage, 10)
    assert(
      after_regen.hp == 10
      and not(after_regen.unconscious)
      and after_regen.prone  // prone persists — must use movement to stand up
      and not(after_regen.dead)
      and not(after_regen.incapacitatedSources.contains(ISUnconscious))
    )
  }
  
  // Do trolls appear to be dead after reaching 0 HP from non-fire/acid damage? (overflow does not instantly kill)
  run qa_zero_hp_partial_overflow_not_instant_death = {
    // Only instant death if overflow >= maxHp; otherwise unconscious, not dead
    val creature = freshCreature(20)
    // 25 damage on 20 maxHp creature: overflow = 5, which is < 20 (maxHp), so not instant death
    val after_damage = pTakeDamage(creature, 25, Bludgeoning, Set(), Set(), Set(), false)
    assert(
      after_damage.hp == 0
      and not(after_damage.dead)
      and after_damage.unconscious
    )
  }
}
