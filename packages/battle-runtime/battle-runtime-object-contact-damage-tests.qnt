// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof spell.invocation-object-contact-damage spell.invocation-ongoing-spell-ending

module battleRuntimeObjectContactDamageTests {
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeSpellAttack.* from "./battle-runtime-spell-attack"
  import battleRuntimeMarkedRiders.* from "./battle-runtime-marked-riders"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeLight.* from "./battle-runtime-light"
  import battleRuntimeOngoingSpellDispel.* from "./battle-runtime-ongoing-spell-dispel"
  import battleRuntimeAntimagicSuppression.* from "./battle-runtime-antimagic-suppression"
  import battleRuntimeObjectContactDamage.* from "./battle-runtime-object-contact-damage"

  run test_heat_metal_records_object_contact_effect_and_immediate_damage = {
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(Goblin), Set(), Set(), Set(), Set(), 2, 7, true, true)
    all {
      assert(resolved.fighter.activeEffects.contains(HeatMetalObjectContactDamage({
        effectId: heatMetalObjectContactDamageEffectId(Fighter, heatMetalObjectId),
        objectId: heatMetalObjectId,
        sourceSpellLevel: 2,
        damageDice: 2,
        durationTicks: heatMetalDurationTicks,
        startedRound: 1,
      }))),
      assert(resolved.fighter.concentrating),
      assert(resolved.goblin.hp == 3),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_heat_metal_slot_scaling_is_stored_for_later_repeat_damage = {
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(), Set(), Set(), Set(), Set(), 3, 0, true, true)
    all {
      assert(heatMetalDamageDice(2) == 2),
      assert(heatMetalDamageDice(3) == 3),
      assert(heatMetalObjectContactDamageActiveDamageDice(resolved, heatMetalObjectId) == 3),
      assert(resolved.goblin.hp == initialState.goblin.hp),
    }
  }

  run test_heat_metal_self_contact_damage_can_break_new_concentration = {
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(Fighter), Set(), Set(), Set(), Set(), 2, 7, false, true)
    all {
      assert(resolved.fighter.hp == 5),
      assert(not(resolved.fighter.concentrating)),
      assert(not(heatMetalObjectContactDamageActive(resolved, heatMetalObjectId))),
      assert(not(resolved.actionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(resolved, Fighter)),
    }
  }

  run test_heat_metal_later_turn_repeat_requires_range_and_spends_bonus_action = {
    val cast = resolveHeatMetal(initialState, heatMetalObjectId, Set(Goblin), Set(), Set(), Set(), Set(), 3, 4, true, true)
    val sameTurnBlocked = resolveHeatMetalRepeat(cast, heatMetalObjectId, true, Set(Goblin), Set(), Set(), Set(), Set(), 3, true, true)
    val goblinTurn = endTurn(cast)
    val fighterTurn = endTurn(goblinTurn)
    val rangeBlocked = resolveHeatMetalRepeat(fighterTurn, heatMetalObjectId, false, Set(Goblin), Set(), Set(), Set(), Set(), 3, true, true)
    val repeated = resolveHeatMetalRepeat(fighterTurn, heatMetalObjectId, true, Set(Goblin), Set(), Set(), Set(), Set(), 3, true, true)
    all {
      assert(sameTurnBlocked.goblin.hp == cast.goblin.hp),
      assert(sameTurnBlocked.bonusActionAvailable == cast.bonusActionAvailable),
      assert(rangeBlocked.goblin.hp == fighterTurn.goblin.hp),
      assert(rangeBlocked.bonusActionAvailable),
      assert(repeated.goblin.hp == 3),
      assert(not(repeated.bonusActionAvailable)),
    }
  }

