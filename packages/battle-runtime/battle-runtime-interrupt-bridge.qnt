// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
module battleRuntimeInterruptBridge {
  import attackDamageComposition.* from "../shared-algebras/proofs/rule-core/attack-damage-composition"
  import actionTurnProcedures.* from "../shared-algebras/proofs/rule-core/action-turn-procedures"
  import reactionsContinuationsConcentration.* from "../shared-algebras/proofs/rule-core/reactions-continuations-concentration"
  // Reaction-resolution enums live in a leaf so battle-runtime-model can reference
  // them without importing this bridge's rule-core closure. See the leaf header.
  import battleRuntimeReactionKinds.* from "./battle-runtime-reaction-kinds"

  type BattleRuntimeReactionDecision =
    | BattleRuntimeInvalidReactionDecision
    | BattleRuntimeDeclinedReaction({ frameComplete: bool })
    | BattleRuntimeTookReaction({
        frameComplete: bool,
        reactionAvailableAfterChoice: bool,
      })

  pure def battleRuntimeReactionWindowKind(trigger: BattleRuntimeReactionTrigger): ReactionWindowKind =
    match trigger {
      | BattleRuntimeOpportunityAttack => OpportunityAttackReactionWindow
      | BattleRuntimeAttackDamage => DamageInterruptionReactionWindow
      | BattleRuntimeAfterDamage => DamageInterruptionReactionWindow
      | BattleRuntimeAttackHit => ReadiedSpellReactionWindow
      | BattleRuntimeSpellCast => ReadiedSpellReactionWindow
      | BattleRuntimeCreatureFalls => ReadiedSpellReactionWindow
      | BattleRuntimeSaveFailed => DamageInterruptionReactionWindow
    }

  pure def battleRuntimeReactionChoice(procedure: BattleRuntimeReactionProcedure): ReactionChoice =
    match procedure {
      | BattleRuntimeOpportunityAttackProcedure => TakeOpportunityAttackReaction
      | BattleRuntimeDamageInterruptionProcedure => TakeDamageInterruptionReaction
      | BattleRuntimeReadiedSpellReleaseProcedure => TakeReadiedSpellReaction
      | BattleRuntimeShieldReactionProcedure => TakeReadiedSpellReaction
      | BattleRuntimeCounterspellReactionProcedure => TakeReadiedSpellReaction
      | BattleRuntimeReactionArmorClassEffectProcedure => TakeReadiedSpellReaction
      | BattleRuntimeSpellInterruptionReactionProcedure => TakeReadiedSpellReaction
      | BattleRuntimeAfterDamageSpellReactionProcedure => TakeDamageInterruptionReaction
      | BattleRuntimeFallMitigationReactionProcedure => TakeReadiedSpellReaction
      | BattleRuntimeNoReactionProcedure => DeclineReaction
    }

  pure def battleRuntimeOfferedReactionWindow(trigger: BattleRuntimeReactionTrigger): ReactionWindowState =
    offerReactionWindow(NoReactionWindow, battleRuntimeReactionWindowKind(trigger))

  pure def battleRuntimeDeclineReactionDecision(
    eligible: bool,
    alreadyOffered: bool,
    frameCompleteAfterDecision: bool
  ): BattleRuntimeReactionDecision =
    if (not(eligible) or alreadyOffered)
      BattleRuntimeInvalidReactionDecision
    else
      BattleRuntimeDeclinedReaction({ frameComplete: frameCompleteAfterDecision })

  pure def battleRuntimeTakeReactionDecision(
    trigger: BattleRuntimeReactionTrigger,
    procedure: BattleRuntimeReactionProcedure,
    eligible: bool,
    alreadyOffered: bool,
    reactionAvailable: bool,
    procedureAdmitted: bool,
    frameCompleteAfterDecision: bool
  ): BattleRuntimeReactionDecision =
    if (not(eligible) or alreadyOffered or not(procedureAdmitted))
      BattleRuntimeInvalidReactionDecision
    else {
      val turn = {
        actionQuota: ActionAvailable,
        bonusActionAvailable: true,
        reactionAvailable: reactionAvailable,
        dashMovementBonusFeet: 0,
        disengaged: false,
        dodging: false,
        hidden: false,
        helpAttackHeld: false,
        readiedMovementHeld: false,
        startOfTurnHookActive: false,
        endOfTurnHookActive: false,
        currentActorOwnsTurn: true,
      }
      val choice = resolveReactionChoice(
        turn,
        battleRuntimeOfferedReactionWindow(trigger),
        battleRuntimeReactionChoice(procedure),
      )
      if (choice.reactionWindow == battleRuntimeOfferedReactionWindow(trigger))
        BattleRuntimeInvalidReactionDecision
      else
        BattleRuntimeTookReaction({
          frameComplete: frameCompleteAfterDecision,
          reactionAvailableAfterChoice: choice.turn.reactionAvailable,
        })
    }

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
