// -*- mode: Bluespec; -*-

module objectInteractionCostCoreExamples {
  import objectInteractionCostCore.* from "./object-interaction-cost-core"

  pure val freshTurn: ObjectInteractionTurn = {
    ownTurn: true,
    canAct: true,
    freeInteractionAvailable: true,
    actionAvailable: true,
  }

  pure val afterFree: ObjectInteractionTurn = {
    ...freshTurn,
    freeInteractionAvailable: false,
  }

  run theFirstObjectIsFreeAndTheSecondTakesTheUtilizeAction = all {
    assert(objectInteractionCharge(freshTurn, false)
      == Set({ charge: FreeObjectInteraction, turn: afterFree })),
    assert(objectInteractionCharge(afterFree, false)
      == Set({ charge: UtilizeAction, turn: { ...afterFree, actionAvailable: false } })),
    assert(objectInteractionCharge({ ...afterFree, actionAvailable: false }, false) == Set()),
  }

  run anObjectThatNeedsAnActionTakesTheUtilizeAction = all {
    assert(objectInteractionCharge(freshTurn, true)
      == Set({ charge: UtilizeAction, turn: { ...freshTurn, actionAvailable: false } })),
    // The free interaction stays for another object.
    assert(objectInteractionCharge({ ...freshTurn, actionAvailable: false }, false)
      == Set({ charge: FreeObjectInteraction,
               turn: { ...afterFree, actionAvailable: false } })),
    assert(objectInteractionCharge({ ...freshTurn, actionAvailable: false }, true) == Set()),
  }

  pure val offTurn: ObjectInteractionTurn = {
    ownTurn: false,
    canAct: true,
    freeInteractionAvailable: false,
    actionAvailable: false,
  }

  run noInteractionOffTurnOrWhileUnableToAct = all {
    assert(objectInteractionCharge(offTurn, false) == Set()),
    assert(objectInteractionCharge({ ...offTurn, freeInteractionAvailable: true }, false) == Set()),
    assert(objectInteractionCharge({ ...freshTurn, canAct: false }, false) == Set()),
  }

  run aReleasedReadiedInteractionTakesTheReadiedUtilizeAction = all {
    assert(objectInteractionCharge(releaseReadiedUtilize(offTurn), false)
      == Set({ charge: UtilizeAction, turn: offTurn })),
    assert(objectInteractionCharge(releaseReadiedUtilize(offTurn), true)
      == Set({ charge: UtilizeAction, turn: offTurn })),
    assert(objectInteractionCharge({ ...releaseReadiedUtilize(offTurn), canAct: false }, false)
      == Set()),
  }

  run theFreeInteractionComesBackOnTheNextTurn = all {
    assert(startOwnTurn({ ...afterFree, actionAvailable: false, ownTurn: false }) == freshTurn),
  }
}
