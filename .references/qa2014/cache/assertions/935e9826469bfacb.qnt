// Source: https://rpg.stackexchange.com/q/132508
module _qa_935e9826469bfacb {
  import dnd.* from "./dnd"

  // Does every damage type have a way to deal nonmagical damage?
  run qa_all_thirteen_damage_types_defined = {
    val expectedTypes = Set(
      Acid, Cold, Fire, Force, Lightning, Necrotic, Poison,
      Psychic, Radiant, Thunder, Bludgeoning, Piercing, Slashing
    )
    assert(ALL_DAMAGE_TYPES == expectedTypes)
  }
  
  // Each damage type (including Force) reduces HP identically via pTakeDamage — spec does not distinguish magical vs nonmagical
  run qa_every_damage_type_reduces_hp = {
    val c = freshCreature(20)
    assert(
      ALL_DAMAGE_TYPES.forall(dt =>
        pTakeDamage(c, 5, dt, Set(), Set(), Set(), false).hp == 15
      )
    )
  }
  
  // Resistance halves damage regardless of damage type, confirming uniform mechanical treatment across all types
  run qa_resistance_applies_to_all_damage_types = {
    val c = freshCreature(20)
    assert(
      ALL_DAMAGE_TYPES.forall(dt =>
        pTakeDamage(c, 10, dt, Set(dt), Set(), Set(), false).hp == 15
      )
    )
  }
  
  // Immunity blocks damage for every damage type (including exotic types like Psychic, Radiant, Force)
  run qa_immunity_blocks_all_damage_types = {
    val c = freshCreature(20)
    assert(
      ALL_DAMAGE_TYPES.forall(dt =>
        pTakeDamage(c, 30, dt, Set(), Set(), Set(dt), false).hp == 20
      )
    )
  }
}
