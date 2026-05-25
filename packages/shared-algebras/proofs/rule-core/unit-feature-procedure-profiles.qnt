// -*- mode: Bluespec; -*-
// RAW-COVERAGE: qnt-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: qnt-owner unit-feature.martial-arts-attack-projection unit-feature.passive-armor-class-bonus unit-feature.passive-speed-bonus unit-feature.passive-speed-kind-grants unit-feature.zero-hit-point-replacement
// KERNEL-COVERAGE: qnt-owner BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP

module unitFeatureProcedureProfiles {
  import hitPointDamage.* from "./hit-point-damage"
  import zeroHitPointLifecycle.* from "./zero-hit-point-lifecycle"
  import hitPointRecovery.* from "./hit-point-recovery"
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import actionTurnProcedures.* from "./action-turn-procedures"
  import unitFeaturePoolCostCore.* from "./unit-feature-pool-cost-core"

  // RAW anchors:
  // - Classes/Rogue.md: Cunning Action.
  // - Classes/Sorcerer.md: Innate Sorcery activation.
  // - Classes/Monk.md: Martial Arts attack projection, Unarmored Movement,
  //   and Roving.
  // - Feats.md: Defense.
  // - Character-Origins.md: Orc Relentless Endurance.
  // - Playing-the-Game.md: Bonus Actions, Damage Rolls, Dropping to 0 Hit
  //   Points, Instant Death, Saving Throws and Damage, Resistance and
  //   Vulnerability.

  type PassiveArmorClassBonusFacts = {
    wearingLightArmor: bool,
    wearingMediumArmor: bool,
    wearingHeavyArmor: bool,
  }

  type PassiveSpeedBonusEquipmentGate =
    | NotWearingHeavyArmorSpeedBonusGate
    | UnarmoredUnshieldedSpeedBonusGate

  type ArmorWorn =
    | NoArmorWorn
    | LightArmorWorn
    | MediumArmorWorn
    | HeavyArmorWorn

  type PassiveSpeedBonusFacts = {
    baseSpeedFeet: int,
    gate: PassiveSpeedBonusEquipmentGate,
    armorWorn: ArmorWorn,
    wieldingShield: bool,
    movementSpentFeet: int,
  }

  type PassiveSpeedBonusResult = {
    effectiveSpeedFeet: int,
    movementRemainingFeet: int,
    dashMovementBonusFeet: int,
  }

  type MovementSpeedKind =
    | WalkSpeedKind
    | ClimbSpeedKind
    | SwimSpeedKind

  type PassiveSpeedKindGrantsFacts = {
    baseSpeedFeet: int,
    wearingHeavyArmor: bool,
    movementSpentFeet: int,
    chosenSpeedKind: MovementSpeedKind,
  }

  type PassiveSpeedKindGrantsResult = {
    chosenSpeedKind: MovementSpeedKind,
    walkSpeedFeet: int,
    climbSpeedFeet: int,
    swimSpeedFeet: int,
    movementRemainingFeet: int,
    dashMovementBonusFeet: int,
  }

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

  type ZeroHitPointReplacementFacts = {
    incomingDamage: int,
    choosesFeature: bool,
  }

  type ZeroHitPointReplacementResult = {
    admitted: bool,
    pool: FeatureUsePool,
    vitals: CreatureVitals,
    deathSavingThrows: DeathSavingThrowLifecycle,
  }

  pure def wearingArmorForDefense(facts: PassiveArmorClassBonusFacts): bool =
    facts.wearingLightArmor or facts.wearingMediumArmor or facts.wearingHeavyArmor

  pure def defenseArmorClass(baseArmorClass: int, facts: PassiveArmorClassBonusFacts): int =
    if (wearingArmorForDefense(facts)) baseArmorClass + 1 else baseArmorClass

  pure def wearingAnyArmorForSpeedBonus(facts: PassiveSpeedBonusFacts): bool =
    facts.armorWorn != NoArmorWorn

  pure def passiveSpeedBonusApplies(facts: PassiveSpeedBonusFacts): bool =
    match facts.gate {
      | NotWearingHeavyArmorSpeedBonusGate => facts.armorWorn != HeavyArmorWorn
      | UnarmoredUnshieldedSpeedBonusGate =>
        not(wearingAnyArmorForSpeedBonus(facts)) and not(facts.wieldingShield)
    }

