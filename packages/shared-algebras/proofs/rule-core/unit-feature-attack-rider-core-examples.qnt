// -*- mode: Bluespec; -*-
// UNIT-PROFILE-COVERAGE: verification-owner:qnt-proof unit-feature.attack-damage-die-floor

module unitFeatureAttackRiderCoreExamples {
  import attackRollDamageDiceCore.* from "./attack-roll-damage-dice-core"
  import attackDamageComposition.* from "./attack-damage-composition"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import unitFeatureAttackRiderCore.* from "./unit-feature-attack-rider-core"

  run test_champion_improved_critical_is_weapon_or_unarmed_threshold_nineteen_fact = {
    val weaponOutcome = resolveAttackRoll({
      naturalD20: 19,
      total: 1,
      armorClass: 30,
      criticalThreshold: attackCriticalThreshold(ChampionImprovedCriticalThresholdProfile({
        attackForm: ChampionWeaponAttack,
      })),
    })
    val unarmedOutcome = resolveAttackRoll({
      naturalD20: 19,
      total: 1,
      armorClass: 30,
      criticalThreshold: attackCriticalThreshold(ChampionImprovedCriticalThresholdProfile({
        attackForm: ChampionUnarmedStrikeAttack,
      })),
    })
    val nonEligibleAttackOutcome = resolveAttackRoll({
      naturalD20: 19,
      total: 1,
      armorClass: 30,
      criticalThreshold: attackCriticalThreshold(StandardAttackCriticalThresholdProfile),
    })
    all {
      assert(weaponOutcome.hits),
      assert(weaponOutcome.critical),
      assert(unarmedOutcome.hits),
      assert(unarmedOutcome.critical),
      assert(not(nonEligibleAttackOutcome.hits)),
      assert(not(nonEligibleAttackOutcome.critical)),
    }
  }

