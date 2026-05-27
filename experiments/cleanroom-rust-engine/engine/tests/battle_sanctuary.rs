use dnd_cleanroom_engine::battle::*;

fn sanctuary_facts() -> SanctuarySpellFacts {
    SanctuarySpellFacts {
        has_spell_access: true,
        selected_slot_level: 1,
        target_within_range: true,
    }
}

#[test]
fn sanctuary_spell_creates_bonus_action_ward_from_valid_target_witness() {
    let result = resolve_sanctuary_spell(SpellcastingProcedureState::initial(), sanctuary_facts());

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert_eq!(
        result.invocation.state.turn.action_quota,
        ActionQuota::ActionAvailable
    );
    assert!(!result.invocation.state.turn.bonus_action_available);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 1);
    assert!(result.ward.active);
    assert!(result.ward.source_is_sanctuary);
    assert_eq!(result.ward.duration_ticks, SANCTUARY_DURATION_TICKS);
}

#[test]
fn invalid_sanctuary_target_spends_resources_but_creates_no_ward() {
    let result = resolve_sanctuary_spell(
        SpellcastingProcedureState::initial(),
        SanctuarySpellFacts {
            target_within_range: false,
            ..sanctuary_facts()
        },
    );

    assert!(result.invocation.admitted);
    assert!(result.invocation.slot_expended);
    assert!(!result.ward.active);
    assert_eq!(result.invocation.state.slot_ledger.slots_remaining, 1);
}

#[test]
fn sanctuary_requests_save_for_direct_attack_or_damaging_spell_not_area_effect() {
    let ward = sanctuary_ward_active_effect();
    let attack = resolve_sanctuary_targeting_interdiction(
        ward,
        SanctuaryTargetingTrigger::SanctuaryAttackRollTargeting,
        SanctuaryInterdictionOutcome::SanctuaryLoseAttackOrSpell,
    );
    let spell = resolve_sanctuary_targeting_interdiction(
        ward,
        SanctuaryTargetingTrigger::SanctuaryDamagingSpellTargeting,
        SanctuaryInterdictionOutcome::SanctuarySaveSucceeded,
    );
    let area = resolve_sanctuary_targeting_interdiction(
        ward,
        SanctuaryTargetingTrigger::SanctuaryAreaOfEffectTargeting,
        SanctuaryInterdictionOutcome::SanctuaryLoseAttackOrSpell,
    );

    assert!(ward_targeting_interdiction_applies(
        SanctuaryTargetingTrigger::SanctuaryAttackRollTargeting
    ));
    assert!(attack.wisdom_save_requested);
    assert!(attack.attack_or_spell_lost);
    assert_eq!(
        attack.resolved_target,
        SanctuaryTargetIdentity::WardedCreature
    );
    assert!(spell.wisdom_save_requested);
    assert!(spell.outcome_applies);
    assert_eq!(
        spell.resolved_target,
        SanctuaryTargetIdentity::WardedCreature
    );
    assert!(!area.wisdom_save_requested);
    assert!(!ward_targeting_interdiction_applies(
        SanctuaryTargetingTrigger::SanctuaryAreaOfEffectTargeting
    ));
}

#[test]
fn sanctuary_legal_replacement_target_is_admitted_and_resolved() {
    let result = resolve_sanctuary_targeting_interdiction(
        sanctuary_ward_active_effect(),
        SanctuaryTargetingTrigger::SanctuaryAttackRollTargeting,
        SanctuaryInterdictionOutcome::SanctuaryChooseNewTarget {
            witness: SanctuaryReplacementTargetWitness {
                replacement: SanctuaryTargetIdentity::ReplacementCreature,
                caller_target_legal: true,
            },
        },
    );

    assert!(result.wisdom_save_requested);
    assert!(result.replacement_admitted);
    assert!(result.outcome_applies);
    assert!(!result.attack_or_spell_lost);
    assert_eq!(
        result.resolved_target,
        SanctuaryTargetIdentity::ReplacementCreature
    );
}

#[test]
fn sanctuary_illegal_replacement_target_is_rejected() {
    let same_warded_target = resolve_sanctuary_targeting_interdiction(
        sanctuary_ward_active_effect(),
        SanctuaryTargetingTrigger::SanctuaryAttackRollTargeting,
        SanctuaryInterdictionOutcome::SanctuaryChooseNewTarget {
            witness: SanctuaryReplacementTargetWitness {
                replacement: SanctuaryTargetIdentity::WardedCreature,
                caller_target_legal: true,
            },
        },
    );
    let caller_rejected_target = resolve_sanctuary_targeting_interdiction(
        sanctuary_ward_active_effect(),
        SanctuaryTargetingTrigger::SanctuaryAttackRollTargeting,
        SanctuaryInterdictionOutcome::SanctuaryChooseNewTarget {
            witness: SanctuaryReplacementTargetWitness {
                replacement: SanctuaryTargetIdentity::ReplacementCreature,
                caller_target_legal: false,
            },
        },
    );

    assert!(!same_warded_target.replacement_admitted);
    assert!(!same_warded_target.outcome_applies);
    assert_eq!(
        same_warded_target.resolved_target,
        SanctuaryTargetIdentity::WardedCreature
    );
    assert!(!caller_rejected_target.replacement_admitted);
    assert!(!caller_rejected_target.outcome_applies);
}

#[test]
fn sanctuary_ward_ends_when_warded_creature_attacks_casts_or_deals_damage() {
    let ward = sanctuary_ward_active_effect();

    assert!(!sanctuary_ward_after_warded_action(ward, SanctuaryWardedAction::AttackRoll).active);
    assert!(!sanctuary_ward_after_warded_action(ward, SanctuaryWardedAction::SpellCast).active);
    assert!(!sanctuary_ward_after_warded_action(ward, SanctuaryWardedAction::DamageDealt).active);
    assert!(sanctuary_ward_after_warded_action(ward, SanctuaryWardedAction::OtherAction).active);
}