  pure def passiveSpeedBonusDelta(facts: PassiveSpeedBonusFacts): int =
    if (passiveSpeedBonusApplies(facts)) 10 else 0

  pure def passiveSpeedBonus(facts: PassiveSpeedBonusFacts): int =
    passiveSpeedBonusDelta(facts)

  pure def passiveSpeedBonusEffectiveSpeed(facts: PassiveSpeedBonusFacts): int =
    facts.baseSpeedFeet + passiveSpeedBonus(facts)

  pure def resolvePassiveSpeedBonusBudget(
    turn: TurnProcedureState,
    facts: PassiveSpeedBonusFacts
  ): PassiveSpeedBonusResult = {
    val speed = passiveSpeedBonusEffectiveSpeed(facts)
    {
      effectiveSpeedFeet: speed,
      movementRemainingFeet:
        nonnegative(speed + turn.dashMovementBonusFeet - facts.movementSpentFeet),
      dashMovementBonusFeet: turn.dashMovementBonusFeet,
    }
  }

  pure def resolvePassiveSpeedBonusDash(
    turn: TurnProcedureState,
    facts: PassiveSpeedBonusFacts
  ): PassiveSpeedBonusResult = {
    val speed = passiveSpeedBonusEffectiveSpeed(facts)
    val dashed = resolveDash(turn, speed, StandardActionCost(DashAction))
    resolvePassiveSpeedBonusBudget(dashed, facts)
  }

  pure def rovingEffectiveSpeed(facts: PassiveSpeedKindGrantsFacts): int =
    passiveSpeedBonusEffectiveSpeed({
      baseSpeedFeet: facts.baseSpeedFeet,
      gate: NotWearingHeavyArmorSpeedBonusGate,
      armorWorn: if (facts.wearingHeavyArmor) HeavyArmorWorn else NoArmorWorn,
      wieldingShield: false,
      movementSpentFeet: facts.movementSpentFeet,
    })

  pure def resolveRovingSpeedKindBudget(
    turn: TurnProcedureState,
    facts: PassiveSpeedKindGrantsFacts
  ): PassiveSpeedKindGrantsResult = {
    val speed = rovingEffectiveSpeed(facts)
    {
      chosenSpeedKind: facts.chosenSpeedKind,
      walkSpeedFeet: speed,
      climbSpeedFeet: speed,
      swimSpeedFeet: speed,
      movementRemainingFeet:
        nonnegative(speed + turn.dashMovementBonusFeet - facts.movementSpentFeet),
      dashMovementBonusFeet: turn.dashMovementBonusFeet,
    }
  }

