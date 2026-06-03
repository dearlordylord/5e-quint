// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-jump-movement-replacement

module battleRuntimeJumpMovement {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeMovement.* from "./battle-runtime-movement"

  pure def jumpMovementReplacementMaxTargets(slotLevel: int): int =
    if (slotLevel < 1) 0 else slotLevel

  pure def jumpMovementReplacementActiveEffect(): ActiveEffect =
    JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false })

  pure def jumpMovementReplacementMaxDistanceFeet(state: BattleState): int =
    30 * state.jumpDistanceMultiplier

  pure def jumpMovementReplacementLandingIsLegal(landing: JumpMovementLandingFact): bool =
    landing != JumpIllegalLanding

  pure def jumpMovementReplacementLandingAppliesProne(landing: JumpMovementLandingFact): bool =
    landing == JumpLegalLandingAcrobaticsFailed

  pure def activeEffectsContainAvailableJumpMovementReplacement(effects: Set[ActiveEffect]): bool =
    effects.exists(effect => match effect {
      | JumpMovementReplacement(data) => not(data.usedThisTurn)
      | _ => false
    })

  pure def activeEffectsAfterJumpMovementReplacementUse(effects: Set[ActiveEffect]): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | JumpMovementReplacement(data) => JumpMovementReplacement({ ...data, usedThisTurn: true })
      | _ => effect
    })

  pure def resolveJumpMovementReplacementSpell(state: BattleState, targets: Set[Actor], willingTargets: Set[Actor], slotLevel: int): BattleState =
    if (
      currentActor(state) == Fighter and
      state.bonusActionAvailable and
      canExpendSpellSlotThisTurn(state) and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      targets.size() >= 1 and
      targets.forall(target => willingTargets.contains(target)) and
      targets.size() <= jumpMovementReplacementMaxTargets(slotLevel)
    ) {
      val effect = jumpMovementReplacementActiveEffect
      commitActorSpellSlotUse({
        ...state,
        fighter: if (targets.contains(Fighter))
          { ...state.fighter, activeEffects: state.fighter.activeEffects.union(Set(effect)) }
        else
          state.fighter,
        goblin: if (targets.contains(Goblin))
          { ...state.goblin, activeEffects: state.goblin.activeEffects.union(Set(effect)) }
        else
          state.goblin,
        bonusActionAvailable: false,
      }, Fighter)
    } else {
      state
    }

  pure def jumpMovementReplacementFighter(
    state: BattleState,
    movementCost: int,
    jumpDistance: int,
    landing: JumpMovementLandingFact
  ): BattleState =
    if (
      currentActor(state) == Fighter and
      movementCost == 10 and
      jumpDistance > 0 and
      jumpDistance <= jumpMovementReplacementMaxDistanceFeet(state) and
      jumpMovementReplacementLandingIsLegal(landing) and
      activeEffectsContainAvailableJumpMovementReplacement(state.fighter.activeEffects) and
      fighterCanMoveWithSpeedKind(state, WalkSpeedKind, movementCost)
    ) {
      val moved = applyFighterMovementWithSpeedKind(state, WalkSpeedKind, movementCost)
      {
        ...moved,
        fighter: {
          ...moved.fighter,
          activeEffects: activeEffectsAfterJumpMovementReplacementUse(moved.fighter.activeEffects),
          prone: moved.fighter.prone or jumpMovementReplacementLandingAppliesProne(landing),
        },
      }
    } else {
      state
    }
}
