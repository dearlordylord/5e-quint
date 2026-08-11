// -*- mode: Bluespec; -*-

module battleRuntimeSpellAttackRecklessBoundaryTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellAttackDirectResolution.* from "./battle-runtime-spell-attack-direct-resolution"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"


  run test_spell_attack_roll_counts_for_first_attack_roll = {
    val afterSpellAttack = resolveRayOfFrost(initialState, 1, 1, 4, true)
    val recklessAfterSpell = activateRecklessAttackOnFirstAttackRoll(afterSpellAttack)
    all {
      assert(afterSpellAttack.attackRollMadeThisTurn),
      assert(not(fighterHasRecklessAttack(recklessAfterSpell))),
    }
  }
}
