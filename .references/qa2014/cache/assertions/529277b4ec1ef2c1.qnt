// Source: https://rpg.stackexchange.com/q/92936
module _qa_529277b4ec1ef2c1 {
  import dnd.* from "./dnd"

  // Does a Gnome Mystic who replaces WIS save with an alternate attribute still have advantage on the save?
  run qa_gnome_cunning_advantage_persists_with_switched_proficiency = {
    // Gnome Mystic level 4: WIS 14 (+2), DEX 12 (+1), profBonus = 2
    // Mystic feature: proficiency switched from WIS saves → DEX saves
    val wisMod   = abilityModifier(14)    // +2
    val dexMod   = abilityModifier(12)    // +1
    val prof     = proficiencyBonus(4)    // +2
    val dc       = 15
  
    // WIS save against magic: Gnome Cunning still grants advantage on WIS saves
    // even though class proficiency was switched away. isProficient = false (no class prof on WIS).
    // Advantage rolls: 7 and 14 → take the higher (14)
    val wisHighRoll = 14
    val wisLowRoll  = 7
    // 14 + 2 + 0 = 16 >= 15 → succeeds (advantage matters)
    val wisWithAdvantage    = saveSucceeds(wisHighRoll, wisMod, false, prof, 0, dc)
    // 7  + 2 + 0 = 9  < 15 → fails (without advantage)
    val wisWithoutAdvantage = saveSucceeds(wisLowRoll,  wisMod, false, prof, 0, dc)
  
    // DEX save: now has proficiency (switched here), but no Gnome Cunning advantage
    // 11 + 1 + 2 = 14 < 15 → fails (proficiency alone not enough without the advantage boost)
    val dexRoll        = 11
    val dexWithProf    = saveSucceeds(dexRoll, dexMod, true, prof, 0, dc)
  
    assert(
      // Gnome Cunning advantage on WIS save succeeds despite no proficiency (14+2=16>=15)
      wisWithAdvantage    == true
      // Without advantage, same WIS save (no prof) fails (7+2=9<15)
      and wisWithoutAdvantage == false
      // Proficiency moved to DEX, but without racial advantage it still falls short (11+1+2=14<15)
      and dexWithProf     == false
    )
  }
}
