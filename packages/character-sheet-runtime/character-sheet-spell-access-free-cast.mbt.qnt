// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_ACCESS.FREE_CAST_LIFECYCLE

module characterSheetSpellAccessFreeCastMbt {
  import spellAccessFreeCast.* from "../shared-algebras/proofs/rule-core/spell-access-free-cast"

  type SpellAccessFreeCastReplayState = {
    replayIndex: int,
    freeCastExpended: int,
    spellSlotsExpended: int,
  }

  pure val selectedSpellAccess: SpellAccessKey = {
    sourceUnitId: "selected-source",
    spellId: "selected-spell",
  }

  pure def castingState(state: SpellAccessFreeCastReplayState): SpellAccessCastingState = {
    freeCastExpended: Map(selectedSpellAccess -> state.freeCastExpended),
    spellSlotsExpended: state.spellSlotsExpended,
  }

  var qState: SpellAccessFreeCastReplayState

  action init = all {
    qState' = { replayIndex: 0, freeCastExpended: 0, spellSlotsExpended: 0 },
  }

  action spendFreeCast = all {
    qState.replayIndex == 0,
    val spent = spendSpellAccessFreeCast(castingState(qState), selectedSpellAccess)
    qState' = {
      replayIndex: 1,
      freeCastExpended: spent.freeCastExpended.get(selectedSpellAccess),
      spellSlotsExpended: spent.spellSlotsExpended,
    },
  }

  action completeShortRest = all {
    qState.replayIndex == 1,
    val rested = completeShortRestSpellAccessFreeCast(castingState(qState))
    qState' = {
      replayIndex: 2,
      freeCastExpended: rested.freeCastExpended.get(selectedSpellAccess),
      spellSlotsExpended: rested.spellSlotsExpended,
    },
  }

  action completeLongRest = all {
    qState.replayIndex == 2,
    val rested = completeLongRestSpellAccessFreeCast(castingState(qState))
    qState' = {
      replayIndex: 3,
      freeCastExpended: rested.freeCastExpended.get(selectedSpellAccess),
      spellSlotsExpended: rested.spellSlotsExpended,
    },
  }

  action step = any {
    spendFreeCast,
    completeShortRest,
    completeLongRest,
  }
}
