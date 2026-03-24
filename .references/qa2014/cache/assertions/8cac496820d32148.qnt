// Source: https://rpg.stackexchange.com/q/204046
module _qa_8cac496820d32148 {
  import dnd.* from "./dnd"

  // Is there a spell or item that makes it so enemies have disadvantage when attacking anyone other than you?
  run qa_emissary_of_redemption_resistance_all_damage_types = {
    // Emissary of Redemption grants resistance to ALL damage dealt by creatures not yet attacked.
    // ALL_DAMAGE_TYPES as resistances halves every damage type — fire, piercing, psychic alike.
    val paladin = freshCreature(20)
    val emissaryResist = ALL_DAMAGE_TYPES
    val afterFire     = pTakeDamage(paladin, 10, Fire,     emissaryResist, Set(), Set(), false)
    val afterPiercing = pTakeDamage(paladin, 10, Piercing, emissaryResist, Set(), Set(), false)
    val afterPsychic  = pTakeDamage(paladin, 10, Psychic,  emissaryResist, Set(), Set(), false)
    assert(
      afterFire.hp == 15 and
      afterPiercing.hp == 15 and
      afterPsychic.hp == 15
    )
  }
  
  // Is there a spell or item that makes it so enemies have disadvantage when attacking anyone other than you?
  run qa_advantage_disadvantage_cancel_to_neither = {
    // PHB: if a roll has both advantage and disadvantage from any sources, you have neither.
    // No stacking of extra sources changes this — one adv + one disadv = neutral roll.
    val resolved = resolveAdvantage({ hasAdvantage: true, hasDisadvantage: true })
    assert(not(resolved.hasAdvantage) and not(resolved.hasDisadvantage))
  }
  
  // Is there a spell or item that makes it so enemies have disadvantage when attacking anyone other than you?
  run qa_dodge_action_imposes_disadvantage_on_attacker = {
    // Dodge is one of the few standard mechanics that protects a creature by imposing
    // attacker disadvantage — the spec models this in pAggregateAttackMods.
    val ctx: AttackContext = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false, targetParalyzed: false, targetPetrified: false,
      targetStunned: false, targetUnconscious: false, targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: true,
      targetDodging: true,
      targetCanSeeAttacker: true,
      attackerCanSeeTarget: true,
      isRangedAttack: false, beyondNormalRange: false, hostileWithin5ft: false,
      isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasDisadvantage and not(mods.hasAdvantage))
  }
}