  run test_antimagic_field_suppresses_heat_metal_without_deleting_it = {
    val effectId = heatMetalObjectContactDamageEffectId(Fighter, heatMetalObjectId)
    val active = {
      ...endTurn(initialState),
      fighter: {
        ...initialState.fighter,
        activeEffects: Set(heatMetalObjectContactDamageEffect(initialState, Fighter, heatMetalObjectId, 2)),
      },
      goblin: {
        ...initialState.goblin,
        activeEffects: Set(AntimagicFieldOngoingSpellSuppression({
          areaId: antimagicFieldAreaId,
          radiusFeet: antimagicFieldRadiusFeet,
          suppressedOngoingSpellEffects: Set(OngoingSpellActiveEffectRef({
            activeEffectKind: OngoingSpellObjectContactDamageEffect,
            effectId: effectId,
          })),
          durationTicks: antimagicFieldDurationTicks,
        })),
      },
    }
    val ticked = endTurn(endTurn(active))
    all {
      assert(heatMetalObjectContactDamageActiveForCombatant(active.fighter, heatMetalObjectId)),
      assert(not(heatMetalRepeatAvailable(active, heatMetalObjectId, true))),
      assert(heatMetalObjectContactDamageActiveForCombatant(ticked.fighter, heatMetalObjectId)),
      assert(not(heatMetalObjectContactDamageActive(ticked, heatMetalObjectId))),
    }
  }

