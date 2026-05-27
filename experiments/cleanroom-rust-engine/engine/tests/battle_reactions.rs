use dnd_cleanroom_engine::battle::*;

fn player(
    hit_points: i32,
    hit_point_maximum: i32,
    temporary_hit_points: i32,
    dead: bool,
    unconscious: bool,
) -> CreatureVitals {
    CreatureVitals::new(
        CreatureKind::PlayerCharacter,
        hit_points,
        hit_point_maximum,
        temporary_hit_points,
        dead,
        unconscious,
    )
    .unwrap()
}

#[test]
fn offer_decline_and_advance_close_reaction_window_without_spending() {
    let offered = offer_reaction_window(
        ReactionWindowState::NoReactionWindow,
        ReactionWindowKind::OpportunityAttackReactionWindow,
    );
    let declined = resolve_reaction_choice(
        TurnProcedureState::initial(),
        offered,
        ReactionChoice::DeclineReaction,
    );

    assert!(reaction_window_is_open(offered));
    assert!(declined.turn.reaction_available);
    assert_eq!(
        declined.reaction_window,
        ReactionWindowState::NoReactionWindow
    );
    assert_eq!(
        advance_continuation(offered),
        ReactionWindowState::NoReactionWindow
    );
}

#[test]
fn reaction_choice_spends_quota_and_closes_matching_window() {
    let offered = offer_reaction_window(
        ReactionWindowState::NoReactionWindow,
        ReactionWindowKind::OpportunityAttackReactionWindow,
    );
    let resolved = resolve_reaction_choice(
        TurnProcedureState::initial(),
        offered,
        ReactionChoice::TakeOpportunityAttackReaction,
    );

    assert!(!resolved.turn.reaction_available);
    assert_eq!(
        resolved.reaction_window,
        ReactionWindowState::NoReactionWindow
    );
}

#[test]
fn unavailable_reaction_quota_leaves_window_open() {
    let offered = offer_reaction_window(
        ReactionWindowState::NoReactionWindow,
        ReactionWindowKind::DamageInterruptionReactionWindow,
    );
    let spent_turn = spend_reaction(TurnProcedureState::initial());
    let resolved = resolve_reaction_choice(
        spent_turn,
        offered,
        ReactionChoice::TakeDamageInterruptionReaction,
    );

    assert!(!resolved.turn.reaction_available);
    assert_eq!(resolved.reaction_window, offered);
}

#[test]
fn nested_reaction_windows_are_bounded_and_resume_suspended_window() {
    let first = offer_reaction_window(
        ReactionWindowState::NoReactionWindow,
        ReactionWindowKind::OpportunityAttackReactionWindow,
    );
    let second = offer_reaction_window(first, ReactionWindowKind::DamageInterruptionReactionWindow);
    let capped = offer_reaction_window(second, ReactionWindowKind::ReadiedMovementReactionWindow);

    assert!(legal_reaction_window_state(first));
    assert!(legal_reaction_window_state(second));
    assert_eq!(capped, second);
    assert_eq!(advance_continuation(second), first);
}

#[test]
fn opportunity_attack_trigger_opens_matching_reaction_window() {
    let facts = OpportunityAttackTriggerFacts {
        hostile_creature: true,
        observer_can_see: true,
        leaves_reach: true,
        movement_resource: MovementResource::OwnMovementActionBonusReactionOrSpeed,
    };
    let offered = offer_opportunity_attack_reaction(ReactionProtocolState::initial(), facts);

    assert!(reaction_window_is_open(offered.reaction_window));
    assert!(reaction_window_is_kind(
        offered.reaction_window,
        ReactionWindowKind::OpportunityAttackReactionWindow
    ));
    assert!(legal_reaction_protocol_state(offered));

    let disengaged = ReactionProtocolState {
        interrupted_actor: MovementGrappleState {
            turn: resolve_disengage(
                TurnProcedureState::initial(),
                ActionCost::StandardActionCost(StandardAction::Disengage),
            ),
            ..MovementGrappleState::initial()
        },
        ..ReactionProtocolState::initial()
    };
    let not_offered = offer_opportunity_attack_reaction(disengaged, facts);
    assert_eq!(
        not_offered.reaction_window,
        ReactionWindowState::NoReactionWindow
    );
}

#[test]
fn readied_movement_reaction_spends_reaction_and_movement() {
    let ready_turn = resolve_ready_movement(TurnProcedureState::initial(), true);
    let readied = ReactionProtocolState {
        reactor: MovementGrappleState {
            turn: ready_turn,
            ..MovementGrappleState::initial()
        },
        reaction_window: offer_reaction_window(
            ReactionWindowState::NoReactionWindow,
            ReactionWindowKind::ReadiedMovementReactionWindow,
        ),
        ..ReactionProtocolState::initial()
    };

    let resolved = resolve_readied_movement_reaction(
        readied,
        MovementSpendFacts {
            distance_feet: 10,
            extra_cost_feet: 0,
        },
    );

    assert!(!resolved.reactor.turn.reaction_available);
    assert!(!resolved.reactor.turn.readied_movement_held);
    assert_eq!(resolved.reactor.movement_spent_feet, 10);
    assert_eq!(resolved.interrupted_actor.movement_spent_feet, 0);
    assert_eq!(
        resolved.reaction_window,
        ReactionWindowState::NoReactionWindow
    );
}

