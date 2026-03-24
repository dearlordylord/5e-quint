// Source: https://rpg.stackexchange.com/q/70006
module _qa_5ced6b6a5f3fb622 {
  import dnd.* from "./dnd"

  // With Spirit Guardians up and Insect Plague: only breaking caster's concentration stops the spell
  run qa_insect_plague_failed_conc_save_ends_spell = {
    // Accepted answer: spell effects cannot be damaged; only breaking caster's concentration stops Insect Plague
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "insect_plague")
    // Caster takes 20 damage → DC = max(20/2, 10) = 10
    val dc = pConcentrationDC(20)
    // Caster fails the CON save → concentration breaks → Insect Plague ends
    val ss1 = pConcentrationCheck(ss0, false)
    assert(dc == 10 and ss1.concentrationSpellId == "")
  }
  
  // With Spirit Guardians up and Insect Plague: spell persists while caster succeeds concentration saves
  run qa_insect_plague_successful_conc_save_sustains_spell = {
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "insect_plague")
    // Caster takes 30 damage → DC = max(30/2, 10) = 15
    val dc = pConcentrationDC(30)
    // Caster succeeds → spell continues regardless of any damage to the swarm
    val ss1 = pConcentrationCheck(ss0, true)
    assert(dc == 15 and ss1.concentrationSpellId == "insect_plague" and isConcentrating(ss1))
  }
  
  // Concentration DC floors at 10 even for low damage (Spirit Guardians tick damage)
  run qa_insect_plague_conc_dc_minimum_ten = {
    // Repeated small hits from Spirit Guardians each require a DC-10 minimum save
    val dc1  = pConcentrationDC(1)
    val dc5  = pConcentrationDC(5)
    val dc10 = pConcentrationDC(10)
    val dc22 = pConcentrationDC(22)
    assert(dc1 == 10 and dc5 == 10 and dc10 == 10 and dc22 == 11)
  }
  
  // Damaging the caster is the only lever: death/incapacitation also breaks concentration
  run qa_insect_plague_caster_death_breaks_concentration = {
    val caster0 = freshCreature(10)
    val ss0 = FRESH_SPELL_SLOTS.with("concentrationSpellId", "insect_plague")
    // Caster drops to 0 HP (lethal damage with overflow >= maxHp → dead)
    val caster1 = pTakeDamage(caster0, 25, Slashing, Set(), Set(), Set(), false)
    // Breaking concentration on state-change (death)
    val ss1 = pBreakConcOnStateChange(ss0, caster0, caster1)
    assert(caster1.dead and ss1.concentrationSpellId == "")
  }
}
