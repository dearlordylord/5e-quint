// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-command-approach-route spell.invocation-command-drop-held-object spell.invocation-command-flee-route spell.invocation-command-halt-grovel

// KERNEL-COVERAGE: qnt-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN
module battleRuntimeCommandNextTurn {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"

  pure def commandMaxTargets(slotLevel: int): int =
    slotLevel

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
    else
      commitActorSpellSlotUse({
        ...state,
        fighter: if (failedTargets.contains(Fighter)) {
          ...state.fighter,
          activeEffects: activeEffectsWithoutCommandPending(state.fighter.activeEffects, Fighter)
            .union(Set(commandPendingEffectFor(state, Fighter, option))),
        } else state.fighter,
        goblin: if (failedTargets.contains(Goblin)) {
          ...state.goblin,
          activeEffects: activeEffectsWithoutCommandPending(state.goblin.activeEffects, Fighter)
            .union(Set(commandPendingEffectFor(state, Goblin, option))),
        } else state.goblin,
        actionAvailable: false,
      }, Fighter)

  pure def commandPendingEffectsForActor(state: BattleState, actor: Actor, option: CommandOption): Set[ActiveEffect] =
    match actor {
      | Fighter => state.fighter.activeEffects
      | Goblin => state.goblin.activeEffects
    }
      .filter(effect => match effect {
        | CommandPending(data) =>
            data.option == option and data.expiresAtActor == actor and data.expiresAtRound == state.initiative.round
        | _ => false
      })
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
    if (hasPendingCommand) CommandGrovelAppliesProneEndsTurn else CommandGrovelIgnored

  pure def commandDropFollowOutcome(hasPendingCommand: bool, heldObjectCount: int): CommandDropFollowOutcome =
    if (hasPendingCommand and heldObjectCount >= 0)
      CommandDropObjectsAndEndsTurn({ droppedObjectCount: heldObjectCount })
    else
      CommandDropIgnored

  pure def commandHaltFollowOutcome(hasPendingCommand: bool): CommandHaltFollowOutcome =
    if (hasPendingCommand) CommandHaltSuppressesActionBonusAndMovement else CommandHaltIgnored

  pure def commandApproachFollowOutcome(
    hasMovementAvailable: bool,
    movementCanBeSpent: bool,
    movedWithinFiveFeetOfCaster: bool,
  ): CommandApproachFollowOutcome =
    if (not(hasMovementAvailable))
      CommandApproachNoMovement
    else if (not(movementCanBeSpent))
      CommandApproachMovementRejected
    else if (movedWithinFiveFeetOfCaster)
      CommandApproachMovementEndsTurn
    else
      CommandApproachMovementContinues

  pure def commandFleeFollowOutcome(
    hasMovementAvailable: bool,
    movementCost: int,
    movementRemaining: int,
    movementCanBeSpent: bool,
    provokesOpportunityAttack: bool,
  ): CommandFleeFollowOutcome =
    if (not(hasMovementAvailable))
      CommandFleeNoMovementEndsTurn
    else if (movementCost != movementRemaining or not(movementCanBeSpent))
      CommandFleeMovementRejected
    else if (provokesOpportunityAttack)
      CommandFleeOpportunityAttackContinuation
    else
      CommandFleeMovementEndsTurn
}
