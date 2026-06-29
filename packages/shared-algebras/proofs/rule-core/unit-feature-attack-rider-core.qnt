// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.attack-damage-die-floor unit-feature.attack-damage-rider unit-feature.attack-roll-miss-to-hit-replacement unit-feature.passive-ranged-attack-roll-bonus unit-feature.weapon-critical-range-19 unit-feature.weapon-damage-dice-roll-choice
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES

module unitFeatureAttackRiderCore {
  import hitPointDamage.* from "./hit-point-damage"
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import attackDamageComposition.* from "./attack-damage-composition"
  import damageComponentAdjustments.* from "./damage-component-adjustments"

  // RAW anchors:
  // - Classes/Rogue.md: Sneak Attack.
  // - Classes/Fighter.md: Champion Improved Critical.
  // - Feats.md: Archery, Great Weapon Fighting, Savage Attacker, and Boon of Combat Prowess.
  // - Playing-the-Game.md: Attack Rolls, Damage Rolls, and Critical Hits.
  // - UBIQUITOUS_LANGUAGE.md: Attack Roll, Critical Hit, Advantage, and
  //   Disadvantage.

  type ChampionImprovedCriticalAttackForm =
    | ChampionWeaponAttack
    | ChampionUnarmedStrikeAttack

  type AttackCriticalThresholdProfile =
    | StandardAttackCriticalThresholdProfile
    | ChampionImprovedCriticalThresholdProfile({
      attackForm: ChampionImprovedCriticalAttackForm,
    })

  type WeaponProcedureKind =
    | FinesseWeapon
    | RangedWeapon
    | OtherWeapon

  type SneakAttackFacts = {
    hitWithAttackRoll: bool,
    weaponKind: WeaponProcedureKind,
    hasAdvantage: bool,
    hasDisadvantage: bool,
    allyWithinFiveFeet: bool,
    allyIncapacitated: bool,
    usedThisTurn: bool,
    rogueLevel: int,
    weaponDamageType: RuleDamageType,
  }

  type SneakAttackResult = {
    admitted: bool,
    usedThisTurn: bool,
    damageDice: int,
    damageType: RuleDamageType,
  }

  type PassiveRangedAttackRollBonusFacts = {
    weaponKind: WeaponProcedureKind,
    baseAttackRollTotal: int,
    targetArmorClass: int,
    naturalD20: int,
  }

  type PassiveRangedAttackRollBonusResult = {
    bonus: int,
    effectiveAttackRollTotal: int,
    hits: bool,
  }

  type WeaponDamageDiceRollChoiceFacts = {
    hitWithWeapon: bool,
    criticalHit: bool,
    usedThisTurn: bool,
    choosesFeature: bool,
    weaponDamageDice: int,
    weaponDamageDieSize: int,
    firstCandidateTotal: int,
    secondCandidateTotal: int,
    chooseSecondCandidate: bool,
    damageModifier: int,
  }

  type WeaponDamageDiceRollChoiceResult = {
    admitted: bool,
    usedThisTurn: bool,
    weaponDamageDiceRolledPerCandidate: int,
    selectedWeaponDamageDiceTotal: int,
    effectiveDamage: int,
  }

  type AttackDamageDieFloorFacts = {
    hitWithQualifyingAttack: bool,
    choosesFeature: bool,
    attackDamageDice: int,
    firstDamageDieResult: int,
    secondDamageDieResult: int,
    thirdDamageDieResult: int,
    fourthDamageDieResult: int,
    damageModifier: int,
  }

  type AttackDamageDieFloorResult = {
    admitted: bool,
    selectedAttackDamageDiceTotal: int,
    effectiveDamage: int,
  }

  type AttackRollMissToHitReplacementFacts = {
    naturalD20: int,
    total: int,
    armorClass: int,
    usedSinceTurnStart: bool,
    choosesFeature: bool,
  }

  type AttackRollMissToHitReplacementResult = {
    admitted: bool,
    usedSinceTurnStart: bool,
    ordinaryHits: bool,
    effectiveHits: bool,
    critical: bool,
  }

  pure def archeryAttackRollBonus(facts: PassiveRangedAttackRollBonusFacts): int =
    if (facts.weaponKind == RangedWeapon) 2 else 0

