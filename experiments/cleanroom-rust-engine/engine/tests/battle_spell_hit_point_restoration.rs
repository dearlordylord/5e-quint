use dnd_cleanroom_engine::battle::*;

fn player(
    hit_points: i32,
    hit_point_maximum: i32,
    dead: bool,
    unconscious: bool,
) -> CreatureVitals {
    CreatureVitals::new(
        CreatureKind::PlayerCharacter,
        hit_points,
        hit_point_maximum,
        0,
        dead,
        unconscious,
    )
    .unwrap()
}

fn restoration_target(
    hit_points: i32,
    hit_point_maximum: i32,
    unconscious: bool,
    death_saving_throws: DeathSavingThrowLifecycle,
    witness: DirectHitPointRestorationTargetWitness,
) -> DirectHitPointRestorationTarget {
    DirectHitPointRestorationTarget {
        vitals: player(hit_points, hit_point_maximum, false, unconscious),
        death_saving_throws,
        positive_hit_point_unconscious_recovery:
            PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
        witness,
    }
}

fn healing_facts(
    profile: DirectHitPointRestorationProfile,
    slot_level: i32,
    healing_dice_roll: i32,
) -> DirectHitPointRestorationSpellFacts {
    DirectHitPointRestorationSpellFacts {
        has_spell_access: true,
        effect: DirectHitPointRestorationEffectFacts {
            profile,
            slot_level,
            healing_dice_roll,
            spellcasting_ability_modifier: 3,
        },
    }
}

#[test]
fn healing_word_restores_one_selected_wounded_target_and_spends_bonus_action_slot() {
    let result = resolve_direct_hit_point_restoration_spell(
        SpellcastingProcedureState::initial(),
        &[restoration_target(
            4,
            12,
            false,
            DeathSavingThrowLifecycle::reset(),
            DirectHitPointRestorationTargetWitness::valid(),
        )],
        healing_facts(DirectHitPointRestorationProfile::HealingWord, 1, 5),
    );

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(
        result.invocation.state.turn.action_quota,
        ActionQuota::ActionAvailable
    );
    assert!(!result.invocation.state.turn.bonus_action_available);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 1);
    assert!(result.invocation.state.slot_spell_cast_this_turn);
    assert_eq!(result.targets[0].vitals.hit_points(), 12);
    assert_eq!(result.targets[0].hit_points_regained, 8);
}

#[test]
fn healing_word_restores_zero_hit_point_target_and_resets_death_saves() {
    let result = resolve_direct_hit_point_restoration_spell(
        SpellcastingProcedureState::initial(),
        &[restoration_target(
            0,
            12,
            true,
            DeathSavingThrowLifecycle::new(1, 1, false, false).unwrap(),
            DirectHitPointRestorationTargetWitness::valid(),
        )],
        healing_facts(DirectHitPointRestorationProfile::HealingWord, 1, 2),
    );

    assert_eq!(result.targets[0].vitals.hit_points(), 5);
    assert!(!result.targets[0].vitals.is_unconscious());
    assert_eq!(
        result.targets[0].death_saving_throws,
        DeathSavingThrowLifecycle::reset()
    );
}

#[test]
fn mass_healing_word_projects_healing_to_each_selected_target() {
    let state = SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level: 3,
            slots_remaining: 1,
        },
        ..SpellcastingProcedureState::initial()
    };

    let result = resolve_direct_hit_point_restoration_spell(
        state,
        &[
            restoration_target(
                4,
                12,
                false,
                DeathSavingThrowLifecycle::reset(),
                DirectHitPointRestorationTargetWitness::valid(),
            ),
            restoration_target(
                4,
                12,
                false,
                DeathSavingThrowLifecycle::reset(),
                DirectHitPointRestorationTargetWitness::valid(),
            ),
        ],
        healing_facts(DirectHitPointRestorationProfile::MassHealingWord, 3, 5),
    );

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 0);
    assert!(!result.invocation.state.turn.bonus_action_available);
    assert_eq!(result.targets.len(), 2);
    assert_eq!(result.targets[0].vitals.hit_points(), 12);
    assert_eq!(result.targets[1].vitals.hit_points(), 12);
}

#[test]
fn mass_cure_wounds_uses_fifth_level_action_spell_and_area_profile() {
    let state = SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level: 5,
            slots_remaining: 1,
        },
        ..SpellcastingProcedureState::initial()
    };

    let result = resolve_direct_hit_point_restoration_spell(
        state,
        &[
            restoration_target(
                4,
                12,
                false,
                DeathSavingThrowLifecycle::reset(),
                DirectHitPointRestorationTargetWitness::valid(),
            ),
            restoration_target(
                4,
                12,
                false,
                DeathSavingThrowLifecycle::reset(),
                DirectHitPointRestorationTargetWitness::valid(),
            ),
        ],
        healing_facts(DirectHitPointRestorationProfile::MassCureWounds, 5, 5),
    );

    assert_eq!(
        hit_point_restoration_area_profile(DirectHitPointRestorationProfile::MassCureWounds),
        HitPointRestorationAreaProfile::MassCureWoundsPointOriginSphereArea
    );
    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 0);
    assert_eq!(
        result.invocation.state.turn.action_quota,
        ActionQuota::ActionSpent
    );
    assert!(result.invocation.state.turn.bonus_action_available);
    assert_eq!(result.targets[0].vitals.hit_points(), 12);
    assert_eq!(result.targets[1].vitals.hit_points(), 12);
}

#[test]
fn invalid_explicit_target_witness_spends_slot_but_does_not_apply_healing() {
    let invalid_spatial_witness = DirectHitPointRestorationTargetWitness {
        selected_by_caster: true,
        spell_spatial_requirements_satisfied: false,
    };

    let result = resolve_direct_hit_point_restoration_spell(
        SpellcastingProcedureState::initial(),
        &[restoration_target(
            4,
            12,
            false,
            DeathSavingThrowLifecycle::reset(),
            invalid_spatial_witness,
        )],
        healing_facts(DirectHitPointRestorationProfile::HealingWord, 1, 5),
    );

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 1);
    assert_eq!(result.targets[0].vitals.hit_points(), 4);
    assert_eq!(result.targets[0].hit_points_regained, 0);
}

#[test]
fn missing_target_or_illegal_healing_roll_facts_do_not_spend_resources() {
    let missing_target = resolve_direct_hit_point_restoration_spell(
        SpellcastingProcedureState::initial(),
        &[],
        healing_facts(DirectHitPointRestorationProfile::HealingWord, 1, 5),
    );
    let illegal_healing_roll = resolve_direct_hit_point_restoration_spell(
        SpellcastingProcedureState::initial(),
        &[restoration_target(
            4,
            12,
            false,
            DeathSavingThrowLifecycle::reset(),
            DirectHitPointRestorationTargetWitness::valid(),
        )],
        healing_facts(DirectHitPointRestorationProfile::HealingWord, 1, 1),
    );

    assert!(!missing_target.invocation.admitted);
    assert!(!missing_target.invocation.slot_expended);
    assert_eq!(
        missing_target.invocation.state,
        SpellcastingProcedureState::initial()
    );
    assert!(!illegal_healing_roll.invocation.admitted);
    assert!(!illegal_healing_roll.invocation.slot_expended);
    assert_eq!(
        illegal_healing_roll.invocation.state,
        SpellcastingProcedureState::initial()
    );
    assert_eq!(illegal_healing_roll.targets[0].vitals.hit_points(), 4);
}
