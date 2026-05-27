use dnd_cleanroom_engine::battle::*;

fn spell_facts(
    profile: SpellDefinitionProfile,
    selected_slot_level: i32,
    target_count: i32,
) -> SpellInvocationFacts {
    SpellInvocationFacts {
        profile,
        has_spell_access: true,
        selected_slot_level,
        target_count,
        targets_are_valid: true,
    }
}

#[test]
fn magic_missile_profile_spends_slot_and_uses_slot_scaled_target_cardinality() {
    let higher_slot_state = SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level: 2,
            ..SpellSlotLedger::initial()
        },
        ..SpellcastingProcedureState::initial()
    };

    let invocation = resolve_spell_invocation(
        higher_slot_state,
        spell_facts(SpellDefinitionProfile::MagicMissile, 2, 4),
    );

    assert!(invocation.admitted);
    assert!(legal_spell_invocation_target_count(
        SpellDefinitionProfile::MagicMissile,
        2,
        4
    ));
    assert!(!legal_spell_invocation_target_count(
        SpellDefinitionProfile::MagicMissile,
        2,
        5
    ));
    assert_eq!(magic_missile_dart_count(2), 4);
    assert!(invocation.slot_expended);
    assert_eq!(invocation.state.slot_ledger.slots_remaining, 1);
    assert!(invocation.state.slot_spell_cast_this_turn);
    assert_eq!(invocation.state.turn.action_quota, ActionQuota::ActionSpent);
}

#[test]
fn cantrip_profile_spends_magic_action_without_slot() {
    let invocation = resolve_spell_invocation(
        SpellcastingProcedureState::initial(),
        spell_facts(SpellDefinitionProfile::RayOfFrost, 0, 1),
    );

    assert!(invocation.admitted);
    assert!(!invocation.slot_expended);
    assert_eq!(invocation.state.slot_ledger, SpellSlotLedger::initial());
    assert!(!invocation.state.slot_spell_cast_this_turn);
    assert_eq!(invocation.state.turn.action_quota, ActionQuota::ActionSpent);
}

#[test]
fn bonus_action_spell_profile_spends_bonus_action_not_action() {
    let invocation = resolve_spell_invocation(
        SpellcastingProcedureState::initial(),
        spell_facts(SpellDefinitionProfile::HealingWord, 1, 1),
    );

    assert!(invocation.admitted);
    assert!(invocation.slot_expended);
    assert_eq!(
        invocation.state.turn.action_quota,
        ActionQuota::ActionAvailable
    );
    assert!(!invocation.state.turn.bonus_action_available);
    assert_eq!(invocation.state.slot_ledger.slots_remaining, 1);
    assert!(invocation.state.slot_spell_cast_this_turn);
}

#[test]
fn second_slot_spell_in_same_turn_is_rejected_even_if_action_is_available() {
    let first = resolve_spell_invocation(
        SpellcastingProcedureState::initial(),
        spell_facts(SpellDefinitionProfile::MageArmor, 1, 1),
    );
    let second_state = SpellcastingProcedureState {
        turn: TurnProcedureState {
            action_quota: ActionQuota::ActionAvailable,
            ..first.state.turn
        },
        ..first.state
    };
    let second = resolve_spell_invocation(
        second_state,
        spell_facts(SpellDefinitionProfile::MagicMissile, 1, 1),
    );

    assert!(first.admitted);
    assert!(first.slot_expended);
    assert!(!second.admitted);
    assert_eq!(second.state, second_state);
}

#[test]
fn invalid_spell_targets_spend_resources_but_cannot_affect_targets() {
    let facts = SpellInvocationFacts {
        targets_are_valid: false,
        ..spell_facts(SpellDefinitionProfile::MagicMissile, 1, 1)
    };
    let invocation = resolve_spell_invocation(SpellcastingProcedureState::initial(), facts);

    assert!(invocation.admitted);
    assert!(invocation.slot_expended);
    assert!(!spell_invocation_can_affect_targets(invocation, facts));
}

#[test]
fn resource_admission_rejects_missing_access_wrong_slot_and_bad_target_count() {
    let no_access = resolve_spell_invocation(
        SpellcastingProcedureState::initial(),
        SpellInvocationFacts {
            has_spell_access: false,
            ..spell_facts(SpellDefinitionProfile::MagicMissile, 1, 1)
        },
    );
    let wrong_slot = resolve_spell_invocation(
        SpellcastingProcedureState::initial(),
        spell_facts(SpellDefinitionProfile::MagicMissile, 2, 1),
    );
    let too_many_targets = resolve_spell_invocation(
        SpellcastingProcedureState::initial(),
        spell_facts(SpellDefinitionProfile::HealingWord, 1, 2),
    );

    assert!(!no_access.admitted);
    assert_eq!(no_access.state, SpellcastingProcedureState::initial());
    assert!(!wrong_slot.admitted);
    assert_eq!(wrong_slot.state, SpellcastingProcedureState::initial());
    assert!(!too_many_targets.admitted);
    assert_eq!(
        too_many_targets.state,
        SpellcastingProcedureState::initial()
    );
}

#[test]
fn mass_healing_word_uses_third_level_slot_and_allows_up_to_six_targets() {
    let third_level_state = SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level: 3,
            slots_remaining: 1,
        },
        ..SpellcastingProcedureState::initial()
    };

    let admitted = resolve_spell_invocation(
        third_level_state,
        spell_facts(SpellDefinitionProfile::MassHealingWord, 3, 6),
    );
    let rejected_slot = resolve_spell_invocation(
        third_level_state,
        spell_facts(SpellDefinitionProfile::MassHealingWord, 2, 6),
    );
    let rejected_targets = resolve_spell_invocation(
        third_level_state,
        spell_facts(SpellDefinitionProfile::MassHealingWord, 3, 7),
    );

    assert!(admitted.admitted);
    assert!(admitted.slot_expended);
    assert_eq!(admitted.state.slot_ledger.slots_remaining, 0);
    assert!(!admitted.state.turn.bonus_action_available);
    assert!(!rejected_slot.admitted);
    assert!(!rejected_targets.admitted);
}

#[test]
fn spell_slot_expenditure_result_helpers_preserve_prior_state_when_rejected_or_slotless() {
    let prior = SpellSlotExpenditureState {
        slot_ledger: SpellSlotLedger::initial(),
        slot_spell_cast_this_turn: false,
    };
    let rejected = apply_spell_slot_expenditure(
        prior,
        SpellSlotExpenditureRequest::SpellSlotExpenditureRequired { slot_level: 2 },
    );
    let slotless = apply_spell_slot_expenditure(
        prior,
        SpellSlotExpenditureRequest::SpellSlotExpenditureNotRequired,
    );

    assert!(!spell_slot_expenditure_accepted(rejected));
    assert_eq!(spell_slot_expenditure_result_state(prior, rejected), prior);
    assert!(spell_slot_expenditure_accepted(slotless));
    assert!(!spell_slot_was_expended(slotless));
    assert_eq!(spell_slot_expenditure_result_state(prior, slotless), prior);
}
