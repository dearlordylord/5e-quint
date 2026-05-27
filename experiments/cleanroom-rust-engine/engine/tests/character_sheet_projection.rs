use dnd_cleanroom_engine::character_creation::{
    project_sheet_weapon_mastery_reselection_on_long_rest, project_sheet_weapon_mastery_selection,
    project_spellbook_ritual_invocation, ClassFeatureUnitRef, ClassUnitRef, PreparationRequirement,
    RequiredSpellAccess, SheetWeaponMasteryClass, SheetWeaponMasteryProjection, SpellSlotCostKind,
    SpellUnitRef, SpellbookRitualAccessFacts, WeaponUnitRef,
};

fn assert_weapon_mastery_projection(
    projection: SheetWeaponMasteryProjection,
    expected_feature: ClassFeatureUnitRef,
    expected_class: ClassUnitRef,
    expected_weapons: [WeaponUnitRef; 2],
    expected_changed_choice_count: usize,
) {
    assert_eq!(projection.feature_unit, expected_feature);
    assert_eq!(projection.feature_unit.as_str(), expected_feature.as_str());
    assert_eq!(projection.class_unit, expected_class);
    assert_eq!(projection.class_unit.as_str(), expected_class.as_str());
    assert_eq!(projection.selected_weapons, expected_weapons);
    assert_eq!(
        projection
            .selected_weapons
            .map(|weapon_unit| weapon_unit.as_str()),
        expected_weapons.map(|weapon_unit| weapon_unit.as_str())
    );
    assert_eq!(projection.choice_count, 2);
    assert_eq!(projection.long_rest_change_count, 2);
    assert_eq!(projection.selected_weapons.len(), 2);
    assert_eq!(
        projection.changed_choice_count,
        expected_changed_choice_count
    );
    assert!(projection.first_weapon_eligible);
    assert!(projection.second_weapon_eligible);
}

#[test]
fn paladin_weapon_mastery_selection_projects_two_selected_refs() {
    assert_weapon_mastery_projection(
        project_sheet_weapon_mastery_selection(
            SheetWeaponMasteryClass::Paladin,
            [WeaponUnitRef::Longsword, WeaponUnitRef::Dagger],
        ),
        ClassFeatureUnitRef::PaladinWeaponMastery,
        ClassUnitRef::Paladin,
        [WeaponUnitRef::Longsword, WeaponUnitRef::Dagger],
        0,
    );
}

#[test]
fn paladin_weapon_mastery_long_rest_reselection_counts_changed_choices() {
    assert_weapon_mastery_projection(
        project_sheet_weapon_mastery_reselection_on_long_rest(
            SheetWeaponMasteryClass::Paladin,
            [WeaponUnitRef::Longsword, WeaponUnitRef::Dagger],
            [WeaponUnitRef::Spear, WeaponUnitRef::Flail],
        ),
        ClassFeatureUnitRef::PaladinWeaponMastery,
        ClassUnitRef::Paladin,
        [WeaponUnitRef::Spear, WeaponUnitRef::Flail],
        2,
    );
}

#[test]
fn ranger_weapon_mastery_selection_projects_two_selected_refs() {
    assert_weapon_mastery_projection(
        project_sheet_weapon_mastery_selection(
            SheetWeaponMasteryClass::Ranger,
            [WeaponUnitRef::Longsword, WeaponUnitRef::Dagger],
        ),
        ClassFeatureUnitRef::RangerWeaponMastery,
        ClassUnitRef::Ranger,
        [WeaponUnitRef::Longsword, WeaponUnitRef::Dagger],
        0,
    );
}

#[test]
fn ranger_weapon_mastery_long_rest_reselection_counts_changed_choices() {
    assert_weapon_mastery_projection(
        project_sheet_weapon_mastery_reselection_on_long_rest(
            SheetWeaponMasteryClass::Ranger,
            [WeaponUnitRef::Longsword, WeaponUnitRef::Dagger],
            [WeaponUnitRef::Spear, WeaponUnitRef::Flail],
        ),
        ClassFeatureUnitRef::RangerWeaponMastery,
        ClassUnitRef::Ranger,
        [WeaponUnitRef::Spear, WeaponUnitRef::Flail],
        2,
    );
}

