// Source: https://rpg.stackexchange.com/q/204584
module _qa_f38bb35bb13a511c {
  import dnd.* from "./dnd"

  // How to dual wield as a hexblade warlock: off-hand TWF attack does not add positive ability modifier to damage
  run qa_twf_offhand_positive_mod_not_added = {
      // CHA +3 on off-hand: only dice count, mod ignored when positive
      val diceRoll = 5
      val chaMod = 3
      assert(pTWFOffHandDamage(diceRoll, chaMod) == 5)
  }
  
  // How to dual wield as a hexblade warlock: off-hand TWF attack applies negative ability modifier to damage
  run qa_twf_offhand_negative_mod_applied = {
      // ability mod -2 (e.g. weak STR) does subtract from off-hand damage
      val diceRoll = 4
      val negMod = -2
      assert(pTWFOffHandDamage(diceRoll, negMod) == 2)
  }
  
  // How to dual wield as a hexblade warlock: TWF requires both weapons to be light melee
  run qa_twf_requires_both_weapons_light_melee = {
      val dagger: Weapon = {
          name: "dagger",
          damageDie: 4,
          versatileDie: 0,
          damageType: Piercing,
          properties: Set(Finesse, Light_, Thrown),
          isMelee: true,
          normalRange: 20,
          longRange: 60,
      }
      val longsword: Weapon = {
          name: "longsword",
          damageDie: 8,
          versatileDie: 10,
          damageType: Slashing,
          properties: Set(Versatile),
          isMelee: true,
          normalRange: 0,
          longRange: 0,
      }
      val creature = freshCreature(20)
      // attack action already used this turn, bonus action still available
      val t = FRESH_TURN.with("attackActionUsed", true)
      all {
          // dagger + dagger (both Light melee) → TWF permitted
          assert(pCanTWFWithWeapons(dagger, dagger, t, creature)),
          // dagger + longsword (longsword not Light) → TWF not permitted
          assert(not(pCanTWFWithWeapons(dagger, longsword, t, creature))),
      }
  }
  
  // How to dual wield as a hexblade warlock: zero off-hand damage is clamped at 0 (not negative)
  run qa_twf_offhand_damage_min_zero = {
      // very low roll + large negative mod cannot produce negative damage
      val diceRoll = 1
      val negMod = -5
      assert(pTWFOffHandDamage(diceRoll, negMod) == 0)
  }
}