  pure def resolveArcheryAttackRoll(
    facts: PassiveRangedAttackRollBonusFacts
  ): PassiveRangedAttackRollBonusResult = {
    val bonus = archeryAttackRollBonus(facts)
    val total = facts.baseAttackRollTotal + bonus
    val outcome = resolveAttackRoll({
      naturalD20: facts.naturalD20,
      total: total,
      armorClass: facts.targetArmorClass,
      criticalThreshold: 20,
    })
    {
      bonus: bonus,
      effectiveAttackRollTotal: total,
      hits: outcome.hits,
    }
  }

  pure def savageAttackerCandidateDiceCount(facts: WeaponDamageDiceRollChoiceFacts): int =
    if (facts.criticalHit) facts.weaponDamageDice * 2 else facts.weaponDamageDice

  pure def legalWeaponDamageDiceRollChoiceFacts(
    facts: WeaponDamageDiceRollChoiceFacts
  ): bool = all {
    facts.weaponDamageDice >= 1,
    facts.weaponDamageDice <= 4,
    facts.weaponDamageDieSize >= 4,
    facts.weaponDamageDieSize <= 12,
    facts.firstCandidateTotal >= savageAttackerCandidateDiceCount(facts),
    facts.secondCandidateTotal >= savageAttackerCandidateDiceCount(facts),
    facts.firstCandidateTotal <= savageAttackerCandidateDiceCount(facts) * facts.weaponDamageDieSize,
    facts.secondCandidateTotal <= savageAttackerCandidateDiceCount(facts) * facts.weaponDamageDieSize,
  }

  pure def resolveWeaponDamageDiceRollChoice(
    facts: WeaponDamageDiceRollChoiceFacts,
    ordinaryWeaponDamageDiceTotal: int
  ): WeaponDamageDiceRollChoiceResult = {
    val admitted = all {
      legalWeaponDamageDiceRollChoiceFacts(facts),
      facts.hitWithWeapon,
      not(facts.usedThisTurn),
      facts.choosesFeature,
    }
    val selectedTotal =
      if (admitted) {
        if (facts.chooseSecondCandidate) facts.secondCandidateTotal
        else facts.firstCandidateTotal
      } else ordinaryWeaponDamageDiceTotal
    {
      admitted: admitted,
      usedThisTurn: facts.usedThisTurn or admitted,
      weaponDamageDiceRolledPerCandidate: savageAttackerCandidateDiceCount(facts),
      selectedWeaponDamageDiceTotal: selectedTotal,
      effectiveDamage: nonnegative(selectedTotal + facts.damageModifier),
    }
  }

  pure def attackDamageDieFloorMinimum: int = 3

  pure def attackDamageDieResultWithFloor(dieResult: int): int =
    if (dieResult == 1 or dieResult == 2)
      attackDamageDieFloorMinimum
    else dieResult

  pure def legalAttackDamageDieFloorFacts(facts: AttackDamageDieFloorFacts): bool = all {
    facts.attackDamageDice >= 1,
    facts.attackDamageDice <= 4,
    facts.firstDamageDieResult >= 1,
    facts.firstDamageDieResult <= 12,
    if (facts.attackDamageDice >= 2)
      facts.secondDamageDieResult >= 1 and facts.secondDamageDieResult <= 12
    else facts.secondDamageDieResult == 0,
    if (facts.attackDamageDice >= 3)
      facts.thirdDamageDieResult >= 1 and facts.thirdDamageDieResult <= 12
    else facts.thirdDamageDieResult == 0,
    if (facts.attackDamageDice >= 4)
      facts.fourthDamageDieResult >= 1 and facts.fourthDamageDieResult <= 12
    else facts.fourthDamageDieResult == 0,
  }

  pure def attackDamageDiceTotal(facts: AttackDamageDieFloorFacts): int =
    facts.firstDamageDieResult +
    (if (facts.attackDamageDice >= 2) facts.secondDamageDieResult else 0) +
    (if (facts.attackDamageDice >= 3) facts.thirdDamageDieResult else 0) +
    (if (facts.attackDamageDice >= 4) facts.fourthDamageDieResult else 0)

