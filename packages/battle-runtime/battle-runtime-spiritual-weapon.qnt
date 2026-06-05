// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-spiritual-weapon-attack-proxy
// UNIT-PROFILE-COVERAGE: qnt-owner spell.invocation-ongoing-spell-ending
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-ongoing-spell-ending
module battleRuntimeSpiritualWeapon {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeFighterOngoingFeatures.* from "./battle-runtime-fighter-ongoing-features"
  import battleRuntimeHitPoints.* from "./battle-runtime-hit-points"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeOngoingSpellDispel.* from "./battle-runtime-ongoing-spell-dispel"
  import battleRuntimeAntimagicSuppression.* from "./battle-runtime-antimagic-suppression"

  // RAW trace: .references/srd-5.2.1/Spells/Descriptions-S-Z.md:512-525.
  // The promoted model covers Spiritual Weapon's Bonus Action level-2 cast,
  // 60-foot force placement, Concentration up to 1 minute, immediate and later
  // melee Spell Attacks within 5 feet of the force, 20-foot later-turn force
  // movement, Force damage, and +1d8 damage per slot level above 2.
  pure val spiritualWeaponDurationTicks = 10
  pure val spiritualWeaponRangeFeet = 60
  pure val spiritualWeaponForceReachFeet = 5
  pure val spiritualWeaponRepeatMoveMaxFeet = 20

  type SpiritualWeaponForcePositionMode =
    | SpiritualWeaponCastPosition
    | SpiritualWeaponRepositionPosition

  type SpiritualWeaponForcePositionHole = {
    mode: SpiritualWeaponForcePositionMode,
    maxDistanceFeet: int,
  }

  type SpiritualWeaponForcePositionFill =
    | SpiritualWeaponCastForcePosition({ positionId: int, distanceFromCasterFeet: int })
    | SpiritualWeaponRepositionForcePosition({ positionId: int, moveDistanceFeet: int })

  type SpiritualWeaponTargetReachFact = {
    target: Actor,
    forcePositionId: int,
    reachFeet: int,
  }

  pure def spiritualWeaponDamageDice(slotLevel: int): int =
    if (slotLevel < 2) 0 else 1 + (slotLevel - 2)

  pure def spiritualWeaponEffectId(source: Actor): int =
    match source {
      | Fighter => 2101
      | Goblin => 2102
    }

  pure val spiritualWeaponCastForcePositionHole: SpiritualWeaponForcePositionHole =
    { mode: SpiritualWeaponCastPosition, maxDistanceFeet: spiritualWeaponRangeFeet }

  pure val spiritualWeaponRepeatForcePositionHole: SpiritualWeaponForcePositionHole =
    { mode: SpiritualWeaponRepositionPosition, maxDistanceFeet: spiritualWeaponRepeatMoveMaxFeet }

  pure def spiritualWeaponForcePositionId(fill: SpiritualWeaponForcePositionFill): int =
    match fill {
      | SpiritualWeaponCastForcePosition(data) => data.positionId
      | SpiritualWeaponRepositionForcePosition(data) => data.positionId
    }

  pure def spiritualWeaponForcePositionFillValid(
    fill: SpiritualWeaponForcePositionFill,
    hole: SpiritualWeaponForcePositionHole,
  ): bool =
    match fill {
      | SpiritualWeaponCastForcePosition(data) =>
          hole.mode == SpiritualWeaponCastPosition and
            data.distanceFromCasterFeet >= 0 and
            data.distanceFromCasterFeet <= hole.maxDistanceFeet
      | SpiritualWeaponRepositionForcePosition(data) =>
          hole.mode == SpiritualWeaponRepositionPosition and
            data.moveDistanceFeet >= 0 and
            data.moveDistanceFeet <= hole.maxDistanceFeet
    }

  pure def spiritualWeaponTargetReachFactMatches(
    fact: SpiritualWeaponTargetReachFact,
    target: Actor,
    forcePositionId: int,
  ): bool =
    fact.target == target and
      fact.forcePositionId == forcePositionId and
      fact.reachFeet == spiritualWeaponForceReachFeet

  pure def spiritualWeaponEffect(
    source: Actor,
    forcePositionId: int,
    slotLevel: int,
    spellcastingAbilityModifier: int,
    startedRound: int,
  ): ActiveEffect =
    SpiritualWeapon({
      source: source,
      effectId: spiritualWeaponEffectId(source),
      sourceSpellLevel: slotLevel,
      forcePositionId: forcePositionId,
      forceReachFeet: spiritualWeaponForceReachFeet,
      repeatMoveMaxFeet: spiritualWeaponRepeatMoveMaxFeet,
      startedRound: startedRound,
      damageDice: spiritualWeaponDamageDice(slotLevel),
      spellcastingAbilityModifier: spellcastingAbilityModifier,
      durationTicks: spiritualWeaponDurationTicks,
    })

