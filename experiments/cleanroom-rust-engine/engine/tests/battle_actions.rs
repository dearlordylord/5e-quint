use dnd_cleanroom_engine::battle::*;

fn pool(uses_remaining: i32, maximum_uses: i32) -> FeatureUsePool {
    FeatureUsePool {
        uses_remaining,
        maximum_uses,
    }
}

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

#[test]
fn dash_disengage_dodge_and_hide_spend_their_declared_action_costs() {
    let dashed = resolve_dash(
        TurnProcedureState::initial(),
        30,
        ActionCost::StandardActionCost(StandardAction::Dash),
    );
    assert_eq!(dashed.action_quota, ActionQuota::ActionSpent);
    assert_eq!(dashed.dash_movement_bonus_feet, 30);
    assert!(legal_turn_procedure_state(dashed));

    let bonus_dash = resolve_dash(
        TurnProcedureState::initial(),
        30,
        ActionCost::BonusActionCost,
    );
    assert_eq!(bonus_dash.action_quota, ActionQuota::ActionAvailable);
    assert!(!bonus_dash.bonus_action_available);
    assert_eq!(bonus_dash.dash_movement_bonus_feet, 30);

    let disengaged = resolve_disengage(
        TurnProcedureState::initial(),
        ActionCost::StandardActionCost(StandardAction::Disengage),
    );
    let dodged = resolve_dodge(TurnProcedureState::initial());
    assert!(disengaged.disengaged);
    assert_eq!(disengaged.action_quota, ActionQuota::ActionSpent);
    assert!(dodged.dodging);
    assert_eq!(dodged.action_quota, ActionQuota::ActionSpent);

    let hidden = resolve_hide(
        TurnProcedureState::initial(),
        HideProcedureFacts {
            prerequisite_satisfied: true,
            check_total: 18,
            dc: 15,
        },
        ActionCost::StandardActionCost(StandardAction::Hide),
    );
    let not_hidden = resolve_hide(
        TurnProcedureState::initial(),
        HideProcedureFacts {
            prerequisite_satisfied: false,
            check_total: 18,
            dc: 15,
        },
        ActionCost::StandardActionCost(StandardAction::Hide),
    );
    assert!(hidden.hidden);
    assert_eq!(hidden.action_quota, ActionQuota::ActionSpent);
    assert!(!not_hidden.hidden);
    assert_eq!(not_hidden.action_quota, ActionQuota::ActionAvailable);
}

#[test]
fn search_ready_reaction_and_turn_boundaries_use_explicit_witness_facts() {
    let searching = TurnProcedureState {
        hidden: true,
        ..TurnProcedureState::initial()
    };
    let found = resolve_search(
        searching,
        SearchProcedureFacts {
            hidden_target_exists: true,
            check_total: 16,
            dc: 15,
        },
    );
    assert!(!found.hidden);
    assert_eq!(found.action_quota, ActionQuota::ActionSpent);

    let readied = resolve_ready_movement(TurnProcedureState::initial(), true);
    let next_turn = start_turn(readied);
    assert!(readied.readied_movement_held);
    assert!(readied.start_of_turn_hook_active);
    assert!(!next_turn.readied_movement_held);
    assert!(!next_turn.start_of_turn_hook_active);

    let spent_reaction = spend_reaction(TurnProcedureState::initial());
    assert!(!spent_reaction.reaction_available);
    assert!(start_turn(spent_reaction).reaction_available);

    let ended = end_turn(TurnProcedureState {
        action_quota: ActionQuota::ActionSpent,
        bonus_action_available: false,
        reaction_available: false,
        dash_movement_bonus_feet: 30,
        disengaged: true,
        dodging: true,
        hidden: true,
        help_attack_held: true,
        readied_movement_held: true,
        start_of_turn_hook_active: true,
        end_of_turn_hook_active: true,
        current_actor_owns_turn: true,
    });
    assert!(!ended.end_of_turn_hook_active);
    assert!(!ended.current_actor_owns_turn);
    assert_eq!(ended.action_quota, ActionQuota::ActionSpent);
}

#[test]
fn light_property_extra_attack_requires_prior_light_attack_and_spends_bonus_action() {
    let admitted = resolve_light_property_extra_attack(
        TurnProcedureState::initial(),
        LightPropertyExtraAttackFacts {
            prior_attack_action_light_weapon_attack: true,
            different_light_weapon: true,
        },
    );
    let rejected = resolve_light_property_extra_attack(
        TurnProcedureState::initial(),
        LightPropertyExtraAttackFacts {
            prior_attack_action_light_weapon_attack: false,
            different_light_weapon: true,
        },
    );

    assert!(admitted.admitted);
    assert_eq!(admitted.turn.action_quota, ActionQuota::ActionAvailable);
    assert!(!admitted.turn.bonus_action_available);
    assert!(!rejected.admitted);
    assert_eq!(rejected.turn, TurnProcedureState::initial());
}

