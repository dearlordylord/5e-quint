// Source: https://rpg.stackexchange.com/q/171423
module _qa_aa1187463ad8ebc6 {
  import dnd.* from "./dnd"

  // In D&D 5e is there a spell or ability that mimics the D&D 2e Priest spell Combine?
  // Accepted answer: No such feature exists in 5e — no ability increases effective caster level or Turn Undead strength by combining with others.
  // The spec has no "combine caster levels" or "boost effective level" mechanic; proficiencyBonus and spellcastingBonus are fixed by individual level alone.
  run qa_no_combine_caster_level_boost = {
    // A level-5 cleric's spellcasting bonus is purely their own level + ability mod.
    // There is no function to combine levels with another caster.
    val config = TEST_CONFIG.with("level", 5)
                            .with("spellcastingAbility", Wis)
                            .with("abilityScores", Map(Str -> 14, Dex -> 12, Con -> 14, Int_ -> 10, Wis -> 16, Cha -> 8))
                            .with("hasSpellcasting", true)
    // proficiencyBonus(5) = 3, wisMod = (16-10)/2 = 3, so spellcastingBonus = 6, spellSaveDC = 14
    val pb = proficiencyBonus(config.level)
    val wisMod = abilityModifier(config.abilityScores.get(Wis))
    val bonus = spellcastingBonus(config)
    val dc = spellSaveDC(config)
    // Verify: bonus is exactly pb + wisMod, not inflated by any "combine" mechanic
    assert(
      pb == 3
      and wisMod == 3
      and bonus == pb + wisMod
      and dc == 8 + bonus
      // A hypothetical "combined" level-10 cleric would have pb=4, bonus=7, dc=15 — not achievable here
      and bonus != proficiencyBonus(10) + wisMod
    )
  }
}
