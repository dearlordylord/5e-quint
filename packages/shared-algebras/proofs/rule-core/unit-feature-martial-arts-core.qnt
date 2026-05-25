// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.martial-arts-attack-projection
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES

module unitFeatureMartialArtsCore {
  import actionTurnProcedures.* from "./action-turn-procedures"

  // RAW anchors:
  // - Classes/Monk.md: Martial Arts, Monk Features table, and Monk weapons.
  // - Rules-Glossary.md: Unarmed Strike Damage, Grapple, and Shove.
  // - Playing-the-Game.md: Attack Rolls, Damage Rolls, and Bonus Actions.
  // - UBIQUITOUS_LANGUAGE.md: Unarmed Strike, Grapple, and Shove.

  type MartialArtsAttackForm =
    | MartialArtsUnarmedStrike
    | MartialArtsMonkWeapon
    | MartialArtsOtherWeapon

  type MartialArtsEligibilityFacts = {
    unarmored: bool,
    wieldingShield: bool,
    attackForm: MartialArtsAttackForm,
  }

  type MartialArtsAttackProjectionFacts = {
    eligibility: MartialArtsEligibilityFacts,
    monkLevel: int,
    strengthModifier: int,
    dexterityModifier: int,
    normalDamageDice: int,
    normalDamageDieSize: int,
    proficiencyBonus: int,
  }

  type MartialArtsAttackProjectionResult = {
    eligible: bool,
    attackAbilityModifier: int,
    damageAbilityModifier: int,
    damageDice: int,
    damageDieSize: int,
    unarmedStrikeSaveDc: int,
  }

  type MartialArtsBonusUnarmedStrikeResult = {
    turn: TurnProcedureState,
    admitted: bool,
  }

  pure def martialArtsAttackEligible(facts: MartialArtsEligibilityFacts): bool =
    facts.unarmored and
    not(facts.wieldingShield) and
    (
      facts.attackForm == MartialArtsUnarmedStrike or
      facts.attackForm == MartialArtsMonkWeapon
    )

  pure def martialArtsChosenAbilityModifier(
    eligible: bool,
    strengthModifier: int,
    dexterityModifier: int
  ): int =
    if (eligible and dexterityModifier >= strengthModifier)
      dexterityModifier
    else
      strengthModifier

  pure def martialArtsDieSizeAtMonkLevel(monkLevel: int): int =
    if (monkLevel >= 17) 12
    else if (monkLevel >= 11) 10
    else if (monkLevel >= 5) 8
    else 6

  pure def martialArtsDamageDieSize(
    eligible: bool,
    monkLevel: int,
    normalDamageDice: int,
    normalDamageDieSize: int
  ): int =
    {
      val martialArtsDieSize = martialArtsDieSizeAtMonkLevel(monkLevel)
      if (
        eligible and
        (normalDamageDice == 0 or normalDamageDice == 1) and
        normalDamageDieSize < martialArtsDieSize
      )
        martialArtsDieSize
      else
        normalDamageDieSize
    }

  pure def resolveMartialArtsAttackProjection(
    facts: MartialArtsAttackProjectionFacts
  ): MartialArtsAttackProjectionResult = {
    val eligible = martialArtsAttackEligible(facts.eligibility)
    val chosenModifier = martialArtsChosenAbilityModifier(
      eligible,
      facts.strengthModifier,
      facts.dexterityModifier
    )
    val damageDieSize = martialArtsDamageDieSize(
      eligible,
      facts.monkLevel,
      facts.normalDamageDice,
      facts.normalDamageDieSize
    )
    val damageDice =
      if (eligible and facts.normalDamageDice == 0) 1 else facts.normalDamageDice
    {
      eligible: eligible,
      attackAbilityModifier: chosenModifier,
      damageAbilityModifier: chosenModifier,
      damageDice: damageDice,
      damageDieSize: damageDieSize,
      unarmedStrikeSaveDc: 8 + chosenModifier + facts.proficiencyBonus,
    }
  }

  pure def resolveMartialArtsBonusUnarmedStrike(
    turn: TurnProcedureState,
    facts: MartialArtsEligibilityFacts
  ): MartialArtsBonusUnarmedStrikeResult = {
    val admitted = turn.bonusActionAvailable and martialArtsAttackEligible(facts)
    {
      turn: if (admitted) spendActionCost(turn, BonusActionCost) else turn,
      admitted: admitted,
    }
  }
}