  pure def activeEffectsWithoutSpiritualWeapon(
    effects: Set[ActiveEffect],
    source: Actor,
  ): Set[ActiveEffect] =
    effects.filter(effect => match effect {
      | SpiritualWeapon(data) => data.source != source
      | _ => true
    })

  pure def activeEffectsContainSpiritualWeapon(
    effects: Set[ActiveEffect],
    source: Actor,
  ): bool =
    effects.exists(effect => match effect {
      | SpiritualWeapon(data) => data.source == source
      | _ => false
    })

  pure def activeEffectsContainSpiritualWeaponEffectId(
    effects: Set[ActiveEffect],
    effectId: int,
  ): bool =
    effects.exists(effect => match effect {
      | SpiritualWeapon(data) => data.effectId == effectId
      | _ => false
    })

  pure def stateActorHasSpiritualWeapon(state: BattleState, source: Actor): bool =
    match source {
      | Fighter => activeEffectsContainSpiritualWeapon(state.fighter.activeEffects, source)
      | Goblin => activeEffectsContainSpiritualWeapon(state.goblin.activeEffects, source)
    }

  pure def stateWithSpiritualWeaponConcentrationClearedAfterDispel(
    before: BattleState,
    after: BattleState,
    source: Actor,
  ): BattleState =
    if (
      stateActorHasSpiritualWeapon(before, source)
      and not(stateActorHasSpiritualWeapon(after, source))
    )
      match source {
        | Fighter => { ...after, fighter: { ...after.fighter, concentrating: false } }
        | Goblin => { ...after, goblin: { ...after.goblin, concentrating: false } }
      }
    else
      after

  pure def resolveDispelMagicAgainstSpiritualWeaponMagicalEffectTarget(
    state: BattleState,
    source: Actor,
    effectId: int,
    slotLevel: int,
    successfulCheckEffectIds: Set[int],
  ): BattleState = {
    val dispelled = {
      ...state,
      fighter: {
        ...state.fighter,
        activeEffects: dispelMagicMagicalEffectTargetActiveEffects(
          state.fighter.activeEffects,
          OngoingSpellSpiritualWeaponEffect,
          effectId,
          slotLevel,
          successfulCheckEffectIds,
        ),
      },
      goblin: {
        ...state.goblin,
        activeEffects: dispelMagicMagicalEffectTargetActiveEffects(
          state.goblin.activeEffects,
          OngoingSpellSpiritualWeaponEffect,
          effectId,
          slotLevel,
          successfulCheckEffectIds,
        ),
      },
    }
    stateWithSpiritualWeaponConcentrationClearedAfterDispel(state, dispelled, source)
  }

  pure def activeEffectsContainLaterTurnSpiritualWeapon(
    effects: Set[ActiveEffect],
    source: Actor,
    state: BattleState,
  ): bool =
    effects.exists(effect => match effect {
      | SpiritualWeapon(data) =>
          data.source == source and
            not(antimagicSuppressesOngoingSpellActiveEffect(
              state,
              OngoingSpellSpiritualWeaponEffect,
              data.effectId,
            )) and
            (currentActor(state) != data.source or
              state.initiative.round != data.startedRound)
      | _ => false
    })

  pure def activeEffectsWithSpiritualWeaponPosition(
    effects: Set[ActiveEffect],
    source: Actor,
    forcePositionId: int,
  ): Set[ActiveEffect] =
    effects.map(effect => match effect {
      | SpiritualWeapon(data) =>
          if (data.source == source)
            SpiritualWeapon({ ...data, forcePositionId: forcePositionId })
          else
            effect
      | _ => effect
    })

  pure def spiritualWeaponAttackDamage(
    effects: Set[ActiveEffect],
    source: Actor,
    damageDiceRoll: int,
  ): int =
    effects
      .map(effect => match effect {
        | SpiritualWeapon(data) =>
            if (data.source == source)
              damageDiceRoll + data.spellcastingAbilityModifier
            else
              0
        | _ => 0
      })
      .fold(0, (highest, damage) => if (highest > damage) highest else damage)

  pure def spiritualWeaponActorHasSpellSlotUse(state: BattleState, actor: Actor): bool =
    state.spellSlotUsesThisTurn.exists(slotUse => match slotUse {
      | BattlePendingSpellSlotUse(slotActor) => slotActor == actor
      | BattleCommittedSpellSlotUse(slotActor) => slotActor == actor
    })

