use dnd_cleanroom_engine::battle::*;

fn pending(option: CommandOption) -> Option<CommandPendingEffect> {
    Some(CommandPendingEffect {
        option,
        expires_on_current_turn: true,
    })
}

fn movement(speed_feet: i32, movement_spent_feet: i32) -> MovementGrappleState {
    MovementGrappleState {
        speed_feet,
        movement_spent_feet,
        ..MovementGrappleState::initial()
    }
}

fn command_facts(
    selected_slot_level: i32,
    target_count: i32,
    failed_target_count: i32,
    option: CommandOption,
) -> CommandSpellFacts {
    CommandSpellFacts {
        has_spell_access: true,
        selected_slot_level,
        target_count,
        targets_are_valid: true,
        failed_target_count,
        failed_targets_are_selected_targets: true,
        option,
    }
}

#[test]
fn command_spell_uses_slot_scaled_target_count_and_records_failed_targets() {
    let second_level_state = SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level: 2,
            slots_remaining: 1,
        },
        ..SpellcastingProcedureState::initial()
    };

    let result = resolve_command_spell(
        second_level_state,
        command_facts(2, 2, 1, CommandOption::CommandGrovel),
    );
    let too_many_targets = resolve_command_spell(
        second_level_state,
        command_facts(2, 3, 1, CommandOption::CommandGrovel),
    );
    let failed_not_selected = resolve_command_spell(
        second_level_state,
        CommandSpellFacts {
            failed_targets_are_selected_targets: false,
            ..command_facts(2, 2, 1, CommandOption::CommandGrovel)
        },
    );

    assert_eq!(command_max_targets(2), 2);
    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 0);
    assert_eq!(
        result.invocation.state.turn.action_quota,
        ActionQuota::ActionSpent
    );
    assert_eq!(result.pending_effect_count, 1);
    assert_eq!(result.option, CommandOption::CommandGrovel);
    assert!(!too_many_targets.invocation.admitted);
    assert_eq!(too_many_targets.pending_effect_count, 0);
    assert!(!failed_not_selected.invocation.admitted);
    assert_eq!(failed_not_selected.invocation.state, second_level_state);
}

#[test]
fn command_spell_with_invalid_targets_spends_resources_but_creates_no_pending_effect() {
    let result = resolve_command_spell(
        SpellcastingProcedureState::initial(),
        CommandSpellFacts {
            targets_are_valid: false,
            ..command_facts(1, 1, 1, CommandOption::CommandDrop)
        },
    );

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 1);
    assert_eq!(result.pending_effect_count, 0);
}

#[test]
fn command_grovel_sets_prone_removes_pending_and_ends_turn() {
    let result = follow_command_grovel(
        MovementGrappleState::initial(),
        pending(CommandOption::CommandGrovel),
    );
    let ignored = follow_command_grovel(
        MovementGrappleState::initial(),
        pending(CommandOption::CommandDrop),
    );

    assert!(result.movement.prone);
    assert!(!result.movement.turn.current_actor_owns_turn);
    assert_eq!(result.pending, None);
    assert!(!ignored.movement.prone);
    assert_eq!(ignored.pending, pending(CommandOption::CommandDrop));
}

#[test]
fn command_drop_reports_all_held_objects_removes_pending_and_ends_turn() {
    let result = follow_command_drop(
        MovementGrappleState::initial(),
        pending(CommandOption::CommandDrop),
        2,
    );
    let invalid_count = follow_command_drop(
        MovementGrappleState::initial(),
        pending(CommandOption::CommandDrop),
        -1,
    );

    assert_eq!(result.dropped_object_count, 2);
    assert!(!result.movement.turn.current_actor_owns_turn);
    assert_eq!(result.pending, None);
    assert_eq!(invalid_count.dropped_object_count, 0);
    assert_eq!(invalid_count.pending, pending(CommandOption::CommandDrop));
}

#[test]
fn command_halt_suppresses_action_bonus_and_movement_until_end_command_turn() {
    let result = follow_command_halt(movement(30, 5), pending(CommandOption::CommandHalt));
    let ended = end_command_halt_turn(result.movement, result.pending);

    assert_eq!(result.movement.turn.action_quota, ActionQuota::ActionSpent);
    assert!(!result.movement.turn.bonus_action_available);
    assert_eq!(movement_remaining_feet(result.movement), 0);
    assert_eq!(result.pending, pending(CommandOption::CommandHalt));
    assert_eq!(ended.pending, None);
    assert!(!ended.movement.turn.current_actor_owns_turn);
}

#[test]
fn command_approach_spends_movement_and_ends_only_when_within_five_feet() {
    let continues = follow_command_approach(
        movement(30, 0),
        pending(CommandOption::CommandApproach),
        MovementSpendFacts {
            distance_feet: 10,
            extra_cost_feet: 0,
        },
        false,
    );
    let ends = follow_command_approach(
        movement(30, 0),
        pending(CommandOption::CommandApproach),
        MovementSpendFacts {
            distance_feet: 10,
            extra_cost_feet: 0,
        },
        true,
    );
    let rejected = follow_command_approach(
        movement(30, 25),
        pending(CommandOption::CommandApproach),
        MovementSpendFacts {
            distance_feet: 10,
            extra_cost_feet: 0,
        },
        true,
    );

    assert_eq!(continues.movement.movement_spent_feet, 10);
    assert!(continues.movement.turn.current_actor_owns_turn);
    assert_eq!(continues.pending, None);
    assert_eq!(ends.movement.movement_spent_feet, 10);
    assert!(!ends.movement.turn.current_actor_owns_turn);
    assert_eq!(ends.pending, None);
    assert_eq!(rejected.movement.movement_spent_feet, 25);
    assert_eq!(rejected.pending, pending(CommandOption::CommandApproach));
}

#[test]
fn command_flee_requires_all_remaining_movement_and_can_offer_opportunity_attack() {
    let ends = follow_command_flee(
        movement(30, 0),
        pending(CommandOption::CommandFlee),
        MovementSpendFacts {
            distance_feet: 30,
            extra_cost_feet: 0,
        },
        false,
    );
    let continuation = follow_command_flee(
        movement(30, 0),
        pending(CommandOption::CommandFlee),
        MovementSpendFacts {
            distance_feet: 30,
            extra_cost_feet: 0,
        },
        true,
    );
    let rejected_partial = follow_command_flee(
        movement(30, 0),
        pending(CommandOption::CommandFlee),
        MovementSpendFacts {
            distance_feet: 20,
            extra_cost_feet: 0,
        },
        false,
    );

    assert_eq!(ends.movement.movement_spent_feet, 30);
    assert!(!ends.movement.turn.current_actor_owns_turn);
    assert_eq!(ends.pending, None);
    assert_eq!(
        continuation.reaction_window,
        ReactionWindowState::OfferedOpportunityAttackWindow {
            suspended: SuspendedReactionWindowKind::NoSuspendedReactionWindow
        }
    );
    assert_eq!(continuation.pending, pending(CommandOption::CommandFlee));
    assert_eq!(rejected_partial.movement.movement_spent_feet, 0);
    assert_eq!(
        rejected_partial.pending,
        pending(CommandOption::CommandFlee)
    );
}
