// Source: https://rpg.stackexchange.com/q/100200
module _qa_f9945b9fb2361d05 {
  import dnd.* from "./dnd"

  // Dispel Magic vs Magic Resistance: Magic Resistance grants advantage on saving throws, not on the caster's spellcasting ability check
  run qa_magic_resistance_does_not_affect_dispel_check = {
    // Dispel Magic (3rd level) vs a 9th-level spell: DC = 10 + 9 = 19
    val spellLevel = 9
    val dc = 10 + spellLevel
    // Caster: spellcasting mod +4 (e.g. INT 18), no proficiency added (most classes)
    val spellcastingMod = 4
    // Magic Resistance = advantage on SAVING THROWS against spells (NPC's side).
    // It does NOT impose disadvantage on the caster's ability check — the caster's
    // adv state is entirely unaffected by the target's Magic Resistance.
    val casterCheckAdv = resolveAdvantage({ hasAdvantage: false, hasDisadvantage: false })
    // d20=15: 15 + 4 = 19 >= 19, check succeeds (just makes it)
    val succeedsOn15 = checkSucceeds(15, spellcastingMod, NoneProf, 0, 0, dc)
    // d20=14: 14 + 4 = 18 < 19, check fails
    val failsOn14 = checkSucceeds(14, spellcastingMod, NoneProf, 0, 0, dc)
    assert(
      // Magic Resistance leaves the caster's check adv state unchanged
      casterCheckAdv == { hasAdvantage: false, hasDisadvantage: false }
      // Dispel Magic DC against 9th-level spell is 19
      and dc == 19
      // Check arithmetic: needs at least 15 on the die with +4 mod to beat DC 19
      and succeedsOn15
      and not(failsOn14)
    )
  }
}