  pure def resolveRovingSpeedKindDash(
    turn: TurnProcedureState,
    facts: PassiveSpeedKindGrantsFacts
  ): PassiveSpeedKindGrantsResult = {
    val speed = rovingEffectiveSpeed(facts)
    val dashed = resolveDash(turn, speed, StandardActionCost(DashAction))
    resolveRovingSpeedKindBudget(dashed, facts)
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

  pure def damageWouldKillOutright(
    before: CreatureVitals,
    damageResult: DamageResult
  ): bool =
    before.kind == PlayerCharacter
      and before.hitPoints > 0
      and damageResult.vitals.hitPoints == 0
      and damageResult.remainingDamageAtZero >= before.hitPointMaximum

  pure def resolveZeroHitPointReplacement(
    before: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    pool: FeatureUsePool,
    facts: ZeroHitPointReplacementFacts
  ): ZeroHitPointReplacementResult = {
    val damaged = applyResolvedDamageToPositiveHitPoints(
      before,
      facts.incomingDamage
    )
    val admitted = all {
      legalVitals(before),
      legalDeathSavingThrowLifecycle(lifecycle),
      before.kind == PlayerCharacter,
      before.hitPoints > 0,
      damaged.vitals.hitPoints == 0,
      not(damageWouldKillOutright(before, damaged)),
      facts.choosesFeature,
      pool.usesRemaining > 0,
    }
    {
      admitted: admitted,
      pool: if (admitted) spendFeatureUsePool(pool) else pool,
      vitals:
        if (admitted) {
          kind: before.kind,
          hitPoints: 1,
          hitPointMaximum: before.hitPointMaximum,
          temporaryHitPoints: damaged.vitals.temporaryHitPoints,
          dead: false,
          unconscious: false,
        } else damaged.vitals,
      deathSavingThrows:
        if (admitted) lifecycle
        else deathSavingThrowLifecycleAfterPositiveHitPointDamage(
          lifecycle,
          damaged
        ),
    }
  }

  run test_defense_adds_armor_class_while_wearing_armor = {
    val light = defenseArmorClass(16, {
      wearingLightArmor: true,
      wearingMediumArmor: false,
      wearingHeavyArmor: false,
    })
    val medium = defenseArmorClass(16, {
      wearingLightArmor: false,
      wearingMediumArmor: true,
      wearingHeavyArmor: false,
    })
    val heavy = defenseArmorClass(16, {
      wearingLightArmor: false,
      wearingMediumArmor: false,
      wearingHeavyArmor: true,
    })
    val unarmored = defenseArmorClass(16, {
      wearingLightArmor: false,
      wearingMediumArmor: false,
      wearingHeavyArmor: false,
    })
    all {
      assert(light == 17),
      assert(medium == 17),
      assert(heavy == 17),
      assert(unarmored == 16),
    }
  }

  run test_fast_movement_adds_ten_to_speed_budget_and_dash_when_not_wearing_heavy_armor = {
    val facts = {
      baseSpeedFeet: 30,
      gate: NotWearingHeavyArmorSpeedBonusGate,
      armorWorn: NoArmorWorn,
      wieldingShield: false,
      movementSpentFeet: 5,
    }
    val budget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, facts)
    val dashed = resolvePassiveSpeedBonusDash(initialTurnProcedureState, facts)
    all {
      assert(budget.effectiveSpeedFeet == 40),
      assert(budget.movementRemainingFeet == 35),
      assert(dashed.effectiveSpeedFeet == 40),
      assert(dashed.dashMovementBonusFeet == 40),
      assert(dashed.movementRemainingFeet == 75),
    }
  }

