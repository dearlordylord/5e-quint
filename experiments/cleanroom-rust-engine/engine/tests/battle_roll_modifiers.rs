use dnd_cleanroom_engine::battle::*;
use dnd_cleanroom_engine::types::Ability;

#[test]
fn bless_and_bane_project_attack_and_saving_throw_d4_modifiers() {
    let bless = roll_modifier_choice_active_effect(
        RollModifierSpell::BlessRollModifier,
        Ability::Wisdom,
        RollModifierSkill::OtherSkill,
    );
    let bane = roll_modifier_choice_active_effect(
        RollModifierSpell::BaneRollModifier,
        Ability::Wisdom,
        RollModifierSkill::OtherSkill,
    );

    assert_eq!(
        d20_roll_modifier_projection(bless),
        D20RollModifierProjection {
            sign: D20ModifierSign::D20ModifierBonus,
            attack_roll: true,
            saving_throw: true,
            ability_check: false,
            skill: None,
        }
    );
    assert_eq!(
        d20_roll_modifier_delta(bless, D20RollKind::AttackRoll, 3),
        3
    );
    assert_eq!(
        d20_roll_modifier_delta(bless, D20RollKind::SavingThrow, 2),
        2
    );
    assert_eq!(
        d20_roll_modifier_projection(bane).sign,
        D20ModifierSign::D20ModifierPenalty
    );
    assert_eq!(
        d20_roll_modifier_delta(bane, D20RollKind::AttackRoll, 4),
        -4
    );
    assert_eq!(
        d20_roll_modifier_delta(bane, D20RollKind::SavingThrow, 1),
        -1
    );
}

#[test]
fn guidance_projects_selected_skill_ability_check_bonus_only() {
    let guidance = roll_modifier_choice_active_effect(
        RollModifierSpell::GuidanceRollModifier,
        Ability::Dexterity,
        RollModifierSkill::StealthSkill,
    );

    assert_eq!(
        d20_roll_modifier_projection(guidance),
        D20RollModifierProjection {
            sign: D20ModifierSign::D20ModifierBonus,
            attack_roll: false,
            saving_throw: false,
            ability_check: true,
            skill: Some(RollModifierSkill::StealthSkill),
        }
    );
    assert_eq!(
        d20_roll_modifier_delta(
            guidance,
            D20RollKind::AbilityCheck {
                ability: Ability::Dexterity,
                skill: RollModifierSkill::StealthSkill,
            },
            4,
        ),
        4
    );
    assert_eq!(
        d20_roll_modifier_delta(
            guidance,
            D20RollKind::AbilityCheck {
                ability: Ability::Wisdom,
                skill: RollModifierSkill::PerceptionSkill,
            },
            4,
        ),
        0
    );
}

#[test]
fn fixed_skill_deltas_apply_to_stealth_and_passive_perception() {
    let pass_without_trace = roll_modifier_choice_active_effect(
        RollModifierSpell::PassWithoutTraceRollModifier,
        Ability::Dexterity,
        RollModifierSkill::StealthSkill,
    );
    let enthrall = roll_modifier_choice_active_effect(
        RollModifierSpell::EnthrallRollModifier,
        Ability::Wisdom,
        RollModifierSkill::PerceptionSkill,
    );

    assert_eq!(
        roll_modifier_fixed_ability_check_delta(
            pass_without_trace,
            RollModifierSkill::StealthSkill
        ),
        10
    );
    assert_eq!(
        roll_modifier_fixed_ability_check_delta(
            pass_without_trace,
            RollModifierSkill::PerceptionSkill
        ),
        0
    );
    assert_eq!(
        roll_modifier_fixed_ability_check_delta(enthrall, RollModifierSkill::PerceptionSkill),
        -10
    );
    assert_eq!(passive_perception_modifier_delta(&[enthrall]), -10);
}

#[test]
fn enhance_ability_projects_advantage_for_selected_ability_checks() {
    let enhance = roll_modifier_choice_active_effect(
        RollModifierSpell::EnhanceAbilityRollModifier,
        Ability::Strength,
        RollModifierSkill::OtherSkill,
    );

    assert_eq!(
        enhance,
        RollModifierActiveEffect::EnhanceAbilityCheckAdvantage {
            ability: Ability::Strength
        }
    );
}

#[test]
fn thaumaturgy_booming_voice_counts_one_minute_effect_and_advantages_intimidation() {
    let booming_voice = thaumaturgy_booming_voice_active_effect();
    let effects = [booming_voice];

    assert_eq!(
        booming_voice,
        RollModifierActiveEffect::ThaumaturgyBoomingVoice {
            duration_ticks: THAUMATURGY_BOOMING_VOICE_DURATION_TICKS
        }
    );
    assert_eq!(
        thaumaturgy_active_one_minute_effect_count_after_booming_voice_cast(&[], 2),
        3
    );
    assert_eq!(
        thaumaturgy_active_one_minute_effect_count_after_booming_voice_cast(&effects, 3),
        3
    );
    assert!(can_add_thaumaturgy_booming_voice(&[], 2));
    assert!(!can_add_thaumaturgy_booming_voice(&[], 3));
    assert_eq!(
        thaumaturgy_booming_voice_ability_check_roll_mode(
            &effects,
            Ability::Charisma,
            RollModifierSkill::IntimidationSkill,
        ),
        AbilityCheckRollMode::AdvantageAbilityCheck
    );
    assert_eq!(
        thaumaturgy_booming_voice_ability_check_roll_mode(
            &effects,
            Ability::Wisdom,
            RollModifierSkill::PerceptionSkill,
        ),
        AbilityCheckRollMode::NormalAbilityCheck
    );
}
