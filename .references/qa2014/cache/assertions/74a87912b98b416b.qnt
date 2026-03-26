// Source: https://rpg.stackexchange.com/q/216873
module _qa_74a87912b98b416b {
  import dnd.* from "./dnd"

  // Can a Pact of the Chain Imp familiar use its Shapechanger on its own?
  // Accepted answer: yes; Shapechanger modifies movement speeds only, all other stats unchanged.
  run qa_imp_shapechanger_speed_not_stats = {
    // Imp familiar: 21 HP, unharmed, no conditions
    val impHp = 21
    val impState = freshCreature(impHp)
    // Imp turn: walk speed 20ft (per Imp stat block), action available
    val impTurn: TurnState = {
      movementRemaining: 20,
      effectiveSpeed: 20,
      actionsRemaining: 1,
      attackActionUsed: false,
      bonusActionUsed: false,
      reactionAvailable: true,
      freeInteractionsRemaining: 1,
      extraAttacksRemaining: 0,
      disengaged: false,
      dodging: false,
      readiedAction: false,
      bonusActionSpellCast: false,
      nonCantripActionSpellCast: false,
      surprised: false,
    }
    // Imp uses its action for Shapechanger (modeled as AUseObject — a creature ability action)
    val afterAction = pUseAction(impTurn, impState, AUseObject)
    // Shapechanger → raven form: fly 60 ft; 0 ft moved before shapchanging this turn
    val afterShapechange = pSwitchSpeedType(afterAction, 60, 0)
    // Key assertions:
    // (1) Action was consumed
    // (2) Fly speed (60ft) is now available — movement type switched
    // (3) Creature stat block (HP, conditions) is entirely unchanged
    assert(
      afterShapechange.actionsRemaining == 0
      and afterShapechange.effectiveSpeed == 60
      and afterShapechange.movementRemaining == 60
      and impState.hp == impHp
      and not(impState.prone)
      and not(impState.blinded)
      and not(impState.paralyzed)
      and not(impState.poisoned)
      and impState.dead == false
    )
  }
}
