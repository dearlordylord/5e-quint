// Source: https://rpg.stackexchange.com/q/169384
module _qa_d1baa51b5aa6a08a {
  import dnd.* from "./dnd"

  // "When would someone in a Sculpt Spell's 'pocket of safety' take damage?"
  // Accepted answer: Sculpt Spell has two distinct protections: (1) auto-succeed the saving throw
  // (avoiding non-damage effects like being pushed/prone), AND (2) negate half-damage on that success.
  // If it only said "no damage", the pocket creature would still need to roll against the push.
  run qa_sculpt_spell_auto_success_avoids_non_damage_effects = {
    // Thunderwave-like spell:
    //   Failed save  → 16 thunder damage + prone (pushed)
    //   Natural success → 8 thunder damage (half), not prone
    //   Sculpt pocket  → 0 damage, not prone (auto-success + half-damage negation)
  
    val creature = freshCreature(20)
    val fullDamage = 16   // 2d8 = 16
    val halfDamage = 8    // half of 16, what a normal successful save gives
  
    // Without Sculpt: nat-1 vs DC 13 fails the save
    val withoutSculpt_saveFails = not(saveSucceeds(1, 0, false, 2, 0, 13))
  
    // Failed save: full damage + prone (thunderwave pushes to the ground)
    val afterFailedSave =
      pTakeDamage(
        pApplyCondition(creature, CProne),
        fullDamage, Thunder, Set(), Set(), Set(), false
      )
  
    // Natural success (roll 20): passes save, no prone, but STILL takes half damage
    val withoutSculpt_saveSucceeds = saveSucceeds(20, 0, false, 2, 0, 13)
    val afterNaturalSuccess =
      pTakeDamage(creature, halfDamage, Thunder, Set(), Set(), Set(), false)
  
    // Sculpt Spell pocket: auto-succeed = no save roll needed → no prone, AND 0 damage
    val afterSculptPocket = creature  // untouched: no condition, no damage
  
    assert(
      // Nat-1 fails DC 13
      withoutSculpt_saveFails
      // Failed save → prone + full damage (20 − 16 = 4 HP)
      and afterFailedSave.prone
      and afterFailedSave.hp == 4
      // Nat-20 passes save → not prone, but still half damage (20 − 8 = 12 HP)
      and withoutSculpt_saveSucceeds
      and not(afterNaturalSuccess.prone)
      and afterNaturalSuccess.hp == 12
      // Sculpt pocket: auto-success avoids prone, AND negates the residual half-damage
      and not(afterSculptPocket.prone)
      and afterSculptPocket.hp == 20
      // Key: natural success still deals 8 damage; sculpt gives strictly better (0 damage)
      and afterNaturalSuccess.hp < afterSculptPocket.hp
    )
  }
}
