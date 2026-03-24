// Source: https://rpg.stackexchange.com/q/104549
module _qa_4f3224e5e78287c1 {
  import dnd.* from "./dnd"

  // "Magical" isn't technically a damage type — WCMFTPOOR weapon still hits Force-immune creature
  run qa_wcmftpoor_slashing_bypasses_force_immunity = {
    // Kensei weapon counts as magical but deals Slashing — Force immunity is irrelevant
    val forceImmune = Set(Force)
    val damage = applyDamageModifiers(10, Slashing, forceImmune, Set(), Set())
    assert(damage == 10)
  }
  
  // Arcane Arrow deals Piercing, not Force — Force immunity does not block it
  run qa_magic_arrow_piercing_bypasses_force_immunity = {
    val forceImmune = Set(Force)
    val damage = applyDamageModifiers(8, Piercing, forceImmune, Set(), Set())
    assert(damage == 8)
  }
  
  // Force immunity does block actual Force damage (e.g., Eldritch Blast)
  run qa_force_immunity_blocks_force_damage = {
    val forceImmune = Set(Force)
    val damage = applyDamageModifiers(10, Force, forceImmune, Set(), Set())
    assert(damage == 0)
  }
  
  // Full state test: Force-immune creature survives Slashing from a "magical" weapon
  run qa_force_immune_creature_takes_slashing_from_magical_weapon = {
    val creature = freshCreature(20)
    val forceImmune = Set(Force)
    val after = pTakeDamage(creature, 8, Slashing, Set(), Set(), forceImmune, false)
    assert(after.hp == 12)
  }
  
  // Damage type identity: Slashing != Force regardless of weapon's magical property
  run qa_magical_tag_does_not_change_damage_type = {
    // A weapon "counting as magical" for overcoming nonmagical immunity still
    // has its base damage type; immunity lookup is strictly by DamageType variant
    val immuneToForceNotSlashing = Set(Force)
    val slashingDmg = applyDamageModifiers(12, Slashing, immuneToForceNotSlashing, Set(), Set())
    val forceDmg    = applyDamageModifiers(12, Force,    immuneToForceNotSlashing, Set(), Set())
    assert(slashingDmg == 12 and forceDmg == 0)
  }
}
