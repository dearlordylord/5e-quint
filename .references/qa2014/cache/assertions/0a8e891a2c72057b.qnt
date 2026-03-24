// Source: https://rpg.stackexchange.com/q/123558
module _qa_0a8e891a2c72057b {
  import dnd.* from "./dnd"

  // Scorching Ray with Faerie Fire: "any attack roll against an affected creature has advantage" — each ray rolls independently with advantage
  run qa_faerie_fire_advantage_per_scorching_ray = {
    // Faerie Fire: "Any attack roll against an affected creature has advantage."
    // Modelled via targetBlinded=true (same mechanical effect: all attacks vs. target gain advantage).
    // Scorching Ray makes 3 separate ranged spell attack rolls; each evaluates the same context
    // independently — advantage is not "consumed" after the first roll.
    val ctx = {
      attackerBlinded: false, attackerProne: false, attackerRestrained: false,
      attackerPoisoned: false, attackerFrightened: false, attackerFrightSourceInLOS: false,
      attackerExhaustion: 0,
      targetBlinded: true,
      targetParalyzed: false, targetPetrified: false, targetStunned: false,
      targetUnconscious: false, targetRestrained: false, targetProne: false,
      attackerWithin5ft: false, targetDodging: false, targetCanSeeAttacker: true,
      attackerCanSeeTarget: true, isRangedAttack: true, beyondNormalRange: false,
      hostileWithin5ft: false, isHeavyWeapon: false, wielderSizeSmallOrTiny: false,
      squeezing: false, underwater: false, attackerHasSwimSpeed: false,
      isUnderwaterMeleeException: false, isUnderwaterRangedException: false,
    }
    // Each ray independently derives its own modifier context from the same Faerie Fire condition
    val ray1Mods = pAggregateAttackMods(ctx)
    val ray2Mods = pAggregateAttackMods(ctx)
    val ray3Mods = pAggregateAttackMods(ctx)
    // Each ray uses its own advantaged d20 result (higher of two dice, chosen by caller)
    val ray1 = resolveAttackRoll(15, 5, 14, 0) // 15+5=20 >= AC 14
    val ray2 = resolveAttackRoll(12, 5, 14, 0) // 12+5=17 >= AC 14
    val ray3 = resolveAttackRoll(10, 5, 14, 0) // 10+5=15 >= AC 14
    assert(
      // All three rays have advantage — Faerie Fire's "any attack roll" wording covers each
      ray1Mods.hasAdvantage and not(ray1Mods.hasDisadvantage) and
      ray2Mods.hasAdvantage and not(ray2Mods.hasDisadvantage) and
      ray3Mods.hasAdvantage and not(ray3Mods.hasDisadvantage) and
      // Each ray resolves its own attack roll independently with its advantaged die
      ray1.hits and ray2.hits and ray3.hits
    )
  }
}
