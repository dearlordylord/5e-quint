// Source: https://rpg.stackexchange.com/q/122705
module _qa_babfef947eeb9680 {
  import dnd.* from "./dnd"

  // What makes a creature a Devil? — shared devil trait: immunity to fire damage
  run qa_devil_fire_immunity = {
    val devil = freshCreature(50)
    val immunities = Set(Fire, Poison)
    val resistances = Set(Cold, Bludgeoning, Piercing, Slashing)
    val afterFire = pTakeDamage(devil, 30, Fire, resistances, Set(), immunities, false)
    assert(afterFire.hp == 50)
  }
  
  // What makes a creature a Devil? — shared devil trait: immunity to poison damage
  run qa_devil_poison_damage_immunity = {
    val devil = freshCreature(50)
    val immunities = Set(Fire, Poison)
    val resistances = Set(Cold, Bludgeoning, Piercing, Slashing)
    val afterPoison = pTakeDamage(devil, 20, Poison, resistances, Set(), immunities, false)
    assert(afterPoison.hp == 50)
  }
  
  // What makes a creature a Devil? — shared devil trait: cold resistance halves damage
  run qa_devil_cold_resistance = {
    val devil = freshCreature(50)
    val immunities = Set(Fire, Poison)
    val resistances = Set(Cold, Bludgeoning, Piercing, Slashing)
    val afterCold = pTakeDamage(devil, 20, Cold, resistances, Set(), immunities, false)
    // 20 cold / 2 = 10 damage -> 50 - 10 = 40 hp
    assert(afterCold.hp == 40)
  }
  
  // What makes a creature a Devil? — shared devil trait: resistance to nonmagical weapon damage (modeled as Slashing resistance)
  run qa_devil_weapon_resistance_slashing = {
    val devil = freshCreature(50)
    val immunities = Set(Fire, Poison)
    val resistances = Set(Cold, Bludgeoning, Piercing, Slashing)
    val afterSlash = pTakeDamage(devil, 18, Slashing, resistances, Set(), immunities, false)
    // 18 / 2 = 9 damage -> 50 - 9 = 41 hp
    assert(afterSlash.hp == 41)
  }
  
  // What makes a creature a Devil? — shared devil trait: resistance to nonmagical weapon damage (modeled as Bludgeoning resistance)
  run qa_devil_weapon_resistance_bludgeoning = {
    val devil = freshCreature(50)
    val immunities = Set(Fire, Poison)
    val resistances = Set(Cold, Bludgeoning, Piercing, Slashing)
    val afterBludgeon = pTakeDamage(devil, 14, Bludgeoning, resistances, Set(), immunities, false)
    // 14 / 2 = 7 damage -> 50 - 7 = 43 hp
    assert(afterBludgeon.hp == 43)
  }
  
  // What makes a creature a Devil? — shared devil trait: darkvision means darkness is only lightly obscured
  run qa_devil_darkvision_in_dark = {
    val obs = pEffectiveObscurement(Dark, true)
    assert(obs == LightlyObscured)
  }
  
  // What makes a creature a Devil? — darkvision: dim light is fully unobscured for a devil
  run qa_devil_darkvision_in_dim = {
    val obs = pEffectiveObscurement(Dim, true)
    assert(obs == Unobscured)
  }
  
  // What makes a creature a Devil? — fire immunity takes priority over any resistance (immunity + resistance both present)
  run qa_devil_immunity_beats_resistance = {
    val devil = freshCreature(40)
    // even if fire were in resistances too, immunity should yield 0 damage
    val afterFire = pTakeDamage(devil, 40, Fire, Set(Fire), Set(), Set(Fire), false)
    assert(afterFire.hp == 40)
  }
}