  run test_heat_metal_concentration_break_removes_object_contact_effect = {
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(), Set(), Set(), Set(), Set(), 2, 0, true, true)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(broken.fighter.concentrating)),
      assert(not(heatMetalObjectContactDamageActive(broken, heatMetalObjectId))),
    }
  }

  run test_dispel_magic_object_target_ends_heat_metal_object_contact_effect_and_clears_concentration = {
    val cast = resolveHeatMetal(initialState, heatMetalObjectId, Set(), Set(), Set(), Set(), Set(), 2, 0, true, true)
    val dispelled = resolveDispelMagicAgainstHeatMetalObjectTarget(cast, Fighter, heatMetalObjectId, 3, Set())
    all {
      assert(not(dispelled.fighter.concentrating)),
      assert(not(heatMetalObjectContactDamageActive(dispelled, heatMetalObjectId))),
    }
  }

  run test_dispel_magic_higher_level_check_gate_for_heat_metal_object_contact_effect = {
    val higherSlotCast = resolveHeatMetal(initialState, heatMetalObjectId, Set(), Set(), Set(), Set(), Set(), 4, 0, true, true)
    val effectId = heatMetalObjectContactDamageEffectId(Fighter, heatMetalObjectId)
    val failedCheckIds = dispelMagicSuccessfulAbilityCheckEffectIds(effectId, 13, 4)
    val succeededCheckIds = dispelMagicSuccessfulAbilityCheckEffectIds(effectId, 14, 4)
    val failed = resolveDispelMagicAgainstHeatMetalObjectTarget(higherSlotCast, Fighter, heatMetalObjectId, 3, failedCheckIds)
    val succeeded = resolveDispelMagicAgainstHeatMetalObjectTarget(higherSlotCast, Fighter, heatMetalObjectId, 3, succeededCheckIds)
    val higherSlot = resolveDispelMagicAgainstHeatMetalObjectTarget(higherSlotCast, Fighter, heatMetalObjectId, 4, Set())
    all {
      assert(failed.fighter.concentrating),
      assert(heatMetalObjectContactDamageActive(failed, heatMetalObjectId)),
      assert(not(succeeded.fighter.concentrating)),
      assert(not(heatMetalObjectContactDamageActive(succeeded, heatMetalObjectId))),
      assert(not(higherSlot.fighter.concentrating)),
      assert(not(heatMetalObjectContactDamageActive(higherSlot, heatMetalObjectId))),
      assert(failedCheckIds == Set()),
      assert(succeededCheckIds == Set(effectId)),
    }
  }

  run test_dispel_magic_object_target_ends_same_object_heat_metal_effects_from_multiple_owners = {
    val state = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(
          heatMetalObjectContactDamageEffect(initialState, Fighter, heatMetalObjectId, 2),
        ),
      },
      goblin: {
        ...initialState.goblin,
        concentrating: true,
        activeEffects: Set(
          heatMetalObjectContactDamageEffect(initialState, Goblin, heatMetalObjectId, 2),
        ),
      },
    }
    val dispelled = resolveDispelMagicAgainstHeatMetalObjectTarget(state, Fighter, heatMetalObjectId, 3, Set())
    all {
      assert(not(dispelled.fighter.concentrating)),
      assert(not(dispelled.goblin.concentrating)),
      assert(not(heatMetalObjectContactDamageActiveForCombatant(dispelled.fighter, heatMetalObjectId))),
      assert(not(heatMetalObjectContactDamageActiveForCombatant(dispelled.goblin, heatMetalObjectId))),
    }
  }

  run test_dispel_magic_magical_effect_target_removes_only_selected_same_object_heat_metal_effect = {
    val state = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(
          heatMetalObjectContactDamageEffect(initialState, Fighter, heatMetalObjectId, 2),
        ),
      },
      goblin: {
        ...initialState.goblin,
        concentrating: true,
        activeEffects: Set(
          heatMetalObjectContactDamageEffect(initialState, Goblin, heatMetalObjectId, 2),
        ),
      },
    }
    val dispelled =
      resolveDispelMagicAgainstHeatMetalMagicalEffectTarget(
        state,
        Fighter,
        heatMetalObjectContactDamageEffectId(Fighter, heatMetalObjectId),
        3,
        Set(),
      )
    all {
      assert(not(dispelled.fighter.concentrating)),
      assert(dispelled.goblin.concentrating),
      assert(not(heatMetalObjectContactDamageActiveForCombatant(dispelled.fighter, heatMetalObjectId))),
      assert(heatMetalObjectContactDamageActiveForCombatant(dispelled.goblin, heatMetalObjectId)),
    }
  }

  run test_heat_metal_failed_holding_wearing_save_without_drop_applies_penalty = {
    val penalty = heatMetalHoldingWearingPenaltyEffect(Fighter, heatMetalObjectId)
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(Goblin), Set(Goblin), Set(), Set(), Set(), 2, 7, true, true)
    val goblinTurn = endTurn(resolved)
    val fighterTurn = endTurn(goblinTurn)
    val broken = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(resolved.goblin.activeEffects.contains(penalty)),
      assert(spellAttackRollModeFromActiveEffects(resolved.goblin.activeEffects, Set(), true) == DisadvantageSpellAttackRoll),
      assert(heatMetalHoldingWearingPenaltyAbilityCheckRollMode(resolved.goblin.activeEffects) == DisadvantageAbilityCheck),
      assert(goblinTurn.goblin.activeEffects.contains(penalty)),
      assert(not(fighterTurn.goblin.activeEffects.contains(penalty))),
      assert(not(broken.goblin.activeEffects.contains(penalty))),
    }
  }

  run test_heat_metal_self_failed_no_drop_after_concentration_break_has_no_penalty = {
    val penalty = heatMetalHoldingWearingPenaltyEffect(Fighter, heatMetalObjectId)
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(Fighter), Set(Fighter), Set(), Set(), Set(), 2, 7, false, true)
    all {
      assert(not(resolved.fighter.concentrating)),
      assert(not(heatMetalObjectContactDamageActive(resolved, heatMetalObjectId))),
      assert(not(resolved.fighter.activeEffects.contains(penalty))),
    }
  }

  run test_heat_metal_failed_holding_save_with_drop_has_drop_result_without_penalty = {
    val penalty = heatMetalHoldingWearingPenaltyEffect(Fighter, heatMetalObjectId)
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(Goblin), Set(Goblin), Set(), Set(Goblin), Set(Goblin), 2, 5, true, true)
    all {
      assert(heatMetalDroppedTargets(Set(Goblin), Set(Goblin), Set(), Set(Goblin), Set(Goblin)) == Set(Goblin)),
      assert(not(resolved.goblin.activeEffects.contains(penalty))),
      assert(spellAttackRollModeFromActiveEffects(resolved.goblin.activeEffects, Set(), true) == NormalSpellAttackRoll),
    }
  }

  run test_heat_metal_successful_holding_wearing_save_has_no_drop_or_penalty = {
    val penalty = heatMetalHoldingWearingPenaltyEffect(Fighter, heatMetalObjectId)
    val resolved = resolveHeatMetal(initialState, heatMetalObjectId, Set(Goblin), Set(Goblin), Set(Goblin), Set(), Set(), 2, 5, true, true)
    all {
      assert(heatMetalDroppedTargets(Set(Goblin), Set(Goblin), Set(Goblin), Set(), Set()) == Set()),
      assert(not(resolved.goblin.activeEffects.contains(penalty))),
      assert(heatMetalHoldingWearingPenaltyAbilityCheckRollMode(resolved.goblin.activeEffects) == NormalAbilityCheck),
    }
  }
}
