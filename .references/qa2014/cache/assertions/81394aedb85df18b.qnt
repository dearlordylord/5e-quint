// Source: https://rpg.stackexchange.com/q/214084
module _qa_81394aedb85df18b {
  import dnd.* from "./dnd"

  // Does a touch spell have advantage when delivered by an invisible Familiar?
  // Accepted answer: No — the spellcaster makes the spell attack, so only the
  // spellcaster's (not the familiar's) invisibility is relevant.
  run qa_invisible_familiar_touch_spell_no_advantage = {
    // Familiar is invisible, but the spellcaster (the actual attacker) is visible.
    // Target can see the spellcaster → adv_unseenAttacker = false → no advantage.
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: true,  // target sees the spellcaster (the attacker), not the familiar
      attackerCanSeeTarget: true,
      isRangedAttack: false,       // melee spell attack
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(not(mods.hasAdvantage) and not(mods.hasDisadvantage))
  }
  
  // Does a touch spell have advantage when delivered by an invisible Familiar?
  // Contrapositive: if the SPELLCASTER (the attacker) is invisible, advantage IS granted.
  run qa_invisible_spellcaster_touch_spell_has_advantage = {
    // The spellcaster is the one invisible; target cannot see the attacker → advantage.
    val ctx: AttackContext = {
      attackerBlinded: false,
      attackerProne: false,
      attackerRestrained: false,
      attackerPoisoned: false,
      attackerFrightened: false,
      attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: false,
      targetParalyzed: false,
      targetPetrified: false,
      targetStunned: false,
      targetUnconscious: false,
      targetRestrained: false,
      targetProne: false,
      attackerWithin5ft: false,
      targetDodging: false,
      targetCanSeeAttacker: false, // target cannot see the invisible spellcaster (the attacker)
      attackerCanSeeTarget: true,
      isRangedAttack: false,
      beyondNormalRange: false,
      hostileWithin5ft: false,
      isHeavyWeapon: false,
      wielderSizeSmallOrTiny: false,
      squeezing: false,
      underwater: false,
      attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false,
      isUnderwaterRangedException: false,
    }
    val mods = pAggregateAttackMods(ctx)
    assert(mods.hasAdvantage and not(mods.hasDisadvantage))
  }
}
