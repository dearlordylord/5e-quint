// -*- mode: Bluespec; -*-

module battleRuntimeWeaponRecklessAttackTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeWeaponAttacks.* from "./battle-runtime-weapon-attacks"
  import battleRuntimeAttackFacts.* from "./battle-runtime-attack-facts"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"


  run test_reckless_attack_activates_on_first_attack_roll_boundary = {
    val reckless = resolveAttackRecklessly(initialState, 15, 10, fighterWeaponAttackDamageRoll(4), true)
    val goblinTurn = endTurn(reckless)
    val fighterTurn = endTurn(goblinTurn)
    all {
      assert(fighterHasRecklessAttack(reckless)),
      assert(goblinAttackAgainstFighterHasAdvantage(goblinTurn)),
      assert(not(fighterHasRecklessAttack(fighterTurn))),
    }
  }
}
