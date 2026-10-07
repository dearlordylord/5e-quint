// RAW: monsters.md: Spellcasting; playing-the-game.md: Your Turn, Bonus Actions.
module statBlockAtWillSpellcastingGroup {
  import statBlockSpellcastingProcedure.* from "./stat-block-spellcasting-procedure"
  import actionTurnProcedures as turn from "./action-turn-procedures"

  // At-will capacity has no resource ledger. Group selection and downstream
  // procedure admission precede action spending, so rejected acts are atomic.
  pure def invokeAtWillSpellcastingGroup(
    resources: turn::ActionResourceState,
    section: StatBlockSpellcastingActionSection,
    group: StatBlockSpellcastingGroup,
    invocationOrdinal: int,
    executionAdmitted: bool
  ): turn::ActionResourceSpendResult = {
    val selected = match group {
      | AtWillGroup(data) =>
          invocationOrdinal >= 1 and
          invocationOrdinal <= data.invocations.length() and
          executionAdmitted
      | LimitedGroup(_) => false
    }
    if (not(selected)) { resources: resources, admitted: false }
    else turn::spendActionResources(
      resources,
      if (section == SpellcastingBonusActions) turn::BonusActionCost
      else turn::StandardActionCost(turn::MagicAction)
    )
  }
}
