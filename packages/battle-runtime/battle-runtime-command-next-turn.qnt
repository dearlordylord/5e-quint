// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel

// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
module battleRuntimeCommandNextTurn {
  import battleRuntimeCompelledNextTurnBehavior.* from "./battle-runtime-compelled-next-turn-behavior"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeActorCombatants.* from "./battle-runtime-actor-combatants"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def commandMaxTargets(slotLevel: int): int =
    compelledBehaviorMaximumTargets(slotLevel)

  pure def commandPendingEffectFor(state: BattleState, targetActor: Actor, option: CommandOption): ActiveEffect =
    CommandPending({
      source: Fighter,
      option: option,
      expiresAtActor: targetActor,
      expiresAtRound: if (currentActor(state) == targetActor) state.initiative.round + 1 else state.initiative.round,
    })

  pure def activeEffectsWithoutCommandPending(effects: Set[ActiveEffect], source: Actor): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | CommandPending(data) => data.source != source
      | _ => true
    })

  pure def combatantWithCommandPending(
    state: BattleState,
    targetActor: Actor,
    option: CommandOption,
  ): Combatant = {
    val combatant = combatantForActor(state, targetActor)
    {
      ...combatant,
      activeEffects: activeEffectsWithoutCommandPending(combatant.activeEffects, Fighter)
        .union(Set(commandPendingEffectFor(state, targetActor, option))),
    }
  }

  pure def resolveCommand(
    state: BattleState,
    targets: Set[Actor],
    failedTargets: Set[Actor],
    slotLevel: int,
    option: CommandOption,
  ): BattleState =
    if (
      not(state.actionAvailable) or
      currentActor(state) != Fighter or
      state.fighter.unconscious or
      state.fighter.incapacitated or
      fighterHasRage(state) or
      not(canExpendSpellSlotThisTurn(state)) or
      targets.size() < 1 or
      targets.size() > commandMaxTargets(slotLevel) or
      not(failedTargets.forall(target => targets.contains(target)))
    )
      state
    else {
      val withFighterPending = if (failedTargets.contains(Fighter))
        stateWithActorCombatant(state, Fighter, combatantWithCommandPending(state, Fighter, option))
      else
        state
      val withFailedTargetPending = if (failedTargets.contains(Goblin))
        stateWithActorCombatant(withFighterPending, Goblin, combatantWithCommandPending(withFighterPending, Goblin, option))
      else
        withFighterPending
      commitActorSpellSlotUse({ ...withFailedTargetPending, actionAvailable: false }, Fighter)
    }

  pure def commandPendingEffectsForActor(state: BattleState, actor: Actor, option: CommandOption): Set[ActiveEffect] =
    combatantForActor(state, actor).activeEffects
      .filter(effect => match effect {
        | CommandPending(data) =>
            data.option == option and data.expiresAtActor == actor and data.expiresAtRound == state.initiative.round
        | _ => false
      })

  pure def stateWithoutCommandPendingForActor(
    state: BattleState,
    actor: Actor,
    option: CommandOption,
  ): BattleState = {
    val combatant = combatantForActor(state, actor)
    stateWithActorCombatant(state, actor, {
      ...combatant,
      activeEffects: combatant.activeEffects.exclude(commandPendingEffectsForActor(state, actor, option)),
    })
  }

  type CommandGrovelFollowOutcome =
    | CommandGrovelIgnored
    | CommandGrovelAppliesProneEndsTurn

  type CommandDropFollowOutcome =
    | CommandDropIgnored
    | CommandDropObjectsAndEndsTurn({ droppedObjectCount: int })

  type CommandHaltFollowOutcome =
    | CommandHaltIgnored
    | CommandHaltSuppressesActionBonusAndMovement

  type CommandApproachFollowOutcome =
    | CommandApproachNoMovement
    | CommandApproachMovementRejected
    | CommandApproachMovementContinues
    | CommandApproachMovementEndsTurn

  type CommandFleeFollowOutcome =
    | CommandFleeNoMovementEndsTurn
    | CommandFleeMovementRejected
    | CommandFleeOpportunityAttackContinuation
    | CommandFleeMovementEndsTurn

  pure def commandGrovelFollowOutcome(hasPendingCommand: bool): CommandGrovelFollowOutcome =
    match compelledGrovelOutcome(hasPendingCommand) {
      | CompelledGrovelIgnored => CommandGrovelIgnored
      | CompelledGrovelAppliesProneEndsTurn => CommandGrovelAppliesProneEndsTurn
    }

  pure def commandDropFollowOutcome(hasPendingCommand: bool, heldObjectCount: int): CommandDropFollowOutcome =
    match compelledDropOutcome(hasPendingCommand, heldObjectCount) {
      | CompelledDropObjectsAndEndsTurn(data) => CommandDropObjectsAndEndsTurn(data)
      | CompelledDropIgnored => CommandDropIgnored
    }

  pure def commandHaltFollowOutcome(hasPendingCommand: bool): CommandHaltFollowOutcome =
    match compelledHaltOutcome(hasPendingCommand) {
      | CompelledHaltIgnored => CommandHaltIgnored
      | CompelledHaltSuppressesActionBonusAndMovement => CommandHaltSuppressesActionBonusAndMovement
    }

  pure def commandApproachFollowOutcome(
    hasMovementAvailable: bool,
    movementCanBeSpent: bool,
    movedWithinFiveFeetOfCaster: bool,
  ): CommandApproachFollowOutcome =
    match compelledApproachOutcome(
      hasMovementAvailable,
      movementCanBeSpent,
      movedWithinFiveFeetOfCaster,
    ) {
      | CompelledApproachNoMovement => CommandApproachNoMovement
      | CompelledApproachMovementRejected => CommandApproachMovementRejected
      | CompelledApproachMovementContinues => CommandApproachMovementContinues
      | CompelledApproachMovementEndsTurn => CommandApproachMovementEndsTurn
    }

  pure def commandFleeFollowOutcome(
    hasMovementAvailable: bool,
    movementCost: int,
    movementRemaining: int,
    movementCanBeSpent: bool,
    provokesOpportunityAttack: bool,
  ): CommandFleeFollowOutcome =
    match compelledFleeOutcome(
      hasMovementAvailable,
      movementCost,
      movementRemaining,
      movementCanBeSpent,
      provokesOpportunityAttack,
    ) {
      | CompelledFleeNoMovementEndsTurn => CommandFleeNoMovementEndsTurn
      | CompelledFleeMovementRejected => CommandFleeMovementRejected
      | CompelledFleeReactionContinuation => CommandFleeOpportunityAttackContinuation
      | CompelledFleeMovementEndsTurn => CommandFleeMovementEndsTurn
    }
}
