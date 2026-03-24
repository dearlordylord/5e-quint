// Source: https://rpg.stackexchange.com/q/184777
module _qa_c33238884c597c27 {
  import dnd.* from "./dnd"

  // Life Transference: ally heals twice the necrotic damage caster actually takes; "can't be reduced in any way" means resistances and immunities are bypassed on the caster
  run qa_life_transference_healing_equals_twice_damage_taken = {
    val ally = freshCreature(40).with("hp", 10)
    val rawDamage = 20
    // Spell errata bypasses all reductions on caster: empty immunity/resistance sets
    val damageTaken = applyDamageModifiers(rawDamage, Necrotic, Set(), Set(), Set())
    val healingAmount = damageTaken * 2
    val allyAfter = pHeal(ally, healingAmount)
    assert(
      damageTaken == 20 and
      healingAmount == 40 and
      allyAfter.hp == 40
    )
  }
  
  // Life Transference: if damage is redirected to another entity (Arcane Ward / Redemption Aura) and caster takes 0, healing = 2*0 = 0
  run qa_life_transference_redirect_gives_zero_healing = {
    val ally = freshCreature(40).with("hp", 10)
    // Caster takes 0 damage because another entity absorbed it all
    val damageTakenByCaster = 0
    val healingAmount = damageTakenByCaster * 2
    val allyAfter = pHeal(ally, healingAmount)
    assert(
      healingAmount == 0 and
      allyAfter.hp == 10
    )
  }
  
  // Life Transference: "can't be reduced in any way" — even a caster with necrotic resistance takes full damage, so ally heals the unreduced amount
  run qa_life_transference_bypasses_resistance_on_caster = {
    val rawDamage = 24
    // Normal path: necrotic resistance would halve damage
    val withResistance = applyDamageModifiers(rawDamage, Necrotic, Set(), Set(Necrotic), Set())
    // Spell errata forces full damage through; healing is based on unreduced amount
    val noReduction = applyDamageModifiers(rawDamage, Necrotic, Set(), Set(), Set())
    assert(
      withResistance == 12 and
      noReduction == 24 and
      noReduction * 2 == 48
    )
  }
}
