// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.ACTION.OBJECT_INTERACTION_COST
module objectInteractionCostCore {
  // .references/srd-5.2.1/playing-the-game.md "Your Turn", Interacting with
  // Things: "You can interact with one object or feature of the environment
  // for free, during either your move or action ... If you want to interact
  // with a second object, you need to take the Utilize action. Some magic
  // items and other special objects always require an action to use ... The
  // GM might require you to use an action for any of these activities when it
  // needs special care or when it presents an unusual obstacle."
  //
  // .references/srd-5.2.1/rules-glossary.md "Utilize [Action]": "When an
  // object requires an action for its use, you take the Utilize action."
  //
  // requiresUtilize is the table's ruling on the object. The free interaction
  // belongs to the creature's own turn and comes back at the start of its
  // next turn. Off its turn the creature holds an action only when it
  // releases a readied Utilize action (rules-glossary.md "Ready [Action]"),
  // so that release can interact with an object but never for free
  // (ASSUMPTIONS.md A60).

  type ObjectInteractionCharge = FreeObjectInteraction | UtilizeAction

  type ObjectInteractionTurn = {
    ownTurn: bool,
    canAct: bool,
    freeInteractionAvailable: bool,
    actionAvailable: bool,
  }

  type ObjectInteractionOutcome = {
    charge: ObjectInteractionCharge,
    turn: ObjectInteractionTurn,
  }

  pure def objectInteractionCharge(
    turn: ObjectInteractionTurn,
    requiresUtilize: bool,
  ): Set[ObjectInteractionOutcome] =
    if (not(turn.canAct))
      Set()
    else if (not(requiresUtilize) and turn.ownTurn and turn.freeInteractionAvailable)
      Set({
        charge: FreeObjectInteraction,
        turn: { ...turn, freeInteractionAvailable: false },
      })
    else if (turn.actionAvailable)
      Set({
        charge: UtilizeAction,
        turn: { ...turn, actionAvailable: false },
      })
    else
      Set()

  pure def startOwnTurn(turn: ObjectInteractionTurn): ObjectInteractionTurn = {
    ...turn,
    ownTurn: true,
    freeInteractionAvailable: true,
    actionAvailable: true,
  }

  // Off-turn, releasing a readied Utilize action: the action Ready held, and
  // no free interaction.
  pure def releaseReadiedUtilize(turn: ObjectInteractionTurn): ObjectInteractionTurn = {
    ...turn,
    ownTurn: false,
    freeInteractionAvailable: false,
    actionAvailable: true,
  }
}
