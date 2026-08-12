// -*- mode: Bluespec; -*-

module battleRuntimeRageSpellRestrictionTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeSpellcastingFacts.* from "./battle-runtime-spellcasting-facts"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeReactionWindow.* from "./battle-runtime-reaction-window"


  run test_rage_breaks_concentration_and_blocks_spells = {
    val concentrating = { ...initialState, fighter: { ...initialState.fighter, concentrating: true, activeEffects: Set(GuidanceAbilityCheckBonus({ skill: StealthSkill })) } }
    val raging = startRage(concentrating, 2).state
    all {
      assert(not(raging.fighter.concentrating)),
      assert(not(canDiscoverSpellActs(true, fighterHasRage(raging)))),
      assert(resolveRayOfFrost(raging, 15, 10, 4, true) == raging),
    }
  }

  run test_rage_breaks_readied_spell_hold = {
    val readied = readyFighterReadiedSpell(initialState)
    val raging = startRage(readied, 2).state
    all {
      assert(not(raging.fighter.concentrating)),
      assert(not(raging.fighter.readiedSpellHeld)),
      assert(releaseFighterReadiedSpell(raging) == raging),
    }
  }
}
