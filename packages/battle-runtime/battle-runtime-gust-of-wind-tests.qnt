// -*- mode: Bluespec; -*-

module battleRuntimeGustOfWindTests {
  import battleRuntimeGustOfWind.* from "./battle-runtime-gust-of-wind"
  import battleRuntimeModel.* from "./battle-runtime-model"
  import battleRuntimeSpellInvocation.* from "./battle-runtime-spell-invocation"
  import battleRuntimeTurnAdvancement.* from "./battle-runtime-turn-advancement"

  run test_gust_of_wind_line_runtime_support = {
    val cast = resolveGustOfWindLineCast(
      { battle: initialState, effect: NoGustOfWindLine },
      Fighter,
      2,
      1,
      10,
      noHeightenedSpellTarget,
      true,
    )
    val sameTurnChange = resolveGustOfWindLineDirectionChange(cast, Fighter, 20)
    val laterTurn = { ...cast, battle: endTurn(endTurn(cast.battle)) }
    val changed = resolveGustOfWindLineDirectionChange(laterTurn, Fighter, 20)
    all {
      assert(not(cast.battle.actionAvailable)),
      assert(cast.battle.fighter.concentrating),
      assert(battleActorHasCommittedSpellSlotUse(cast.battle, Fighter)),
      assert(gustOfWindLineMovementFactValid(sameTurnChange.effect, Fighter, 1, 10, 5, 5, 10)),
      assert(sameTurnChange.battle.bonusActionAvailable),
      assert(gustOfWindLineMovementFactValid(changed.effect, Fighter, 1, 20, 5, 5, 10)),
      assert(not(gustOfWindLineMovementFactValid(changed.effect, Fighter, 1, 20, 5, 5, 5))),
      assert(gustOfWindLineSaveFactsValid(changed.effect, Fighter, 1, 20, true, false, 0, false)),
      assert(gustOfWindLineSaveFactsValid(changed.effect, Fighter, 1, 20, true, true, 15, false)),
      assert(not(gustOfWindLineSaveFactsValid(changed.effect, Fighter, 1, 20, true, true, 15, true))),
      assert(not(changed.battle.bonusActionAvailable)),
    }
  }

  run test_heightened_gust_of_wind_line_target_survives_direction_change = {
    val cast = resolveGustOfWindLineCast(
      { battle: initialState, effect: NoGustOfWindLine },
      Fighter,
      2,
      1,
      10,
      HeightenedSpellTarget({ target: Goblin }),
      true,
    )
    val laterTurn = { ...cast, battle: endTurn(endTurn(cast.battle)) }
    val changed = resolveGustOfWindLineDirectionChange(laterTurn, Fighter, 20)
    all {
      assert(gustOfWindLineHeightenedDisadvantageApplies(cast.effect, Goblin)),
      assert(not(gustOfWindLineHeightenedDisadvantageApplies(cast.effect, Fighter))),
      assert(gustOfWindLineHeightenedDisadvantageApplies(changed.effect, Goblin)),
      assert(gustOfWindLineSaveFactsValid(changed.effect, Fighter, 1, 20, true, true, 15, false)),
      assert(gustOfWindLineMovementFactValid(changed.effect, Fighter, 1, 20, 5, 5, 10)),
    }
  }
}