  pure def attackDamageDiceTotalWithFloor(facts: AttackDamageDieFloorFacts): int =
    attackDamageDieResultWithFloor(facts.firstDamageDieResult) +
    (if (facts.attackDamageDice >= 2) attackDamageDieResultWithFloor(facts.secondDamageDieResult) else 0) +
    (if (facts.attackDamageDice >= 3) attackDamageDieResultWithFloor(facts.thirdDamageDieResult) else 0) +
    (if (facts.attackDamageDice >= 4) attackDamageDieResultWithFloor(facts.fourthDamageDieResult) else 0)

  pure def resolveAttackDamageDieFloor(
    facts: AttackDamageDieFloorFacts
  ): AttackDamageDieFloorResult = {
    val admitted = all {
      legalAttackDamageDieFloorFacts(facts),
      facts.hitWithQualifyingAttack,
      facts.choosesFeature,
    }
    val selectedTotal =
      if (admitted) attackDamageDiceTotalWithFloor(facts)
      else attackDamageDiceTotal(facts)
    {
      admitted: admitted,
      selectedAttackDamageDiceTotal: selectedTotal,
      effectiveDamage: nonnegative(selectedTotal + facts.damageModifier),
    }
  }

  pure def resolveAttackRollMissToHitReplacement(
    facts: AttackRollMissToHitReplacementFacts
  ): AttackRollMissToHitReplacementResult = {
    val ordinaryOutcome = resolveAttackRoll({
      naturalD20: facts.naturalD20,
      total: facts.total,
      armorClass: facts.armorClass,
      criticalThreshold: 20,
    })
    val admitted = all {
      legalAttackRollProcedureFacts({
        naturalD20: facts.naturalD20,
        total: facts.total,
        armorClass: facts.armorClass,
        criticalThreshold: 20,
      }),
      not(ordinaryOutcome.hits),
      not(facts.usedSinceTurnStart),
      facts.choosesFeature,
    }
    {
      admitted: admitted,
      usedSinceTurnStart: facts.usedSinceTurnStart or admitted,
      ordinaryHits: ordinaryOutcome.hits,
      effectiveHits: ordinaryOutcome.hits or admitted,
      critical: ordinaryOutcome.critical,
    }
  }

  pure def championImprovedCriticalThreshold: int = 19

  pure def attackCriticalThreshold(profile: AttackCriticalThresholdProfile): int =
    match profile {
      | StandardAttackCriticalThresholdProfile => 20
      | ChampionImprovedCriticalThresholdProfile(v) =>
        match v.attackForm {
          | ChampionWeaponAttack => championImprovedCriticalThreshold
          | ChampionUnarmedStrikeAttack => championImprovedCriticalThreshold
        }
    }

  pure def sneakAttackDiceForRogueLevel(rogueLevel: int): int =
    if (rogueLevel >= 19) 10
    else if (rogueLevel >= 17) 9
    else if (rogueLevel >= 15) 8
    else if (rogueLevel >= 13) 7
    else if (rogueLevel >= 11) 6
    else if (rogueLevel >= 9) 5
    else if (rogueLevel >= 7) 4
    else if (rogueLevel >= 5) 3
    else if (rogueLevel >= 3) 2
    else if (rogueLevel >= 1) 1
    else 0

  pure def sneakAttackWeaponEligible(kind: WeaponProcedureKind): bool =
    kind == FinesseWeapon or kind == RangedWeapon

  pure def rollHasEffectiveAdvantage(hasAdvantage: bool, hasDisadvantage: bool): bool =
    hasAdvantage and not(hasDisadvantage)

  pure def sneakAttackEligibilityBranch(facts: SneakAttackFacts): bool =
    rollHasEffectiveAdvantage(facts.hasAdvantage, facts.hasDisadvantage)
      or (facts.allyWithinFiveFeet and not(facts.allyIncapacitated) and not(facts.hasDisadvantage))

  pure def resolveSneakAttack(facts: SneakAttackFacts): SneakAttackResult = {
    val admitted = all {
      facts.hitWithAttackRoll,
      sneakAttackWeaponEligible(facts.weaponKind),
      sneakAttackEligibilityBranch(facts),
      not(facts.usedThisTurn),
      sneakAttackDiceForRogueLevel(facts.rogueLevel) > 0,
    }
    {
      admitted: admitted,
      usedThisTurn: facts.usedThisTurn or admitted,
      damageDice: if (admitted) sneakAttackDiceForRogueLevel(facts.rogueLevel) else 0,
      damageType: facts.weaponDamageType,
    }
  }
}