#[test]
fn readied_movement_reaction_requires_held_response() {
    let readied = ReactionProtocolState {
        reaction_window: offer_reaction_window(
            ReactionWindowState::NoReactionWindow,
            ReactionWindowKind::ReadiedMovementReactionWindow,
        ),
        ..ReactionProtocolState::initial()
    };
    let resolved = resolve_readied_movement_reaction(
        readied,
        MovementSpendFacts {
            distance_feet: 10,
            extra_cost_feet: 0,
        },
    );

    assert!(resolved.reactor.turn.reaction_available);
    assert_eq!(resolved.reactor.movement_spent_feet, 0);
    assert_eq!(resolved.reaction_window, readied.reaction_window);
}

#[test]
fn damage_integration_opens_interruption_and_breaks_only_target_concentration() {
    let concentrating = ActorConcentrationState {
        interrupted_actor: ConcentrationState::Concentrating,
        reactor: ConcentrationState::Concentrating,
    };

    let interrupted_result = apply_damage_target_with_concentration_interruption(
        ReactionProtocolState {
            concentration: concentrating,
            ..ReactionProtocolState::initial()
        },
        ConcentrationDamageTarget {
            actor: ReactionProtocolActor::InterruptedActor,
            vitals: player(20, 20, 0, false, false),
        },
        12,
        false,
    );

    assert_eq!(
        interrupted_result.concentration.interrupted_actor,
        ConcentrationState::NoConcentration
    );
    assert_eq!(
        interrupted_result.concentration.reactor,
        ConcentrationState::Concentrating
    );
    assert_eq!(
        interrupted_result.reaction_window,
        ReactionWindowState::OfferedDamageInterruptionWindow {
            suspended: SuspendedReactionWindowKind::NoSuspendedReactionWindow
        }
    );
    assert!(legal_reaction_protocol_state(interrupted_result));

    let reactor_result = apply_damage_target_with_concentration_interruption(
        ReactionProtocolState {
            concentration: concentrating,
            ..ReactionProtocolState::initial()
        },
        ConcentrationDamageTarget {
            actor: ReactionProtocolActor::Reactor,
            vitals: player(20, 20, 0, false, false),
        },
        12,
        false,
    );

    assert_eq!(
        reactor_result.concentration.interrupted_actor,
        ConcentrationState::Concentrating
    );
    assert_eq!(
        reactor_result.concentration.reactor,
        ConcentrationState::NoConcentration
    );
}

#[test]
fn damage_integration_rejects_non_dead_zero_hit_point_target() {
    let state = ReactionProtocolState {
        concentration: ActorConcentrationState {
            interrupted_actor: ConcentrationState::Concentrating,
            reactor: ConcentrationState::Concentrating,
        },
        ..ReactionProtocolState::initial()
    };
    let invalid_positive_hp_target = ConcentrationDamageTarget {
        actor: ReactionProtocolActor::InterruptedActor,
        vitals: player(0, 20, 0, false, true),
    };

    assert_eq!(
        apply_damage_target_with_concentration_interruption(
            state,
            invalid_positive_hp_target,
            12,
            false,
        ),
        state
    );
}

#[test]
fn concentration_start_replace_end_prevent_and_damage_save_dc() {
    let initial = ReactionProtocolState::initial().concentration;
    let started = start_concentration(initial, ReactionProtocolActor::Reactor, true);
    let replaced = start_concentration(started, ReactionProtocolActor::Reactor, true);
    let prevented = start_concentration(initial, ReactionProtocolActor::Reactor, false);
    let ended = end_concentration(started, ReactionProtocolActor::Reactor);
    let broken = break_concentration_if_prevented(started, ReactionProtocolActor::Reactor, true);

    assert_eq!(started.reactor, ConcentrationState::Concentrating);
    assert_eq!(
        started.interrupted_actor,
        ConcentrationState::NoConcentration
    );
    assert_eq!(replaced.reactor, ConcentrationState::Concentrating);
    assert_eq!(prevented.reactor, ConcentrationState::NoConcentration);
    assert_eq!(ended.reactor, ConcentrationState::NoConcentration);
    assert_eq!(broken.reactor, ConcentrationState::NoConcentration);

    let small = resolve_concentration_after_damage(ConcentrationState::Concentrating, 8, true);
    let large = resolve_concentration_after_damage(ConcentrationState::Concentrating, 80, true);
    let failed = resolve_concentration_after_damage(ConcentrationState::Concentrating, 22, false);
    let no_damage = resolve_concentration_after_damage(ConcentrationState::Concentrating, 0, false);

    assert!(small.save_required);
    assert_eq!(small.save_dc, 10);
    assert_eq!(large.save_dc, 30);
    assert_eq!(failed.save_dc, 11);
    assert_eq!(failed.concentration, ConcentrationState::NoConcentration);
    assert_eq!(no_damage.concentration, ConcentrationState::Concentrating);
    assert!(!no_damage.save_required);
}
