// -*- mode: Bluespec; -*-

module battleRuntimeHideSearchCombatTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeHidden.* from "./battle-runtime-hidden"
  import battleRuntimeHideSearchFixture.* from "./battle-runtime-hide-search-fixture"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"


  run test_hide_records_discovery_dc = {
    val canHide = { ...initialState, fighter: { ...initialState.fighter, hidePrerequisite: true } }
    all {
      assert(hideHoles(initialState) == Set()),
      assert(hideHoles(canHide) == Set(AbilityCheck)),
      assert(hideFighter(initialState, 20).fighter.hidden == NotHidden),
      assert(fighterIsHidden(hideFighter(canHide, 15))),
      assert(hideFighter(canHide, 14).fighter.hidden == NotHidden),
    }
  }

  run test_search_finds_hidden_fighter = {
    val hidden = endTurn(hideFighter({ ...initialState, fighter: { ...initialState.fighter, hidePrerequisite: true } }, 18))
    all {
      assert(searchGoblinForFighter(hidden, 17).fighter.hidden == HiddenByDc(HiddenDc18)),
      assert(searchGoblinForFighter(hidden, 18).fighter.hidden == NotHidden),
    }
  }

  run test_attack_reveals_hidden_fighter = {
    val hidden = hideFighter({ ...initialState, fighter: { ...initialState.fighter, hidePrerequisite: true } }, 18)
    assert(resolveAttack({ ...hidden, actionAvailable: true }, 1, 1, fighterWeaponAttackDamageRoll(4), true).fighter.hidden == NotHidden)
  }
}
