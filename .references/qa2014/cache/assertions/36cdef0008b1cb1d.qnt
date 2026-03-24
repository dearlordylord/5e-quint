// Source: https://rpg.stackexchange.com/q/168825
module _qa_36cdef0008b1cb1d {
  import dnd.* from "./dnd"

  // Meenlock telepathic torment on target with 0 HP: Guaranteed 1 hour meenlock?
  run qa_meenlock_torment_at_0hp_stays_0 = {
    // Accepted answer: torment damage on a 0-HP target adds death-save failures
    // but HP stays at 0 — no new "drop to 0 HP" event occurs.
    val alive = freshCreature(20)
    val unconscious = pTakeDamage(alive, 20, Bludgeoning, Set(), Set(), Set(), false)
    val afterTorment = pTakeDamage(unconscious, 5, Psychic, Set(), Set(), Set(), false)
    assert(
      // Was already at 0 HP before torment
      unconscious.hp == 0
      // HP remains 0 after torment (no fresh drop-to-0)
      and afterTorment.hp == 0
      // But damage did register: death save failures incremented
      and afterTorment.deathSaves.failures > unconscious.deathSaves.failures
    )
  }
  
  // Meenlock telepathic torment on target with 0 HP: Guaranteed 1 hour meenlock?
  run qa_meenlock_torment_three_failures_kills = {
    // Three rounds of torment damage accumulate 3 death-save failures → dead
    // (models the humanoid "dropping to 0 HP" from the final torment hit and transforming).
    val alive = freshCreature(20)
    val unconscious = pTakeDamage(alive, 20, Bludgeoning, Set(), Set(), Set(), false)
    val after1 = pTakeDamage(unconscious, 5, Psychic, Set(), Set(), Set(), false)
    val after2 = pTakeDamage(after1,    5, Psychic, Set(), Set(), Set(), false)
    val after3 = pTakeDamage(after2,    5, Psychic, Set(), Set(), Set(), false)
    assert(after3.dead)
  }
}
