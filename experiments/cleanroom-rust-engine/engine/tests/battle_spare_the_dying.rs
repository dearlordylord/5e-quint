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

fn monster(hit_points: i32, dead: bool) -> CreatureVitals {
    CreatureVitals::new(CreatureKind::MonsterCreature, hit_points, 7, 0, dead, false).unwrap()
}

fn facts() -> SpareTheDyingInvocationFacts {
    SpareTheDyingInvocationFacts {
        character_level: 1,
        has_spell_access: true,
        target_within_range: true,
    }
}

#[test]
fn spare_the_dying_range_scales_by_character_level() {
    assert_eq!(spare_the_dying_range_feet(1), 15);
    assert_eq!(spare_the_dying_range_feet(4), 15);
    assert_eq!(spare_the_dying_range_feet(5), 30);
    assert_eq!(spare_the_dying_range_feet(10), 30);
    assert_eq!(spare_the_dying_range_feet(11), 60);
    assert_eq!(spare_the_dying_range_feet(16), 60);
    assert_eq!(spare_the_dying_range_feet(17), 120);
}

#[test]
fn spare_the_dying_makes_zero_hit_point_non_dead_target_stable_and_spends_action() {
    let vitals = player(0, 12, 0, false, true);
    let lifecycle = DeathSavingThrowLifecycle::new(2, 1, false, false).unwrap();

    let result = resolve_spare_the_dying(TurnProcedureState::initial(), vitals, lifecycle, facts());

    assert!(result.admitted);
    assert_eq!(result.turn.action_quota, ActionQuota::ActionSpent);
    assert_eq!(result.vitals.hit_points(), 0);
    assert!(result.vitals.is_unconscious());
    assert_eq!(result.death_saving_throws.successes(), 0);
    assert_eq!(result.death_saving_throws.failures(), 0);
    assert!(result.death_saving_throws.is_stable());
    assert!(legal_player_character_death_saving_throw_state(
        result.vitals,
        result.death_saving_throws
    ));
}

#[test]
fn spare_the_dying_rejects_missing_access_out_of_range_or_spent_action() {
    let vitals = player(0, 12, 0, false, true);
    let lifecycle = DeathSavingThrowLifecycle::new(1, 1, false, false).unwrap();

    let no_access = resolve_spare_the_dying(
        TurnProcedureState::initial(),
        vitals,
        lifecycle,
        SpareTheDyingInvocationFacts {
            has_spell_access: false,
            ..facts()
        },
    );
    let out_of_range = resolve_spare_the_dying(
        TurnProcedureState::initial(),
        vitals,
        lifecycle,
        SpareTheDyingInvocationFacts {
            target_within_range: false,
            ..facts()
        },
    );
    let spent_action = resolve_spare_the_dying(
        spend_action_cost(
            TurnProcedureState::initial(),
            ActionCost::StandardActionCost(StandardAction::Attack),
        ),
        vitals,
        lifecycle,
        facts(),
    );

    assert!(!no_access.admitted);
    assert_eq!(no_access.turn.action_quota, ActionQuota::ActionAvailable);
    assert_eq!(no_access.vitals, vitals);
    assert_eq!(no_access.death_saving_throws, lifecycle);

    assert!(!out_of_range.admitted);
    assert_eq!(out_of_range.turn.action_quota, ActionQuota::ActionAvailable);
    assert_eq!(out_of_range.vitals, vitals);
    assert_eq!(out_of_range.death_saving_throws, lifecycle);

    assert!(!spent_action.admitted);
    assert_eq!(spent_action.vitals, vitals);
    assert_eq!(spent_action.death_saving_throws, lifecycle);
    assert_eq!(spent_action.turn.action_quota, ActionQuota::ActionSpent);
}

#[test]
fn spare_the_dying_rejects_positive_hit_points_dead_targets_and_non_death_save_targets() {
    let dying = DeathSavingThrowLifecycle::new(1, 1, false, false).unwrap();
    let dead = DeathSavingThrowLifecycle::new(0, 3, false, false).unwrap();

    let positive = resolve_spare_the_dying(
        TurnProcedureState::initial(),
        player(1, 12, 0, false, false),
        DeathSavingThrowLifecycle::reset(),
        facts(),
    );
    let dead_target = resolve_spare_the_dying(
        TurnProcedureState::initial(),
        player(0, 12, 0, true, true),
        dead,
        facts(),
    );
    let monster_target = resolve_spare_the_dying(
        TurnProcedureState::initial(),
        monster(0, true),
        DeathSavingThrowLifecycle::reset(),
        facts(),
    );

    assert!(!positive.admitted);
    assert_eq!(
        positive.death_saving_throws,
        DeathSavingThrowLifecycle::reset()
    );
    assert!(!dead_target.admitted);
    assert_eq!(dead_target.death_saving_throws.failures(), 3);
    assert!(!monster_target.admitted);
    assert_eq!(monster_target.vitals.kind(), CreatureKind::MonsterCreature);

    let stable = resolve_spare_the_dying(
        TurnProcedureState::initial(),
        player(0, 12, 0, false, true),
        dying,
        facts(),
    );
    assert!(stable.admitted);
}

#[test]
fn apply_spare_the_dying_is_the_target_lifecycle_mutation_without_action_cost() {
    let vitals = player(0, 12, 0, false, true);
    let lifecycle = DeathSavingThrowLifecycle::new(2, 1, false, false).unwrap();

    let (next_vitals, next_lifecycle) = apply_spare_the_dying(vitals, lifecycle);

    assert_eq!(next_vitals, vitals);
    assert_eq!(next_lifecycle.successes(), 0);
    assert_eq!(next_lifecycle.failures(), 0);
    assert!(next_lifecycle.is_stable());
}
