// Source: https://rpg.stackexchange.com/q/124643
module _qa_930ae97dc8efda26 {
  import dnd.* from "./dnd"

  // Q&A: "Can I see a Hidden creature that is not obscured at all?"
  // A: Attack advantage comes from being UNSEEN (target can't see attacker), not from "hidden" status alone (PHB p.177)
  run qa_hidden_unseen_advantage = {
    val baseCtx: AttackContext = {
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
      attackerWithin5ft: true,
      targetDodging: false,
      targetCanSeeAttacker: true,
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
    // Goblin walks around the tree and can see the rogue clearly: no advantage, no disadvantage
    val modsSeen = pAggregateAttackMods(baseCtx)
    // Attacker is unseen (hidden behind cover, target has not spotted them): advantage
    val modsUnseen = pAggregateAttackMods(baseCtx.with("targetCanSeeAttacker", false))
    assert(
      modsSeen.hasAdvantage    == false and
      modsSeen.hasDisadvantage == false and
      modsUnseen.hasAdvantage  == true  and
      modsUnseen.hasDisadvantage == false
    )
  }
}
