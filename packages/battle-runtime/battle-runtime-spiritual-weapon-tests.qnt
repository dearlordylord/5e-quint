module battleRuntimeSpiritualWeaponTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeOngoingSpellDispel.* from "./battle-runtime-ongoing-spell-dispel"
  import battleRuntimeAntimagicSuppression.* from "./battle-runtime-antimagic-suppression"
  import battleRuntimeSpiritualWeapon.* from "./battle-runtime-spiritual-weapon"

  run test_spiritual_weapon_cast_records_proxy_and_attack = {
    val fill = SpiritualWeaponCastForcePosition({ positionId: 1, distanceFromCasterFeet: 60 })
    val fact = { target: Goblin, forcePositionId: 1, reachFeet: 5 }
    val resolved = resolveFighterSpiritualWeaponAttackProxy(
      initialState,
      4,
      fill,
      fact,
      true,
      5,
      3,
      true,
    )
    all {
      assert(resolved.fighter.concentrating),
      assert(not(resolved.bonusActionAvailable)),
      assert(spiritualWeaponActorHasCommittedSpellSlotUse(resolved, Fighter)),
      assert(resolved.goblin.hp == 2),
      assert(resolved.fighter.activeEffects.contains(SpiritualWeapon({
        source: Fighter,
        effectId: spiritualWeaponEffectId(Fighter),
        sourceSpellLevel: 4,
        forcePositionId: 1,
        forceReachFeet: 5,
        repeatMoveMaxFeet: 20,
        startedRound: 1,
        damageDice: 3,
        spellcastingAbilityModifier: 3,
        durationTicks: 10,
      }))),
    }
  }

  run test_spiritual_weapon_rejects_invalid_spatial_witnesses = {
    val overRange = SpiritualWeaponCastForcePosition({ positionId: 1, distanceFromCasterFeet: 61 })
    val validCast = SpiritualWeaponCastForcePosition({ positionId: 1, distanceFromCasterFeet: 60 })
    val mismatchedFact = { target: Goblin, forcePositionId: 2, reachFeet: 5 }
    val validFact = { target: Goblin, forcePositionId: 1, reachFeet: 5 }
    val overRangeResult = resolveFighterSpiritualWeaponAttackProxy(initialState, 2, overRange, validFact, true, 5, 3, true)
    val mismatchedResult = resolveFighterSpiritualWeaponAttackProxy(initialState, 2, validCast, mismatchedFact, true, 5, 3, true)
    all {
      assert(overRangeResult == initialState),
      assert(mismatchedResult == initialState),
    }
  }

  run test_spiritual_weapon_repeat_repositions_without_slot = {
    val active = {
      ...initialState,
      initiative: { ...initialState.initiative, round: 2 },
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(spiritualWeaponEffect(Fighter, 1, 2, 3, 1)),
        concentrating: true,
      },
    }
    val fill = SpiritualWeaponRepositionForcePosition({ positionId: 2, moveDistanceFeet: 20 })
    val fact = { target: Goblin, forcePositionId: 2, reachFeet: 5 }
    val repeated = resolveFighterSpiritualWeaponRepeatAttack(active, fill, fact, true, 4, true)
    all {
      assert(not(repeated.bonusActionAvailable)),
      assert(not(spiritualWeaponActorHasCommittedSpellSlotUse(repeated, Fighter))),
      assert(repeated.goblin.hp == 3),
      assert(repeated.fighter.activeEffects.contains(SpiritualWeapon({
        source: Fighter,
        effectId: spiritualWeaponEffectId(Fighter),
        sourceSpellLevel: 2,
        forcePositionId: 2,
        forceReachFeet: 5,
        repeatMoveMaxFeet: 20,
        startedRound: 1,
        damageDice: 1,
        spellcastingAbilityModifier: 3,
        durationTicks: 10,
      }))),
    }
  }

  run test_spiritual_weapon_repeat_rejects_overlong_move = {
    val active = {
      ...initialState,
      initiative: { ...initialState.initiative, round: 2 },
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(spiritualWeaponEffect(Fighter, 1, 2, 3, 1)),
        concentrating: true,
      },
    }
    val fill = SpiritualWeaponRepositionForcePosition({ positionId: 2, moveDistanceFeet: 21 })
    val fact = { target: Goblin, forcePositionId: 2, reachFeet: 5 }
    val repeated = resolveFighterSpiritualWeaponRepeatAttack(active, fill, fact, true, 4, true)
    all {
      assert(repeated == active),
    }
  }

  run test_spiritual_weapon_repeat_rejects_same_turn = {
    val active = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(spiritualWeaponEffect(Fighter, 1, 2, 3, 1)),
        concentrating: true,
      },
    }
    val fill = SpiritualWeaponRepositionForcePosition({ positionId: 2, moveDistanceFeet: 20 })
    val fact = { target: Goblin, forcePositionId: 2, reachFeet: 5 }
    val repeated = resolveFighterSpiritualWeaponRepeatAttack(active, fill, fact, true, 4, true)
    all {
      assert(repeated == active),
    }
  }

  run test_antimagic_field_suppresses_spiritual_weapon_repeat_without_deleting = {
    val weapon = spiritualWeaponEffect(Fighter, 1, 2, 3, 1)
    val active = {
      ...initialState,
      initiative: { ...initialState.initiative, round: 2 },
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(weapon),
        concentrating: true,
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(AntimagicFieldOngoingSpellSuppression({
          areaId: 1,
          radiusFeet: 10,
          suppressedOngoingSpellEffects: Set(OngoingSpellActiveEffectRef({
            activeEffectKind: OngoingSpellSpiritualWeaponEffect,
            effectId: spiritualWeaponEffectId(Fighter),
          })),
          durationTicks: 10,
        })),
        concentrating: true,
      },
    }
    val fill = SpiritualWeaponRepositionForcePosition({ positionId: 2, moveDistanceFeet: 20 })
    val fact = { target: Goblin, forcePositionId: 2, reachFeet: 5 }
    val repeated = resolveFighterSpiritualWeaponRepeatAttack(active, fill, fact, true, 4, true)
    all {
      assert(activeEffectsContainSpiritualWeaponEffectId(active.fighter.activeEffects, spiritualWeaponEffectId(Fighter))),
      assert(repeated == active),
    }
  }

  run test_spiritual_weapon_concentration_break_removes_proxy = {
    val active = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(spiritualWeaponEffect(Fighter, 1, 2, 3, 1)),
        concentrating: true,
      },
    }
    val broken = breakConcentrationSpellEffects(active, Fighter)
    all {
      assert(activeEffectsContainSpiritualWeapon(active.fighter.activeEffects, Fighter)),
      assert(active.fighter.concentrating),
      assert(not(activeEffectsContainSpiritualWeapon(broken.fighter.activeEffects, Fighter))),
      assert(not(broken.fighter.concentrating)),
    }
  }

  run test_dispel_magic_ends_spiritual_weapon_magical_effect_target = {
    val weapon = spiritualWeaponEffect(Fighter, 1, 2, 3, 1)
    val weaponState = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(weapon),
        concentrating: true,
      },
    }
    val dispelled = resolveDispelMagicAgainstSpiritualWeaponMagicalEffectTarget(
      weaponState,
      Fighter,
      spiritualWeaponEffectId(Fighter),
      3,
      Set(),
    )
    all {
      assert(activeEffectsContainSpiritualWeaponEffectId(weaponState.fighter.activeEffects, spiritualWeaponEffectId(Fighter))),
      assert(not(activeEffectsContainSpiritualWeaponEffectId(dispelled.fighter.activeEffects, spiritualWeaponEffectId(Fighter)))),
      assert(not(dispelled.fighter.concentrating)),
    }
  }

  run test_dispel_magic_higher_level_spiritual_weapon_uses_check_gate = {
    val weapon = spiritualWeaponEffect(Fighter, 1, 4, 3, 1)
    val weaponState = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(weapon),
        concentrating: true,
      },
    }
    val failedCheck = resolveDispelMagicAgainstSpiritualWeaponMagicalEffectTarget(
      weaponState,
      Fighter,
      spiritualWeaponEffectId(Fighter),
      3,
      Set(),
    )
    val successfulCheck = resolveDispelMagicAgainstSpiritualWeaponMagicalEffectTarget(
      weaponState,
      Fighter,
      spiritualWeaponEffectId(Fighter),
      3,
      Set(spiritualWeaponEffectId(Fighter)),
    )
    all {
      assert(activeEffectsContainSpiritualWeaponEffectId(failedCheck.fighter.activeEffects, spiritualWeaponEffectId(Fighter))),
      assert(failedCheck.fighter.concentrating),
      assert(not(activeEffectsContainSpiritualWeaponEffectId(successfulCheck.fighter.activeEffects, spiritualWeaponEffectId(Fighter)))),
      assert(not(successfulCheck.fighter.concentrating)),
    }
  }

}
