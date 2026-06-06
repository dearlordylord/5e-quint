// -*- mode: Bluespec; -*-

// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-heightened-save-disadvantage
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-damage-type-substitution
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-effective-level-extra-target
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-range-increase
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-duration-and-concentration
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-cast-component-suppression
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-missed-spell-attack-reroll
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.metamagic-damage-dice-reroll

module battleRuntimeMetamagicTests {
  import unitFeatureMetamagicOptionFactCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-option-fact-core"
  import unitFeatureMetamagicSpellModificationAdmissionCore.* from "../shared-algebras/proofs/rule-core/unit-feature-metamagic-spell-modification-admission-core"
  import unitFeatureQuickenedActionSpellProcedureSupportCore.* from "../shared-algebras/proofs/rule-core/unit-feature-quickened-action-spell-procedure-support-core"
  import battleRuntimeMetamagic.* from "./battle-runtime-metamagic"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeRestorationAndBuffs.* from "./battle-runtime-restoration-and-buffs"
  import battleRuntimeTurnOrder.* from "./battle-runtime-turn-order"

  run test_quickened_direct_restoration_spends_bonus_action_not_magic_action = {
    val wounded = {
      ...initialState,
      fighter: { ...initialState.fighter, hp: 4 },
    }
    val result = resolveQuickenedDirectHitPointRestoration(
      wounded,
      CureWoundsRestoration,
      1,
      7,
      3,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.state.fighter.hp == 12),
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
      assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 2),
    }
  }

  run test_quickened_direct_restoration_rejects_prior_level_1_plus_spell = {
    val priorSpell = commitActorSpellSlotUse(initialState, Fighter)
    val result = resolveQuickenedDirectHitPointRestoration(
      priorSpell,
      CureWoundsRestoration,
      1,
      7,
      3,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    assert(result == { state: priorSpell, sorceryPointsRemaining: 4 })
  }

  run test_quickened_direct_restoration_rejects_prior_free_level_1_plus_spell = {
    val priorFreeSpell = commitActorLevelOnePlusSpellCast(initialState, Fighter)
    val result = resolveQuickenedDirectHitPointRestoration(
      priorFreeSpell,
      CureWoundsRestoration,
      1,
      7,
      3,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    assert(result == { state: priorFreeSpell, sorceryPointsRemaining: 4 })
  }

  run test_quickened_scalar_buff_spends_bonus_action_not_magic_action = {
    val result = resolveQuickenedScalarBuffSpell(
      initialState,
      FalseLifeScalarBuff,
      Set(Fighter),
      Set(),
      1,
      7,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.state.fighter.tempHp == 11),
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
      assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 2),
    }
  }

  run test_quickened_save_gated_condition_spends_bonus_action_not_magic_action = {
    val result = resolveQuickenedColorSpray(
      initialState,
      false,
      true,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.state.fighter.activeEffects.contains(ColorSprayBlinded({
        source: Fighter,
        expiresAtRound: 2,
      }))),
      assert(not(result.state.goblin.activeEffects.contains(ColorSprayBlinded({
        source: Fighter,
        expiresAtRound: 2,
      })))),
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
      assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 2),
    }
  }

  run test_quickened_save_gated_condition_immunity_spends_bonus_action_not_magic_action = {
    val result = resolveQuickenedCalmEmotions(
      initialState,
      true,
      false,
      false,
      true,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.state.fighter.activeEffects.contains(CalmEmotionsCharmedImmunity)),
      assert(result.state.fighter.activeEffects.contains(CalmEmotionsFrightenedImmunity)),
      assert(not(result.state.goblin.activeEffects.contains(CalmEmotionsCharmedImmunity))),
      assert(result.state.fighter.concentrating),
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
      assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 2),
    }
  }

  run test_quickened_direct_condition_spends_bonus_action_not_magic_action = {
    val result = resolveQuickenedInvisibility(
      initialState,
      Set(Goblin),
      2,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.state.goblin.activeEffects.contains(InvisibilityCondition({
        source: Fighter,
        durationTicks: 600,
      }))),
      assert(not(result.state.fighter.activeEffects.contains(InvisibilityCondition({
        source: Fighter,
        durationTicks: 600,
      })))),
      assert(result.state.fighter.concentrating),
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
      assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 2),
    }
  }

  run test_quickened_roll_modifier_spends_bonus_action_not_magic_action = {
    val result = resolveQuickenedRollModifierChoiceSpell(
      initialState,
      BlessRollModifier,
      Set(Fighter),
      Set(),
      1,
      StrAbility,
      StealthSkill,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.state.fighter.activeEffects.contains(BlessD20RollBonus)),
      assert(not(result.state.goblin.activeEffects.contains(BlessD20RollBonus))),
      assert(result.state.fighter.concentrating),
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
      assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 2),
    }
  }

  run test_quickened_save_gated_damage_spends_bonus_action_not_magic_action = {
    val result = resolveQuickenedBurningHands(
      initialState,
      true,
      false,
      9,
      true,
      true,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.state.fighter.hp == 8),
      assert(result.state.goblin.hp == 1),
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasCommittedSpellSlotUse(result.state, Fighter)),
      assert(battleActorHasCastLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 2),
    }
  }

  run test_quickened_metamagic_known_affordable_and_stacking_admission = {
    val known = Set(
      quickenedSpellMetamagicFact,
      empoweredSpellMetamagicFact,
      heightenedSpellMetamagicFact,
    )
    all {
      assert(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      )),
      assert(selectedMetamagicOptionsCanStack(
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
      )),
      assert(not(selectedMetamagicOptionsCanStack(
        Set(quickenedSpellMetamagicFact, heightenedSpellMetamagicFact),
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        known,
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
        3,
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        known,
        Set(quickenedSpellMetamagicFact, heightenedSpellMetamagicFact),
        4,
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        Set(quickenedSpellMetamagicFact),
        Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
        3,
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        CureWoundsRestoration,
        known,
        Set(quickenedSpellMetamagicFact),
        1,
      ))),
      assert(not(quickenedSpellCanModifyDirectRestoration(
        initialState,
        HealingWordRestoration,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      ))),
      assert(quickenedSpellCanModifyScalarBuff(
        initialState,
        FalseLifeScalarBuff,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      )),
      assert(not(quickenedSpellCanModifyScalarBuff(
        initialState,
        ShieldOfFaithScalarBuff,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      ))),
      assert(quickenedSpellCanModifySaveGatedDamage(
        initialState,
        BurningHandsSaveGate,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedSaveGatedConditionProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedSaveGatedConditionImmunityProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedDirectConditionProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedRollModifierProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(quickenedSpellCanModifySpellAttackDamage(
        initialState,
        RayOfFrostSpellAttack,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      )),
      assert(not(quickenedSpellCanModifySaveGatedDamage(
        initialState,
        HellishRebukeSaveGate,
        known,
        Set(quickenedSpellMetamagicFact),
        2,
      ))),
    }
  }

  run test_quickened_spell_attack_preserves_attack_damage_and_spends_bonus_action = {
    val noReaction = { ...initialState, goblin: { ...initialState.goblin, reactionAvailable: false } }
    val result = resolveQuickenedRayOfFrost(
      noReaction,
      15,
      10,
      7,
      true,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      2,
    )
    all {
      assert(result.state.actionAvailable),
      assert(not(result.state.bonusActionAvailable)),
      assert(battleActorHasQuickenedLevelOnePlusSpellThisTurn(result.state, Fighter)),
      assert(result.sorceryPointsRemaining == 0),
      assert(result.state.goblin.hp == 3),
      assert(result.state.goblin.activeEffects.contains(RayOfFrostSpeedDelta)),
    }
  }

  run test_quickened_spell_attack_rejects_prior_level_1_plus_spell = {
    val priorSpell = commitActorLevelOnePlusSpellCast(initialState, Fighter)
    val result = resolveQuickenedRayOfFrost(
      priorSpell,
      15,
      10,
      7,
      true,
      Set(quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      2,
    )
    assert(result == { state: priorSpell, sorceryPointsRemaining: 2 })
  }

  run test_distant_spell_range_projection_admits_touch_and_distance_shapes = {
    val known = Set(distantSpellMetamagicFact)
    val touchResult = resolveDistantSpellRangeProjection(
      DistantRangeBearingTargetProcedure,
      SpellRangeTouch,
      known,
      Set(distantSpellMetamagicFact),
      2,
    )
    val distanceResult = resolveDistantSpellRangeProjection(
      DistantRangeBearingTargetProcedure,
      SpellRangeFeet({ feet: 60 }),
      known,
      Set(distantSpellMetamagicFact),
      2,
    )
    all {
      assert(touchResult == { rangeFeet: 30, sorceryPointsRemaining: 1 }),
      assert(distanceResult == { rangeFeet: 120, sorceryPointsRemaining: 1 }),
    }
  }

  run test_distant_spell_range_projection_rejects_self_short_and_unsupported_shapes = {
    val known = Set(distantSpellMetamagicFact)
    all {
      assert(not(distantSpellCanModifyRangeSpell(
        DistantRangeBearingTargetProcedure,
        SpellRangeSelf,
        known,
        Set(distantSpellMetamagicFact),
        1,
      ))),
      assert(not(distantSpellCanModifyRangeSpell(
        DistantRangeBearingTargetProcedure,
        SpellRangeFeet({ feet: 4 }),
        known,
        Set(distantSpellMetamagicFact),
        1,
      ))),
      assert(not(distantSpellCanModifyRangeSpell(
        NonDistantRangeProcedure,
        SpellRangeTouch,
        known,
        Set(distantSpellMetamagicFact),
        1,
      ))),
      assert(not(distantSpellCanModifyRangeSpell(
        DistantRangeBearingTargetProcedure,
        SpellRangeTouch,
        known,
        Set(distantSpellMetamagicFact),
        0,
      ))),
    }
  }

  run test_extended_spell_duration_projection_admits_timed_and_concentration_shapes = {
    val known = Set(extendedSpellMetamagicFact)
    val timedResult = resolveExtendedSpellDurationProjection(
      ExtendedDurationBearingProcedure,
      SpellTimedDurationTicks({ durationTicks: 600 }),
      known,
      Set(extendedSpellMetamagicFact),
      2,
    )
    val concentrationResult = resolveExtendedSpellDurationProjection(
      ExtendedDurationBearingProcedure,
      SpellConcentrationDurationTicks({ durationTicks: 10 }),
      known,
      Set(extendedSpellMetamagicFact),
      2,
    )
    all {
      assert(timedResult == {
        durationTicks: 1200,
        concentrationSavingThrowMode: NormalSavingThrow,
        sorceryPointsRemaining: 1,
      }),
      assert(concentrationResult == {
        durationTicks: 20,
        concentrationSavingThrowMode: AdvantageSavingThrow,
        sorceryPointsRemaining: 1,
      }),
    }
  }

  run test_extended_spell_duration_projection_caps_and_rejects_ineligible_shapes = {
    val known = Set(extendedSpellMetamagicFact)
    val capped = resolveExtendedSpellDurationProjection(
      ExtendedDurationBearingProcedure,
      SpellTimedDurationTicks({ durationTicks: 10000 }),
      known,
      Set(extendedSpellMetamagicFact),
      2,
    )
    all {
      assert(capped.durationTicks == 14400),
      assert(not(extendedSpellCanModifyDurationSpell(
        ExtendedDurationBearingProcedure,
        SpellTimedDurationTicks({ durationTicks: 9 }),
        known,
        Set(extendedSpellMetamagicFact),
        1,
      ))),
      assert(not(extendedSpellCanModifyDurationSpell(
        ExtendedDurationBearingProcedure,
        SpellInstantaneousDuration,
        known,
        Set(extendedSpellMetamagicFact),
        1,
      ))),
      assert(not(extendedSpellCanModifyDurationSpell(
        NonExtendedDurationProcedure,
        SpellConcentrationDurationTicks({ durationTicks: 10 }),
        known,
        Set(extendedSpellMetamagicFact),
        1,
      ))),
      assert(not(extendedSpellCanModifyDurationSpell(
        ExtendedDurationBearingProcedure,
        SpellConcentrationDurationTicks({ durationTicks: 10 }),
        known,
        Set(extendedSpellMetamagicFact),
        0,
      ))),
    }
  }

  run test_subtle_spell_component_projection_suppresses_verbal_somatic_and_focus_replaceable_material = {
    val known = Set(subtleSpellMetamagicFact)
    val verbalSomatic = resolveSubtleSpellComponentProjection(
      { verbal: true, somatic: true, material: NoMaterialComponent },
      known,
      Set(subtleSpellMetamagicFact),
      2,
    )
    val focusReplaceableMaterial = resolveSubtleSpellComponentProjection(
      { verbal: true, somatic: true, material: FocusReplaceableMaterialComponent },
      known,
      Set(subtleSpellMetamagicFact),
      2,
    )
    all {
      assert(verbalSomatic == {
        verbalSuppressed: true,
        somaticSuppressed: true,
        materialSuppressed: false,
        materialPreserved: false,
        sorceryPointsRemaining: 1,
      }),
      assert(focusReplaceableMaterial == {
        verbalSuppressed: true,
        somaticSuppressed: true,
        materialSuppressed: true,
        materialPreserved: false,
        sorceryPointsRemaining: 1,
      }),
    }
  }

  run test_subtle_spell_component_projection_preserves_priced_or_consumed_material = {
    val known = Set(subtleSpellMetamagicFact)
    val priced = resolveSubtleSpellComponentProjection(
      { verbal: true, somatic: true, material: PricedMaterialComponent },
      known,
      Set(subtleSpellMetamagicFact),
      2,
    )
    val consumed = resolveSubtleSpellComponentProjection(
      { verbal: true, somatic: true, material: ConsumedMaterialComponent },
      known,
      Set(subtleSpellMetamagicFact),
      2,
    )
    val consumedPriced = resolveSubtleSpellComponentProjection(
      { verbal: false, somatic: false, material: ConsumedPricedMaterialComponent },
      known,
      Set(subtleSpellMetamagicFact),
      2,
    )
    all {
      assert(priced == {
        verbalSuppressed: true,
        somaticSuppressed: true,
        materialSuppressed: false,
        materialPreserved: true,
        sorceryPointsRemaining: 1,
      }),
      assert(consumed == {
        verbalSuppressed: true,
        somaticSuppressed: true,
        materialSuppressed: false,
        materialPreserved: true,
        sorceryPointsRemaining: 1,
      }),
      assert(consumedPriced == {
        verbalSuppressed: false,
        somaticSuppressed: false,
        materialSuppressed: false,
        materialPreserved: true,
        sorceryPointsRemaining: 1,
      }),
    }
  }

  run test_subtle_spell_component_projection_rejects_missing_unknown_unaffordable_or_stacked_selection = {
    val known = Set(subtleSpellMetamagicFact)
    val components = { verbal: true, somatic: false, material: NoMaterialComponent }
    val rejected = resolveSubtleSpellComponentProjection(
      { verbal: false, somatic: false, material: NoMaterialComponent },
      known,
      Set(subtleSpellMetamagicFact),
      2,
    )
    all {
      assert(rejected == {
        verbalSuppressed: false,
        somaticSuppressed: false,
        materialSuppressed: false,
        materialPreserved: false,
        sorceryPointsRemaining: 2,
      }),
      assert(not(subtleSpellCanModifyComponentSpell(
        components,
        Set(),
        Set(subtleSpellMetamagicFact),
        1,
      ))),
      assert(not(subtleSpellCanModifyComponentSpell(
        components,
        known,
        Set(subtleSpellMetamagicFact),
        0,
      ))),
      assert(not(subtleSpellCanModifyComponentSpell(
        components,
        Set(subtleSpellMetamagicFact, empoweredSpellMetamagicFact),
        Set(subtleSpellMetamagicFact, empoweredSpellMetamagicFact),
        2,
      ))),
    }
  }

  run test_quickened_unsupported_action_spell_procedure_classes_are_closed = {
    all {
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedSaveGatedDamageProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedSpellAttackProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedSaveGatedConditionProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedSaveGatedConditionImmunityProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedDirectConditionProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedRollModifierProcedure,
        Set(quickenedSpellMetamagicFact),
      )),
      assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedDamageProcedure,
        Set(quickenedSpellMetamagicFact),
      ))),
      assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedControlProcedure,
        Set(quickenedSpellMetamagicFact),
      ))),
      assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedOngoingEffectProcedure,
        Set(quickenedSpellMetamagicFact),
      ))),
      assert(not(selectedMetamagicOptionsSupportedByQuickenedActionSpell(
        QuickenedOtherActionProcedure,
        Set(quickenedSpellMetamagicFact),
      ))),
    }
  }

  run test_save_affecting_metamagic_admission_and_sleep_closure = {
    val known = Set(carefulSpellMetamagicFact, heightenedSpellMetamagicFact)
    all {
      assert(saveMetamagicCanModifySaveSpell(
        SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
        known,
        Set(carefulSpellMetamagicFact),
        1,
      )),
      assert(saveMetamagicCanModifySaveSpell(
        SaveGatedNonDamageProcedure,
        known,
        Set(heightenedSpellMetamagicFact),
        2,
      )),
      assert(not(saveMetamagicCanModifySaveSpell(
        SleepTargetAdmissionProcedure,
        known,
        Set(heightenedSpellMetamagicFact),
        2,
      ))),
      assert(not(saveMetamagicCanModifySaveSpell(
        SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
        known,
        Set(carefulSpellMetamagicFact, heightenedSpellMetamagicFact),
        3,
      ))),
      assert(not(saveMetamagicCanModifySaveSpell(
        SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
        Set(carefulSpellMetamagicFact),
        Set(heightenedSpellMetamagicFact),
        2,
      ))),
    }
  }

  run test_save_affecting_metamagic_projects_save_boundary_facts = {
    val targets = Set(Fighter, Goblin)
    all {
      assert(carefulSpellProtectedTargetSelectionValid(targets, Set(Fighter), 3)),
      assert(carefulSpellProtectedTargetSelectionValid(targets, Set(Fighter), 0)),
      assert(not(carefulSpellProtectedTargetSelectionValid(targets, Set(Fighter, Goblin), 1))),
      assert(not(carefulSpellProtectedTargetSelectionValid(targets, Set(), 3))),
      assert(heightenedSpellTargetSelectionValid(targets, Goblin)),
      assert(not(heightenedSpellTargetSelectionValid(Set(Fighter), Goblin))),
      assert(savingThrowRollModeWithHeightenedSpell(
        NormalSavingThrow,
        Set(heightenedSpellMetamagicFact),
        Goblin,
        Goblin,
      ) == DisadvantageSavingThrow),
      assert(savingThrowRollModeWithHeightenedSpell(
        NormalSavingThrow,
        Set(heightenedSpellMetamagicFact),
        Fighter,
        Goblin,
      ) == NormalSavingThrow),
      assert(savingThrowRollModeWithHeightenedSpell(
        AdvantageSavingThrow,
        Set(heightenedSpellMetamagicFact),
        Goblin,
        Goblin,
      ) == NormalSavingThrow),
      assert(carefulSpellSuppressesSuccessfulHalfDamage(
        SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
        Set(carefulSpellMetamagicFact),
        Set(Fighter),
        Fighter,
        true,
      )),
      assert(not(carefulSpellSuppressesSuccessfulHalfDamage(
        SaveGatedDamageProcedure({ success: HalfDamageOnSaveSuccess }),
        Set(carefulSpellMetamagicFact),
        Set(Fighter),
        Fighter,
        false,
      ))),
      assert(not(carefulSpellSuppressesSuccessfulHalfDamage(
        SaveGatedDamageProcedure({ success: NoDamageOnSaveSuccess }),
        Set(carefulSpellMetamagicFact),
        Set(Fighter),
        Fighter,
        true,
      ))),
    }
  }

  run test_transmuted_spell_damage_type_admission = {
    val known = Set(transmutedSpellMetamagicFact)
    all {
      assert(transmutedSpellCanModifyDamageSpell(
        TransmutedSaveGatedDamageProcedure,
        Fire,
        Cold,
        known,
        Set(transmutedSpellMetamagicFact),
        1,
      )),
      assert(transmutedSpellCanModifyDamageSpell(
        TransmutedSpellAttackDamageProcedure,
        Cold,
        Thunder,
        known,
        Set(transmutedSpellMetamagicFact),
        1,
      )),
      assert(not(transmutedSpellCanModifyDamageSpell(
        TransmutedSpellAttackSequenceProcedure,
        Force,
        Thunder,
        known,
        Set(transmutedSpellMetamagicFact),
        1,
      ))),
      assert(not(transmutedSpellCanModifyDamageSpell(
        TransmutedSpellAttackDamageProcedure,
        Fire,
        Fire,
        known,
        Set(transmutedSpellMetamagicFact),
        1,
      ))),
      assert(not(transmutedSpellCanModifyDamageSpell(
        NonTransmutedDamageProcedure,
        Fire,
        Cold,
        known,
        Set(transmutedSpellMetamagicFact),
        1,
      ))),
      assert(not(transmutedSpellCanModifyDamageSpell(
        TransmutedSaveGatedDamageProcedure,
        Fire,
        Cold,
        Set(carefulSpellMetamagicFact),
        Set(transmutedSpellMetamagicFact),
        1,
      ))),
    }
  }

  run test_transmuted_spell_projects_damage_type_without_changing_source = {
    val known = Set(transmutedSpellMetamagicFact)
    all {
      assert(transmutedSpellDamageTypeProjection(
        TransmutedSaveGatedDamageProcedure,
        Fire,
        Lightning,
        known,
        Set(transmutedSpellMetamagicFact),
        1,
      ) == Lightning),
      assert(transmutedSpellDamageTypeProjection(
        TransmutedSpellAttackDamageProcedure,
        Cold,
        Acid,
        known,
        Set(transmutedSpellMetamagicFact),
        1,
      ) == Acid),
      assert(transmutedSpellDamageTypeProjection(
        TransmutedSpellAttackSequenceProcedure,
        Fire,
        Poison,
        known,
        Set(),
        1,
      ) == Fire),
    }
  }

  run test_seeking_spell_rerolls_missed_spell_attack_and_spends_one_point = {
    val result = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      15,
      10,
      13,
      Set(seekingSpellMetamagicFact),
      Set(),
      4,
    )
    all {
      assert(result.finalTotal == 15),
      assert(result.finalNaturalD20 == 10),
      assert(result.hit),
      assert(not(result.critical)),
      assert(result.sorceryPointsRemaining == 3),
    }
  }

  run test_seeking_spell_replacement_miss_and_natural_one_remain_misses = {
    val replacementMiss = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      7,
      4,
      13,
      Set(seekingSpellMetamagicFact),
      Set(),
      4,
    )
    val naturalOne = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      30,
      1,
      13,
      Set(seekingSpellMetamagicFact),
      Set(),
      4,
    )
    all {
      assert(not(replacementMiss.hit)),
      assert(not(replacementMiss.critical)),
      assert(replacementMiss.sorceryPointsRemaining == 3),
      assert(not(naturalOne.hit)),
      assert(not(naturalOne.critical)),
      assert(naturalOne.sorceryPointsRemaining == 3),
    }
  }

  run test_seeking_spell_replacement_natural_twenty_is_critical_hit = {
    val result = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      20,
      20,
      30,
      Set(seekingSpellMetamagicFact),
      Set(),
      4,
    )
    all {
      assert(result.hit),
      assert(result.critical),
      assert(result.sorceryPointsRemaining == 3),
    }
  }

  run test_seeking_spell_rejects_original_hit_unknown_unaffordable_and_repeated_attack_sequence = {
    val originalHit = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      15,
      10,
      5,
      2,
      13,
      Set(seekingSpellMetamagicFact),
      Set(),
      4,
    )
    val unknown = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      15,
      10,
      13,
      Set(quickenedSpellMetamagicFact),
      Set(),
      4,
    )
    val unaffordable = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      15,
      10,
      13,
      Set(seekingSpellMetamagicFact),
      Set(),
      0,
    )
    val repeatedAttackSequence = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackSequenceProcedure,
      5,
      2,
      15,
      10,
      13,
      Set(seekingSpellMetamagicFact),
      Set(),
      4,
    )
    all {
      assert(originalHit.finalTotal == 15),
      assert(originalHit.sorceryPointsRemaining == 4),
      assert(unknown.finalTotal == 5),
      assert(unknown.sorceryPointsRemaining == 4),
      assert(unaffordable.finalTotal == 5),
      assert(unaffordable.sorceryPointsRemaining == 0),
      assert(repeatedAttackSequence.finalTotal == 5),
      assert(repeatedAttackSequence.sorceryPointsRemaining == 4),
    }
  }

  run test_seeking_spell_stacking_exception_allows_one_different_metamagic_only = {
    val quickenedCast = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      15,
      10,
      13,
      Set(seekingSpellMetamagicFact, quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    val seekingAlreadyCast = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      15,
      10,
      13,
      Set(seekingSpellMetamagicFact),
      Set(seekingSpellMetamagicFact),
      4,
    )
    val twoCastMetamagics = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      15,
      10,
      13,
      Set(seekingSpellMetamagicFact, quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact, empoweredSpellMetamagicFact),
      4,
    )
    val quickenedCastCombinedUnaffordable = resolveSeekingSpellAttackReroll(
      SeekingSpellAttackDamageProcedure,
      5,
      2,
      15,
      10,
      13,
      Set(seekingSpellMetamagicFact, quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      2,
    )
    all {
      assert(quickenedCast.hit),
      assert(quickenedCast.sorceryPointsRemaining == 1),
      assert(seekingAlreadyCast.finalTotal == 5),
      assert(seekingAlreadyCast.sorceryPointsRemaining == 4),
      assert(twoCastMetamagics.finalTotal == 5),
      assert(twoCastMetamagics.sorceryPointsRemaining == 4),
      assert(quickenedCastCombinedUnaffordable.finalTotal == 5),
      assert(quickenedCastCombinedUnaffordable.sorceryPointsRemaining == 2),
    }
  }

  pure val empoweredDamageDieSize = 8

  pure val empoweredSingleDamageReroll: Set[BattleRuntimeEmpoweredSpellDamageDieReroll] =
    Set({
      selectedDieOrdinal: 0,
      original: 8,
      replacement: 1,
    })

  pure val empoweredOverLimitDamageRerolls: Set[BattleRuntimeEmpoweredSpellDamageDieReroll] =
    Set(
      {
        selectedDieOrdinal: 0,
        original: 4,
        replacement: 1,
      },
      {
        selectedDieOrdinal: 1,
        original: 3,
        replacement: 1,
      },
      {
        selectedDieOrdinal: 2,
        original: 2,
        replacement: 1,
      },
      {
        selectedDieOrdinal: 3,
        original: 1,
        replacement: 1,
      },
    )

  pure val empoweredInvalidReplacementDamageReroll: Set[BattleRuntimeEmpoweredSpellDamageDieReroll] =
    Set({
      selectedDieOrdinal: 0,
      original: 8,
      replacement: -1,
    })

  pure val empoweredEmptyDamageRerolls: Set[BattleRuntimeEmpoweredSpellDamageDieReroll] = Set()

  run test_empowered_spell_rerolls_damage_dice_and_spends_one_point = {
    val result = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact),
      Set(),
      4,
    )
    all {
      assert(result.finalDamageTotal == 9),
      assert(result.selectedDice == 1),
      assert(result.sorceryPointsRemaining == 3),
    }
  }

  run test_empowered_spell_rejects_unknown_unaffordable_unsupported_and_over_limit = {
    val unknown = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(quickenedSpellMetamagicFact),
      Set(),
      4,
    )
    val unaffordable = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact),
      Set(),
      0,
    )
    val repeatedAttackSequence = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackSequenceProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact),
      Set(),
      4,
    )
    val nonDamageOwner = resolveEmpoweredSpellDamageReroll(
      NonEmpoweredSpellDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact),
      Set(),
      4,
    )
    val overLimit = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredOverLimitDamageRerolls,
      3,
      Set(empoweredSpellMetamagicFact),
      Set(),
      4,
    )
    val zeroSelected = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredEmptyDamageRerolls,
      3,
      Set(empoweredSpellMetamagicFact),
      Set(),
      4,
    )
    val invalidReplacement = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredInvalidReplacementDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact),
      Set(),
      4,
    )
    all {
      assert(unknown.finalDamageTotal == 16),
      assert(unknown.sorceryPointsRemaining == 4),
      assert(unaffordable.finalDamageTotal == 16),
      assert(unaffordable.sorceryPointsRemaining == 0),
      assert(repeatedAttackSequence.finalDamageTotal == 16),
      assert(repeatedAttackSequence.sorceryPointsRemaining == 4),
      assert(nonDamageOwner.finalDamageTotal == 16),
      assert(nonDamageOwner.sorceryPointsRemaining == 4),
      assert(overLimit.finalDamageTotal == 16),
      assert(overLimit.selectedDice == 0),
      assert(overLimit.sorceryPointsRemaining == 4),
      assert(zeroSelected.finalDamageTotal == 16),
      assert(zeroSelected.selectedDice == 0),
      assert(zeroSelected.sorceryPointsRemaining == 4),
      assert(invalidReplacement.finalDamageTotal == 16),
      assert(invalidReplacement.selectedDice == 0),
      assert(invalidReplacement.sorceryPointsRemaining == 4),
    }
  }

  run test_empowered_spell_stacking_exception_allows_one_different_metamagic_only = {
    val quickenedCast = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact, quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      4,
    )
    val empoweredAlreadyCast = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact),
      Set(empoweredSpellMetamagicFact),
      4,
    )
    val twoCastMetamagics = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact, quickenedSpellMetamagicFact, seekingSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact, seekingSpellMetamagicFact),
      4,
    )
    val quickenedCastCombinedUnaffordable = resolveEmpoweredSpellDamageReroll(
      EmpoweredSpellAttackDamageProcedure,
      16,
      empoweredDamageDieSize,
      empoweredSingleDamageReroll,
      3,
      Set(empoweredSpellMetamagicFact, quickenedSpellMetamagicFact),
      Set(quickenedSpellMetamagicFact),
      2,
    )
    all {
      assert(quickenedCast.finalDamageTotal == 9),
      assert(quickenedCast.sorceryPointsRemaining == 1),
      assert(empoweredAlreadyCast.finalDamageTotal == 16),
      assert(empoweredAlreadyCast.sorceryPointsRemaining == 4),
      assert(twoCastMetamagics.finalDamageTotal == 16),
      assert(twoCastMetamagics.sorceryPointsRemaining == 4),
      assert(quickenedCastCombinedUnaffordable.finalDamageTotal == 16),
      assert(quickenedCastCombinedUnaffordable.sorceryPointsRemaining == 2),
    }
  }

  run test_twinned_spell_projects_next_effective_target_count_without_changing_actual_slot = {
    val result = resolveTwinnedTargetCountProjection(
      TwinnedOneAdditionalCreatureTargetProcedure,
      1,
      2,
      3,
      4,
      Set(twinnedSpellMetamagicFact),
      Set(twinnedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.actualSlotLevel == 1),
      assert(result.effectiveSpellLevel == 2),
      assert(result.maximumTargets == 4),
      assert(result.sorceryPointsRemaining == 3),
    }
  }

  run test_twinned_spell_rejects_non_target_count_projection = {
    val result = resolveTwinnedTargetCountProjection(
      NonTwinnedTargetCountProcedure,
      1,
      2,
      1,
      1,
      Set(twinnedSpellMetamagicFact),
      Set(twinnedSpellMetamagicFact),
      4,
    )
    all {
      assert(result.actualSlotLevel == 1),
      assert(result.effectiveSpellLevel == 1),
      assert(result.maximumTargets == 1),
      assert(result.sorceryPointsRemaining == 4),
    }
  }
}
