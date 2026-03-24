// Source: https://rpg.stackexchange.com/q/164625
module _qa_220d2df10e6a8795 {
  import dnd.* from "./dnd"

  // What does it mean for a cone's point of origin to be included or excluded in the cone's area of effect?
  run qa_cone_origin_caster_included_takes_damage = {
    // Caster chooses to include themselves in the cone: they take fire damage normally (no self-immunity)
    val caster = freshCreature(20)
    val afterDamage = pTakeDamage(caster, 14, Fire, Set(), Set(), Set(), false)
    assert(afterDamage.hp == 6)
  }
  
  // What does it mean for a cone's point of origin to be included or excluded in the cone's area of effect?
  run qa_cone_origin_caster_excluded_no_damage = {
    // Default: caster excludes themselves from the cone; they take no damage (modeled as 0 damage applied)
    val caster = freshCreature(20)
    val afterDamage = pTakeDamage(caster, 0, Fire, Set(), Set(), Set(), false)
    assert(afterDamage.hp == 20)
  }
  
  // What does it mean for a cone's point of origin to be included or excluded in the cone's area of effect?
  run qa_cone_origin_self_damage_not_reduced_by_default_resistances = {
    // Self-inclusion: caster with no resistances/immunities takes full fire damage from their own spell
    val caster = freshCreature(30)
    val afterDamage = pTakeDamage(caster, 20, Fire, Set(), Set(), Set(), false)
    assert(afterDamage.hp == 10 and not(afterDamage.dead))
  }
}
