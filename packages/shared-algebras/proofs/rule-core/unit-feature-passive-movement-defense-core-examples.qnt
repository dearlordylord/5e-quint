// -*- mode: Bluespec; -*-

module unitFeaturePassiveMovementDefenseCoreExamples {
  import actionTurnProcedures.* from "./action-turn-procedures"
  import unitFeaturePassiveMovementDefenseCore.* from "./unit-feature-passive-movement-defense-core"

  run test_defense_adds_armor_class_while_wearing_armor = {
    val light = defenseArmorClass(16, {
      armorWorn: LightArmorWorn,
    })
    val medium = defenseArmorClass(16, {
      armorWorn: MediumArmorWorn,
    })
    val heavy = defenseArmorClass(16, {
      armorWorn: HeavyArmorWorn,
    })
    val unarmored = defenseArmorClass(16, {
      armorWorn: NoArmorWorn,
    })
    all {
      assert(light == 17),
      assert(medium == 17),
      assert(heavy == 17),
      assert(unarmored == 16),
    }
  }

  run test_fast_movement_adds_ten_to_speed_budget_and_dash_when_not_wearing_heavy_armor = {
    val facts = NotWearingHeavyArmorSpeedBonus({
      baseSpeedFeet: 30,
      armorWorn: NoArmorWorn,
      movementSpentFeet: 5,
    })
    val budget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, facts)
    val dashed = resolvePassiveSpeedBonusDash(initialTurnProcedureState, facts)
    all {
      assert(budget.speedFeet == 40),
      assert(budget.movementRemainingFeet == 35),
      assert(dashed.speedFeet == 40),
      assert(dashed.dashMovementBonusFeet == 40),
      assert(dashed.movementRemainingFeet == 75),
    }
  }

  run test_fast_movement_does_not_add_speed_when_wearing_heavy_armor = {
    val facts = NotWearingHeavyArmorSpeedBonus({
      baseSpeedFeet: 30,
      armorWorn: HeavyArmorWorn,
      movementSpentFeet: 5,
    })
    val budget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, facts)
    val dashed = resolvePassiveSpeedBonusDash(initialTurnProcedureState, facts)
    all {
      assert(budget.speedFeet == 30),
      assert(budget.movementRemainingFeet == 25),
      assert(dashed.dashMovementBonusFeet == 30),
      assert(dashed.movementRemainingFeet == 55),
    }
  }

  run test_unarmored_movement_adds_ten_only_when_unarmored_and_unshielded = {
    val eligibleFacts = {
      baseSpeedFeet: 30,
      armorWorn: NoArmorWorn,
      wieldingShield: false,
      movementSpentFeet: 5,
    }
    val eligible = UnarmoredUnshieldedSpeedBonus(eligibleFacts)
    val lightArmor = UnarmoredUnshieldedSpeedBonus(eligibleFacts.with("armorWorn", LightArmorWorn))
    val mediumArmor = UnarmoredUnshieldedSpeedBonus(eligibleFacts.with("armorWorn", MediumArmorWorn))
    val heavyArmor = UnarmoredUnshieldedSpeedBonus(eligibleFacts.with("armorWorn", HeavyArmorWorn))
    val shield = UnarmoredUnshieldedSpeedBonus(eligibleFacts.with("wieldingShield", true))
    val eligibleBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, eligible)
    val lightArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, lightArmor)
    val mediumArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, mediumArmor)
    val heavyArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, heavyArmor)
    val shieldBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, shield)
    all {
      assert(eligibleBudget.speedFeet == 40),
      assert(eligibleBudget.movementRemainingFeet == 35),
      assert(lightArmorBudget.speedFeet == 30),
      assert(lightArmorBudget.movementRemainingFeet == 25),
      assert(mediumArmorBudget.speedFeet == 30),
      assert(mediumArmorBudget.movementRemainingFeet == 25),
      assert(heavyArmorBudget.speedFeet == 30),
      assert(heavyArmorBudget.movementRemainingFeet == 25),
      assert(shieldBudget.speedFeet == 30),
      assert(shieldBudget.movementRemainingFeet == 25),
    }
  }

  run test_roving_grants_climb_and_swim_equal_effective_speed = {
    val facts = {
      baseSpeedFeet: 30,
      armorWorn: NoArmorWorn,
      movementSpentFeet: 5,
      chosenSpeedKind: ClimbSpeedKind,
    }
    val budget = resolveRovingSpeedKindBudget(initialTurnProcedureState, facts)
    val dashed =
      resolveRovingSpeedKindDash(initialTurnProcedureState, facts.with("chosenSpeedKind", SwimSpeedKind))
    all {
      assert(budget.speedFeet == 40),
      assert(budget.grantedSpeedKinds == Set(ClimbSpeedKind, SwimSpeedKind)),
      assert(budget.movementRemainingFeet == 35),
      assert(dashed.chosenSpeedKind == SwimSpeedKind),
      assert(dashed.speedFeet == 40),
      assert(dashed.dashMovementBonusFeet == 40),
      assert(dashed.movementRemainingFeet == 75),
    }
  }

  run test_roving_heavy_armor_removes_speed_increase_but_keeps_special_speeds_equal = {
    val facts = {
      baseSpeedFeet: 30,
      armorWorn: HeavyArmorWorn,
      movementSpentFeet: 10,
      chosenSpeedKind: SwimSpeedKind,
    }
    val budget = resolveRovingSpeedKindBudget(initialTurnProcedureState, facts)
    all {
      assert(budget.speedFeet == 30),
      assert(budget.grantedSpeedKinds == Set(ClimbSpeedKind, SwimSpeedKind)),
      assert(budget.movementRemainingFeet == 20),
    }
  }
}