#[test]
fn second_wind_spends_bonus_action_and_heals_or_preserves_state_on_rejection() {
    let result = resolve_second_wind(
        TurnProcedureState::initial(),
        pool(2, 2),
        player(3, 20),
        DeathSavingThrowLifecycle::reset(),
        PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
        SecondWindFacts {
            healing_roll: 6,
            fighter_level: 4,
        },
    );

    assert!(!result.turn.bonus_action_available);
    assert_eq!(result.pool.uses_remaining, 1);
    assert_eq!(result.recovery.vitals.hit_points(), 13);
    assert!(legal_hit_point_recovery_state(
        result.recovery.vitals,
        result.recovery.death_saving_throws,
        result.recovery.positive_hit_point_unconscious_recovery
    ));

    let recovery = PositiveHitPointUnconsciousRecovery::EndsWhenHitPointsRegained;
    let blocked = resolve_second_wind(
        TurnProcedureState::initial(),
        pool(0, 2),
        CreatureVitals::new(CreatureKind::PlayerCharacter, 5, 20, 0, false, true).unwrap(),
        DeathSavingThrowLifecycle::reset(),
        recovery,
        SecondWindFacts {
            healing_roll: 6,
            fighter_level: 4,
        },
    );

    assert_eq!(blocked.turn, TurnProcedureState::initial());
    assert_eq!(blocked.pool.uses_remaining, 0);
    assert_eq!(blocked.recovery.vitals.hit_points(), 5);
    assert_eq!(
        blocked.recovery.positive_hit_point_unconscious_recovery,
        recovery
    );
    assert_eq!(blocked.recovery.hit_points_regained, 0);
}

#[test]
fn failed_ability_check_boost_spends_only_when_it_converts_failure_to_success() {
    let converted = resolve_failed_ability_check_resource_boost(
        pool(2, 2),
        FailedAbilityCheckResourceBoostFacts {
            original_total: 13,
            dc: 15,
            boost_roll: 3,
        },
    );
    let still_failed = resolve_failed_ability_check_resource_boost(
        pool(2, 2),
        FailedAbilityCheckResourceBoostFacts {
            original_total: 10,
            dc: 15,
            boost_roll: 4,
        },
    );
    let original_success = resolve_failed_ability_check_resource_boost(
        pool(2, 2),
        FailedAbilityCheckResourceBoostFacts {
            original_total: 15,
            dc: 15,
            boost_roll: 1,
        },
    );

    assert!(!converted.original_succeeded);
    assert!(converted.boosted_succeeded);
    assert_eq!(converted.boosted_total, 16);
    assert_eq!(converted.pool.uses_remaining, 1);
    assert!(!still_failed.boosted_succeeded);
    assert_eq!(still_failed.pool.uses_remaining, 2);
    assert!(original_success.original_succeeded);
    assert_eq!(original_success.pool.uses_remaining, 2);
}

#[test]
fn cunning_action_spends_bonus_action_for_dash_disengage_or_hide() {
    let hide_facts = HideProcedureFacts {
        prerequisite_satisfied: true,
        check_total: 18,
        dc: 15,
    };

    let dash = resolve_cunning_action(
        TurnProcedureState::initial(),
        CunningActionFacts {
            choice: CunningActionChoice::CunningDash,
            speed_feet: 30,
            hide_facts,
        },
    );
    let disengage = resolve_cunning_action(
        TurnProcedureState::initial(),
        CunningActionFacts {
            choice: CunningActionChoice::CunningDisengage,
            speed_feet: 30,
            hide_facts,
        },
    );
    let hide = resolve_cunning_action(
        TurnProcedureState::initial(),
        CunningActionFacts {
            choice: CunningActionChoice::CunningHide,
            speed_feet: 30,
            hide_facts,
        },
    );

    assert!(!dash.bonus_action_available);
    assert_eq!(dash.dash_movement_bonus_feet, 30);
    assert!(!disengage.bonus_action_available);
    assert!(disengage.disengaged);
    assert!(!hide.bonus_action_available);
    assert!(hide.hidden);
}

#[test]
fn innate_sorcery_spends_bonus_action_and_one_feature_use_once() {
    let state = InnateSorceryState {
        turn: TurnProcedureState::initial(),
        pool: pool(2, 2),
        occurrence: InnateSorceryOccurrence::NoInnateSorceryOccurrence,
    };

    let active = activate_innate_sorcery(state);
    let exhausted = activate_innate_sorcery(InnateSorceryState {
        pool: pool(0, 2),
        ..state
    });
    let already_active = activate_innate_sorcery(active);

    assert!(!active.turn.bonus_action_available);
    assert_eq!(active.pool.uses_remaining, 1);
    assert_eq!(
        active.occurrence,
        InnateSorceryOccurrence::InnateSorceryOneMinuteDuration
    );
    assert_eq!(
        exhausted.occurrence,
        InnateSorceryOccurrence::NoInnateSorceryOccurrence
    );
    assert_eq!(exhausted.pool.uses_remaining, 0);
    assert_eq!(already_active.pool.uses_remaining, 1);
}

