// -*- mode: Bluespec; -*-
// KERNEL-COVERAGE: qnt-owner BATTLE.SPELL.BLUR_ATTACK_ROLL_DEFENSE_LIFECYCLE

module battleRuntimePerceptionGatedAttackRollDefense {
  type PerceptionGatedAttackRollMode =
    | PerceptionGatedNormalAttackRoll
    | PerceptionGatedAdvantageAttackRoll
    | PerceptionGatedDisadvantageAttackRoll

  pure def perceptionGatedAttackRollMode(
    hasAdvantage: bool,
    hasOtherDisadvantage: bool,
    defenseActive: bool,
    attackerPerceivesWithBypassSense: bool,
  ): PerceptionGatedAttackRollMode = {
    val hasDisadvantage = hasOtherDisadvantage or (
      defenseActive and not(attackerPerceivesWithBypassSense)
    )
    if (hasAdvantage and not(hasDisadvantage))
      PerceptionGatedAdvantageAttackRoll
    else if (hasDisadvantage and not(hasAdvantage))
      PerceptionGatedDisadvantageAttackRoll
    else
      PerceptionGatedNormalAttackRoll
  }
}
