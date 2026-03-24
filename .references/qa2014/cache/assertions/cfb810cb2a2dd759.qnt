// Source: https://rpg.stackexchange.com/q/165210
module _qa_cfb810cb2a2dd759 {
  import dnd.* from "./dnd"

  // Can you cast Magic Stone on 3 pebbles as a bonus action, throw a stone as an action, then throw 2 remaining pebbles via TWF?
  run qa_magic_stone_not_twf_no_light_no_melee = {
    // Magic stones are ranged spell attack objects: not melee, no Light_ property
    val magicStone: Weapon = {
      name: "magic_stone",
      damageDie: 6,
      versatileDie: 0,
      damageType: Bludgeoning,
      properties: Set(),    // not Light_, not Finesse
      isMelee: false,       // ranged attack only per spell description
      normalRange: 60,
      longRange: 120,
    }
    val creature = freshCreature(20)
    // Attack action already taken, bonus action still available — TWF precondition met at turn level
    val t = FRESH_TURN.with("attackActionUsed", true).with("bonusActionUsed", false)
    assert(not(pCanTWFWithWeapons(magicStone, magicStone, t, creature)))
  }
  
  // Even granting magic stones the Light_ property, TWF still fails: they are not melee weapons
  run qa_magic_stone_not_twf_ranged_even_if_light = {
    val magicStoneLight: Weapon = {
      name: "magic_stone_light",
      damageDie: 6,
      versatileDie: 0,
      damageType: Bludgeoning,
      properties: Set(Light_),  // hypothetically assume light — best-case for the argument
      isMelee: false,           // still a ranged attack, not a melee weapon
      normalRange: 60,
      longRange: 120,
    }
    val creature = freshCreature(20)
    val t = FRESH_TURN.with("attackActionUsed", true).with("bonusActionUsed", false)
    assert(not(pCanTWFWithWeapons(magicStoneLight, magicStoneLight, t, creature)))
  }
}
