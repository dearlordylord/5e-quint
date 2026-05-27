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

fn target() -> SaveGatedConditionTargetState {
    SaveGatedConditionTargetState {
        active_effects: Vec::new(),
    }
}

fn facts(
    choice: BlindnessDeafnessConditionChoice,
    saving_throw_succeeded: bool,
) -> BlindnessDeafnessSpellFacts {
    BlindnessDeafnessSpellFacts {
        has_spell_access: true,
        selected_slot_level: 2,
        target_count: 1,
        targets_are_valid: true,
        source: SaveGatedConditionSource::PrimaryCaster,
        choice,
        saving_throw_succeeded,
    }
}

#[test]
fn blindness_deafness_profile_uses_action_second_level_slot_and_slot_scaled_targets() {
    assert_eq!(
        spell_profile_action(SpellDefinitionProfile::BlindnessDeafness),
        SpellInvocationAction::ActionTimeSpellInvocation
    );
    assert_eq!(
        spell_profile_minimum_slot_level(SpellDefinitionProfile::BlindnessDeafness),
        2
    );
    assert_eq!(
        blindness_deafness_saving_throw_ability(),
        SpellSavingThrowAbility::SpellConstitutionSavingThrow
    );
    assert_eq!(blindness_deafness_maximum_targets(2), 1);
    assert_eq!(blindness_deafness_maximum_targets(4), 3);
    assert!(legal_spell_invocation_target_count(
        SpellDefinitionProfile::BlindnessDeafness,
        4,
        3
    ));
    assert!(!legal_spell_invocation_target_count(
        SpellDefinitionProfile::BlindnessDeafness,
        4,
        4
    ));
}

#[test]
fn failed_save_applies_selected_blinded_condition_and_spends_action_and_slot() {
    let result = resolve_blindness_deafness_spell(
        state_for_slot(2),
        target(),
        facts(
            BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice,
            false,
        ),
    );
    let projection = save_gated_condition_projection(&result.target);

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(
        result.invocation.state.turn.action_quota,
        ActionQuota::ActionSpent
    );
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 0);
    assert!(result.target_effected);
    assert!(projection.blinded);
    assert!(!projection.deafened);
    assert_eq!(
        result.target.active_effects,
        vec![SaveGatedConditionActiveEffect::BlindnessDeafnessBlinded {
            source: SaveGatedConditionSource::PrimaryCaster,
            duration_ticks: BLINDNESS_DEAFNESS_DURATION_TICKS,
        }]
    );
}

#[test]
fn failed_save_applies_selected_deafened_condition_only() {
    let result = resolve_blindness_deafness_spell(
        state_for_slot(2),
        target(),
        facts(
            BlindnessDeafnessConditionChoice::BlindnessDeafnessDeafenedChoice,
            false,
        ),
    );
    let projection = save_gated_condition_projection(&result.target);

    assert!(projection.deafened);
    assert!(!projection.blinded);
    assert_eq!(
        result.target.active_effects,
        vec![SaveGatedConditionActiveEffect::BlindnessDeafnessDeafened {
            source: SaveGatedConditionSource::PrimaryCaster,
            duration_ticks: BLINDNESS_DEAFNESS_DURATION_TICKS,
        }]
    );
}

#[test]
fn successful_initial_save_spends_spell_resources_without_condition_effect() {
    let result = resolve_blindness_deafness_spell(
        state_for_slot(2),
        target(),
        facts(
            BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice,
            true,
        ),
    );

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert!(result.target_effected);
    assert!(!save_gated_condition_projection(&result.target).blinded);
    assert!(result.target.active_effects.is_empty());
}

#[test]
fn explicit_target_witness_can_spend_without_applying_condition() {
    let result = resolve_blindness_deafness_spell(
        state_for_slot(2),
        target(),
        BlindnessDeafnessSpellFacts {
            targets_are_valid: false,
            ..facts(
                BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice,
                false,
            )
        },
    );

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert!(!result.target_effected);
    assert!(result.target.active_effects.is_empty());
}

#[test]
fn illegal_slot_or_target_count_rejects_without_spending_resources() {
    let wrong_slot = resolve_blindness_deafness_spell(
        state_for_slot(1),
        target(),
        BlindnessDeafnessSpellFacts {
            selected_slot_level: 1,
            ..facts(
                BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice,
                false,
            )
        },
    );
    let too_many_targets = resolve_blindness_deafness_spell(
        state_for_slot(2),
        target(),
        BlindnessDeafnessSpellFacts {
            target_count: 2,
            ..facts(
                BlindnessDeafnessConditionChoice::BlindnessDeafnessDeafenedChoice,
                false,
            )
        },
    );

    assert!(!wrong_slot.invocation.admitted);
    assert_eq!(wrong_slot.invocation.state, state_for_slot(1));
    assert!(!too_many_targets.invocation.admitted);
    assert_eq!(too_many_targets.invocation.state, state_for_slot(2));
}

#[test]
fn repeat_save_success_removes_only_matching_choice_and_source() {
    let active_effects = vec![
        blindness_deafness_active_effect(
            BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice,
            SaveGatedConditionSource::PrimaryCaster,
        ),
        blindness_deafness_active_effect(
            BlindnessDeafnessConditionChoice::BlindnessDeafnessDeafenedChoice,
            SaveGatedConditionSource::PrimaryCaster,
        ),
        blindness_deafness_active_effect(
            BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice,
            SaveGatedConditionSource::OtherSource,
        ),
    ];

    let success = end_turn_with_blindness_deafness_repeat_save(
        SaveGatedConditionTargetState { active_effects },
        SaveGatedConditionSource::PrimaryCaster,
        BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice,
        true,
    );
    let projection = save_gated_condition_projection(&success.target);
    let failure = end_turn_with_blindness_deafness_repeat_save(
        success.target.clone(),
        SaveGatedConditionSource::PrimaryCaster,
        BlindnessDeafnessConditionChoice::BlindnessDeafnessDeafenedChoice,
        false,
    );

    assert!(success.effect_ended);
    assert!(projection.blinded);
    assert!(projection.deafened);
    assert_eq!(success.target.active_effects.len(), 2);
    assert!(!failure.effect_ended);
    assert_eq!(failure.target, success.target);
}
