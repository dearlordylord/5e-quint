// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.ATTACK_BRANCHES

// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Attack Rolls defines hit
//   resolution against Armor Class.
// - .references/srd-5.2.1/Playing-the-Game.md#Damage Rolls defines damage
//   dice rolls and attack damage modifiers.
// - .references/srd-5.2.1/Playing-the-Game.md#Critical Hits defines doubled
//   damage dice for Critical Hits.
// - .references/srd-5.2.1/Rules-Glossary.md#Unconscious makes any attack-roll
//   hit from within 5 feet a Critical Hit.
// - UBIQUITOUS_LANGUAGE.md defines Attack Roll and Critical Hit; the Damage
//   section supplies downstream attack-damage vocabulary.

module attackRollDamageDiceCore {
  type AttackRollProcedureFacts = {
    naturalD20: int,
    total: int,
    armorClass: int,
    criticalThreshold: int,
  }

  type AttackRollOutcome =
    | Miss
    | NormalHit
    | CriticalHit

  type AttackTargetCriticalFacts = {
    unconscious: bool,
    distanceFeet: int,
  }

  pure val unconsciousCriticalHitDistanceFeet: int = 5

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

  pure def attackRollOutcomeHits(outcome: AttackRollOutcome): bool =
    match outcome {
      | Miss => false
      | NormalHit => true
      | CriticalHit => true
    }

  pure def attackRollOutcomeIsCriticalHit(outcome: AttackRollOutcome): bool =
    match outcome {
      | Miss => false
      | NormalHit => false
      | CriticalHit => true
    }

  pure def legalAttackTargetCriticalFacts(facts: AttackTargetCriticalFacts): bool =
    facts.distanceFeet >= 0

  pure def resolveAttackRoll(facts: AttackRollProcedureFacts): AttackRollOutcome = {
    val critical = attackRollIsCriticalHit(facts)
    if (facts.naturalD20 == 1) {
      Miss
    } else if (critical) {
      CriticalHit
    } else if (facts.total >= facts.armorClass) {
      NormalHit
    } else {
      Miss
    }
  }

  pure def resolveAttackRollAgainstTarget(
    facts: AttackRollProcedureFacts,
    target: AttackTargetCriticalFacts,
  ): AttackRollOutcome = {
    val rollOutcome = resolveAttackRoll(facts)
    val contextualCritical = all {
      attackRollOutcomeHits(rollOutcome),
      legalAttackTargetCriticalFacts(target),
      target.unconscious,
      target.distanceFeet <= unconsciousCriticalHitDistanceFeet,
    }
    if (contextualCritical) {
      CriticalHit
    } else {
      rollOutcome
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
