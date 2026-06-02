// -*- mode: Bluespec; -*-

module battleRuntimeLevitateCreatureTests {
  import battleRuntimeLevitateCreature.* from "./battle-runtime-levitate-creature"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeConcentration.* from "./battle-runtime-concentration"
  import battleRuntimeTimedEffects.* from "./battle-runtime-timed-effects"

  run test_levitate_creature_initial_rise_is_caller_selected = {
    val resolved = resolveLevitateCreature(initialState, Goblin, true, false, 5, 2)
    val tooHigh = resolveLevitateCreature(initialState, Goblin, true, false, 25, 2)
    all {
      assert(targetLevitatedCreatureAltitudeFrom(resolved, Goblin, Fighter) == 5),
      assert(not(targetHasLevitatedCreatureFrom(tooHigh, Goblin, Fighter))),
      assert(not(resolved.actionAvailable)),
      assert(resolved.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(resolved.fighter.concentrating),
    }
  }

  run test_levitate_creature_successful_save_spends_only = {
    val resolved = resolveLevitateCreature(initialState, Goblin, false, true, 10, 2)
    all {
      assert(not(resolved.actionAvailable)),
      assert(resolved.spellSlotUsesThisTurn.contains(BattleCommittedSpellSlotUse(Fighter))),
      assert(not(targetHasLevitatedCreatureFrom(resolved, Goblin, Fighter))),
      assert(not(resolved.fighter.concentrating)),
    }
  }

  run test_levitate_creature_movement_witness_and_caster_control = {
    val cast = resolveLevitateCreature(initialState, Goblin, true, false, 10, 2)
    val goblinTurn = { ...cast, initiative: { ...cast.initiative, alreadyActed: [Fighter], stillToAct: { actor: Goblin, waiting: [] } }, actionAvailable: true }
    val missingWitness = moveLevitatedTargetWithWitness(goblinTurn, Goblin, Fighter, false, WalkSpeedKind, 10, true, 5)
    val underpaidClimb = moveLevitatedTargetWithWitness(goblinTurn, Goblin, Fighter, true, WalkSpeedKind, 5, true, 5)
    val witnessedMove = moveLevitatedTargetWithWitness(goblinTurn, Goblin, Fighter, true, WalkSpeedKind, 10, true, 5)
    val fighterTurn = { ...witnessedMove, initiative: { ...witnessedMove.initiative, alreadyActed: [], stillToAct: { actor: Fighter, waiting: [Goblin] } }, actionAvailable: true }
    val outOfRange = controlLevitatedCreatureAltitude(fighterTurn, Goblin, Fighter, false, true, 5)
    val controlled = controlLevitatedCreatureAltitude(fighterTurn, Goblin, Fighter, true, false, 10)
    all {
      assert(targetLevitatedCreatureAltitudeFrom(missingWitness, Goblin, Fighter) == 10),
      assert(targetLevitatedCreatureAltitudeFrom(underpaidClimb, Goblin, Fighter) == 10),
      assert(targetLevitatedCreatureAltitudeFrom(witnessedMove, Goblin, Fighter) == 15),
      assert(targetLevitatedCreatureAltitudeFrom(outOfRange, Goblin, Fighter) == 15),
      assert(targetLevitatedCreatureAltitudeFrom(controlled, Goblin, Fighter) == 5),
      assert(not(controlled.actionAvailable)),
    }
  }

  run test_levitate_creature_self_target_uses_movement_only_for_altitude = {
    val cast = resolveLevitateCreature(initialState, Fighter, true, false, 10, 2)
    val fighterTurn = { ...cast, actionAvailable: true }
    val magicActionControl = controlLevitatedCreatureAltitude(fighterTurn, Fighter, Fighter, true, true, 5)
    val witnessedMove = moveLevitatedTargetWithWitness(fighterTurn, Fighter, Fighter, true, WalkSpeedKind, 10, true, 5)
    all {
      assert(targetLevitatedCreatureAltitudeFrom(magicActionControl, Fighter, Fighter) == 10),
      assert(magicActionControl.actionAvailable),
      assert(targetLevitatedCreatureAltitudeFrom(witnessedMove, Fighter, Fighter) == 15),
    }
  }

  run test_levitate_creature_replacement_clears_displaced_source_concentration = {
    val goblinLevitatingItself = {
      ...initialState,
      goblin: {
        ...initialState.goblin,
        concentrating: true,
        activeEffects: Set(levitatedCreatureEffect(Goblin, 8)),
      },
    }
    val replaced = resolveLevitateCreature(goblinLevitatingItself, Goblin, true, false, 10, 2)
    all {
      assert(not(replaced.goblin.concentrating)),
      assert(not(targetHasLevitatedCreatureFrom(replaced, Goblin, Goblin))),
      assert(targetHasLevitatedCreatureFrom(replaced, Goblin, Fighter)),
    }
  }

  run test_levitate_creature_concentration_cleanup_removes_target_effect = {
    val resolved = resolveLevitateCreature(initialState, Goblin, true, false, 10, 2)
    val cleaned = breakConcentrationSpellEffects(resolved, Fighter)
    all {
      assert(not(cleaned.fighter.concentrating)),
      assert(not(targetHasLevitatedCreatureFrom(cleaned, Goblin, Fighter))),
    }
  }

  run test_levitate_creature_duration_cleanup_removes_target_effect = {
    val resolved = resolveLevitateCreature(initialState, Goblin, true, false, 10, 2)
    val expiring = {
      ...resolved,
      goblin: {
        ...resolved.goblin,
        activeEffects: Set(LevitatedCreature({
          source: Fighter,
          altitudeFeet: 10,
          maxAltitudeChangeFeet: levitateAltitudeChangeMaxFeet,
          rangeFeet: levitateRangeFeet,
          durationTicks: 1,
        })),
      },
    }
    val cleaned = tickRoundDurationSpellEffects(expiring)
    all {
      assert(not(cleaned.fighter.concentrating)),
      assert(not(targetHasLevitatedCreatureFrom(cleaned, Goblin, Fighter))),
    }
  }

  run test_levitate_creature_duration_cleanup_preserves_target_own_concentration = {
    val targetConcentratingOnOwnSpell = {
      ...initialState,
      fighter: {
        ...initialState.fighter,
        concentrating: true,
        activeEffects: Set(LevitatedCreature({
          source: Goblin,
          altitudeFeet: 10,
          maxAltitudeChangeFeet: levitateAltitudeChangeMaxFeet,
          rangeFeet: levitateRangeFeet,
          durationTicks: 1,
        }), BlessD20RollBonus),
      },
      goblin: {
        ...initialState.goblin,
        concentrating: true,
      },
    }
    val cleaned = tickRoundDurationSpellEffects(targetConcentratingOnOwnSpell)
    all {
      assert(cleaned.fighter.concentrating),
      assert(cleaned.fighter.activeEffects.contains(BlessD20RollBonus)),
      assert(not(cleaned.goblin.concentrating)),
      assert(not(targetHasLevitatedCreatureFrom(cleaned, Fighter, Goblin))),
    }
  }
}
