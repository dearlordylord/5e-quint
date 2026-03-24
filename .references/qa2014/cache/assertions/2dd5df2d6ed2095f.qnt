// Source: https://rpg.stackexchange.com/q/125511
module _qa_2dd5df2d6ed2095f {
  import dnd.* from "./dnd"

  // If a PC contracts lycanthropy (werewolf), they gain the lycanthrope's damage immunities (MM p.207: bludgeoning, piercing, slashing)
  run qa_lycanthrope_damage_immunities = {
    val werewolfImmunities: Set[DamageType] = Set(Bludgeoning, Piercing, Slashing)
    val pc = freshCreature(30)
    val afterBlud = pTakeDamage(pc, 15, Bludgeoning, Set(), Set(), werewolfImmunities, false)
    val afterPier = pTakeDamage(pc, 15, Piercing, Set(), Set(), werewolfImmunities, false)
    val afterSlas = pTakeDamage(pc, 15, Slashing, Set(), Set(), werewolfImmunities, false)
    assert(afterBlud.hp == 30 and afterPier.hp == 30 and afterSlas.hp == 30)
  }
  
  // Lycanthrope PC immunity is type-specific: non-immune damage types still deal full damage (MM p.207)
  run qa_lycanthrope_non_immune_damage_applies = {
    val werewolfImmunities: Set[DamageType] = Set(Bludgeoning, Piercing, Slashing)
    val pc = freshCreature(20)
    val afterFire  = pTakeDamage(pc, 10, Fire,    Set(), Set(), werewolfImmunities, false)
    val afterAcid  = pTakeDamage(pc, 10, Acid,    Set(), Set(), werewolfImmunities, false)
    val afterRadiant = pTakeDamage(pc, 10, Radiant, Set(), Set(), werewolfImmunities, false)
    assert(afterFire.hp == 10 and afterAcid.hp == 10 and afterRadiant.hp == 10)
  }
  
  // Lycanthrope PC inherits Keen Hearing and Smell trait: advantage on Perception checks yields +5 to passive Perception (MM p.207)
  run qa_lycanthrope_keen_senses_passive_perception = {
    val wisMod   = 1   // e.g. Wisdom 13
    val profBonus = 3   // level 5
    val normalPassive = passiveCheck(wisMod, Proficient, profBonus, false, false)
    val keenPassive   = passiveCheck(wisMod, Proficient, profBonus, true,  false)
    assert(keenPassive == normalPassive + 5)
  }
  
  // Immunity to physical types is all-or-nothing per type: even a single point is blocked (MM p.207)
  run qa_lycanthrope_immunity_blocks_one_damage = {
    val werewolfImmunities: Set[DamageType] = Set(Bludgeoning, Piercing, Slashing)
    val pc = freshCreature(10)
    val after = pTakeDamage(pc, 1, Slashing, Set(), Set(), werewolfImmunities, false)
    assert(after.hp == 10)
  }
}
