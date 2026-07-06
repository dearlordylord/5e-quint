// -*- mode: Bluespec; -*-

module spellProcedureProfilesInductiveTests {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import attackDamageComposition.* from "./attack-damage-composition"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import reactionsContinuationsConcentration.* from "./reactions-continuations-concentration"
  import spellDefinitionProfiles.* from "./spell-definition-profiles"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"
  import spellInvocationActionSlotCore.* from "./spell-invocation-action-slot-core"
  import spellDirectDamageProjectionCore.* from "./spell-direct-damage-projection-core"
  import spellHitPointRestorationCore.* from "./spell-hit-point-restoration-core"
  import spellDefensiveEffectCore.* from "./spell-defensive-effect-core"
  import spellReadiedSpellResponseCore.* from "./spell-readied-spell-response-core"
  import spellProcedureProfiles.* from "./spell-procedure-profiles"

  run healing_word_invocation_reaches_bonus_action_slot_spend = {
    val result = resolveSpellInvocation(initialSpellcastingProcedureState, {
      profile: HealingWordSpellProfile,
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      targetCount: 1,
      targetsAreValid: true,
    })
    all {
      assert(result.admitted),
      assert(result.slotExpended),
      assert(result.state.turn.actionQuota == ActionAvailable),
      assert(not(result.state.turn.bonusActionAvailable)),
      assert(result.state.slotLedger.slotsRemaining == 1),
      assert(result.state.slotSpellCastThisTurn),
      assert(legalSpellcastingProcedureState(result.state)),
    }
  }

  run readied_spell_reaches_release_state = {
    val held = holdReadiedSpellResponse(
      initialSpellcastingProcedureState,
      initialReadiedSpellProcedureState,
      {
        profile: CureWoundsSpellProfile,
        hasSpellAccess: true,
        selectedSlotLevel: 1,
        targetCount: 1,
        targetsAreValid: true,
      },
      true,
      true
    )
    val release = releaseReadiedSpellReaction(offerReadiedSpellReaction(held.readiedSpell))
    all {
      assert(held.held),
      assert(held.slotExpended),
      assert(release.released == ReleasedReadiedSpell({ profile: CureWoundsSpellProfile })),
      assert(not(release.readiedSpell.reaction.reactor.turn.reactionAvailable)),
      assert(legalReadiedSpellProcedureState(release.readiedSpell)),
      assert(legalReadiedSpellRelease(release.released)),
    }
  }
}
