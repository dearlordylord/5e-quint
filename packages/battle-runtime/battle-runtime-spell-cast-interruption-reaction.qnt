// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeSpellCastInterruptionReaction {
  import statBlockSpellcastingGroup as group from "../shared-algebras/proofs/rule-core/stat-block-spellcasting-group"
  import statBlockResourceLifecycle as resource from "../shared-algebras/proofs/rule-core/stat-block-resource-lifecycle"

  // RAW monsters.md:425-429 counts using the limited stat-block part.
  // spells.md:1497 preserves a Spell Slot only; the use remains committed.
  // Long-casting progress is not an immediate cast and defers final payment.
  pure def counteredImmediateLimitedSpellPayment(
    pools: int -> resource::StatBlockLimitedUseResource,
    selectedGroup: group::LimitedSpellcastingGroup,
    invocation: int,
  ): group::LimitedSpellcastingSpend =
    group::spendSelectedSpellcastingInvocation(pools, selectedGroup, invocation, true)

  run test_counteredImmediateLimitedUseIsNotASpellSlot = {
    val pools = Map(
      1 -> resource::StatBlockDailyUse(resource::initialStatBlockDailyUseResource),
      2 -> resource::StatBlockDailyUse(resource::initialStatBlockDailyUseResource)
    )
    val each = group::EachInvocationPool(Map(0 -> 1, 1 -> 2))
    val shared = group::SharedGroupPool({ invocations: Set(0, 1), pool: 1 })
    val eachPaid = counteredImmediateLimitedSpellPayment(pools, each, 0)
    val sharedPaid = counteredImmediateLimitedSpellPayment(pools, shared, 0)
    all {
      assert(eachPaid.admitted),
      assert(eachPaid.pools.get(2) == pools.get(2)),
      assert(not(counteredImmediateLimitedSpellPayment(eachPaid.pools, each, 0).admitted)),
      assert(sharedPaid.admitted),
      assert(sharedPaid.pools.get(2) == pools.get(2)),
      assert(not(counteredImmediateLimitedSpellPayment(sharedPaid.pools, shared, 1).admitted)),
    }
  }
  type SpellCastInterruptionDisposition =
    | SpellCastInterruptionUnchanged
    | SpellCastInterruptionDeclinedResume
    | SpellCastInterruptionResume
    | SpellCastInterruptionEndedTriggeringCast

  pure def spellCastInterruptionReactionAdmitted(
    triggerMatches: bool,
    reactorCanReact: bool,
    reactorCanExpendSpellSlot: bool,
  ): bool =
    triggerMatches and reactorCanReact and reactorCanExpendSpellSlot

  pure def spellCastInterruptionEndsTriggeringCast(
    interruptionTakesEffect: bool,
    triggeringCasterSavingThrowSucceeded: bool,
  ): bool =
    interruptionTakesEffect and not(triggeringCasterSavingThrowSucceeded)

  pure def triggeringSpellSlotCommitsAfterInterruption(
    triggeringSpellUsesSlot: bool,
    interruptionTakesEffect: bool,
    interruptionEndsTriggeringCast: bool,
  ): bool =
    triggeringSpellUsesSlot and (
      not(interruptionTakesEffect) or not(interruptionEndsTriggeringCast)
    )

  pure def triggeringSpellSlotCommitsAfterDecline(
    triggeringSpellUsesSlot: bool,
  ): bool =
    triggeringSpellUsesSlot

  pure def spellCastInterruptionDisposition(
    reactionTaken: bool,
    decisionClosedFrame: bool,
    interruptionEndedTriggeringCast: bool,
    declined: bool,
  ): SpellCastInterruptionDisposition =
    if (not(reactionTaken) and not(declined))
      SpellCastInterruptionUnchanged
    else if (interruptionEndedTriggeringCast)
      SpellCastInterruptionEndedTriggeringCast
    else if (decisionClosedFrame and declined)
      SpellCastInterruptionDeclinedResume
    else if (decisionClosedFrame)
      SpellCastInterruptionResume
    else
      SpellCastInterruptionUnchanged
}
