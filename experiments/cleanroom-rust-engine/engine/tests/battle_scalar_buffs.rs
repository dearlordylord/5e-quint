use dnd_cleanroom_engine::battle::*;

fn player(hit_points: i32, maximum: i32, temporary: i32) -> CreatureVitals {
    CreatureVitals::new(
        CreatureKind::PlayerCharacter,
        hit_points,
        maximum,
        temporary,
        false,
        hit_points == 0,
    )
    .unwrap()
}

fn target(hit_points: i32, maximum: i32, temporary: i32) -> ScalarBuffTargetState {
    ScalarBuffTargetState {
        vitals: player(hit_points, maximum, temporary),
        active_effects: Vec::new(),
    }
}

fn state_for_slot(slot_level: i32) -> SpellcastingProcedureState {
    SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level,
            slots_remaining: 1,
        },
        ..SpellcastingProcedureState::initial()
    }
}

fn facts(invocation: ScalarBuffSpell, selected_slot_level: i32) -> ScalarBuffSpellFacts {
    ScalarBuffSpellFacts {
        invocation,
        has_spell_access: true,
        selected_slot_level,
        target_count: 1,
        targets_are_valid: true,
        all_targets_willing: true,
        false_life_rolled_dice: 5,
        temporary_hit_point_choice: TemporaryHitPointChoice::GainNew,
    }
}

fn projection(target: &ScalarBuffTargetState) -> ScalarBuffProjection {
    scalar_buff_project_target(
        target,
        ScalarBuffBaseStats {
            armor_class: 10,
            speed_feet: 30,
        },
    )
}

#[test]
fn scalar_buff_profiles_expose_action_cost_slot_floor_and_target_scaling() {
    assert_eq!(
        spell_profile_action(SpellDefinitionProfile::ShieldOfFaith),
        SpellInvocationAction::BonusActionSpellInvocation
    );
    assert_eq!(
        spell_profile_action(SpellDefinitionProfile::Barkskin),
        SpellInvocationAction::BonusActionSpellInvocation
    );
    assert_eq!(
        spell_profile_action(SpellDefinitionProfile::Longstrider),
        SpellInvocationAction::ActionTimeSpellInvocation
    );
    assert_eq!(
        spell_profile_minimum_slot_level(SpellDefinitionProfile::Aid),
        2
    );
    assert_eq!(
        spell_profile_minimum_slot_level(SpellDefinitionProfile::Fly),
        3
    );
    assert_eq!(
        scalar_buff_maximum_targets(ScalarBuffSpell::LongstriderScalarBuff, 3),
        3
    );
    assert_eq!(
        scalar_buff_maximum_targets(ScalarBuffSpell::SpiderClimbScalarBuff, 3),
        2
    );
    assert_eq!(
        scalar_buff_maximum_targets(ScalarBuffSpell::FlyScalarBuff, 4),
        2
    );
    assert_eq!(
        scalar_buff_maximum_targets(ScalarBuffSpell::AidScalarBuff, 9),
        3
    );
}

#[test]
fn scalar_buff_mbt_projection_values_match_core_witnesses() {
    let shield = resolve_scalar_buff_spell(
        state_for_slot(1),
        false,
        target(12, 12, 0),
        facts(ScalarBuffSpell::ShieldOfFaithScalarBuff, 1),
    );
    let longstrider = resolve_scalar_buff_spell(
        state_for_slot(1),
        false,
        target(12, 12, 0),
        facts(ScalarBuffSpell::LongstriderScalarBuff, 1),
    );
    let spider_climb = resolve_scalar_buff_spell(
        state_for_slot(2),
        false,
        target(12, 12, 0),
        facts(ScalarBuffSpell::SpiderClimbScalarBuff, 2),
    );
    let aid = resolve_scalar_buff_spell(
        state_for_slot(2),
        false,
        target(12, 12, 0),
        facts(ScalarBuffSpell::AidScalarBuff, 2),
    );
    let false_life = resolve_scalar_buff_spell(
        state_for_slot(1),
        false,
        target(12, 12, 0),
        facts(ScalarBuffSpell::FalseLifeScalarBuff, 1),
    );

    assert!(shield.invocation.admitted);
    assert_eq!(projection(&shield.target).armor_class, 12);
    assert!(projection(&shield.target).armor_class_bonus_active);
    assert!(shield.caster_concentrating);
    assert_eq!(projection(&longstrider.target).speed_feet, 40);
    assert!(projection(&longstrider.target).speed_delta_active);
    assert!(!longstrider.caster_concentrating);
    assert_eq!(projection(&spider_climb.target).climb_speed_feet, 30);
    assert!(projection(&spider_climb.target).special_speed_grant_active);
    assert!(spider_climb.caster_concentrating);
    assert_eq!(projection(&aid.target).hit_point_maximum, 17);
    assert_eq!(projection(&aid.target).hit_points, 17);
    assert!(projection(&aid.target).hit_point_maximum_increase_active);
    assert_eq!(projection(&false_life.target).temporary_hit_points, 9);
}

