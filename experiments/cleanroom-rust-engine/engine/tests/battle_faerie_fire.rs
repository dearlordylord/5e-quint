use dnd_cleanroom_engine::battle::*;

fn state_for_slot(slot_level: i32) -> SpellcastingProcedureState {
    SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level,
            slots_remaining: 1,
        },
        ..SpellcastingProcedureState::initial()
    }
}

fn faerie_facts() -> FaerieFireSpellFacts {
    FaerieFireSpellFacts {
        has_spell_access: true,
        selected_slot_level: 1,
        area_witness_valid: true,
        creature_target_count: 2,
        failed_creature_save_count: 1,
        failed_creatures_are_in_area: true,
        object_target_count: 1,
        object_targets_are_in_area: true,
    }
}

#[test]
fn faerie_fire_is_action_level_one_spell_with_area_witness_admission() {
    let result = resolve_faerie_fire_spell(state_for_slot(1), faerie_facts());

    assert_eq!(
        spell_profile_action(SpellDefinitionProfile::FaerieFire),
        SpellInvocationAction::ActionTimeSpellInvocation
    );
    assert_eq!(
        spell_profile_minimum_slot_level(SpellDefinitionProfile::FaerieFire),
        1
    );
    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(
        result.invocation.state.turn.action_quota,
        ActionQuota::ActionSpent
    );
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 0);
    assert_eq!(result.outlined_creature_count, 1);
    assert_eq!(
        result.object_outlines,
        vec![FaerieFireObjectOutline { object_id: 0 }]
    );
    assert!(result.caster_concentrating);
}

#[test]
fn faerie_fire_explicit_witness_facts_gate_effect_application() {
    let invalid_area = resolve_faerie_fire_spell(
        state_for_slot(1),
        FaerieFireSpellFacts {
            area_witness_valid: false,
            ..faerie_facts()
        },
    );
    let mismatched_failed_creature = resolve_faerie_fire_spell(
        state_for_slot(1),
        FaerieFireSpellFacts {
            failed_creatures_are_in_area: false,
            ..faerie_facts()
        },
    );
    let too_many_failed = resolve_faerie_fire_spell(
        state_for_slot(1),
        FaerieFireSpellFacts {
            failed_creature_save_count: 3,
            ..faerie_facts()
        },
    );

    assert!(invalid_area.invocation.admitted);
    assert!(invalid_area.invocation.slot_expended);
    assert_eq!(invalid_area.outlined_creature_count, 0);
    assert!(invalid_area.object_outlines.is_empty());
    assert!(!invalid_area.caster_concentrating);
    assert!(!mismatched_failed_creature.invocation.admitted);
    assert!(!too_many_failed.invocation.admitted);
}

#[test]
fn failed_save_adds_faerie_fire_outline_once() {
    let target = FaerieFireTargetState {
        active_effects: vec![FaerieFireActiveEffect::FaerieFireOutline],
    };
    let failed = faerie_fire_target(target.clone(), false);
    let succeeded = faerie_fire_target(target.clone(), true);

    assert_eq!(failed.active_effects, target.active_effects);
    assert_eq!(succeeded, target);
    assert!(faerie_fire_target_is_outlined(&failed.active_effects));
}

#[test]
fn outlined_creature_grants_attack_roll_advantage_when_seen_and_denies_invisibility() {
    let effects = faerie_fire_failed_save_active_effects();

    assert_eq!(
        faerie_fire_creature_attack_roll_mode(false, &effects, true),
        SpellAttackRollMode::AdvantageSpellAttackRoll
    );
    assert_eq!(
        faerie_fire_creature_attack_roll_mode(false, &effects, false),
        SpellAttackRollMode::NormalSpellAttackRoll
    );
    assert_eq!(
        faerie_fire_creature_attack_roll_mode(true, &effects, true),
        SpellAttackRollMode::NormalSpellAttackRoll
    );
    assert!(faerie_fire_active_effects_deny_invisible_benefit(&effects));
}

#[test]
fn outlined_object_grants_attack_roll_advantage_by_matching_object_identity() {
    let outlines = vec![FaerieFireObjectOutline { object_id: 7 }];

    assert_eq!(
        faerie_fire_object_attack_roll_mode(false, &outlines, 7, true),
        SpellAttackRollMode::AdvantageSpellAttackRoll
    );
    assert_eq!(
        faerie_fire_object_attack_roll_mode(false, &outlines, 8, true),
        SpellAttackRollMode::NormalSpellAttackRoll
    );
    assert_eq!(
        faerie_fire_object_attack_roll_mode(true, &outlines, 7, true),
        SpellAttackRollMode::NormalSpellAttackRoll
    );
    assert!(faerie_fire_object_outlines_deny_invisible_benefit(
        &outlines, 7
    ));
    assert!(!faerie_fire_object_outlines_deny_invisible_benefit(
        &outlines, 8
    ));
}
