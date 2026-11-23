// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: parity-witness BATTLE.ACTION.OBJECT_INTERACTION_COST
// RAW: .references/srd-5.2.1/playing-the-game.md "Your Turn", Interacting with
// Things; .references/srd-5.2.1/rules-glossary.md "Utilize [Action]".
// Focused witness of one creature's object interactions across its own turns
// and another creature's turns. Rules authority is object-interaction-cost-core.qnt.
module battleRuntimeObjectInteractionMbt {
  import objectInteractionCostCore.* from "../shared-algebras/proofs/rule-core/object-interaction-cost-core"

  // The interacting creature's turn. Off its turn it has neither its free
  // interaction nor its action: those belong to its own turn.
  var qTurn: ObjectInteractionTurn
  // "none", "free", "utilize" or "refused": the last interaction's charge.
  var qLastCharge: str

  pure val offTurn: ObjectInteractionTurn = {
    ownTurn: false,
    canAct: true,
    freeInteractionAvailable: false,
    actionAvailable: false,
  }

  pure def chargeLabel(charge: ObjectInteractionCharge): str =
    match charge {
      | FreeObjectInteraction => "free"
      | UtilizeAction => "utilize"
    }

  action init = all {
    qTurn' = startOwnTurn(offTurn),
    qLastCharge' = "none",
  }

  action interact(requiresUtilize: bool): bool = {
    val outcomes = objectInteractionCharge(qTurn, requiresUtilize)
    if (outcomes.size() == 0)
      all { qTurn' = qTurn, qLastCharge' = "refused" }
    else
      nondet outcome = outcomes.oneOf()
      all { qTurn' = outcome.turn, qLastCharge' = chargeLabel(outcome.charge) }
  }

  action doInteractFree = interact(false)

  action doInteractNeedingUtilize = interact(true)

  action doEndOwnTurn = all {
    qTurn.ownTurn,
    qTurn' = offTurn,
    qLastCharge' = "none",
  }

  action doEndOtherTurn = all {
    not(qTurn.ownTurn),
    qTurn' = startOwnTurn(qTurn),
    qLastCharge' = "none",
  }

  action step = any {
    doInteractFree,
    doInteractNeedingUtilize,
    doEndOwnTurn,
    doEndOtherTurn,
  }
}