#[test]
fn scalar_buff_target_witnesses_gate_willing_targets_and_spatial_effects() {
    let unwilling = resolve_scalar_buff_spell(
        state_for_slot(2),
        false,
        target(12, 12, 0),
        ScalarBuffSpellFacts {
            all_targets_willing: false,
            ..facts(ScalarBuffSpell::SpiderClimbScalarBuff, 2)
        },
    );
    let invalid_spatial = resolve_scalar_buff_spell(
        state_for_slot(1),
        false,
        target(12, 12, 0),
        ScalarBuffSpellFacts {
            targets_are_valid: false,
            ..facts(ScalarBuffSpell::ShieldOfFaithScalarBuff, 1)
        },
    );

    assert!(!unwilling.invocation.admitted);
    assert!(!unwilling.target_effected);
    assert!(invalid_spatial.invocation.admitted);
    assert!(invalid_spatial.invocation.slot_expended);
    assert!(!invalid_spatial.target_effected);
    assert_eq!(projection(&invalid_spatial.target).armor_class, 10);
}

#[test]
fn barkskin_floors_armor_class_and_fly_grants_hover_speed_with_concentration() {
    let barkskin = resolve_scalar_buff_spell(
        state_for_slot(2),
        false,
        target(12, 12, 0),
        facts(ScalarBuffSpell::BarkskinScalarBuff, 2),
    );
    let fly = resolve_scalar_buff_spell(
        state_for_slot(3),
        false,
        target(12, 12, 0),
        facts(ScalarBuffSpell::FlyScalarBuff, 3),
    );
    let fly_upcast = resolve_scalar_buff_spell(
        state_for_slot(4),
        false,
        target(12, 12, 0),
        ScalarBuffSpellFacts {
            selected_slot_level: 4,
            target_count: 2,
            ..facts(ScalarBuffSpell::FlyScalarBuff, 4)
        },
    );

    assert_eq!(projection(&barkskin.target).armor_class, 17);
    assert!(!barkskin.caster_concentrating);
    assert_eq!(projection(&fly.target).fly_speed_feet, 60);
    assert!(fly.caster_concentrating);
    assert!(fly_upcast.invocation.admitted);
}

#[test]
fn aid_uses_highest_active_hit_point_maximum_increase_without_stacking() {
    let first = resolve_scalar_buff_spell(
        state_for_slot(2),
        false,
        target(12, 12, 0),
        facts(ScalarBuffSpell::AidScalarBuff, 2),
    );
    let upcast = resolve_scalar_buff_spell(
        state_for_slot(4),
        false,
        first.target.clone(),
        facts(ScalarBuffSpell::AidScalarBuff, 4),
    );
    let lower_recast = resolve_scalar_buff_spell(
        state_for_slot(2),
        false,
        upcast.target.clone(),
        facts(ScalarBuffSpell::AidScalarBuff, 2),
    );

    assert_eq!(first.target.vitals.hit_point_maximum(), 17);
    assert_eq!(upcast.target.vitals.hit_point_maximum(), 27);
    assert_eq!(upcast.target.vitals.hit_points(), 27);
    assert_eq!(
        aid_hit_point_maximum_increase_applied_amount(&upcast.target.active_effects),
        15
    );
    assert_eq!(lower_recast.target.vitals.hit_point_maximum(), 27);
    assert_eq!(lower_recast.target.vitals.hit_points(), 27);
}

#[test]
fn false_life_uses_table_dice_and_temporary_hit_point_choice() {
    let keep_existing = resolve_scalar_buff_spell(
        state_for_slot(1),
        false,
        target(12, 12, 10),
        ScalarBuffSpellFacts {
            false_life_rolled_dice: 5,
            temporary_hit_point_choice: TemporaryHitPointChoice::KeepExisting,
            ..facts(ScalarBuffSpell::FalseLifeScalarBuff, 1)
        },
    );
    let gain_new = resolve_scalar_buff_spell(
        state_for_slot(3),
        false,
        target(12, 12, 10),
        ScalarBuffSpellFacts {
            selected_slot_level: 3,
            false_life_rolled_dice: 4,
            temporary_hit_point_choice: TemporaryHitPointChoice::GainNew,
            ..facts(ScalarBuffSpell::FalseLifeScalarBuff, 3)
        },
    );
    let invalid_roll = resolve_scalar_buff_spell(
        state_for_slot(1),
        false,
        target(12, 12, 0),
        ScalarBuffSpellFacts {
            false_life_rolled_dice: 1,
            ..facts(ScalarBuffSpell::FalseLifeScalarBuff, 1)
        },
    );

    assert_eq!(keep_existing.target.vitals.temporary_hit_points(), 10);
    assert_eq!(gain_new.target.vitals.temporary_hit_points(), 18);
    assert!(!invalid_roll.invocation.admitted);
}
