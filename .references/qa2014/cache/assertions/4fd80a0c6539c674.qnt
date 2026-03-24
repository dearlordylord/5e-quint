// Source: https://rpg.stackexchange.com/q/167069
module _qa_4fd80a0c6539c674 {
  import dnd.* from "./dnd"

  // Does exhaustion affect passive perception in 5e?
  run qa_exhaustion_passive_perception = {
    val wisMod     = abilityModifier(TEST_CONFIG.abilityScores.get(Wis))
    val profBonus  = proficiencyBonus(TEST_CONFIG.level)
    // Perception is in TEST_CONFIG.skillProficiencies
    val profLevel  = Proficient

    val fresh     = freshCreature(20)
    val exhausted = pAddExhaustion(fresh, 1)

    val modsFresh     = pCheckModifiers(fresh,     false, false, false)
    val modsExhausted = pCheckModifiers(exhausted, false, false, false)

    val passiveFresh     = passiveCheck(wisMod, profLevel, profBonus,
                             modsFresh.hasAdvantage,     modsFresh.hasDisadvantage)
    val passiveExhausted = passiveCheck(wisMod, profLevel, profBonus,
                             modsExhausted.hasAdvantage, modsExhausted.hasDisadvantage)

    assert(
      // exhaustion 1 imposes disadvantage on ability checks → pCheckModifiers sets hasDisadvantage
      modsExhausted.hasDisadvantage == true
      and modsFresh.hasDisadvantage == false
      // disadvantage on the ability check translates to -5 in the passive check formula (PHB ch.7)
      and passiveFresh - passiveExhausted == 5
    )
  }
}
