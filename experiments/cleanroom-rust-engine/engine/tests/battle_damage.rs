use dnd_cleanroom_engine::battle::*;

fn player(hit_points: i32, hit_point_maximum: i32) -> CreatureVitals {
    CreatureVitals::new(
        CreatureKind::PlayerCharacter,
        hit_points,
        hit_point_maximum,
        0,
        false,
        false,
    )
    .unwrap()
}

fn attack_damage(
    attack_kind: AttackKind,
    rolled_damage: i32,
    damage_modifier: i32,
    disposition: AttackDamageDisposition,
) -> AttackDamageProcedureFacts {
    AttackDamageProcedureFacts {
        attack_kind,
        damage_type: DamageType::Slashing,
        rolled_damage,
        damage_modifier,
        target_adjustments: DamageAdjustmentFacts::none(),
        disposition,
    }
}

#[test]
fn same_type_damage_aggregates_before_resistance() {
    let facts = DamageAdjustmentFacts::none().with_resistance(DamageType::Slashing);
    let pair = DamagePair {
        first_type: DamageType::Slashing,
        first_amount: 5,
        second_type: DamageType::Slashing,
        second_amount: 3,
    };

    assert_eq!(
        total_damage_after_target_adjustments(aggregate_damage_pair(pair), facts),
        4
    );
    assert_eq!((5 / 2) + (3 / 2), 3);
}

#[test]
fn modifier_cannot_make_negative_damage() {
    assert_eq!(adjusted_damage_roll_amount(3, -5), 0);
}

#[test]
fn immunity_nullifies_before_resistance_and_vulnerability() {
    let facts = DamageAdjustmentFacts::none()
        .with_immunity(DamageType::Fire)
        .with_resistance(DamageType::Fire)
        .with_vulnerability(DamageType::Fire);

    assert_eq!(
        damage_amount_after_target_adjustments(9, DamageType::Fire, facts),
        0
    );
}

#[test]
fn resistance_then_vulnerability_order_rounds_down_before_doubling() {
    let facts = DamageAdjustmentFacts::none()
        .with_immunity(DamageType::Fire)
        .with_resistance(DamageType::Slashing)
        .with_vulnerability(DamageType::Slashing);

    assert_eq!(
        damage_amount_after_target_adjustments(7, DamageType::Slashing, facts),
        6
    );
    assert_eq!(
        damage_amount_after_target_adjustments(7, DamageType::Poison, facts),
        7
    );
}

#[test]
fn mixed_damage_adjusts_by_type_and_sums() {
    let facts = DamageAdjustmentFacts::none()
        .with_immunity(DamageType::Poison)
        .with_resistance(DamageType::Slashing)
        .with_vulnerability(DamageType::Fire);
    let amounts = DamageByType::empty()
        .add_amount_for_type(DamageType::Slashing, 5)
        .add_amount_for_type(DamageType::Fire, 4)
        .add_amount_for_type(DamageType::Poison, 6);

    assert_eq!(total_damage_after_target_adjustments(amounts, facts), 10);
}

#[test]
fn scalar_reduction_allocates_proportionally_by_largest_remainder() {
    let pair = DamagePair {
        first_type: DamageType::Slashing,
        first_amount: 5,
        second_type: DamageType::Poison,
        second_amount: 4,
    };

    let result = damage_pair_after_scalar_reduction(pair, 3);

    assert_eq!(result.first_amount, 3);
    assert_eq!(result.second_amount, 3);
    assert_eq!(pair_total(result), 6);
}

#[test]
fn adjusted_damage_total_feeds_positive_hit_point_damage() {
    let facts = DamageAdjustmentFacts::none().with_vulnerability(DamageType::Slashing);
    let damage = total_damage_after_target_adjustments(
        DamageByType::empty().add_amount_for_type(DamageType::Slashing, 4),
        facts,
    );
    let result = apply_resolved_damage_to_positive_hit_points(
        CreatureVitals::new(CreatureKind::PlayerCharacter, 10, 12, 2, false, false).unwrap(),
        damage,
    );

    assert_eq!(damage, 8);
    assert_eq!(result.vitals.temporary_hit_points(), 0);
    assert_eq!(result.vitals.hit_points(), 4);
}