#[test]
fn rogue_weapon_mastery_selection_projects_two_selected_refs() {
    assert_weapon_mastery_projection(
        project_sheet_weapon_mastery_selection(
            SheetWeaponMasteryClass::Rogue,
            [WeaponUnitRef::Dagger, WeaponUnitRef::Shortbow],
        ),
        ClassFeatureUnitRef::RogueWeaponMastery,
        ClassUnitRef::Rogue,
        [WeaponUnitRef::Dagger, WeaponUnitRef::Shortbow],
        0,
    );
}

#[test]
fn rogue_weapon_mastery_long_rest_reselection_counts_changed_choices() {
    assert_weapon_mastery_projection(
        project_sheet_weapon_mastery_reselection_on_long_rest(
            SheetWeaponMasteryClass::Rogue,
            [WeaponUnitRef::Dagger, WeaponUnitRef::Shortbow],
            [WeaponUnitRef::Spear, WeaponUnitRef::Shortsword],
        ),
        ClassFeatureUnitRef::RogueWeaponMastery,
        ClassUnitRef::Rogue,
        [WeaponUnitRef::Spear, WeaponUnitRef::Shortsword],
        2,
    );
}

#[test]
fn spellbook_ritual_invocation_accepts_spellbook_ritual_without_preparation_or_slot() {
    let projection = project_spellbook_ritual_invocation(SpellbookRitualAccessFacts {
        spell: SpellUnitRef::DetectMagic,
        spellcasting_source: ClassUnitRef::Wizard,
        spellbook_contains_ritual: true,
        prepared_contains_ritual: false,
    });

    assert_eq!(
        projection.feature_unit,
        ClassFeatureUnitRef::WizardRitualAdept
    );
    assert_eq!(projection.feature_unit.as_str(), "wizard_ritual_adept");
    assert_eq!(projection.spell, SpellUnitRef::DetectMagic);
    assert_eq!(projection.spell.as_str(), "detect_magic");
    assert_eq!(projection.spellcasting_source, ClassUnitRef::Wizard);
    assert_eq!(projection.spellcasting_source.as_str(), "class_wizard");
    assert!(projection.spellbook_contains_ritual);
    assert!(!projection.prepared_contains_ritual);
    assert!(projection.invocation_accepted);
    assert_eq!(projection.spell_slot_cost_kind, SpellSlotCostKind::None);
    assert_eq!(projection.spell_slot_cost_kind.as_str(), "none");
    assert_eq!(
        projection.preparation_requirement,
        PreparationRequirement::NotRequired
    );
    assert_eq!(projection.preparation_requirement.as_str(), "not_required");
    assert_eq!(
        projection.required_spell_access,
        RequiredSpellAccess::Spellbook
    );
    assert_eq!(projection.required_spell_access.as_str(), "spellbook");
    assert!(projection.requires_reading_spellbook);
    assert_eq!(projection.first_level_spell_slots_expended, 0);
}

#[test]
fn spellbook_ritual_invocation_rejects_prepared_only_ritual_path() {
    let projection = project_spellbook_ritual_invocation(SpellbookRitualAccessFacts {
        spell: SpellUnitRef::DetectMagic,
        spellcasting_source: ClassUnitRef::Wizard,
        spellbook_contains_ritual: false,
        prepared_contains_ritual: true,
    });

    assert_eq!(
        projection.feature_unit,
        ClassFeatureUnitRef::WizardRitualAdept
    );
    assert_eq!(projection.spell, SpellUnitRef::DetectMagic);
    assert_eq!(projection.spellcasting_source, ClassUnitRef::Wizard);
    assert!(!projection.spellbook_contains_ritual);
    assert!(projection.prepared_contains_ritual);
    assert!(!projection.invocation_accepted);
    assert_eq!(projection.spell_slot_cost_kind, SpellSlotCostKind::None);
    assert_eq!(
        projection.preparation_requirement,
        PreparationRequirement::None
    );
    assert_eq!(projection.preparation_requirement.as_str(), "none");
    assert_eq!(projection.required_spell_access, RequiredSpellAccess::None);
    assert_eq!(projection.required_spell_access.as_str(), "none");
    assert!(!projection.requires_reading_spellbook);
    assert_eq!(projection.first_level_spell_slots_expended, 0);
}
