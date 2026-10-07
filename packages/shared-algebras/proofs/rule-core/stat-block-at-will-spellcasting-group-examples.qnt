module statBlockAtWillSpellcastingGroupExamples {
  import statBlockAtWillSpellcastingGroup.* from "./stat-block-at-will-spellcasting-group"
  import statBlockSpellcastingProcedure.* from "./stat-block-spellcasting-procedure"
  import actionTurnProcedures as turn from "./action-turn-procedures"
  import attackDamageComposition.* from "./attack-damage-composition"

  pure val ready = {
    actionQuota: ActionAvailable,
    bonusActionAvailable: true,
    currentActorOwnsTurn: true,
  }
  pure val group = AtWillGroup({ invocations: List(Unrestricted, Unrestricted) })

  run test_action_spends_exactly_one_action = {
    val first = invokeAtWillSpellcastingGroup(ready, SpellcastingActions, group, 1, true)
    val second = invokeAtWillSpellcastingGroup(first.resources, SpellcastingActions, group, 2, true)
    all {
      assert(first.admitted),
      assert(first.resources.actionQuota == ActionSpent),
      assert(first.resources.bonusActionAvailable),
      assert(not(second.admitted)),
      assert(second.resources == first.resources),
    }
  }

  run test_bonus_action_spends_only_bonus_action = {
    val cast = invokeAtWillSpellcastingGroup(ready, SpellcastingBonusActions, group, 2, true)
    all {
      assert(cast.admitted),
      assert(cast.resources.actionQuota == ActionAvailable),
      assert(not(cast.resources.bonusActionAvailable)),
    }
  }

  run test_rejected_selection_and_execution_are_atomic = {
    all {
      assert(invokeAtWillSpellcastingGroup(ready, SpellcastingActions, group, 0, true).resources == ready),
      assert(not(invokeAtWillSpellcastingGroup(ready, SpellcastingActions, group, 3, true).admitted)),
      assert(invokeAtWillSpellcastingGroup(ready, SpellcastingBonusActions, group, 1, false).resources == ready),
      assert(not(invokeAtWillSpellcastingGroup(ready, SpellcastingActions, group, 1, false).admitted)),
    }
  }

  run test_at_will_can_repeat_on_a_later_turn_without_usage_state = {
    val first = invokeAtWillSpellcastingGroup(ready, SpellcastingActions, group, 1, true)
    val laterTurn = invokeAtWillSpellcastingGroup(ready, SpellcastingActions, group, 1, true)
    all { assert(first == laterTurn), assert(laterTurn.admitted) }
  }
}