#[test]
fn bonus_action_dash_temporary_hit_points_spends_bonus_action_and_feature_use() {
    let result = resolve_bonus_action_dash_temporary_hit_points(
        TurnProcedureState::initial(),
        pool(2, 2),
        BonusActionDashTemporaryHitPointsFacts {
            speed_feet: 30,
            proficiency_bonus: 3,
            existing_temporary_hit_points: 1,
            choose_new_temporary_hit_points: true,
        },
    );

    assert!(!result.turn.bonus_action_available);
    assert_eq!(result.turn.dash_movement_bonus_feet, 30);
    assert_eq!(result.pool.uses_remaining, 1);
    assert_eq!(result.temporary_hit_points, 3);

    let keep_existing = resolve_bonus_action_dash_temporary_hit_points(
        TurnProcedureState::initial(),
        pool(1, 2),
        BonusActionDashTemporaryHitPointsFacts {
            speed_feet: 30,
            proficiency_bonus: 2,
            existing_temporary_hit_points: 5,
            choose_new_temporary_hit_points: false,
        },
    );
    assert_eq!(keep_existing.pool.uses_remaining, 0);
    assert_eq!(keep_existing.temporary_hit_points, 5);

    let no_bonus_action = resolve_bonus_action_dash_temporary_hit_points(
        TurnProcedureState {
            bonus_action_available: false,
            ..TurnProcedureState::initial()
        },
        pool(2, 2),
        BonusActionDashTemporaryHitPointsFacts {
            speed_feet: 30,
            proficiency_bonus: 3,
            existing_temporary_hit_points: 1,
            choose_new_temporary_hit_points: true,
        },
    );
    assert_eq!(no_bonus_action.pool.uses_remaining, 2);
    assert_eq!(no_bonus_action.temporary_hit_points, 1);
}

#[test]
fn action_surge_grants_one_non_magic_action_once_per_turn() {
    let surged = activate_action_surge(initial_action_surge_state(pool(2, 2)), true);
    let attack = spend_action_surge_action(surged, StandardAction::Attack);
    let second_activation = activate_action_surge(attack.action_surge, true);
    let next_turn_activation =
        activate_action_surge(start_turn_action_surge(attack.action_surge), true);

    assert_eq!(surged.pool.uses_remaining, 1);
    assert!(attack.action_was_taken);
    assert_eq!(
        attack.action_surge.action_grant,
        ActionSurgeActionGrant::ActionSurgeActionSpent
    );
    assert_eq!(second_activation, attack.action_surge);
    assert_eq!(next_turn_activation.pool.uses_remaining, 0);
    assert!(legal_action_surge_state(next_turn_activation));

    let magic = spend_action_surge_action(
        activate_action_surge(initial_action_surge_state(pool(1, 1)), true),
        StandardAction::Magic,
    );
    assert!(!magic.action_was_taken);
    assert_eq!(
        magic.action_surge.action_grant,
        ActionSurgeActionGrant::ActionSurgeActionAvailable
    );
}

#[test]
fn extra_attack_count_spends_one_action_and_allows_movement_between_slots() {
    let first = take_attack_action_with_attack_count_scaling(
        AttackActionAttackCountState::initial(),
        AttackActionAttackCountFacts {
            additional_attacks: 1,
        },
    );
    let moved = move_during_attack_action_attack_count(first.state);
    let second = resolve_extra_attack_slot(moved);

    assert!(first.action_was_spent);
    assert!(first.attack_was_resolved);
    assert!(!first.state.action_available);
    assert!(first.state.extra_attack_slot_open);
    assert!(moved.extra_attack_slot_open);
    assert_eq!(moved.movement_segments_taken, 1);
    assert!(!second.action_was_spent);
    assert!(second.attack_was_resolved);
    assert!(!second.state.extra_attack_slot_open);
    assert_eq!(second.state.attacks_resolved, 2);

    let ended = end_turn_during_attack_action_attack_count(first.state);
    let rejected_after_end = resolve_extra_attack_slot(ended);
    assert!(!ended.extra_attack_slot_open);
    assert!(ended.turn_ended);
    assert!(!rejected_after_end.attack_was_resolved);
    assert_eq!(rejected_after_end.state.attacks_resolved, 1);

    let rejected_count = take_attack_action_with_attack_count_scaling(
        AttackActionAttackCountState::initial(),
        AttackActionAttackCountFacts {
            additional_attacks: 2,
        },
    );
    assert!(!rejected_count.attack_was_resolved);
    assert!(rejected_count.state.action_available);
}
