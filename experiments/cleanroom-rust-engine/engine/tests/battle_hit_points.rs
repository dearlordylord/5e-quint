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

fn monster(
    hit_points: i32,
    hit_point_maximum: i32,
    temporary_hit_points: i32,
    dead: bool,
    unconscious: bool,
) -> CreatureVitals {
    CreatureVitals::new(
        CreatureKind::MonsterCreature,
        hit_points,
        hit_point_maximum,
        temporary_hit_points,
        dead,
        unconscious,
    )
    .unwrap()
}

#[test]
fn temporary_hit_points_absorb_before_hit_points() {
    let result = apply_resolved_damage_to_positive_hit_points(player(10, 12, 3, false, false), 5);

    assert_eq!(result.vitals.temporary_hit_points(), 0);
    assert_eq!(result.vitals.hit_points(), 8);
    assert_eq!(result.damage_to_hit_points, 2);
    assert_eq!(result.remaining_damage_at_zero, 0);
}

#[test]
fn positive_damage_drops_player_to_zero_or_instant_death() {
    let unconscious =
        apply_resolved_damage_to_positive_hit_points(player(4, 12, 0, false, false), 5);
    let lifecycle = death_saving_throw_lifecycle_after_positive_hit_point_damage(
        DeathSavingThrowLifecycle::reset(),
        unconscious,
    );

    assert_eq!(unconscious.vitals.hit_points(), 0);
    assert!(unconscious.vitals.is_unconscious());
    assert!(!unconscious.vitals.is_dead());
    assert_eq!(lifecycle, DeathSavingThrowLifecycle::reset());
    assert!(legal_player_character_death_saving_throw_state(
        unconscious.vitals,
        lifecycle
    ));

    let killed = apply_resolved_damage_to_positive_hit_points(player(6, 12, 0, false, false), 18);
    let killed_lifecycle = death_saving_throw_lifecycle_after_positive_hit_point_damage(
        DeathSavingThrowLifecycle::reset(),
        killed,
    );

    assert!(killed.vitals.is_dead());
    assert_eq!(killed.remaining_damage_at_zero, 12);
    assert_eq!(killed_lifecycle.failures(), 3);
}

#[test]
fn monster_dies_when_it_drops_to_zero_hit_points() {
    let result = apply_resolved_damage_to_positive_hit_points(monster(3, 7, 1, false, false), 5);

    assert_eq!(result.vitals.hit_points(), 0);
    assert_eq!(result.vitals.temporary_hit_points(), 0);
    assert!(result.vitals.is_dead());
}

#[test]
fn damage_at_zero_adds_death_saving_throw_failures() {
    let vitals = player(0, 12, 0, false, true);

    let ordinary =
        apply_damage_at_zero_hit_points(vitals, DeathSavingThrowLifecycle::reset(), 1, false);
    let critical =
        apply_damage_at_zero_hit_points(vitals, DeathSavingThrowLifecycle::reset(), 1, true);
    let massive =
        apply_damage_at_zero_hit_points(vitals, DeathSavingThrowLifecycle::reset(), 12, false);

    assert_eq!(ordinary.death_saving_throws.failures(), 1);
    assert!(!ordinary.vitals.is_dead());
    assert_eq!(critical.death_saving_throws.failures(), 2);
    assert!(massive.vitals.is_dead());
    assert_eq!(massive.death_saving_throws.failures(), 3);
}

#[test]
fn temporary_hit_points_absorb_zero_hit_point_damage_before_failures() {
    let vitals = player(0, 12, 5, false, true);

    let absorbed = apply_damage_to_zero_hit_point_creature(
        vitals,
        DeathSavingThrowLifecycle::reset(),
        4,
        true,
    );
    let overflow = apply_damage_to_zero_hit_point_creature(
        vitals,
        DeathSavingThrowLifecycle::reset(),
        7,
        true,
    );

    assert_eq!(absorbed.vitals.temporary_hit_points(), 1);
    assert_eq!(absorbed.death_saving_throws.failures(), 0);
    assert_eq!(overflow.vitals.temporary_hit_points(), 0);
    assert_eq!(overflow.death_saving_throws.failures(), 2);
}

#[test]
fn death_saving_throw_rolls_update_lifecycle() {
    let vitals = player(0, 12, 0, false, true);
    let two_successes = DeathSavingThrowLifecycle::new(2, 1, false, false).unwrap();

    let stable = resolve_start_turn_death_saving_throw(vitals, two_successes, 10);
    assert_eq!(stable.death_saving_throws.successes(), 0);
    assert_eq!(stable.death_saving_throws.failures(), 0);
    assert!(stable.death_saving_throws.is_stable());
    assert!(legal_player_character_death_saving_throw_state(
        stable.vitals,
        stable.death_saving_throws
    ));

    let natural_twenty =
        resolve_start_turn_death_saving_throw(vitals, DeathSavingThrowLifecycle::reset(), 20);
    assert_eq!(natural_twenty.vitals.hit_points(), 1);
    assert!(!natural_twenty.vitals.is_unconscious());
    assert!(natural_twenty.death_saving_throws.hit_point_regained());

    let natural_one =
        resolve_start_turn_death_saving_throw(vitals, DeathSavingThrowLifecycle::reset(), 1);
    assert_eq!(natural_one.death_saving_throws.failures(), 2);
}

