use dnd_cleanroom_engine::battle::*;

fn spell_state(slot_level: i32, slots_remaining: i32) -> SpellcastingProcedureState {
    SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level,
            slots_remaining,
        },
        ..SpellcastingProcedureState::initial()
    }
}

fn target(hit_points: i32) -> CreatureVitals {
    CreatureVitals::new(
        CreatureKind::MonsterCreature,
        hit_points,
        30,
        0,
        false,
        false,
    )
    .unwrap()
}

fn divine_smite_facts(smite_damage_roll: i32) -> DivineSmiteAfterHitFacts {
    DivineSmiteAfterHitFacts {
        has_spell_access: true,
        selected_slot_level: 1,
        melee_hit_trigger_witness: true,
        target_fiend_or_undead: false,
        smite_damage_roll,
        attack_critical: false,
        target_adjustments: DamageAdjustmentFacts::none(),
    }
}

#[test]
fn divine_smite_profile_projects_bonus_action_radiant_dice_and_no_concentration() {
    assert_eq!(
        spell_profile_action(SpellDefinitionProfile::DivineSmite),
        SpellInvocationAction::BonusActionSpellInvocation
    );
    assert_eq!(
        damage_rider_spell_action(DamageRiderSpellProfile::DivineSmiteAfterHitDamageProfile),
        SpellInvocationAction::BonusActionSpellInvocation
    );
    assert!(!damage_rider_requires_concentration(
        DamageRiderSpellProfile::DivineSmiteAfterHitDamageProfile
    ));
    assert_eq!(
        spell_profile_minimum_slot_level(SpellDefinitionProfile::DivineSmite),
        1
    );
    assert_eq!(divine_smite_damage_type(), DamageType::Radiant);
    assert_eq!(divine_smite_damage_die_size(), 8);
    assert_eq!(divine_smite_damage_dice(1, false), 2);
    assert_eq!(divine_smite_damage_dice(1, true), 3);
    assert_eq!(divine_smite_damage_dice(3, true), 5);
}

#[test]
fn divine_smite_after_melee_hit_spends_bonus_action_slot_and_deals_radiant_damage() {
    let result =
        resolve_divine_smite_after_melee_hit(spell_state(1, 1), target(30), divine_smite_facts(9));

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert!(!result.invocation.state.turn.bonus_action_available);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 0);
    assert!(result.invocation.state.slot_spell_cast_this_turn);
    assert_eq!(result.damage_type, DamageType::Radiant);
    assert_eq!(result.damage_dice, 2);
    assert_eq!(result.damage_die_size, 8);
    assert_eq!(result.damage_amount, 9);
    assert_eq!(result.damage_result.vitals.hit_points(), 21);
}

#[test]
fn divine_smite_critical_doubles_rolled_rider_damage() {
    let result = resolve_divine_smite_after_melee_hit(
        spell_state(1, 1),
        target(30),
        DivineSmiteAfterHitFacts {
            attack_critical: true,
            ..divine_smite_facts(7)
        },
    );

    assert!(result.invocation.admitted);
    assert_eq!(result.damage_amount, 14);
    assert_eq!(result.damage_result.vitals.hit_points(), 16);
}

#[test]
fn divine_smite_uses_explicit_melee_hit_witness_before_spending_resources() {
    let result = resolve_divine_smite_after_melee_hit(
        spell_state(1, 1),
        target(30),
        DivineSmiteAfterHitFacts {
            melee_hit_trigger_witness: false,
            ..divine_smite_facts(9)
        },
    );

    assert!(!result.invocation.admitted);
    assert!(!result.invocation.slot_expended);
    assert!(result.invocation.state.turn.bonus_action_available);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 1);
    assert_eq!(result.damage_result.vitals.hit_points(), 30);
    assert_eq!(result.damage_amount, 0);
}

#[test]
fn divine_smite_resource_failures_and_illegal_roll_do_not_damage_target() {
    let missing_slot =
        resolve_divine_smite_after_melee_hit(spell_state(1, 0), target(30), divine_smite_facts(9));
    let missing_access = resolve_divine_smite_after_melee_hit(
        spell_state(1, 1),
        target(30),
        DivineSmiteAfterHitFacts {
            has_spell_access: false,
            ..divine_smite_facts(9)
        },
    );
    let negative_roll =
        resolve_divine_smite_after_melee_hit(spell_state(1, 1), target(30), divine_smite_facts(-1));

    assert!(!missing_slot.invocation.admitted);
    assert!(!missing_access.invocation.admitted);
    assert!(!negative_roll.invocation.admitted);
    assert_eq!(missing_slot.damage_result.vitals.hit_points(), 30);
    assert_eq!(missing_access.damage_result.vitals.hit_points(), 30);
    assert_eq!(negative_roll.damage_result.vitals.hit_points(), 30);
}

#[test]
fn divine_smite_target_adjustments_apply_to_radiant_damage() {
    let resisted = resolve_divine_smite_after_melee_hit(
        spell_state(1, 1),
        target(30),
        DivineSmiteAfterHitFacts {
            smite_damage_roll: 9,
            target_adjustments: DamageAdjustmentFacts::none().with_resistance(DamageType::Radiant),
            ..divine_smite_facts(9)
        },
    );
    let vulnerable = resolve_divine_smite_after_melee_hit(
        spell_state(1, 1),
        target(30),
        DivineSmiteAfterHitFacts {
            smite_damage_roll: 9,
            target_adjustments: DamageAdjustmentFacts::none()
                .with_vulnerability(DamageType::Radiant),
            ..divine_smite_facts(9)
        },
    );

    assert_eq!(resisted.damage_amount, 4);
    assert_eq!(resisted.damage_result.vitals.hit_points(), 26);
    assert_eq!(vulnerable.damage_amount, 18);
    assert_eq!(vulnerable.damage_result.vitals.hit_points(), 12);
}