  run test_sneak_attack_uses_attack_roll_weapon_and_once_per_turn_facts = {
    val result = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: FinesseWeapon,
      hasAdvantage: true,
      hasDisadvantage: false,
      allyWithinFiveFeet: false,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 5,
      weaponDamageType: SlashingDamage,
    })
    val repeated = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: FinesseWeapon,
      hasAdvantage: true,
      hasDisadvantage: false,
      allyWithinFiveFeet: false,
      allyIncapacitated: false,
      usedThisTurn: result.usedThisTurn,
      rogueLevel: 5,
      weaponDamageType: SlashingDamage,
    })
    all {
      assert(result.admitted),
      assert(result.damageDice == 3),
      assert(result.damageType == SlashingDamage),
      assert(result.usedThisTurn),
      assert(not(repeated.admitted)),
    }
  }

  run test_sneak_attack_ally_branch_requires_no_disadvantage_and_active_ally = {
    val admitted = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: RangedWeapon,
      hasAdvantage: false,
      hasDisadvantage: false,
      allyWithinFiveFeet: true,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 7,
      weaponDamageType: PoisonDamage,
    })
    val blocked = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: RangedWeapon,
      hasAdvantage: false,
      hasDisadvantage: true,
      allyWithinFiveFeet: true,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 7,
      weaponDamageType: PoisonDamage,
    })
    val canceledAdvantage = resolveSneakAttack({
      hitWithAttackRoll: true,
      weaponKind: RangedWeapon,
      hasAdvantage: true,
      hasDisadvantage: true,
      allyWithinFiveFeet: false,
      allyIncapacitated: false,
      usedThisTurn: false,
      rogueLevel: 7,
      weaponDamageType: PoisonDamage,
    })
    all {
      assert(admitted.admitted),
      assert(admitted.damageDice == 4),
      assert(not(blocked.admitted)),
      assert(not(canceledAdvantage.admitted)),
    }
  }

  run test_archery_adds_two_to_ranged_weapon_attack_rolls = {
    val ranged = resolveArcheryAttackRoll({
      weaponKind: RangedWeapon,
      baseAttackRollTotal: 14,
      targetArmorClass: 16,
      naturalD20: 10,
    })
    val nonRanged = resolveArcheryAttackRoll({
      weaponKind: OtherWeapon,
      baseAttackRollTotal: 14,
      targetArmorClass: 16,
      naturalD20: 10,
    })
    all {
      assert(ranged.bonus == 2),
      assert(ranged.effectiveAttackRollTotal == 16),
      assert(ranged.hits),
      assert(nonRanged.bonus == 0),
      assert(nonRanged.effectiveAttackRollTotal == 14),
      assert(not(nonRanged.hits)),
    }
  }

  run test_savage_attacker_rolls_weapon_damage_dice_twice_and_chooses = {
    val chosenSecond = resolveWeaponDamageDiceRollChoice({
      hitWithWeapon: true,
      criticalHit: false,
      usedThisTurn: false,
      choosesFeature: true,
      weaponDamageDice: 1,
      weaponDamageDieSize: 8,
      firstCandidateTotal: 2,
      secondCandidateTotal: 8,
      chooseSecondCandidate: true,
      damageModifier: 3,
    }, 4)
    val critical = resolveWeaponDamageDiceRollChoice({
      hitWithWeapon: true,
      criticalHit: true,
      usedThisTurn: false,
      choosesFeature: true,
      weaponDamageDice: 1,
      weaponDamageDieSize: 8,
      firstCandidateTotal: 4,
      secondCandidateTotal: 12,
      chooseSecondCandidate: false,
      damageModifier: 3,
    }, 6)
    all {
      assert(chosenSecond.admitted),
      assert(chosenSecond.weaponDamageDiceRolledPerCandidate == 1),
      assert(chosenSecond.selectedWeaponDamageDiceTotal == 8),
      assert(chosenSecond.effectiveDamage == 11),
      assert(critical.weaponDamageDiceRolledPerCandidate == 2),
      assert(critical.selectedWeaponDamageDiceTotal == 4),
      assert(critical.effectiveDamage == 7),
    }
  }

  run test_great_weapon_fighting_floors_each_qualifying_attack_damage_die = {
    val qualifying = resolveAttackDamageDieFloor({
      hitWithQualifyingAttack: true,
      choosesFeature: true,
      attackDamageDice: 2,
      firstDamageDieResult: 1,
      secondDamageDieResult: 2,
      thirdDamageDieResult: 0,
      fourthDamageDieResult: 0,
      damageModifier: 3,
    })
    val declined = resolveAttackDamageDieFloor({
      hitWithQualifyingAttack: true,
      choosesFeature: false,
      attackDamageDice: 2,
      firstDamageDieResult: 1,
      secondDamageDieResult: 2,
      thirdDamageDieResult: 0,
      fourthDamageDieResult: 0,
      damageModifier: 3,
    })
    val notQualifying = resolveAttackDamageDieFloor({
      hitWithQualifyingAttack: false,
      choosesFeature: true,
      attackDamageDice: 2,
      firstDamageDieResult: 1,
      secondDamageDieResult: 2,
      thirdDamageDieResult: 0,
      fourthDamageDieResult: 0,
      damageModifier: 3,
    })
    all {
      assert(qualifying.admitted),
      assert(qualifying.selectedAttackDamageDiceTotal == 6),
      assert(qualifying.effectiveDamage == 9),
      assert(not(declined.admitted)),
      assert(declined.selectedAttackDamageDiceTotal == 3),
      assert(declined.effectiveDamage == 6),
      assert(not(notQualifying.admitted)),
      assert(notQualifying.selectedAttackDamageDiceTotal == 3),
      assert(notQualifying.effectiveDamage == 6),
    }
  }

  run test_attack_roll_miss_to_hit_replacement_turns_one_miss_into_hit = {
    val replaced = resolveAttackRollMissToHitReplacement({
      naturalD20: 2,
      total: 10,
      armorClass: 16,
      usedSinceTurnStart: false,
      choosesFeature: true,
    })
    val declined = resolveAttackRollMissToHitReplacement({
      naturalD20: 2,
      total: 10,
      armorClass: 16,
      usedSinceTurnStart: false,
      choosesFeature: false,
    })
    val reused = resolveAttackRollMissToHitReplacement({
      naturalD20: 2,
      total: 10,
      armorClass: 16,
      usedSinceTurnStart: true,
      choosesFeature: true,
    })
    val ordinaryHit = resolveAttackRollMissToHitReplacement({
      naturalD20: 10,
      total: 16,
      armorClass: 16,
      usedSinceTurnStart: false,
      choosesFeature: true,
    })
    all {
      assert(replaced.admitted),
      assert(not(replaced.ordinaryHits)),
      assert(replaced.effectiveHits),
      assert(replaced.usedSinceTurnStart),
      assert(not(replaced.critical)),
      assert(not(declined.effectiveHits)),
      assert(not(declined.usedSinceTurnStart)),
      assert(not(reused.admitted)),
      assert(not(reused.effectiveHits)),
      assert(ordinaryHit.ordinaryHits),
      assert(ordinaryHit.effectiveHits),
      assert(not(ordinaryHit.admitted)),
    }
  }
}
