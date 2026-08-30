// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeSpellCastInterruptionReaction {
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
