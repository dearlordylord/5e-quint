use dnd_cleanroom_engine::character_creation::{
    project_armor_class_base_formula, ArmorClassBaseSource, ArmorClassFormulaInput,
    ArmorClassSourceUnit,
};

#[test]
fn default_unarmored_armor_class_uses_base_ten_plus_dexterity() {
    let projection = project_armor_class_base_formula(ArmorClassFormulaInput::DefaultUnarmored {
        dexterity_modifier: 2,
        shield_bonus: 0,
    });

    assert_eq!(projection.source_unit, None);
    assert_eq!(
        projection.base_source,
        ArmorClassBaseSource::DefaultUnarmored
    );
    assert_eq!(projection.base_source.as_str(), "default_unarmored");
    assert_eq!(projection.base_armor_class, 10);
    assert!(projection.uses_dexterity);
    assert!(!projection.uses_constitution);
    assert!(!projection.uses_wisdom);
    assert_eq!(projection.shield_bonus, 0);
    assert_eq!(projection.armor_class, 12);
}

#[test]
fn barbarian_unarmored_defense_uses_dexterity_and_constitution() {
    let projection =
        project_armor_class_base_formula(ArmorClassFormulaInput::BarbarianUnarmoredDefense {
            dexterity_modifier: 2,
            constitution_modifier: 1,
            shield_bonus: 0,
        });

    assert_eq!(
        projection.source_unit,
        Some(ArmorClassSourceUnit::BarbarianUnarmoredDefense)
    );
    assert_eq!(
        projection.source_unit.map(|unit| unit.as_str()),
        Some("barbarian_unarmored_defense")
    );
    assert_eq!(
        projection.base_source,
        ArmorClassBaseSource::UnarmoredDefense
    );
    assert_eq!(projection.base_source.as_str(), "unarmored_defense");
    assert_eq!(projection.base_armor_class, 10);
    assert!(projection.uses_dexterity);
    assert!(projection.uses_constitution);
    assert!(!projection.uses_wisdom);
    assert_eq!(projection.shield_bonus, 0);
    assert_eq!(projection.armor_class, 13);
}

#[test]
fn barbarian_unarmored_defense_allows_shield_bonus() {
    let projection =
        project_armor_class_base_formula(ArmorClassFormulaInput::BarbarianUnarmoredDefense {
            dexterity_modifier: 2,
            constitution_modifier: 1,
            shield_bonus: 2,
        });

    assert_eq!(
        projection.source_unit,
        Some(ArmorClassSourceUnit::BarbarianUnarmoredDefense)
    );
    assert_eq!(
        projection.base_source,
        ArmorClassBaseSource::UnarmoredDefense
    );
    assert_eq!(projection.shield_bonus, 2);
    assert_eq!(projection.armor_class, 15);
}

#[test]
fn monk_unarmored_defense_uses_dexterity_and_wisdom_without_shield() {
    let projection =
        project_armor_class_base_formula(ArmorClassFormulaInput::MonkUnarmoredDefense {
            dexterity_modifier: 2,
            wisdom_modifier: 3,
        });

    assert_eq!(
        projection.source_unit,
        Some(ArmorClassSourceUnit::MonkUnarmoredDefense)
    );
    assert_eq!(
        projection.source_unit.map(|unit| unit.as_str()),
        Some("monk_unarmored_defense")
    );
    assert_eq!(
        projection.base_source,
        ArmorClassBaseSource::UnarmoredDefense
    );
    assert_eq!(projection.base_source.as_str(), "unarmored_defense");
    assert_eq!(projection.base_armor_class, 10);
    assert!(projection.uses_dexterity);
    assert!(!projection.uses_constitution);
    assert!(projection.uses_wisdom);
    assert_eq!(projection.shield_bonus, 0);
    assert_eq!(projection.armor_class, 15);
}
