// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-expeditious-retreat-dash spell.invocation-feather-fall-mitigation spell.invocation-jump-movement-replacement spell.invocation-self-teleport

module battleRuntimeSpatialMovementSpellTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellCastResources.* from "./battle-runtime-spell-cast-resources"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"
  import battleRuntimeJumpMovement.* from "./battle-runtime-jump-movement"
  import battleRuntimeSelfTeleport.* from "./battle-runtime-self-teleport"
  import battleRuntimeMovement.* from "./battle-runtime-movement"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeMonkFocus.* from "./battle-runtime-monk-focus"

  run test_expeditious_retreat_immediate_dash_spends_bonus_action_and_slot = {
    val result = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    all {
      assert(result.actionAvailable),
      assert(not(result.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result, Fighter)),
      assert(result.dashMovementBonus == 30),
      assert(movementRemainingForFighterWithSpeedKind(result, WalkSpeedKind) == 60),
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction)),
    }
  }
  run test_expeditious_retreat_later_bonus_action_dash_uses_existing_dash_budget = {
    val cast = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    val nextFighterTurn = endTurn(endTurn(cast))
    val dashed = expeditiousRetreatBonusActionDashFighter(nextFighterTurn, WalkSpeedKind)
    all {
      assert(dashed.actionAvailable),
      assert(not(dashed.bonusActionAvailable)),
      assert(dashed.dashMovementBonus == 30),
      assert(movementRemainingForFighterWithSpeedKind(dashed, WalkSpeedKind) == 60),
      assert(dashed.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction)),
    }
  }
  run test_expeditious_retreat_concentration_cleanup_removes_bonus_action_dash_permission = {
    val cast = resolveExpeditiousRetreatDash(initialState, WalkSpeedKind)
    val broken = { ...cast, fighter: breakConcentration(cast.fighter) }
    val nextFighterTurn = endTurn(endTurn(broken))
    val attempted = expeditiousRetreatBonusActionDashFighter(nextFighterTurn, WalkSpeedKind)
    all {
      assert(not(broken.fighter.concentrating)),
      assert(not(broken.fighter.activeEffects.contains(ExpeditiousRetreatDashBonusAction))),
      assert(attempted == nextFighterTurn),
    }
  }
  run test_jump_movement_replacement_cast_targets_and_slot_scaling = {
    val firstSlot = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val secondSlot = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val unwillingTarget = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter), 2)
    val tooMany = resolveJumpMovementReplacementSpell(initialState, Set(Fighter, Goblin), Set(Fighter, Goblin), 1)
    all {
      assert(not(firstSlot.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(firstSlot, Fighter)),
      assert(firstSlot.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(secondSlot.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(secondSlot.goblin.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: false }))),
      assert(unwillingTarget == initialState),
      assert(tooMany == initialState),
    }
  }
  run test_feather_fall_reaction_targets_slot_and_descent_cap = {
    val selfTrigger = ReactorFalls({ reactor: Fighter })
    val visibleTrigger = VisibleCreatureWithinRangeFalls({ reactor: Fighter, fallingCreature: Goblin, distanceFeet: 60 })
    val distantTrigger = VisibleCreatureWithinRangeFalls({ reactor: Fighter, fallingCreature: Goblin, distanceFeet: 61 })
    val resolved = resolveFeatherFallSpell(initialState, visibleTrigger, Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val selfResolved = resolveFeatherFallSpell(initialState, selfTrigger, Set(Fighter), Set(Fighter), 1)
    val distant = resolveFeatherFallSpell(initialState, distantTrigger, Set(Goblin), Set(Goblin), 1)
    val noReaction = resolveFeatherFallSpell({ ...initialState, fighter: { ...initialState.fighter, reactionAvailable: false } }, selfTrigger, Set(Fighter), Set(Fighter), 1)
    val nonFallingTarget = resolveFeatherFallSpell(initialState, selfTrigger, Set(Fighter, Goblin), Set(Fighter), 2)
    val tooMany = resolveFeatherFallSpell(initialState, selfTrigger, Set(Fighter, Goblin), Set(Fighter, Goblin), 6)
    val goblinTurnSpentSlot = commitActorSpellSlotUse(endTurn(initialState), Goblin)
    val offTurnResolved = resolveFeatherFallSpell(goblinTurnSpentSlot, selfTrigger, Set(Fighter), Set(Fighter), 1)
    all {
      assert(not(resolved.fighter.reactionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(resolved.fighter.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(resolved.goblin.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(selfResolved.fighter.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(distant == initialState),
      assert(activeFeatherFallDescentRateCapFeetPerRound(resolved.fighter.activeEffects) == 60),
      assert(noReaction == { ...initialState, fighter: { ...initialState.fighter, reactionAvailable: false } }),
      assert(nonFallingTarget == initialState),
      assert(tooMany == initialState),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Goblin)),
      assert(battleActorHasCommittedSpellSlotUse(offTurnResolved, Fighter)),
    }
  }
  run test_feather_fall_landing_cleanup_prevents_falling_outcomes = {
    val resolved = resolveFeatherFallSpell(initialState, ReactorFalls({ reactor: Fighter }), Set(Fighter, Goblin), Set(Fighter, Goblin), 2)
    val fighterLanding = resolveFeatherFallLanding(resolved, Fighter)
    val fighterLandingState = featherFallLandingState(fighterLanding)
    val staleLanding = resolveFeatherFallLanding(fighterLandingState, Fighter)
    val staleLandingState = featherFallLandingState(staleLanding)
    val unaffectedLanding = resolveFeatherFallLanding(initialState, Goblin)
    val unaffectedLandingState = featherFallLandingState(unaffectedLanding)
    all {
      assert(featherFallLandingFallDamagePrevented(fighterLanding)),
      assert(featherFallLandingFallingPronePrevented(fighterLanding)),
      assert(not(fighterLandingState.fighter.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 })))),
      assert(fighterLandingState.goblin.activeEffects.contains(FeatherFallMitigation({ durationTicks: 10 }))),
      assert(not(fighterLandingState.fighter.prone)),
      assert(not(featherFallLandingFallDamagePrevented(staleLanding))),
      assert(not(featherFallLandingFallingPronePrevented(staleLanding))),
      assert(staleLandingState == fighterLandingState),
      assert(not(featherFallLandingFallDamagePrevented(unaffectedLanding))),
      assert(not(featherFallLandingFallingPronePrevented(unaffectedLanding))),
      assert(unaffectedLandingState == initialState),
    }
  }
  run test_jump_movement_replacement_spends_ten_movement_once_per_target_turn = {
    val cast = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val jumped = jumpMovementReplacementFighter(cast, 10, 30, JumpLegalLandingNoCheck)
    val secondSameTurn = jumpMovementReplacementFighter(jumped, 10, 30, JumpLegalLandingNoCheck)
    val nextFighterTurn = endTurn(endTurn(jumped))
    val nextTurnJumped = jumpMovementReplacementFighter(nextFighterTurn, 10, 30, JumpLegalLandingNoCheck)
    all {
      assert(jumped.fighter.movementSpent == 10),
      assert(jumped.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: true }))),
      assert(secondSameTurn == jumped),
      assert(nextFighterTurn.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 9, usedThisTurn: false }))),
      assert(nextTurnJumped.fighter.movementSpent == 10),
      assert(nextTurnJumped.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 9, usedThisTurn: true }))),
    }
  }
  run test_jump_movement_replacement_rejects_invalid_distance_cost_and_landing = {
    val cast = resolveJumpMovementReplacementSpell(initialState, Set(Fighter), Set(Fighter), 1)
    val tooCheap = jumpMovementReplacementFighter(cast, 5, 30, JumpLegalLandingAcrobaticsPassed)
    val tooFar = jumpMovementReplacementFighter(cast, 10, 35, JumpLegalLandingAcrobaticsPassed)
    val illegalLanding = jumpMovementReplacementFighter(cast, 10, 30, JumpIllegalLanding)
    val failedLanding = jumpMovementReplacementFighter(cast, 10, 30, JumpLegalLandingAcrobaticsFailed)
    all {
      assert(tooCheap == cast),
      assert(tooFar == cast),
      assert(illegalLanding == cast),
      assert(failedLanding.fighter.prone),
    }
  }
  run test_step_of_the_wind_focus_doubles_jump_movement_replacement_distance = {
    val jumpReady = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeEffects: initialState.fighter.activeEffects.union(Set(jumpMovementReplacementActiveEffect)),
      },
    }
    val stepped = monkFocusStepOfTheWindFocusFighter(jumpReady, 2, WalkSpeedKind).state
    val accepted = jumpMovementReplacementFighter(stepped, 10, 60, JumpLegalLandingNoCheck)
    val rejected = jumpMovementReplacementFighter(stepped, 10, 61, JumpLegalLandingNoCheck)
    all {
      assert(stepped.jumpDistanceMultiplier == 2),
      assert(accepted.fighter.movementSpent == 10),
      assert(accepted.fighter.activeEffects.contains(JumpMovementReplacement({ durationTicks: 10, usedThisTurn: true }))),
      assert(rejected == stepped),
    }
  }
  run test_misty_step_spends_bonus_action_slot_without_movement_or_opportunity_attack = {
    val movedAlready = { ...initialState, fighter: { ...initialState.fighter, movementSpent: 10 } }
    val teleported = resolveMistyStepSpell(movedAlready, 30, true)
    val tooFar = resolveMistyStepSpell(initialState, 31, true)
    val notVisibleUnoccupied = resolveMistyStepSpell(initialState, 30, false)
    all {
      assert(not(teleported.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(teleported, Fighter)),
      assert(teleported.fighter.movementSpent == 10),
      assert(not(mistyStepTeleportSpendsMovement)),
      assert(not(mistyStepTeleportProvokesOpportunityAttacks)),
      assert(mistyStepTeleportTransportsWornAndCarriedEquipment),
      assert(tooFar == initialState),
      assert(notVisibleUnoccupied == initialState),
    }
  }
}
