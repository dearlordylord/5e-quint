// -*- mode: Bluespec; -*-

module battleRuntimeInsectPlagueAreaHazardTests {
  import battleRuntimeInsectPlagueAreaHazard.* from "./battle-runtime-insect-plague-area-hazard"
  import hitPointDamage.* from "../shared-algebras/proofs/rule-core/hit-point-damage"

  pure def initialInsectPlagueState(slotLevel: int): InsectPlagueAreaHazardState = {
    actionAvailable: true,
    targetTurn: false,
    area: InsectPlagueAreaAbsent,
    nextOccurrenceOrdinal: 0,
    slotLedger: { slotLevel: slotLevel, slotsRemaining: 1 },
    slotSpellCastThisTurn: false,
    targetVitals: {
      kind: MonsterCreature,
      hitPoints: 100,
      hitPointMaximum: 100,
      temporaryHitPoints: 0,
      dead: false,
      unconscious: false,
    },
  }

  run test_insect_plague_cast_projects_raw_area_and_upcast_damage = {
    val cast = resolveInsectPlagueCast(initialInsectPlagueState(7), 7)
    all {
      assert(cast.slotLedger.slotsRemaining == 0),
      assert(cast.slotSpellCastThisTurn),
      assert(insectPlagueConcentrationActive(cast)),
      assert(insectPlagueAreaLightlyObscured(cast)),
      assert(insectPlagueAreaDifficultTerrain(cast)),
      assert(match cast.area {
        | InsectPlagueAreaAbsent => false
        | InsectPlagueAreaActive(area) => all {
            area.occurrenceOrdinal == 0,
            area.damageDice == 6,
            area.durationTicks == 100,
            area.radiusFeet == 20,
          }
      }),
    }
  }

  run test_insect_plague_qualified_triggers_share_one_turn_ledger = {
    val cast = resolveInsectPlagueCast(initialInsectPlagueState(5), 5)
    val appeared = resolveInsectPlagueSave(cast, InsectPlagueAppearsInArea, false, 20)
    val duplicateEntry = resolveInsectPlagueSave(appeared, InsectPlagueEntersArea, false, 20)
    val laterTurn = beginInsectPlagueLaterTurn(duplicateEntry)
    val entered = resolveInsectPlagueSave(laterTurn, InsectPlagueEntersArea, true, 20)
    val duplicateEnd = resolveInsectPlagueSave(entered, InsectPlagueEndsTurnInArea, false, 20)
    all {
      assert(appeared.targetVitals.hitPoints == 80),
      assert(duplicateEntry == appeared),
      assert(entered.targetVitals.hitPoints == 70),
      assert(duplicateEnd == entered),
    }
  }

  run test_insect_plague_upcast_failed_save_applies_the_selected_roll = {
    val cast = resolveInsectPlagueCast(initialInsectPlagueState(7), 7)
    val resolved = resolveInsectPlagueSave(cast, InsectPlagueAppearsInArea, false, 49)
    all {
      assert(resolved.targetVitals.hitPoints == 51),
      assert(match resolved.area {
        | InsectPlagueAreaAbsent => false
        | InsectPlagueAreaActive(area) => area.savedThisTurn
      }),
    }
  }

  run test_insect_plague_appearance_is_bound_to_cast_occurrence_and_cleanup = {
    val cast = resolveInsectPlagueCast(initialInsectPlagueState(5), 5)
    val laterTurn = beginInsectPlagueLaterTurn(cast)
    val staleAppearance = resolveInsectPlagueSave(laterTurn, InsectPlagueAppearsInArea, false, 20)
    val cleaned = resolveInsectPlagueConcentrationCleanup(laterTurn)
    all {
      assert(staleAppearance == laterTurn),
      assert(not(insectPlagueAreaActive(cleaned))),
      assert(not(insectPlagueConcentrationActive(cleaned))),
      assert(not(insectPlagueAreaLightlyObscured(cleaned))),
      assert(not(insectPlagueAreaDifficultTerrain(cleaned))),
    }
  }

  run test_insect_plague_duration_expires_at_the_next_round_boundary = {
    val cast = resolveInsectPlagueCast(initialInsectPlagueState(5), 5)
    val targetTurn = beginInsectPlagueLaterTurn(cast)
    val finalTick = match targetTurn.area {
      | InsectPlagueAreaAbsent => targetTurn
      | InsectPlagueAreaActive(area) => {
          ...targetTurn,
          area: InsectPlagueAreaActive({ ...area, durationTicks: 1 }),
        }
    }
    val expired = beginInsectPlagueLaterTurn(finalTick)
    assert(not(insectPlagueAreaActive(expired)))
  }
}
