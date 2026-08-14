// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner SHEET.SPELL_ACCESS.FREE_CAST_LIFECYCLE

module spellAccessFreeCast {
  type SpellAccessKey = {
    sourceUnitId: str,
    spellId: str,
  }

  type SpellAccessCastingState = {
    freeCastExpended: SpellAccessKey -> int,
    spellSlotsExpended: int,
  }

  pure def sameSpellAccess(first: SpellAccessKey, second: SpellAccessKey): bool = and {
    first.sourceUnitId == second.sourceUnitId,
    first.spellId == second.spellId,
  }

  pure def legalSpellAccessCastingState(state: SpellAccessCastingState): bool = and {
    state.freeCastExpended.keys().forall(accessKey => all {
      state.freeCastExpended.get(accessKey) >= 0,
      state.freeCastExpended.get(accessKey) <= 1,
    }),
    state.spellSlotsExpended >= 0,
  }

  pure def canSpendSpellAccessFreeCast(
    state: SpellAccessCastingState,
    accessKey: SpellAccessKey
  ): bool = and {
    legalSpellAccessCastingState(state),
    state.freeCastExpended.keys().contains(accessKey),
    state.freeCastExpended.get(accessKey) == 0,
  }

  pure def spendSpellAccessFreeCast(
    state: SpellAccessCastingState,
    accessKey: SpellAccessKey
  ): SpellAccessCastingState =
    if (canSpendSpellAccessFreeCast(state, accessKey))
      {
        ...state,
        freeCastExpended: state.freeCastExpended.put(
          accessKey,
          state.freeCastExpended.get(accessKey) + 1
        ),
      }
    else state

  pure def completeShortRestSpellAccessFreeCast(state: SpellAccessCastingState): SpellAccessCastingState =
    state

  pure def completeLongRestSpellAccessFreeCast(state: SpellAccessCastingState): SpellAccessCastingState =
    {
      ...state,
      freeCastExpended: state.freeCastExpended.keys().mapBy(accessKey => 0),
    }
}
