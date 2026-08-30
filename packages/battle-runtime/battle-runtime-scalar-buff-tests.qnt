// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-condition-immunity-turn-start-temporary-hit-points spell.scalar-buff

module battleRuntimeScalarBuffTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeArmorClass.* from "./battle-runtime-armor-class"
  import battleRuntimeMovementBridge.* from "./battle-runtime-movement-bridge"
  import battleRuntimeFeatherFall.* from "./battle-runtime-feather-fall"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_scalar_buff_longstrider_targets_selected_creature = {
    val result = resolveScalarBuffSpell(initialState, LongstriderScalarBuff, Set(Goblin), Set(), 1, 0)
    all {
      assert(not(result.fighter.activeEffects.contains(LongstriderSpeedDelta))),
      assert(result.goblin.activeEffects.contains(LongstriderSpeedDelta)),
      assert(movementSpeed(result.goblin, WalkSpeedKind) == 40),
    }
  }
  run test_scalar_buff_shield_of_faith_targets_selected_creature_and_uses_concentration = {
    val result = resolveScalarBuffSpell(initialState, ShieldOfFaithScalarBuff, Set(Goblin), Set(), 1, 0)
    all {
      assert(result.fighter.concentrating),
      assert(not(result.fighter.activeEffects.contains(ShieldOfFaithArmorClassBonus))),
      assert(result.goblin.activeEffects.contains(ShieldOfFaithArmorClassBonus)),
      assert(combatantArmorClass(result.goblin) == 17),
    }
  }
  run test_scalar_buff_barkskin_targets_known_willing_creature_and_applies_armor_class_floor = {
    val result = resolveScalarBuffSpell(initialState, BarkskinScalarBuff, Set(Goblin), Set(Goblin), 2, 0)
    all {
      assert(not(result.fighter.concentrating)),
      assert(not(result.fighter.activeEffects.exists(effect => match effect {
        | BarkskinArmorClassFloor(_) => true
        | _ => false
      }))),
      assert(result.goblin.activeEffects.contains(BarkskinArmorClassFloor({ durationTicks: barkskinDurationTicks }))),
      assert(combatantArmorClass(result.goblin) == 17),
    }
  }
  run test_scalar_buff_barkskin_rejects_non_willing_target = {
    val result = resolveScalarBuffSpell(initialState, BarkskinScalarBuff, Set(Goblin), Set(Fighter), 2, 0)
    all {
      assert(result == initialState),
      assert(not(result.goblin.activeEffects.exists(effect => match effect {
        | BarkskinArmorClassFloor(_) => true
        | _ => false
      }))),
    }
  }
  run test_scalar_buff_barkskin_does_not_lower_higher_armor_class = {
    val highArmorClassState = {
      ...initialState,
      goblin: { ...initialState.goblin, ac: 18 },
    }
    val result = resolveScalarBuffSpell(highArmorClassState, BarkskinScalarBuff, Set(Goblin), Set(Goblin), 2, 0)
    all {
      assert(result.goblin.activeEffects.contains(BarkskinArmorClassFloor({ durationTicks: barkskinDurationTicks }))),
      assert(combatantArmorClass(result.goblin) == 18),
    }
  }
  run test_scalar_buff_barkskin_expiration_removes_armor_class_floor = {
    val barkskinned = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(BarkskinArmorClassFloor({ durationTicks: 1 })),
      },
    }
    val nextRound = endTurn(endTurn(barkskinned))
    all {
      assert(combatantArmorClass(nextRound.fighter) == initialState.fighter.ac),
      assert(not(nextRound.fighter.activeEffects.exists(effect => match effect {
        | BarkskinArmorClassFloor(_) => true
        | _ => false
      }))),
    }
  }
  run test_scalar_buff_spider_climb_targets_selected_creature_and_grants_climb_speed = {
    val result = resolveScalarBuffSpell(initialState, SpiderClimbScalarBuff, Set(Fighter), Set(Fighter), 2, 0)
    val rejected = resolveScalarBuffSpell(initialState, SpiderClimbScalarBuff, Set(Goblin), Set(Fighter), 2, 0)
    val broken = breakConcentration(result.fighter)
    val expired = { ...result.fighter, activeEffects: tickDurationActiveEffects(Set(SpiderClimbClimbSpeedGrant({ durationTicks: 1 }))) }
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(SpiderClimbClimbSpeedGrant({ durationTicks: 600 }))),
      assert(movementSpeed(result.fighter, WalkSpeedKind) == 30),
      assert(movementSpeed(result.fighter, ClimbSpeedKind) == 30),
      assert(rejected == initialState),
      assert(not(broken.activeEffects.contains(SpiderClimbClimbSpeedGrant({ durationTicks: 600 })))),
      assert(movementSpeed(broken, ClimbSpeedKind) == 0),
      assert(not(expired.activeEffects.contains(SpiderClimbClimbSpeedGrant({ durationTicks: 1 })))),
      assert(movementSpeed(expired, ClimbSpeedKind) == 0),
    }
  }
  run test_scalar_buff_fly_targets_selected_creature_and_grants_fixed_fly_speed = {
    val result = resolveScalarBuffSpell(initialState, FlyScalarBuff, Set(Fighter), Set(Fighter), 3, 0)
    val upcast = resolveScalarBuffSpell(initialState, FlyScalarBuff, Set(Fighter, Goblin), Set(Fighter, Goblin), 4, 0)
    val rejected = resolveScalarBuffSpell(initialState, FlyScalarBuff, Set(Goblin), Set(Fighter), 3, 0)
    val laterCasterTurn = endTurn(endTurn(result))
    val expiringState = { ...result, fighter: { ...result.fighter, activeEffects: Set(FlySpeedHoverGrant({ durationTicks: 1 })) } }
    val cleanedLaterCasterTurn = stateWithoutEndedFlySpeedGrant(laterCasterTurn, Fighter, Fighter)
    val pendingCleanup = breakFlySpeedGrantForEndFall(laterCasterTurn, Fighter, Fighter)
    val pendingExpireCleanup = breakFlySpeedGrantForEndFall(expiringState, Fighter, Fighter)
    val stopped = resolveFlySpeedGrantEndFallCleanup(pendingCleanup, Fighter, Fighter, FlyEndTargetCanStopFall)
    val grounded = resolveFlySpeedGrantEndFallCleanup(pendingCleanup, Fighter, Fighter, FlyEndTargetNotAloft)
    val invalidWithoutCleanup = resolveFlySpeedGrantEndFallCleanup(laterCasterTurn, Fighter, Fighter, FlyEndTargetNotAloft)
    val fallsAfterBreak = resolveFlySpeedGrantEndFallCleanup(
      pendingCleanup,
      Fighter,
      Fighter,
      FlyEndTargetCannotStopFall({ featherFallReactor: Fighter, featherFallTargets: Set(Fighter) })
    )
    val fallsAfterExpire = resolveFlySpeedGrantEndFallCleanup(
      pendingExpireCleanup,
      Fighter,
      Fighter,
      FlyEndTargetCannotStopFall({ featherFallReactor: Fighter, featherFallTargets: Set() })
    )
    val longstriderAndFly = {
      ...initialState.fighter,
      activeEffects: Set(LongstriderSpeedDelta, FlySpeedHoverGrant({ durationTicks: flyDurationTicks })),
    }
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(FlySpeedHoverGrant({ durationTicks: flyDurationTicks }))),
      assert(movementSpeed(result.fighter, WalkSpeedKind) == 30),
      assert(movementSpeed(result.fighter, FlySpeedKind) == 60),
      assert(movementSpeed(longstriderAndFly, FlySpeedKind) == 70),
      assert(upcast.fighter.activeEffects.contains(FlySpeedHoverGrant({ durationTicks: flyDurationTicks }))),
      assert(upcast.goblin.activeEffects.contains(FlySpeedHoverGrant({ durationTicks: flyDurationTicks }))),
      assert(rejected == initialState),
      assert(not(activeEffectsWithoutFlySpeedHoverGrant(result.fighter.activeEffects).contains(FlySpeedHoverGrant({ durationTicks: flyDurationTicks })))),
      assert(stopped == FlyEndNoFall({ state: cleanedLaterCasterTurn, target: Fighter })),
      assert(grounded == FlyEndNoFall({ state: cleanedLaterCasterTurn, target: Fighter })),
      assert(invalidWithoutCleanup == FlyEndInvalid({ state: laterCasterTurn, target: Fighter })),
      assert(stateHasFlySpeedGrantEndFallCleanupFrame(pendingCleanup, Fighter)),
      assert(fallsAfterBreak == FlyEndFalls({
        state: resolveFeatherFallSpell(cleanedLaterCasterTurn, Fighter, ReactorFalls({ reactor: Fighter }), Set(Fighter), Set(Fighter), 1),
        target: Fighter,
      })),
      assert(fallsAfterExpire == FlyEndFalls({ state: stateWithoutEndedFlySpeedGrant(expiringState, Fighter, Fighter), target: Fighter })),
    }
  }
  run test_scalar_buff_aid_increases_hit_point_maximum_and_current_hit_points = {
    val result = resolveScalarBuffSpell(initialState, AidScalarBuff, Set(Fighter, Goblin), Set(), 3, 0)
    all {
      assert(result.fighter.hp == 22),
      assert(result.fighter.maxHp == 22),
      assert(result.fighter.activeEffects.contains(AidHitPointMaximumIncrease({ amount: 10, durationTicks: aidDurationTicks }))),
      assert(result.goblin.hp == 20),
      assert(result.goblin.maxHp == 20),
      assert(result.goblin.activeEffects.contains(AidHitPointMaximumIncrease({ amount: 10, durationTicks: aidDurationTicks }))),
    }
  }
  run test_scalar_buff_aid_expiration_removes_hit_point_maximum_and_current_hit_point_increase = {
    val aided = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        hp: 15,
        maxHp: 15,
        activeEffects: Set(AidHitPointMaximumIncrease({ amount: 5, durationTicks: 1 })),
      },
    }
    val nextRound = endTurn(endTurn(aided))
    all {
      assert(nextRound.goblin.hp == 10),
      assert(nextRound.goblin.maxHp == 10),
      assert(not(nextRound.goblin.activeEffects.contains(AidHitPointMaximumIncrease({ amount: 5, durationTicks: 1 })))),
    }
  }
  run test_scalar_buff_aid_lower_slot_recast_waits_under_more_potent_effect = {
    val aided = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        hp: 20,
        maxHp: 20,
        activeEffects: Set(AidHitPointMaximumIncrease({ amount: 10, durationTicks: 1 })),
      },
    }
    val result = resolveScalarBuffSpell(aided, AidScalarBuff, Set(Goblin), Set(), 2, 0)
    val nextRound = endTurn(endTurn(result))
    all {
      assert(result.goblin.hp == 20),
      assert(result.goblin.maxHp == 20),
      assert(result.goblin.activeEffects.contains(AidHitPointMaximumIncrease({ amount: 10, durationTicks: 1 }))),
      assert(result.goblin.activeEffects.contains(AidHitPointMaximumIncrease({ amount: 5, durationTicks: aidDurationTicks }))),
      assert(nextRound.goblin.hp == 15),
      assert(nextRound.goblin.maxHp == 15),
      assert(nextRound.goblin.activeEffects.exists(effect => match effect {
        | AidHitPointMaximumIncrease(data) => data.amount == 5
        | _ => false
      })),
      assert(not(nextRound.goblin.activeEffects.exists(effect => match effect {
        | AidHitPointMaximumIncrease(data) => data.amount == 10
        | _ => false
      }))),
    }
  }
  run test_heroism_stores_distinct_immunity_and_turn_start_temporary_hit_points = {
    val result = resolveHeroismSpell(initialState, Set(Fighter), 1, 3)
    all {
      assert(result.fighter.concentrating),
      assert(result.fighter.activeEffects.contains(HeroismFrightenedImmunity)),
      assert(result.fighter.activeEffects.contains(HeroismTurnStartTemporaryHitPoints({ amount: 3 }))),
      assert(result.fighter.tempHp == 0),
      assert(endTurn(endTurn(result)).fighter.tempHp == 3),
    }
  }
  run test_heroism_slot_level_controls_target_count_and_concentration_cleanup = {
    val hostile = resolveHeroismSpell(initialState, Set(Goblin), 1, 3)
    val invalidCount = resolveHeroismSpell(initialState, Set(Fighter, Goblin), 1, 3)
    val invalidWilling = resolveHeroismSpell(initialState, Set(Fighter, Goblin), 2, 3)
    val valid = resolveHeroismSpell(initialState, Set(Fighter), 1, 3)
    val broken = breakConcentration({ ...valid.fighter, activeEffects: valid.fighter.activeEffects.union(Set(HeroismTurnStartTemporaryHitPoints({ amount: 5 }))) })
    all {
      assert(hostile == initialState),
      assert(invalidCount == initialState),
      assert(invalidWilling == initialState),
      assert(valid.fighter.activeEffects.contains(HeroismFrightenedImmunity)),
      assert(valid.fighter.activeEffects.contains(HeroismTurnStartTemporaryHitPoints({ amount: 3 }))),
      assert(not(broken.activeEffects.contains(HeroismFrightenedImmunity))),
      assert(not(broken.activeEffects.exists(effect => match effect {
        | HeroismTurnStartTemporaryHitPoints(_) => true
        | _ => false
      }))),
    }
  }
}
