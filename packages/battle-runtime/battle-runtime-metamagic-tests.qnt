// -*- mode: Bluespec; -*-

module battleRuntimeMetamagicTests {
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
    }
  }

  run test_quickened_unsupported_action_spell_procedure_classes_are_closed = {
    all {
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
}
