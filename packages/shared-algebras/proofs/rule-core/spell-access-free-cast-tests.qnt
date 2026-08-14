// -*- mode: Bluespec; -*-

module spellAccessFreeCastTests {
  import spellAccessFreeCast.* from "./spell-access-free-cast"

  pure val firstAccess: SpellAccessKey = {
    sourceUnitId: "synthetic_source_a",
    spellId: "synthetic_spell",
  }

  pure val secondAccess: SpellAccessKey = {
    sourceUnitId: "synthetic_source_b",
    spellId: "synthetic_spell",
  }

  pure val fresh: SpellAccessCastingState = {
    freeCastExpended: Map(
      firstAccess -> 0,
      secondAccess -> 0,
    ),
    spellSlotsExpended: 1,
  }

  run sourceAndSpellFormCompoundIdentity = {
    val otherSpell = { sourceUnitId: firstAccess.sourceUnitId, spellId: "synthetic_other_spell" }
    all {
      assert(sameSpellAccess(firstAccess, firstAccess)),
      assert(not(sameSpellAccess(firstAccess, secondAccess))),
      assert(not(sameSpellAccess(firstAccess, otherSpell))),
    }
  }

  run exactSpendAndKeyIsolationAndSlotIndependence = {
    val spent = spendSpellAccessFreeCast(fresh, firstAccess)
    all {
      assert(canSpendSpellAccessFreeCast(fresh, firstAccess)),
      assert(spent.freeCastExpended.get(firstAccess) == 1),
      assert(spent.freeCastExpended.get(secondAccess) == 0),
      assert(spent.spellSlotsExpended == fresh.spellSlotsExpended),
      assert(canSpendSpellAccessFreeCast(spent, secondAccess)),
      assert(not(canSpendSpellAccessFreeCast(spent, firstAccess))),
      assert(spendSpellAccessFreeCast(spent, firstAccess) == spent),
    }
  }

  run restLifecycle = {
    val spent = spendSpellAccessFreeCast(fresh, firstAccess)
    val shortRested = completeShortRestSpellAccessFreeCast(spent)
    val longRested = completeLongRestSpellAccessFreeCast(shortRested)
    all {
      assert(shortRested.freeCastExpended.get(firstAccess) == 1),
      assert(shortRested.freeCastExpended.get(secondAccess) == 0),
      assert(longRested.freeCastExpended.get(firstAccess) == 0),
      assert(longRested.freeCastExpended.get(secondAccess) == 0),
      assert(longRested.spellSlotsExpended == fresh.spellSlotsExpended),
    }
  }
}
