// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.REACTION.OFFER_DECLINE_RESUME BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS

module triggeredArmorDefense {
  pure val triggeredArmorDefenseArmorClassBonus = 5
  pure val triggeredArmorDefenseDurationRounds = 1

  pure def triggeredArmorDefenseReactionAdmitted(
    triggerMatches: bool,
    reactorIsTarget: bool,
    reactorCanReact: bool,
    reactorCanExpendSpellSlot: bool,
  ): bool =
    triggerMatches and
      reactorIsTarget and
      reactorCanReact and
      reactorCanExpendSpellSlot

  pure def triggeredArmorDefenseClosesDecision(
    decisionChangedState: bool,
  ): bool =
    decisionChangedState

  pure def triggeredArmorDefensePreventsAutomaticForcePackets(
    defenseActive: bool,
  ): bool =
    defenseActive
}
