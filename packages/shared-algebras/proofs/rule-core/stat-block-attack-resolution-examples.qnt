// -*- mode: Bluespec; -*-

module statBlockAttackResolutionExamples {
  import damageComponentAdjustments.* from "./damage-component-adjustments"
  import statBlockAttackResolution.* from "./stat-block-attack-resolution"

  pure def baseComponent(
    ordinal: int,
    damageType: RuleDamageType,
    selectedAmount: SelectedStatBlockDamageAmount
  ): SelectedStatBlockDamageComponent = {
    componentRole: BaseStatBlockDamageComponent({ ordinal: ordinal }),
    damageType: damageType,
    selectedAmount: selectedAmount,
  }

  pure def attackFacts(
    attackRoll: { naturalD20: int, total: int, armorClass: int, criticalThreshold: int },
    attackRollMode: StatBlockAttackRollMode,
    firstBaseDamageComponent: SelectedStatBlockDamageComponent,
    remainingBaseDamageComponents: List[SelectedStatBlockDamageComponent],
    advantageBonusDamage: StatBlockAdvantageBonusDamage,
    hitRider: StatBlockHitRider
  ): StatBlockAttackResolutionFacts = {
    attackRoll: attackRoll,
    attackRollMode: attackRollMode,
    firstBaseDamageComponent: firstBaseDamageComponent,
    remainingBaseDamageComponents: remainingBaseDamageComponents,
    advantageBonusDamage: advantageBonusDamage,
    targetDamageAdjustments: noDamageAdjustmentFacts,
    hitRider: hitRider,
  }

  run test_static_component_has_no_critical_dice_and_keeps_its_fixed_amount = {
    val result = resolveStatBlockAttack(attackFacts(
      { naturalD20: 20, total: 20, armorClass: 30, criticalThreshold: 20 },
      NormalStatBlockAttackRoll,
      baseComponent(
        1,
        PiercingDamage,
        SelectedStaticStatBlockDamage({ amount: 5 })
      ),
      List(),
      NoStatBlockAdvantageBonusDamage,
      NoStatBlockHitRider
    ))
    all {
      assert(result.impact.factsLegal),
      assert(result.impact.critical),
      assert(result.impact.rawDamageAmount == 5),
    }
  }

  run test_critical_rolled_component_doubles_dice_but_adds_flat_once = {
    val result = resolveStatBlockAttack(attackFacts(
      { naturalD20: 20, total: 20, armorClass: 30, criticalThreshold: 20 },
      NormalStatBlockAttackRoll,
      baseComponent(
        1,
        SlashingDamage,
        SelectedRolledStatBlockDamage({
          baseDiceCount: 1,
          dieSize: 6,
          dieResults: List(2, 3),
          flatModifier: 2,
        })
      ),
      List(),
      NoStatBlockAdvantageBonusDamage,
      NoStatBlockHitRider
    ))
    all {
      assert(result.impact.factsLegal),
      assert(result.impact.critical),
      assert(result.impact.rawDamageAmount == 7),
    }
  }

  run test_each_damage_instance_selects_static_or_rolled_independently = {
    val result = resolveStatBlockAttack(attackFacts(
      { naturalD20: 12, total: 18, armorClass: 15, criticalThreshold: 20 },
      NormalStatBlockAttackRoll,
      baseComponent(
        1,
        PiercingDamage,
        SelectedStaticStatBlockDamage({ amount: 4 })
      ),
      List(baseComponent(
        2,
        PoisonDamage,
        SelectedRolledStatBlockDamage({
          baseDiceCount: 1,
          dieSize: 6,
          dieResults: List(3),
          flatModifier: 0,
        })
      )),
      NoStatBlockAdvantageBonusDamage,
      NoStatBlockHitRider
    ))
    all {
      assert(result.impact.factsLegal),
      assert(damageAmountForType(result.activeDamageByType, PiercingDamage) == 4),
      assert(damageAmountForType(result.activeDamageByType, PoisonDamage) == 3),
      assert(result.impact.rawDamageAmount == 7),
    }
  }

