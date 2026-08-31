// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.REACTION_CASTING_TIME BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY

module battleRuntimeAfterDamageSaveReaction {
  pure def afterDamageSaveReactionEligible(
    triggerMatches: bool,
    procedureAvailable: bool,
    reactionAvailable: bool,
    spellSlotAvailable: bool,
  ): bool =
    triggerMatches and procedureAvailable and reactionAvailable and spellSlotAvailable

  pure def afterDamageSaveReactionDamageDice(slotLevel: int, baseDamageDice: int): int =
    if (slotLevel < 1) 0 else baseDamageDice + (slotLevel - 1)
}
