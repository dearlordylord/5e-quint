// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-jump-movement-replacement

module battleRuntimeJumpMovement {
  import battleRuntimeFixedCostMovementReplacement.* from "./battle-runtime-fixed-cost-movement-replacement"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeFighterRageFacts.* from "./battle-runtime-fighter-rage-facts"
  import battleRuntimeMovement.* from "./battle-runtime-movement"

  pure def jumpMovementReplacementMaxTargets(slotLevel: int): int =
    fixedCostMovementReplacementMaximumTargets(slotLevel, 1, 1, 1)

  pure def jumpMovementReplacementActiveEffect(): ActiveEffect =
    JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false })

  pure def jumpMovementReplacementMaxDistanceFeet(state: BattleState): int =
    fixedCostMovementReplacementMaximumDistanceFeet(30, state.jumpDistanceMultiplier)

  pure def jumpMovementReplacementLandingProjection(
    landing: JumpMovementLandingFact,
  ): FixedCostMovementReplacementLanding =
    match landing {
      | JumpLegalLandingNoCheck => FixedCostMovementReplacementLegalLanding
      | JumpLegalLandingAcrobaticsPassed => FixedCostMovementReplacementLegalLanding
      | JumpLegalLandingAcrobaticsFailed => FixedCostMovementReplacementLegalLandingWithProne
      | JumpIllegalLanding => FixedCostMovementReplacementIllegalLanding
    }

  pure def jumpMovementReplacementLandingIsLegal(landing: JumpMovementLandingFact): bool =
    fixedCostMovementReplacementLandingIsLegal(
      jumpMovementReplacementLandingProjection(landing),
    )

  pure def jumpMovementReplacementLandingAppliesProne(landing: JumpMovementLandingFact): bool =
    fixedCostMovementReplacementLandingAppliesProne(
      jumpMovementReplacementLandingProjection(landing),
    )

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
      fixedCostMovementReplacementUseAdmitted(
        movementCost,
        10,
        jumpDistance,
        jumpMovementReplacementMaxDistanceFeet(state),
        jumpMovementReplacementLandingIsLegal(landing),
        activeEffectsContainAvailableJumpMovementReplacement(state.fighter.activeEffects),
        fighterCanMoveWithSpeedKind(state, WalkSpeedKind, movementCost),
      )
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