  run test_fast_movement_does_not_add_speed_when_wearing_heavy_armor = {
    val facts = {
      baseSpeedFeet: 30,
      gate: NotWearingHeavyArmorSpeedBonusGate,
      armorWorn: HeavyArmorWorn,
      wieldingShield: false,
      movementSpentFeet: 5,
    }
    val budget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, facts)
    val dashed = resolvePassiveSpeedBonusDash(initialTurnProcedureState, facts)
    all {
      assert(budget.effectiveSpeedFeet == 30),
      assert(budget.movementRemainingFeet == 25),
      assert(dashed.dashMovementBonusFeet == 30),
      assert(dashed.movementRemainingFeet == 55),
    }
  }

  run test_unarmored_movement_adds_ten_only_when_unarmored_and_unshielded = {
    val eligible = {
      baseSpeedFeet: 30,
      gate: UnarmoredUnshieldedSpeedBonusGate,
      armorWorn: NoArmorWorn,
      wieldingShield: false,
      movementSpentFeet: 5,
    }
    val lightArmor = eligible.with("armorWorn", LightArmorWorn)
    val mediumArmor = eligible.with("armorWorn", MediumArmorWorn)
    val heavyArmor = eligible.with("armorWorn", HeavyArmorWorn)
    val shield = eligible.with("wieldingShield", true)
    val eligibleBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, eligible)
    val lightArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, lightArmor)
    val mediumArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, mediumArmor)
    val heavyArmorBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, heavyArmor)
    val shieldBudget = resolvePassiveSpeedBonusBudget(initialTurnProcedureState, shield)
    all {
      assert(eligibleBudget.effectiveSpeedFeet == 40),
      assert(eligibleBudget.movementRemainingFeet == 35),
      assert(lightArmorBudget.effectiveSpeedFeet == 30),
      assert(lightArmorBudget.movementRemainingFeet == 25),
      assert(mediumArmorBudget.effectiveSpeedFeet == 30),
      assert(mediumArmorBudget.movementRemainingFeet == 25),
      assert(heavyArmorBudget.effectiveSpeedFeet == 30),
      assert(heavyArmorBudget.movementRemainingFeet == 25),
      assert(shieldBudget.effectiveSpeedFeet == 30),
      assert(shieldBudget.movementRemainingFeet == 25),
    }
  }

  run test_roving_grants_walk_climb_and_swim_equal_effective_speed = {
    val facts = {
      baseSpeedFeet: 30,
      wearingHeavyArmor: false,
      movementSpentFeet: 5,
      chosenSpeedKind: ClimbSpeedKind,
    }
    val budget = resolveRovingSpeedKindBudget(initialTurnProcedureState, facts)
    val dashed =
      resolveRovingSpeedKindDash(initialTurnProcedureState, facts.with("chosenSpeedKind", SwimSpeedKind))
    all {
      assert(budget.walkSpeedFeet == 40),
      assert(budget.climbSpeedFeet == 40),
      assert(budget.swimSpeedFeet == 40),
      assert(budget.movementRemainingFeet == 35),
      assert(dashed.chosenSpeedKind == SwimSpeedKind),
      assert(dashed.dashMovementBonusFeet == 40),
      assert(dashed.movementRemainingFeet == 75),
    }
  }

  run test_roving_heavy_armor_removes_speed_increase_but_keeps_special_speeds_equal = {
    val facts = {
      baseSpeedFeet: 30,
      wearingHeavyArmor: true,
      movementSpentFeet: 10,
      chosenSpeedKind: SwimSpeedKind,
    }
    val budget = resolveRovingSpeedKindBudget(initialTurnProcedureState, facts)
    all {
      assert(budget.walkSpeedFeet == 30),
      assert(budget.climbSpeedFeet == 30),
      assert(budget.swimSpeedFeet == 30),
      assert(budget.movementRemainingFeet == 20),
    }
  }

  run test_martial_arts_projects_dexterity_die_scaling_and_grapple_shove_dc = {
    val unarmed = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
      monkLevel: 1,
      strengthModifier: 1,
      dexterityModifier: 3,
      normalDamageDice: 0,
      normalDamageDieSize: 1,
      proficiencyBonus: 2,
    })
    val monkWeapon = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsMonkWeapon,
      },
      monkLevel: 17,
      strengthModifier: 1,
      dexterityModifier: 3,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    all {
      assert(unarmed.attackAbilityModifier == 3),
      assert(unarmed.damageAbilityModifier == 3),
      assert(unarmed.damageDice == 1),
      assert(unarmed.damageDieSize == 6),
      assert(unarmed.unarmedStrikeSaveDc == 13),
      assert(monkWeapon.damageDice == 1),
      assert(monkWeapon.damageDieSize == 12),
      assert(monkWeapon.unarmedStrikeSaveDc == 13),
    }
  }

  run test_martial_arts_rejects_armor_shield_and_non_monk_weapons = {
    val armored = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: false,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 0,
      normalDamageDieSize: 1,
      proficiencyBonus: 2,
    })
    val shielded = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: true,
        attackForm: MartialArtsMonkWeapon,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    val otherWeapon = resolveMartialArtsAttackProjection({
      eligibility: {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsOtherWeapon,
      },
      monkLevel: 17,
      strengthModifier: 2,
      dexterityModifier: 4,
      normalDamageDice: 1,
      normalDamageDieSize: 4,
      proficiencyBonus: 2,
    })
    all {
      assert(not(armored.eligible)),
      assert(armored.attackAbilityModifier == 2),
      assert(armored.damageDieSize == 1),
      assert(not(shielded.eligible)),
      assert(shielded.damageDieSize == 4),
      assert(not(otherWeapon.eligible)),
      assert(otherWeapon.attackAbilityModifier == 2),
    }
  }

  run test_martial_arts_bonus_unarmed_strike_spends_bonus_action_without_attack_prerequisite = {
    val result = resolveMartialArtsBonusUnarmedStrike(
      initialTurnProcedureState,
      {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
    )
    val noBonusAction = resolveMartialArtsBonusUnarmedStrike(
      initialTurnProcedureState.with("bonusActionAvailable", false),
      {
        unarmored: true,
        wieldingShield: false,
        attackForm: MartialArtsUnarmedStrike,
      },
    )
    all {
      assert(result.admitted),
      assert(not(result.turn.bonusActionAvailable)),
      assert(not(noBonusAction.admitted)),
    }
  }

}
