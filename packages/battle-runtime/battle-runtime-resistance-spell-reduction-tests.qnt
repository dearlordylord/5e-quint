// -*- mode: Bluespec; -*-

module battleRuntimeResistanceSpellReductionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeDamageTypeAdjustment.* from "./battle-runtime-damage-type-adjustment"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"


  run test_resistance_spell_reduces_matching_damage_once_per_turn = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(ResistanceDamageReduction({ damageType: Slashing, usedThisTurn: false })) } }
    val reduced = applyResistanceSpellReductionToFighter(protected, Slashing, 4, 3)
    val second = applyResistanceSpellReductionToFighter(reduced, Slashing, 4, 3)
    all {
      assert(reduced.fighter.hp == 11),
      assert(reduced.fighter.activeEffects.contains(ResistanceDamageReduction({ damageType: Slashing, usedThisTurn: true }))),
      assert(second.fighter.hp == 7),
    }
  }

  run test_resistance_spell_ignores_nonmatching_damage_and_resets_next_turn = {
    val protected = { ...initialState, fighter: { ...initialState.fighter, activeEffects: Set(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: true })) } }
    val nonmatching = applyResistanceSpellReductionToFighter(protected, Slashing, 4, 3)
    val reset = endTurn(endTurn(nonmatching))
    all {
      assert(nonmatching.fighter.hp == 8),
      assert(reset.fighter.activeEffects.contains(ResistanceDamageReduction({ damageType: Piercing, usedThisTurn: false }))),
    }
  }
}
