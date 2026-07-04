module spellInvocationResourceCoreTests {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import spellSlotExpenditure.* from "./spell-slot-expenditure"
  import spellInvocationResourceCore.* from "./spell-invocation-resource-core"

  run test_spell_invocation_distinguishes_free_cost_from_rejected_unchanged = {
    val inactiveTurn = initialTurnProcedureState.with("currentActorOwnsTurn", false)
    val state = initialSpellcastingProcedureState.with("turn", inactiveTurn)
    val facts = {
      invocationAction: ActionTimeSpellInvocation,
      hasSpellAccess: true,
      slotSpend: SpellInvocationWithoutSlot,
      selectedSlotLevel: 0,
      targetCount: 1,
      targetCardinality: SpellInvocationBoundedTargets({
        minimumTargetCount: 1,
        maximumTargetCount: 1,
      }),
      targetsAreValid: true,
    }
    val freeInvocation = resolveSpellInvocationResourceWithActionCost(
      state,
      facts,
      FreeCost
    )
    val rejectedInvocation = resolveSpellInvocationResource(state, facts)
    all {
      assert(freeInvocation.admitted),
      assert(freeInvocation.state == state),
      assert(not(freeInvocation.slotExpended)),
      assert(not(rejectedInvocation.admitted)),
      assert(rejectedInvocation.state == state),
    }
  }

}
