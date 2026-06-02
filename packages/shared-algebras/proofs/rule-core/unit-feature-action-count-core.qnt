// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.action-surge-resource unit-feature.attack-action-attack-count-scaling
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES

module unitFeatureActionCountCore {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import attackActionAdditionalAttacks.* from "./attack-action-additional-attacks"
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

  type AttackActionAdditionalAttacksAdmission =
    | UnsupportedAdditionalAttackCount
    | SupportedAdditionalAttackCount({
      additionalAttacks: AttackActionAdditionalAttacks,
    })

  type AttackActionAttackCountState = {
    actionAvailable: bool,
    additionalAttacksRemaining: AttackActionAdditionalAttacks,
    attacksResolved: int,
    movementSegmentsTaken: int,
    turnEnded: bool,
  }

  type AttackActionAttackCountFacts = {
    additionalAttacks: AttackActionAdditionalAttacks,
  }

  type AttackActionAttackCountResult = {
    state: AttackActionAttackCountState,
    actionWasSpent: bool,
    attackWasResolved: bool,
  }

  pure def initialAttackActionAttackCountState: AttackActionAttackCountState = {
    actionAvailable: true,
    additionalAttacksRemaining: NoAdditionalAttacks,
    attacksResolved: 0,
    movementSegmentsTaken: 0,
    turnEnded: false,
  }

  pure def admitAttackActionAdditionalAttacks(
    rawAdditionalAttacks: int
  ): AttackActionAdditionalAttacksAdmission =
    if (rawAdditionalAttacks == 0)
      SupportedAdditionalAttackCount({ additionalAttacks: NoAdditionalAttacks })
    else if (rawAdditionalAttacks == 1)
      SupportedAdditionalAttackCount({ additionalAttacks: OneAdditionalAttack })
    else if (rawAdditionalAttacks == 2)
      SupportedAdditionalAttackCount({ additionalAttacks: TwoAdditionalAttacks })
    else if (rawAdditionalAttacks == 3)
      SupportedAdditionalAttackCount({ additionalAttacks: ThreeAdditionalAttacks })
    else UnsupportedAdditionalAttackCount

  pure def legalAttackActionAdditionalAttacks(
    additionalAttacks: AttackActionAdditionalAttacks
  ): bool =
    additionalAttacks.in(Set(
      NoAdditionalAttacks,
      OneAdditionalAttack,
      TwoAdditionalAttacks,
      ThreeAdditionalAttacks
    ))

  pure def decrementAdditionalAttacks(
    additionalAttacks: AttackActionAdditionalAttacks
  ): AttackActionAdditionalAttacks =
    match additionalAttacks {
      | NoAdditionalAttacks => NoAdditionalAttacks
      | OneAdditionalAttack => NoAdditionalAttacks
      | TwoAdditionalAttacks => OneAdditionalAttack
      | ThreeAdditionalAttacks => TwoAdditionalAttacks
    }

  pure def legalAttackActionAttackCountFacts(
    facts: AttackActionAttackCountFacts
  ): bool =
    legalAttackActionAdditionalAttacks(facts.additionalAttacks)

  pure def takeAttackActionWithAttackCountScaling(
    state: AttackActionAttackCountState,
    facts: AttackActionAttackCountFacts
  ): AttackActionAttackCountResult = {
    val admitted = all {
      legalAttackActionAttackCountFacts(facts),
      state.actionAvailable,
      state.additionalAttacksRemaining == NoAdditionalAttacks,
      not(state.turnEnded),
    }
    {
      state:
        if (admitted) {
          state.with("actionAvailable", false)
            .with("additionalAttacksRemaining", facts.additionalAttacks)
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
      state.additionalAttacksRemaining != NoAdditionalAttacks,
      not(state.turnEnded),
    }
    {
      state:
        if (admitted) {
          state.with(
            "additionalAttacksRemaining",
            decrementAdditionalAttacks(state.additionalAttacksRemaining)
          )
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
    state.with("additionalAttacksRemaining", NoAdditionalAttacks)
      .with("turnEnded", true)

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
