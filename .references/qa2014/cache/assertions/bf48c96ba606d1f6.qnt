// Source: https://rpg.stackexchange.com/q/159431
module _qa_bf48c96ba606d1f6 {
  import dnd.* from "./dnd"

  // Monster Slayer Ranger vs Enervation: 2d8 on-save-success damage applies even after counterattack breaks concentration
  run qa_enervation_success_damage_persists_after_break = {
      val hp = 20
      val ranger = freshCreature(hp)
      // Caster is concentrating on Enervation
      val casterConc = FRESH_SPELL_SLOTS.with("concentrationSpellId", "enervation")
      // Slayer's Counter: attack hits → save auto-succeeds (nat 20 models auto-success)
      val saveAutoSucceeds = saveSucceeds(20, 1, false, 3, 0, 15)
      // Enervation on-success effect: 2d8 necrotic (rolled 5+4=9)
      val onSuccessDmg = 9
      val rangerAfterDmg = pTakeDamage(ranger, onSuccessDmg, Necrotic, Set(), Set(), Set(), false)
      // Counterattack broke concentration — separate event, after save damage already resolved
      val casterAfterBreak = pBreakConcentration(casterConc)
      assert(and {
          // Slayer's Counter auto-success confirmed
          saveAutoSucceeds,
          // Ranger took the on-success 2d8 damage (not the on-fail 4d8)
          rangerAfterDmg.hp == hp - onSuccessDmg,
          // Concentration is now broken by the counterattack
          not(isConcentrating(casterAfterBreak)),
          // Damage is not retroactively undone by breaking concentration
          rangerAfterDmg.hp < hp,
      })
  }
}