  pure def spiritualWeaponActorHasCommittedSpellSlotUse(state: BattleState, actor: Actor): bool =
    state.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(actor))

  pure def spiritualWeaponCanExpendSpellSlotThisTurn(state: BattleState, actor: Actor): bool =
    not(spiritualWeaponActorHasSpellSlotUse(state, actor))

  pure def commitSpiritualWeaponSpellSlotUse(state: BattleState, actor: Actor): BattleState =
    if (spiritualWeaponActorHasCommittedSpellSlotUse(state, actor))
      state
    else
      {
        ...state,
        spellSlotUsesThisTurn: state.spellSlotUsesThisTurn
          .filter(slotUse => slotUse != BattlePendingSpellSlotUse(actor))
          .union(Set(BattleCommittedSpellSlotUse(actor))),
        levelOnePlusSpellCastsThisTurn: state.levelOnePlusSpellCastsThisTurn.union(Set(actor)),
      }

  pure def fighterSpiritualWeaponCastAdmitted(
    state: BattleState,
    slotLevel: int,
    fill: SpiritualWeaponForcePositionFill,
    targetReachFact: SpiritualWeaponTargetReachFact,
  ): bool =
    currentActor(state) == Fighter and
      state.bonusActionAvailable and
      not(state.fighter.unconscious) and
      not(state.fighter.incapacitated) and
      not(fighterHasRage(state)) and
      spiritualWeaponCanExpendSpellSlotThisTurn(state, Fighter) and
      slotLevel >= 2 and
      spiritualWeaponForcePositionFillValid(fill, spiritualWeaponCastForcePositionHole) and
      spiritualWeaponTargetReachFactMatches(
        targetReachFact,
        Goblin,
        spiritualWeaponForcePositionId(fill),
      )

  pure def resolveFighterSpiritualWeaponAttackProxy(
    state: BattleState,
    slotLevel: int,
    fill: SpiritualWeaponForcePositionFill,
    targetReachFact: SpiritualWeaponTargetReachFact,
    attackHits: bool,
    damageDiceRoll: int,
    spellcastingAbilityModifier: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(fighterSpiritualWeaponCastAdmitted(state, slotLevel, fill, targetReachFact)))
      state
    else {
      val forcePositionId = spiritualWeaponForcePositionId(fill)
      val effect = spiritualWeaponEffect(
        Fighter,
        forcePositionId,
        slotLevel,
        spellcastingAbilityModifier,
        state.initiative.round,
      )
      val recorded = commitSpiritualWeaponSpellSlotUse({
        ...state,
        fighter: {
          ...state.fighter,
          activeEffects: activeEffectsWithoutSpiritualWeapon(state.fighter.activeEffects, Fighter)
            .union(Set(effect)),
          concentrating: true,
        },
        bonusActionAvailable: false,
      }, Fighter)
      if (attackHits)
        {
          ...recorded,
          goblin: applyDamageFromSource(
            recorded.goblin,
            damageDiceRoll + spellcastingAbilityModifier,
            1,
            concentrationSaveSucceeded,
            OrdinaryDamage,
            Fighter,
          ),
        }
      else
        recorded
    }

  pure def fighterSpiritualWeaponRepeatAdmitted(
    state: BattleState,
    fill: SpiritualWeaponForcePositionFill,
    targetReachFact: SpiritualWeaponTargetReachFact,
  ): bool =
    currentActor(state) == Fighter and
      state.bonusActionAvailable and
      activeEffectsContainLaterTurnSpiritualWeapon(state.fighter.activeEffects, Fighter, state) and
      spiritualWeaponForcePositionFillValid(fill, spiritualWeaponRepeatForcePositionHole) and
      spiritualWeaponTargetReachFactMatches(
        targetReachFact,
        Goblin,
        spiritualWeaponForcePositionId(fill),
      )

  pure def resolveFighterSpiritualWeaponRepeatAttack(
    state: BattleState,
    fill: SpiritualWeaponForcePositionFill,
    targetReachFact: SpiritualWeaponTargetReachFact,
    attackHits: bool,
    damageDiceRoll: int,
    concentrationSaveSucceeded: bool,
  ): BattleState =
    if (not(fighterSpiritualWeaponRepeatAdmitted(state, fill, targetReachFact)))
      state
    else {
      val forcePositionId = spiritualWeaponForcePositionId(fill)
      val positionedEffects = activeEffectsWithSpiritualWeaponPosition(
        state.fighter.activeEffects,
        Fighter,
        forcePositionId,
      )
      val positioned = {
        ...state,
        fighter: { ...state.fighter, activeEffects: positionedEffects },
        bonusActionAvailable: false,
      }
      if (attackHits)
        {
          ...positioned,
          goblin: applyDamageFromSource(
            positioned.goblin,
            spiritualWeaponAttackDamage(positionedEffects, Fighter, damageDiceRoll),
            1,
            concentrationSaveSucceeded,
            OrdinaryDamage,
            Fighter,
          ),
        }
      else
        positioned
    }

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
