// -*- mode: Bluespec; -*-

// KERNEL-COVERAGE: qnt-owner BATTLE.DAMAGE.ATTACK_BRANCHES

// RAW trace:
// - .references/srd-5.2.1/playing-the-game.md#Attack Rolls defines hit
//   resolution against Armor Class.
// - .references/srd-5.2.1/playing-the-game.md#Damage Rolls defines damage
//   dice rolls and attack damage modifiers.
// - .references/srd-5.2.1/playing-the-game.md#Critical Hits defines doubled
//   damage dice for Critical Hits.
// - .references/srd-5.2.1/rules-glossary.md#Unconscious makes any attack-roll
//   hit from within 5 feet a Critical Hit.
//   This slice owns that contextual Critical Hit branch only. The same entry's
//   Attacks Affected Advantage is owned by d20TestCircumstanceCore and is
//   combined there with the Prone source implied by Unconscious.
// - .references/srd-5.2.1/equipment.md#Versatile: a Versatile weapon "can
//   be used with one or two hands" and deals its parenthesized damage "when
//   used with two hands to make a melee attack".
// - .references/srd-5.2.1/equipment.md#Two-Handed: a Two-Handed weapon
//   "requires two hands when you attack with it".
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

  // How a weapon is held: in one hand or with both.
  type WeaponGrip =
    | OneHandedGrip
    | TwoHandedGrip

  // A Versatile weapon's two-handed damage die, or none.
  type VersatileDamage =
    | NotVersatile
    | VersatileDamageDie(int)

  type WeaponAttackDamageDieFacts = {
    damageDieSize: int,
    versatile: VersatileDamage,
    grip: WeaponGrip,
    meleeAttack: bool,
  }

  // Both hands hold a weapon held with the two-handed grip; one hand holds it
  // otherwise.
  pure def weaponGripHandsHeld(grip: WeaponGrip): int =
    match grip {
      | OneHandedGrip => 1
      | TwoHandedGrip => 2
    }

  // The weapon's damage die for one attack: its Versatile die on a melee
  // attack while held with both hands, else its own die.
  pure def weaponAttackDamageDieSize(facts: WeaponAttackDamageDieFacts): int =
    match facts.versatile {
      | NotVersatile => facts.damageDieSize
      | VersatileDamageDie(twoHandedDieSize) =>
          if (facts.grip == TwoHandedGrip and facts.meleeAttack)
            twoHandedDieSize
          else
            facts.damageDieSize
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
