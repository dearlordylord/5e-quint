// Source: https://rpg.stackexchange.com/q/165082
module _qa_e53702e42e4557f5 {
  import dnd.* from "./dnd"

  // Is the Oath of the Ancients Paladin's Elder Champion feature intended to still work while unconscious?
  run qa_elder_champion_heals_unconscious_paladin = {
    // Paladin knocked to 0 HP while Elder Champion is active.
    // Elder Champion has no "ends if incapacitated" clause, so its 10 HP/turn regen still fires.
    val unconsciousPaladin = freshCreature(30)
      .with("hp", 0)
      .with("unconscious", true)
      .with("prone", true)
      .with("incapacitatedSources", Set(ISUnconscious))
    // "At the start of each of your turns, you regain 10 hit points." — no suppression clause.
    val afterRegen = pHeal(unconsciousPaladin, 10)
    assert(
      afterRegen.hp == 10
      and not(afterRegen.unconscious)
      and afterRegen.incapacitatedSources == Set()
      and afterRegen.deathSaves == DEATH_SAVES_RESET
    )
  }
}
