// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES

module unitFeatureActionCountCore {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"

  // RAW anchors:
  // - Classes/Fighter.md: Action Surge, Extra Attack, Two Extra Attacks, and
  //   Three Extra Attacks.
  // - Classes/Barbarian.md, Classes/Monk.md, Classes/Paladin.md,
  //   Classes/Ranger.md, and Classes/Warlock.md: Extra Attack variants.
  // - Rules-Glossary.md: Attack action and Moving between Attacks.
  // - UBIQUITOUS_LANGUAGE.md: Action Surge and Multiattack/Extra Attack.

  type ActionSurgeActionGrant =
    | NoActionSurgeActionGrant
    | ActionSurgeActionAvailable
    | ActionSurgeActionSpent

  type ActionSurgeState = {
    pool: FeatureUsePool,
    actionGrant: ActionSurgeActionGrant,
  }

  type ActionSurgeActionResult = {
    actionSurge: ActionSurgeState,
    actionWasTaken: bool,
  }

  type AttackActionAttackCountState = {
    actionAvailable: bool,
    extraAttackSlotOpen: bool,
    attacksResolved: int,
    movementSegmentsTaken: int,
    turnEnded: bool,
  }

  type AttackActionAttackCountFacts = {
    additionalAttacks: int,
  }

  type AttackActionAttackCountResult = {
    state: AttackActionAttackCountState,
    actionWasSpent: bool,
    attackWasResolved: bool,
  }

  pure def initialAttackActionAttackCountState: AttackActionAttackCountState = {
    actionAvailable: true,
    extraAttackSlotOpen: false,
    attacksResolved: 0,
    movementSegmentsTaken: 0,
    turnEnded: false,
  }

  pure def legalAttackActionAttackCountFacts(
    facts: AttackActionAttackCountFacts
  ): bool = facts.additionalAttacks == 1

  pure def takeAttackActionWithAttackCountScaling(
    state: AttackActionAttackCountState,
    facts: AttackActionAttackCountFacts
  ): AttackActionAttackCountResult = {
    val admitted = all {
      legalAttackActionAttackCountFacts(facts),
      state.actionAvailable,
      not(state.extraAttackSlotOpen),
      not(state.turnEnded),
    }
    {
      state:
        if (admitted) {
          state.with("actionAvailable", false)
            .with("extraAttackSlotOpen", true)
            .with("attacksResolved", state.attacksResolved + 1)
        } else state,
      actionWasSpent: admitted,
      attackWasResolved: admitted,
    }
  }

  pure def resolveExtraAttackSlot(
    state: AttackActionAttackCountState
  ): AttackActionAttackCountResult = {
    val admitted = all {
      state.extraAttackSlotOpen,
      not(state.turnEnded),
    }
    {
      state:
        if (admitted) {
          state.with("extraAttackSlotOpen", false)
            .with("attacksResolved", state.attacksResolved + 1)
        } else state,
      actionWasSpent: false,
      attackWasResolved: admitted,
    }
  }

  pure def moveDuringAttackActionAttackCount(
    state: AttackActionAttackCountState
  ): AttackActionAttackCountState =
    if (state.turnEnded) state
    else state.with("movementSegmentsTaken", state.movementSegmentsTaken + 1)

  pure def endTurnDuringAttackActionAttackCount(
    state: AttackActionAttackCountState
  ): AttackActionAttackCountState =
    state.with("extraAttackSlotOpen", false).with("turnEnded", true)

  pure def legalActionSurgeState(state: ActionSurgeState): bool = all {
    legalFeatureUsePool(state.pool),
    state.actionGrant.in(Set(
      NoActionSurgeActionGrant,
      ActionSurgeActionAvailable,
      ActionSurgeActionSpent
    )),
    state.actionGrant == NoActionSurgeActionGrant or state.pool.usesRemaining < state.pool.maximumUses,
  }

  pure def initialActionSurgeState(pool: FeatureUsePool): ActionSurgeState = {
    pool: pool,
    actionGrant: NoActionSurgeActionGrant,
  }

  pure def startTurnActionSurge(state: ActionSurgeState): ActionSurgeState =
    state.with("actionGrant", NoActionSurgeActionGrant)

  pure def activateActionSurge(state: ActionSurgeState, onTurn: bool): ActionSurgeState =
    if (not(onTurn) or state.actionGrant != NoActionSurgeActionGrant or state.pool.usesRemaining <= 0) state
    else {
      pool: spendFeatureUsePool(state.pool),
      actionGrant: ActionSurgeActionAvailable,
    }

  pure def actionSurgePermitsAction(requestedAction: StandardAction): bool =
    requestedAction != MagicAction

  pure def spendActionSurgeAction(
    state: ActionSurgeState,
    requestedAction: StandardAction
  ): ActionSurgeActionResult =
    if (state.actionGrant != ActionSurgeActionAvailable or not(actionSurgePermitsAction(requestedAction))) {
      actionSurge: state,
      actionWasTaken: false,
    } else {
      actionSurge: state.with("actionGrant", ActionSurgeActionSpent),
      actionWasTaken: true,
    }
}