#[test]
fn attack_roll_natural_one_misses_and_critical_threshold_hits() {
    let natural_one = resolve_attack_roll(AttackRollProcedureFacts {
        natural_d20: 1,
        total: 30,
        armor_class: 10,
        critical_threshold: 20,
    });
    let improved_critical = resolve_attack_roll(AttackRollProcedureFacts {
        natural_d20: 19,
        total: 19,
        armor_class: 25,
        critical_threshold: 19,
    });

    assert!(!natural_one.hits);
    assert!(!natural_one.critical);
    assert!(improved_critical.hits);
    assert!(improved_critical.critical);
}

#[test]
fn attack_procedure_spends_action_and_applies_damage_only_when_admitted_and_hit() {
    let hit = resolve_attack_procedure(
        ActionQuota::ActionAvailable,
        AttackRangeFact::WithinMeleeReach,
        AttackRollProcedureFacts {
            natural_d20: 12,
            total: 15,
            armor_class: 13,
            critical_threshold: 20,
        },
        player(10, 12),
        attack_damage(
            AttackKind::MeleeAttack,
            4,
            2,
            AttackDamageDisposition::OrdinaryAttackDamage,
        ),
    );

    assert_eq!(hit.action_quota, ActionQuota::ActionSpent);
    assert!(hit.attack_roll_outcome.hits);
    assert_eq!(hit.damage_result.vitals.hit_points(), 4);

    let miss = resolve_attack_procedure(
        ActionQuota::ActionAvailable,
        AttackRangeFact::WithinMeleeReach,
        AttackRollProcedureFacts {
            natural_d20: 2,
            total: 8,
            armor_class: 13,
            critical_threshold: 20,
        },
        player(10, 12),
        attack_damage(
            AttackKind::MeleeAttack,
            4,
            2,
            AttackDamageDisposition::OrdinaryAttackDamage,
        ),
    );

    assert_eq!(miss.action_quota, ActionQuota::ActionSpent);
    assert!(!miss.attack_roll_outcome.hits);
    assert_eq!(miss.damage_result.vitals.hit_points(), 10);

    let beyond_range = resolve_attack_procedure(
        ActionQuota::ActionAvailable,
        AttackRangeFact::BeyondRange,
        AttackRollProcedureFacts {
            natural_d20: 20,
            total: 20,
            armor_class: 13,
            critical_threshold: 20,
        },
        player(10, 12),
        attack_damage(
            AttackKind::MeleeAttack,
            4,
            2,
            AttackDamageDisposition::OrdinaryAttackDamage,
        ),
    );

    assert_eq!(beyond_range.action_quota, ActionQuota::ActionAvailable);
    assert_eq!(beyond_range.damage_result.vitals.hit_points(), 10);
}

#[test]
fn knockout_attack_disposition_requires_melee_damage_that_reduces_target_to_zero() {
    let knocked_out = resolve_attack_procedure(
        ActionQuota::ActionAvailable,
        AttackRangeFact::WithinMeleeReach,
        AttackRollProcedureFacts {
            natural_d20: 12,
            total: 15,
            armor_class: 13,
            critical_threshold: 20,
        },
        player(4, 12),
        attack_damage(
            AttackKind::MeleeAttack,
            4,
            0,
            AttackDamageDisposition::KnockOutAttackDamage,
        ),
    );

    assert_eq!(knocked_out.action_quota, ActionQuota::ActionSpent);
    assert_eq!(knocked_out.damage_result.vitals.hit_points(), 1);
    assert!(knocked_out.damage_result.vitals.is_unconscious());
    assert_eq!(
        knocked_out
            .damage_result
            .positive_hit_point_unconscious_recovery,
        PositiveHitPointUnconsciousRecovery::EndsWhenHitPointsRegained
    );

    let illegal_ranged_knockout = resolve_attack_procedure(
        ActionQuota::ActionAvailable,
        AttackRangeFact::WithinNormalRange,
        AttackRollProcedureFacts {
            natural_d20: 12,
            total: 15,
            armor_class: 13,
            critical_threshold: 20,
        },
        player(4, 12),
        attack_damage(
            AttackKind::RangedAttack,
            4,
            0,
            AttackDamageDisposition::KnockOutAttackDamage,
        ),
    );

    assert_eq!(
        illegal_ranged_knockout.action_quota,
        ActionQuota::ActionAvailable
    );
    assert_eq!(illegal_ranged_knockout.damage_result.vitals.hit_points(), 4);
}
