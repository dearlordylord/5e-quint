use dnd_cleanroom_engine::character_creation::{
    project_ability_check_proficiency_bonus, AbilityCheckProficiencyBonusInput,
    AbilityCheckProficiencyBonusSourceUnit, AbilityCheckProficiencyBonusTag, AbilityCheckSkill,
    AbilityCheckSkillTraining,
};

#[test]
fn jack_of_all_trades_projects_half_proficiency_bonus_at_bard_level_two() {
    let projection = project_ability_check_proficiency_bonus(AbilityCheckProficiencyBonusInput {
        skill: AbilityCheckSkill::Performance,
        proficiency_bonus: 2,
        training: AbilityCheckSkillTraining::LacksSkillProficiency {
            jack_of_all_trades_bard_level: Some(2),
            other_proficiency_bonus_applies: false,
        },
    });

    assert_eq!(
        projection.tag,
        AbilityCheckProficiencyBonusTag::JackOfAllTrades
    );
    assert_eq!(projection.tag.as_str(), "jackOfAllTrades");
    assert_eq!(
        projection.source_unit,
        Some(AbilityCheckProficiencyBonusSourceUnit::BardJackOfAllTrades)
    );
    assert_eq!(
        projection.source_unit.map(|unit| unit.as_str()),
        Some("bard_jack_of_all_trades")
    );
    assert_eq!(projection.skill, AbilityCheckSkill::Performance);
    assert_eq!(projection.skill.as_str(), "performance");
    assert_eq!(projection.bonus, 1);
}

#[test]
fn jack_of_all_trades_rounds_half_proficiency_bonus_down() {
    let projection = project_ability_check_proficiency_bonus(AbilityCheckProficiencyBonusInput {
        skill: AbilityCheckSkill::Performance,
        proficiency_bonus: 3,
        training: AbilityCheckSkillTraining::LacksSkillProficiency {
            jack_of_all_trades_bard_level: Some(5),
            other_proficiency_bonus_applies: false,
        },
    });

    assert_eq!(
        projection.tag,
        AbilityCheckProficiencyBonusTag::JackOfAllTrades
    );
    assert_eq!(projection.bonus, 1);
}

#[test]
fn skill_proficiency_projects_full_proficiency_bonus() {
    let projection = project_ability_check_proficiency_bonus(AbilityCheckProficiencyBonusInput {
        skill: AbilityCheckSkill::Performance,
        proficiency_bonus: 3,
        training: AbilityCheckSkillTraining::SkillProficiency,
    });

    assert_eq!(
        projection.tag,
        AbilityCheckProficiencyBonusTag::SkillProficiency
    );
    assert_eq!(projection.tag.as_str(), "skillProficiency");
    assert_eq!(projection.source_unit, None);
    assert_eq!(projection.bonus, 3);
}

#[test]
fn expertise_projects_doubled_proficiency_bonus() {
    let projection = project_ability_check_proficiency_bonus(AbilityCheckProficiencyBonusInput {
        skill: AbilityCheckSkill::Performance,
        proficiency_bonus: 3,
        training: AbilityCheckSkillTraining::Expertise,
    });

    assert_eq!(projection.tag, AbilityCheckProficiencyBonusTag::Expertise);
    assert_eq!(projection.tag.as_str(), "expertise");
    assert_eq!(projection.source_unit, None);
    assert_eq!(projection.bonus, 6);
}

#[test]
fn jack_of_all_trades_does_not_project_when_another_proficiency_bonus_applies() {
    let projection = project_ability_check_proficiency_bonus(AbilityCheckProficiencyBonusInput {
        skill: AbilityCheckSkill::Performance,
        proficiency_bonus: 2,
        training: AbilityCheckSkillTraining::LacksSkillProficiency {
            jack_of_all_trades_bard_level: Some(2),
            other_proficiency_bonus_applies: true,
        },
    });

    assert_eq!(projection.tag, AbilityCheckProficiencyBonusTag::None);
    assert_eq!(projection.tag.as_str(), "none");
    assert_eq!(projection.source_unit, None);
    assert_eq!(projection.bonus, 0);
}

#[test]
fn jack_of_all_trades_does_not_project_before_bard_level_two() {
    let projection = project_ability_check_proficiency_bonus(AbilityCheckProficiencyBonusInput {
        skill: AbilityCheckSkill::Performance,
        proficiency_bonus: 2,
        training: AbilityCheckSkillTraining::LacksSkillProficiency {
            jack_of_all_trades_bard_level: Some(1),
            other_proficiency_bonus_applies: false,
        },
    });

    assert_eq!(projection.tag, AbilityCheckProficiencyBonusTag::None);
    assert_eq!(projection.source_unit, None);
    assert_eq!(projection.bonus, 0);
}