  run test_same_type_advantage_bonus_aggregates_only_for_advantage = {
    val bonus = SelectedStatBlockAdvantageBonusDamage({
      component: {
        componentRole: AdvantageBonusStatBlockDamageComponent,
        damageType: SlashingDamage,
        selectedAmount: SelectedStaticStatBlockDamage({ amount: 3 }),
      },
    })
    val normal = resolveStatBlockAttack(attackFacts(
      { naturalD20: 12, total: 18, armorClass: 15, criticalThreshold: 20 },
      NormalStatBlockAttackRoll,
      baseComponent(
        1,
        SlashingDamage,
        SelectedStaticStatBlockDamage({ amount: 5 })
      ),
      List(),
      bonus,
      NoStatBlockHitRider
    ))
    val advantage = resolveStatBlockAttack(attackFacts(
      { naturalD20: 12, total: 18, armorClass: 15, criticalThreshold: 20 },
      AdvantageStatBlockAttackRoll,
      baseComponent(
        1,
        SlashingDamage,
        SelectedStaticStatBlockDamage({ amount: 5 })
      ),
      List(),
      bonus,
      NoStatBlockHitRider
    ))
    all {
      assert(normal.impact.factsLegal),
      assert(advantage.impact.factsLegal),
      assert(normal.impact.rawDamageAmount == 5),
      assert(advantage.impact.rawDamageAmount == 8),
    }
  }

  run test_miss_applies_neither_damage_nor_hit_rider = {
    val result = resolveStatBlockAttack(attackFacts(
      { naturalD20: 2, total: 8, armorClass: 15, criticalThreshold: 20 },
      NormalStatBlockAttackRoll,
      baseComponent(
        1,
        PiercingDamage,
        SelectedRolledStatBlockDamage({
          baseDiceCount: 1,
          dieSize: 6,
          dieResults: List(),
          flatModifier: 2,
        })
      ),
      List(),
      NoStatBlockAdvantageBonusDamage,
      StatBlockProneIfTargetSizeAtMost({
        targetSize: MediumStatBlockCreature,
        maximumTargetSize: MediumStatBlockCreature,
        targetProneImmune: false,
      })
    ))
    all {
      assert(result.impact.factsLegal),
      assert(not(result.impact.attackHits)),
      assert(result.impact.rawDamageAmount == 0),
      assert(not(result.impact.targetProneApplied)),
    }
  }

  run test_size_gated_prone_rider_requires_hit_size_gate_and_no_immunity = {
    val component = baseComponent(
      1,
      PiercingDamage,
      SelectedStaticStatBlockDamage({ amount: 2 })
    )
    val attackRoll = {
      naturalD20: 12,
      total: 18,
      armorClass: 15,
      criticalThreshold: 20,
    }
    val applies = resolveStatBlockAttack(attackFacts(
      attackRoll,
      NormalStatBlockAttackRoll,
      component,
      List(),
      NoStatBlockAdvantageBonusDamage,
      StatBlockProneIfTargetSizeAtMost({
        targetSize: MediumStatBlockCreature,
        maximumTargetSize: MediumStatBlockCreature,
        targetProneImmune: false,
      })
    ))
    val tooLarge = resolveStatBlockAttack(attackFacts(
      attackRoll,
      NormalStatBlockAttackRoll,
      component,
      List(),
      NoStatBlockAdvantageBonusDamage,
      StatBlockProneIfTargetSizeAtMost({
        targetSize: LargeStatBlockCreature,
        maximumTargetSize: MediumStatBlockCreature,
        targetProneImmune: false,
      })
    ))
    val immune = resolveStatBlockAttack(attackFacts(
      attackRoll,
      NormalStatBlockAttackRoll,
      component,
      List(),
      NoStatBlockAdvantageBonusDamage,
      StatBlockProneIfTargetSizeAtMost({
        targetSize: MediumStatBlockCreature,
        maximumTargetSize: MediumStatBlockCreature,
        targetProneImmune: true,
      })
    ))
    all {
      assert(applies.impact.targetProneApplied),
      assert(not(tooLarge.impact.targetProneApplied)),
      assert(not(immune.impact.targetProneApplied)),
    }
  }
}
