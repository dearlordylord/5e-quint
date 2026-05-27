use dnd_cleanroom_engine::battle::*;

fn player(hit_points: i32) -> CreatureVitals {
    CreatureVitals::new(
        CreatureKind::PlayerCharacter,
        hit_points,
        30,
        0,
        false,
        false,
    )
    .unwrap()
}

fn spell_state(slot_level: i32, slots_remaining: i32) -> SpellcastingProcedureState {
    SpellcastingProcedureState {
        slot_ledger: SpellSlotLedger {
            slot_level,
            slots_remaining,
        },
        ..SpellcastingProcedureState::initial()
    }
}

#[test]
fn counterspell_reaction_can_end_triggering_spell_without_expending_triggering_slot() {
    let result = resolve_counterspell_reaction(
        spell_state(3, 1),
        spell_state(1, 1),
        CounterspellReactionFacts {
            has_spell_access: true,
            counterspell_slot_level: 3,
            triggering_spell_level: 1,
            triggering_spell_uses_slot: true,
            triggering_caster_constitution_save_succeeded: true,
            triggering_casting_resource: CounterspellCastingResource::CounterspellMagicAction,
        },
    );

    assert!(result.triggering_spell_ended);
    assert!(!result.triggering_spell_slot_expended);
    assert!(result.reaction_window_cleared);
    assert!(!result.reactor.turn.reaction_available);
    assert_eq!(result.reactor.slot_ledger.slots_remaining, 0);
    assert!(result.reactor.slot_spell_cast_this_turn);
    assert_eq!(result.triggering_caster.slot_ledger.slots_remaining, 1);
    assert_eq!(
        result.triggering_caster.turn.action_quota,
        ActionQuota::ActionSpent
    );
}

#[test]
fn counterspell_reaction_can_fail_and_resume_triggering_spell_slot_effect() {
    let result = resolve_counterspell_reaction(
        spell_state(3, 1),
        spell_state(4, 1),
        CounterspellReactionFacts {
            has_spell_access: true,
            counterspell_slot_level: 3,
            triggering_spell_level: 4,
            triggering_spell_uses_slot: true,
            triggering_caster_constitution_save_succeeded: true,
            triggering_casting_resource: CounterspellCastingResource::CounterspellMagicAction,
        },
    );
    let reactor_after_triggering_spell =
        apply_resolved_damage_to_positive_hit_points(player(30), 12).vitals;

    assert!(!result.triggering_spell_ended);
    assert!(result.triggering_spell_slot_expended);
    assert!(result.reaction_window_cleared);
    assert!(!result.reactor.turn.reaction_available);
    assert_eq!(result.reactor.slot_ledger.slots_remaining, 0);
    assert_eq!(result.triggering_caster.slot_ledger.slots_remaining, 0);
    assert!(result.triggering_caster.slot_spell_cast_this_turn);
    assert_eq!(reactor_after_triggering_spell.hit_points(), 18);
}

#[test]
fn counterspell_reaction_rejects_wrong_trigger_spent_reaction_or_missing_slot() {
    let wrong_trigger = resolve_reaction_spell_invocation(
        spell_state(3, 1),
        ReactionSpellInvocationFacts {
            profile: ReactionSpellProfile::Counterspell,
            has_spell_access: true,
            selected_slot_level: 3,
            trigger: ReactionSpellTrigger::DamageFromVisibleCreatureWithin60Feet,
        },
    );
    let spent_reaction_state = SpellcastingProcedureState {
        turn: spend_reaction(TurnProcedureState::initial()),
        ..spell_state(3, 1)
    };
    let spent_reaction = resolve_counterspell_reaction(
        spent_reaction_state,
        spell_state(1, 1),
        CounterspellReactionFacts {
            has_spell_access: true,
            counterspell_slot_level: 3,
            triggering_spell_level: 1,
            triggering_spell_uses_slot: true,
            triggering_caster_constitution_save_succeeded: false,
            triggering_casting_resource: CounterspellCastingResource::CounterspellMagicAction,
        },
    );
    let missing_slot = resolve_counterspell_reaction(
        spell_state(3, 0),
        spell_state(1, 1),
        CounterspellReactionFacts {
            has_spell_access: true,
            counterspell_slot_level: 3,
            triggering_spell_level: 1,
            triggering_spell_uses_slot: true,
            triggering_caster_constitution_save_succeeded: false,
            triggering_casting_resource: CounterspellCastingResource::CounterspellMagicAction,
        },
    );

    assert!(!wrong_trigger.admitted);
    assert!(!spent_reaction.reaction_window_cleared);
    assert_eq!(spent_reaction.reactor, spent_reaction_state);
    assert!(!missing_slot.reaction_window_cleared);
    assert_eq!(missing_slot.reactor.slot_ledger.slots_remaining, 0);
}

#[test]
fn hellish_rebuke_reaction_spends_reaction_and_slot_after_damage_trigger() {
    let result = resolve_hellish_rebuke_reaction(
        spell_state(2, 1),
        player(29),
        player(30),
        HellishRebukeReactionFacts {
            has_spell_access: true,
            selected_slot_level: 2,
            damage_roll: 3,
            saving_throw_succeeded: false,
            trigger: ReactionSpellTrigger::DamageFromVisibleCreatureWithin60Feet,
        },
    );

    assert!(result.reaction_window_cleared);
    assert!(!result.reactor.turn.reaction_available);
    assert_eq!(result.reactor.slot_ledger.slots_remaining, 0);
    assert_eq!(result.damaged_reactor.hit_points(), 29);
    assert_eq!(result.triggering_creature.vitals.hit_points(), 27);
}

#[test]
fn hellish_rebuke_halves_damage_on_success_and_rejects_bad_trigger() {
    let saved = resolve_hellish_rebuke_reaction(
        spell_state(1, 1),
        player(29),
        player(30),
        HellishRebukeReactionFacts {
            has_spell_access: true,
            selected_slot_level: 1,
            damage_roll: 5,
            saving_throw_succeeded: true,
            trigger: ReactionSpellTrigger::DamageFromVisibleCreatureWithin60Feet,
        },
    );
    let wrong_trigger = resolve_hellish_rebuke_reaction(
        spell_state(1, 1),
        player(29),
        player(30),
        HellishRebukeReactionFacts {
            has_spell_access: true,
            selected_slot_level: 1,
            damage_roll: 5,
            saving_throw_succeeded: false,
            trigger: ReactionSpellTrigger::SpellCastSeenWithin60FeetWithComponents,
        },
    );

    assert_eq!(hellish_rebuke_damage_dice(1), 2);
    assert_eq!(saved.triggering_creature.vitals.hit_points(), 28);
    assert!(saved.reaction_window_cleared);
    assert_eq!(wrong_trigger.triggering_creature.vitals.hit_points(), 30);
    assert!(!wrong_trigger.reaction_window_cleared);
}
