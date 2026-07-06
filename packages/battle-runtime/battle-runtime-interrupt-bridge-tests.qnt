module battleRuntimeInterruptBridgeTests {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  import battleRuntimeReactionKinds.* from "./battle-runtime-reaction-kinds"
  import battleRuntimeInterruptBridge.* from "./battle-runtime-interrupt-bridge"

  run test_opportunity_attack_reaction_spends_reaction_and_completes = {
    val decision = battleRuntimeTakeReactionDecision(
      BattleRuntimeOpportunityAttack,
      BattleRuntimeOpportunityAttackProcedure,
      true,
      false,
      true,
      true,
      true,
    )
    assert(decision == BattleRuntimeTookReaction({ frameComplete: true, reactionAvailableAfterChoice: false }))
  }

  run test_mismatched_reaction_procedure_is_invalid = {
    val decision = battleRuntimeTakeReactionDecision(
      BattleRuntimeOpportunityAttack,
      BattleRuntimeShieldReactionProcedure,
      true,
      false,
      true,
      true,
      true,
    )
    assert(decision == BattleRuntimeInvalidReactionDecision)
  }

  run test_after_damage_reaction_uses_damage_interruption_contract = {
    val decision = battleRuntimeTakeReactionDecision(
      BattleRuntimeAfterDamage,
      BattleRuntimeDamageInterruptionProcedure,
      true,
      false,
      true,
      true,
      true,
    )
    assert(decision == BattleRuntimeTookReaction({ frameComplete: true, reactionAvailableAfterChoice: false }))
  }

  run test_counterspell_reaction_uses_spell_cast_reaction_contract = {
    val decision = battleRuntimeTakeReactionDecision(
      BattleRuntimeSpellCast,
      BattleRuntimeCounterspellReactionProcedure,
      true,
      false,
      true,
      true,
      true,
    )
    assert(decision == BattleRuntimeTookReaction({ frameComplete: true, reactionAvailableAfterChoice: false }))
  }

  run test_decline_does_not_spend_reaction = {
    assert(battleRuntimeDeclineReactionDecision(true, false, true) == BattleRuntimeDeclinedReaction({ frameComplete: true }))
  }

}
