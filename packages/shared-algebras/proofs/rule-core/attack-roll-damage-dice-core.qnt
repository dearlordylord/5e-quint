// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.ATTACK_BRANCHES

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Attack Rolls defines hit
//   resolution against Armor Class.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls defines damage
//   dice rolls and attack damage modifiers.
// - .references/srd-5.2.1/Playing-the-Game.md#Critical Hits defines doubled
//   damage dice for Critical Hits.
// - UBIQUITOUS_LANGUAGE.md defines Attack Roll and Critical Hit; the Damage
//   section supplies downstream attack-damage vocabulary.

module attackRollDamageDiceCore {
  type AttackRollProcedureFacts = {
    naturalD20: int,
    total: int,
    armorClass: int,
    criticalThreshold: int,
  }

  type AttackRollOutcome = {
    hits: bool,
    critical: bool,
  }

  pure def legalAttackRollProcedureFacts(facts: AttackRollProcedureFacts): bool = all {
    facts.naturalD20 >= 1,
    facts.naturalD20 <= 20,
    facts.total >= 0,
    facts.total <= 40,
    facts.armorClass >= 1,
    facts.armorClass <= 30,
    facts.criticalThreshold == 19 or facts.criticalThreshold == 20,
  }

  pure def naturalD20MeetsCriticalThreshold(naturalD20: int, criticalThreshold: int): bool =
    naturalD20 >= criticalThreshold

  pure def attackRollIsCriticalHit(facts: AttackRollProcedureFacts): bool =
    naturalD20MeetsCriticalThreshold(facts.naturalD20, facts.criticalThreshold)

  pure def resolveAttackRoll(facts: AttackRollProcedureFacts): AttackRollOutcome = {
    val critical = attackRollIsCriticalHit(facts)
    {
      hits:
        if (facts.naturalD20 == 1) false
        else if (critical) true
        else facts.total >= facts.armorClass,
      critical: critical,
    }
  }

  pure def criticalDamageDiceCount(baseDice: int, critical: bool): int =
    if (critical) baseDice * 2 else baseDice

  pure def damageDiceCountMatchesCritical(
    baseDice: int,
    filledDiceCount: int,
    critical: bool
  ): bool =
    filledDiceCount == criticalDamageDiceCount(baseDice, critical)
}