#[test]
fn healing_caps_at_maximum_and_resets_death_saving_throws_when_hit_points_are_regained() {
    let injured = apply_hit_point_healing(
        player(14, 20, 0, false, false),
        DeathSavingThrowLifecycle::reset(),
        PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
        8,
    );

    assert_eq!(injured.vitals.hit_points(), 20);
    assert_eq!(injured.hit_points_regained, 6);

    let dying_lifecycle = DeathSavingThrowLifecycle::new(1, 1, false, false).unwrap();
    let healed_from_zero = apply_hit_point_healing(
        player(0, 12, 0, false, true),
        dying_lifecycle,
        PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
        3,
    );

    assert_eq!(healed_from_zero.vitals.hit_points(), 3);
    assert!(!healed_from_zero.vitals.is_unconscious());
    assert_eq!(
        healed_from_zero.death_saving_throws,
        DeathSavingThrowLifecycle::reset()
    );
}

#[test]
fn dead_creatures_do_not_regain_hit_points_from_healing() {
    let result = apply_hit_point_healing(
        player(0, 12, 0, true, true),
        DeathSavingThrowLifecycle::new(0, 3, false, false).unwrap(),
        PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
        5,
    );

    assert_eq!(result.vitals.hit_points(), 0);
    assert!(result.vitals.is_dead());
    assert_eq!(result.hit_points_regained, 0);
}

#[test]
fn knockout_disposition_sets_one_hit_point_and_ends_by_healing_or_first_aid() {
    let damage = apply_resolved_damage_to_positive_hit_points(player(4, 12, 0, false, false), 4);
    let knocked_out = apply_knock_out_disposition(damage);

    assert_eq!(knocked_out.vitals.hit_points(), 1);
    assert!(knocked_out.vitals.is_unconscious());
    assert_eq!(
        knocked_out.positive_hit_point_unconscious_recovery,
        PositiveHitPointUnconsciousRecovery::EndsWhenHitPointsRegained
    );

    let first_aid = apply_first_aid_to_knock_out_unconscious(
        knocked_out.vitals,
        knocked_out.death_saving_throws,
        knocked_out.positive_hit_point_unconscious_recovery,
        true,
    );
    assert!(!first_aid.vitals.is_unconscious());
    assert_eq!(
        first_aid.positive_hit_point_unconscious_recovery,
        PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery
    );

    let knocked_out_again = apply_knock_out_disposition(damage);
    let healed = apply_hit_point_healing(
        knocked_out_again.vitals,
        knocked_out_again.death_saving_throws,
        knocked_out_again.positive_hit_point_unconscious_recovery,
        1,
    );
    assert!(!healed.vitals.is_unconscious());
    assert_eq!(
        healed.positive_hit_point_unconscious_recovery,
        PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery
    );
}

#[test]
fn temporary_hit_point_grants_do_not_stack_or_restore_consciousness() {
    let dying = player(0, 12, 4, false, true);

    let kept = grant_temporary_hit_points(dying, 7, TemporaryHitPointChoice::KeepExisting);
    let gained = grant_temporary_hit_points(dying, 7, TemporaryHitPointChoice::GainNew);

    assert_eq!(kept.temporary_hit_points(), 4);
    assert_eq!(gained.temporary_hit_points(), 7);
    assert_eq!(gained.hit_points(), 0);
    assert!(gained.is_unconscious());
}

#[test]
fn direct_hit_point_restoration_uses_spell_profile_dice_and_modifier() {
    let facts = DirectHitPointRestorationEffectFacts {
        profile: DirectHitPointRestorationProfile::CureWounds,
        slot_level: 1,
        healing_dice_roll: 9,
        spellcasting_ability_modifier: 3,
    };

    assert!(legal_direct_hit_point_restoration_effect_facts(facts));
    assert_eq!(
        hit_point_restoration_area_profile(DirectHitPointRestorationProfile::MassCureWounds),
        HitPointRestorationAreaProfile::MassCureWoundsPointOriginSphereArea
    );

    let result = resolve_direct_hit_point_restoration_effect(
        player(2, 12, 0, false, false),
        DeathSavingThrowLifecycle::reset(),
        PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
        facts,
    );

    assert_eq!(result.vitals.hit_points(), 12);
    assert_eq!(result.hit_points_regained, 10);
}
