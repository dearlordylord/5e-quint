// Source: https://rpg.stackexchange.com/q/71612
module _qa_2b9774ef202221e1 {
  import dnd.* from "./dnd"

  // Does Jack Of All Trades allow me to keep the bonus after I become proficient in the skill later?
  run qa_jack_of_all_trades_no_stack_with_proficiency = {
    val pb      = proficiencyBonus(2)     // level 2 → +2
    val chaMod  = abilityModifier(14)     // CHA 14  → +2
    // JoaT is modeled as HalfProf; proficiency is Proficient.
    // checkSucceeds accepts a single ProficiencyLevel — stacking is structurally impossible.
    assert(and {
      // JoaT adds exactly floor(pb/2) = 1
      profMultiplier(HalfProf, pb) == 1,
      // Once proficient the bonus is pb = 2, NOT pb + floor(pb/2) = 3
      profMultiplier(Proficient, pb) == 2,
      profMultiplier(Proficient, pb) == pb,
      // The two bonuses are mutually exclusive (not additive)
      profMultiplier(Proficient, pb) != profMultiplier(HalfProf, pb) + pb,
      // Concrete check at DC 14, d20=10:
      //   JoaT:       10+2+1 = 13 < 14 → fails
      not(checkSucceeds(10, chaMod, HalfProf, pb, 0, 14)),
      //   Proficient: 10+2+2 = 14 >= 14 → succeeds (replacing JoaT, not stacking)
      checkSucceeds(10, chaMod, Proficient, pb, 0, 14),
      //   Stacked (wrong, +3): would give 10+2+3=15 but spec never produces profMult=3
      not(checkSucceeds(10, chaMod, Proficient, pb, 0, 14) and
          profMultiplier(Proficient, pb) == profMultiplier(HalfProf, pb) + pb),
    })
  }
}
