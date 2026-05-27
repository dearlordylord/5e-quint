use std::collections::BTreeSet;

use dnd_cleanroom_engine::character_creation::{
    finalize_fighter_defense_fighting_style, finalize_rogue_skill_expertise,
    project_cleric_protector_order, project_cleric_thaumaturge_order, project_druid_magician_order,
    project_druid_warden_order, project_monk_focus_and_uncanny_metabolism,
    project_sorcerer_font_of_magic_and_metamagic, project_warlock_invocation_lifecycle,
    replace_fighter_defense_with_archery_on_level_gain, ClassFeatureOrderOption,
    ClassFeatureOrderProjection, ClassFeatureResourceKind, ClassFeatureSourceFactProjection,
    ClassFeatureUnitRef, ExpertiseSkill, FighterFightingStyleProjection, FightingStyleFeatUnitRef,
    MetamagicEffectKind, MetamagicOptionId, MetamagicSelectionRepeatability, MetamagicStackingMode,
    OrderAbilityCheckBonusKind, SorceryPointPoolId, SpellUnitRef, SpellUseLimit,
    WarlockInvocationLifecycleCase, WarlockInvocationLifecycleProjection,
    WarlockInvocationSelection,
};

#[test]
fn monk_focus_resource_projects_uncanny_metabolism_source_facts() {
    let projection = project_monk_focus_and_uncanny_metabolism(2);

    assert_eq!(
        projection.resource.resource_unit,
        ClassFeatureUnitRef::MonkMonksFocus
    );
    assert_eq!(
        projection.resource.resource_unit.as_str(),
        "monk_monks_focus"
    );
    assert_eq!(projection.resource.kind, ClassFeatureResourceKind::UseCount);
    assert_eq!(projection.resource.kind.as_str(), "use_count");
    assert_eq!(projection.resource.maximum, 2);
    assert!(projection.resource.short_rest_refills_all);
    assert!(projection.resource.long_rest_refills_all);

    match projection.source_fact {
        ClassFeatureSourceFactProjection::UncannyMetabolism {
            linked_resource_unit,
            martial_arts_die_source_unit,
            martial_arts_die,
            monk_level_bonus,
        } => {
            assert_eq!(projection.source_fact.kind_str(), "uncanny_metabolism");
            assert_eq!(linked_resource_unit, ClassFeatureUnitRef::MonkMonksFocus);
            assert_eq!(linked_resource_unit.as_str(), "monk_monks_focus");
            assert_eq!(
                martial_arts_die_source_unit,
                ClassFeatureUnitRef::MonkMartialArts
            );
            assert_eq!(martial_arts_die_source_unit.as_str(), "monk_martial_arts");
            assert_eq!(martial_arts_die.dice, 1);
            assert_eq!(martial_arts_die.size, 6);
            assert_eq!(monk_level_bonus, 2);
        }
        ClassFeatureSourceFactProjection::SorcererMetamagic { .. } => {
            panic!("expected Uncanny Metabolism source facts");
        }
    }
}

#[test]
fn sorcerer_font_resource_projects_metamagic_source_facts() {
    let projection = project_sorcerer_font_of_magic_and_metamagic(2);

    assert_eq!(
        projection.resource.resource_unit,
        ClassFeatureUnitRef::SorcererFontOfMagic
    );
    assert_eq!(
        projection.resource.resource_unit.as_str(),
        "sorcerer_font_of_magic"
    );
    assert_eq!(
        projection.resource.kind,
        ClassFeatureResourceKind::PointPool
    );
    assert_eq!(projection.resource.kind.as_str(), "point_pool");
    assert_eq!(projection.resource.maximum, 2);
    assert!(!projection.resource.short_rest_refills_all);
    assert!(projection.resource.long_rest_refills_all);

    match projection.source_fact {
        ClassFeatureSourceFactProjection::SorcererMetamagic {
            linked_resource_unit,
            known_option_count,
            spell_use_limit,
            owner_class_level,
            choice_count,
            selection_repeatability,
            sorcery_point_pool_id,
            options,
        } => {
            assert_eq!(projection.source_fact.kind_str(), "sorcerer_metamagic");
            assert_eq!(
                linked_resource_unit,
                ClassFeatureUnitRef::SorcererFontOfMagic
            );
            assert_eq!(linked_resource_unit.as_str(), "sorcerer_font_of_magic");
            assert_eq!(known_option_count, 2);
            assert_eq!(
                spell_use_limit,
                SpellUseLimit::OnePerSpellUnlessOptionAllowsStacking
            );
            assert_eq!(
                spell_use_limit.as_str(),
                "one_per_spell_unless_option_allows_stacking"
            );
            assert_eq!(owner_class_level, 2);
            assert_eq!(choice_count, 2);
            assert_eq!(
                selection_repeatability,
                MetamagicSelectionRepeatability::Unique
            );
            assert_eq!(selection_repeatability.as_str(), "unique");
            assert_eq!(sorcery_point_pool_id, SorceryPointPoolId::SorceryPoints);
            assert_eq!(sorcery_point_pool_id.as_str(), "sorcery_points");

            assert_eq!(
                options[0].option_id,
                MetamagicOptionId::SorcererEmpoweredSpell
            );
            assert_eq!(options[0].option_id.as_str(), "sorcerer_empowered_spell");
            assert_eq!(options[0].sorcery_point_cost, 1);
            assert_eq!(
                options[0].stacking_mode,
                MetamagicStackingMode::CanCombineWithDifferentMetamagic
            );
            assert_eq!(
                options[0].stacking_mode.as_str(),
                "can_combine_with_different_metamagic"
            );
            assert_eq!(
                options[0].effect_kind,
                MetamagicEffectKind::DamageDiceReroll
            );
            assert_eq!(options[0].effect_kind.as_str(), "damage_dice_reroll");

            assert_eq!(
                options[1].option_id,
                MetamagicOptionId::SorcererHeightenedSpell
            );
            assert_eq!(options[1].option_id.as_str(), "sorcerer_heightened_spell");
            assert_eq!(options[1].sorcery_point_cost, 2);
            assert_eq!(options[1].stacking_mode, MetamagicStackingMode::OnePerSpell);
            assert_eq!(options[1].stacking_mode.as_str(), "one_per_spell");
            assert_eq!(
                options[1].effect_kind,
                MetamagicEffectKind::SavingThrowDisadvantage
            );
            assert_eq!(options[1].effect_kind.as_str(), "saving_throw_disadvantage");
        }
        ClassFeatureSourceFactProjection::UncannyMetabolism { .. } => {
            panic!("expected Sorcerer Metamagic source facts");
        }
    }
}

#[test]
fn rogue_level_one_expertise_finalizes_two_owned_skill_choices() {
    let projection = finalize_rogue_skill_expertise(
        1,
        6,
        BTreeSet::from([ExpertiseSkill::SleightOfHand, ExpertiseSkill::Stealth]),
    );

    assert_eq!(
        projection.expertise_unit,
        ClassFeatureUnitRef::RogueExpertise
    );
    assert_eq!(projection.expertise_unit.as_str(), "rogue_expertise");
    assert_eq!(projection.selected_expertise_choice_count(), 2);
    assert_eq!(projection.build_expertise_count(), 2);
    assert_eq!(projection.owned_skill_proficiency_count, 6);
    assert!(!projection.expertise.contains(&ExpertiseSkill::Acrobatics));
    assert!(!projection.expertise.contains(&ExpertiseSkill::Perception));
    assert!(projection
        .expertise
        .contains(&ExpertiseSkill::SleightOfHand));
    assert_eq!(ExpertiseSkill::SleightOfHand.as_str(), "sleight_of_hand");
    assert!(projection.expertise.contains(&ExpertiseSkill::Stealth));
    assert_eq!(ExpertiseSkill::Stealth.as_str(), "stealth");
    assert_eq!(projection.total_level, 1);
}

#[test]
fn rogue_level_six_expertise_finalizes_four_owned_skill_choices() {
    let projection = finalize_rogue_skill_expertise(
        6,
        6,
        BTreeSet::from([
            ExpertiseSkill::Acrobatics,
            ExpertiseSkill::Perception,
            ExpertiseSkill::SleightOfHand,
            ExpertiseSkill::Stealth,
        ]),
    );

    assert_eq!(
        projection.expertise_unit,
        ClassFeatureUnitRef::RogueExpertise
    );
    assert_eq!(projection.expertise_unit.as_str(), "rogue_expertise");
    assert_eq!(projection.selected_expertise_choice_count(), 4);
    assert_eq!(projection.build_expertise_count(), 4);
    assert_eq!(projection.owned_skill_proficiency_count, 6);
    assert!(projection.expertise.contains(&ExpertiseSkill::Acrobatics));
    assert_eq!(ExpertiseSkill::Acrobatics.as_str(), "acrobatics");
    assert!(projection.expertise.contains(&ExpertiseSkill::Perception));
    assert_eq!(ExpertiseSkill::Perception.as_str(), "perception");
    assert!(projection
        .expertise
        .contains(&ExpertiseSkill::SleightOfHand));
    assert!(projection.expertise.contains(&ExpertiseSkill::Stealth));
    assert_eq!(projection.total_level, 6);
}

fn assert_warlock_projection(
    projection: &WarlockInvocationLifecycleProjection,
    expected_invocations: BTreeSet<WarlockInvocationSelection>,
    expected_cantrips: i16,
    expected_prepared_spells: i16,
    expected_slot_count: i16,
    expected_slot_level: i16,
    expected_total_level: u8,
) {
    assert_eq!(
        projection.selected_from_unit,
        ClassFeatureUnitRef::WarlockEldritchInvocations
    );
    assert_eq!(
        projection.selected_from_unit.as_str(),
        "warlock_eldritch_invocations"
    );
    assert!(projection.warlock_invocations_unit_ref_present());
    assert_eq!(projection.selected_invocations, expected_invocations);
    assert_eq!(
        projection.selected_invocation_count(),
        projection.selected_invocations.len()
    );
    assert_eq!(projection.selected_class_choice_feature_ref_count, 0);
    assert_eq!(projection.pact_magic.cantrip_count, expected_cantrips);
    assert_eq!(
        projection.pact_magic.prepared_spell_count,
        expected_prepared_spells
    );
    assert_eq!(projection.pact_magic.slot_count, expected_slot_count);
    assert_eq!(projection.pact_magic.slot_level, expected_slot_level);
    assert_eq!(projection.total_level, expected_total_level);
}

#[test]
fn warlock_level_one_selects_armor_of_shadows_and_projects_pact_magic() {
    let projection = project_warlock_invocation_lifecycle(
        WarlockInvocationLifecycleCase::LevelOneArmorOfShadows,
    );

    assert_warlock_projection(
        &projection,
        BTreeSet::from([WarlockInvocationSelection::ArmorOfShadows]),
        2,
        2,
        1,
        1,
        1,
    );
    assert!(projection.armor_of_shadows_unit_ref_present());
    assert!(!projection.locked_replacement_rejected);
    assert!(!projection.duplicate_non_repeatable_rejected);
    assert!(!projection.duplicate_repeatable_choice_rejected);
}

#[test]
fn warlock_level_two_gains_invocations_and_second_pact_slot() {
    let projection =
        project_warlock_invocation_lifecycle(WarlockInvocationLifecycleCase::LevelTwoGained);

    assert_warlock_projection(
        &projection,
        BTreeSet::from([
            WarlockInvocationSelection::ArmorOfShadows,
            WarlockInvocationSelection::PactBlade,
            WarlockInvocationSelection::DevilsSight,
        ]),
        2,
        3,
        2,
        1,
        2,
    );
    assert!(projection
        .selected_invocations
        .contains(&WarlockInvocationSelection::PactBlade));
    assert_eq!(WarlockInvocationSelection::PactBlade.as_str(), "pact_blade");
    assert!(projection
        .selected_invocations
        .contains(&WarlockInvocationSelection::DevilsSight));
    assert_eq!(
        WarlockInvocationSelection::DevilsSight.as_str(),
        "devils_sight"
    );
}

#[test]
fn warlock_level_gain_replaces_non_repeatable_invocation() {
    let projection = project_warlock_invocation_lifecycle(
        WarlockInvocationLifecycleCase::ReplaceArmorWithEldritchMindOnWarlockLevelGain,
    );

    assert_warlock_projection(
        &projection,
        BTreeSet::from([
            WarlockInvocationSelection::PactBlade,
            WarlockInvocationSelection::DevilsSight,
            WarlockInvocationSelection::EldritchMind,
        ]),
        2,
        4,
        2,
        2,
        3,
    );
    assert!(!projection.armor_of_shadows_unit_ref_present());
    assert!(projection
        .selected_invocations
        .contains(&WarlockInvocationSelection::EldritchMind));
    assert_eq!(
        WarlockInvocationSelection::EldritchMind.as_str(),
        "eldritch_mind"
    );
}

#[test]
fn warlock_level_gain_replaces_repeatable_invocation_choice() {
    let projection = project_warlock_invocation_lifecycle(
        WarlockInvocationLifecycleCase::ReplaceRepeatableInvocationByChoice,
    );

    assert_warlock_projection(
        &projection,
        BTreeSet::from([
            WarlockInvocationSelection::ArmorOfShadows,
            WarlockInvocationSelection::DevilsSight,
            WarlockInvocationSelection::RepellingBlastEldritchBlast,
        ]),
        2,
        4,
        2,
        2,
        3,
    );
    assert!(projection
        .selected_invocations
        .contains(&WarlockInvocationSelection::RepellingBlastEldritchBlast));
    assert_eq!(
        WarlockInvocationSelection::RepellingBlastEldritchBlast.as_str(),
        "repelling_blast_eldritch_blast"
    );
    assert!(!projection
        .selected_invocations
        .contains(&WarlockInvocationSelection::RepellingBlastPoisonSpray));
}

#[test]
fn warlock_rejects_replacing_invocation_retained_as_prerequisite() {
    let projection = project_warlock_invocation_lifecycle(
        WarlockInvocationLifecycleCase::RejectPrerequisiteRetainedInvocationReplacement,
    );

    assert_warlock_projection(
        &projection,
        BTreeSet::from([
            WarlockInvocationSelection::ArmorOfShadows,
            WarlockInvocationSelection::PactBlade,
            WarlockInvocationSelection::DevilsSight,
            WarlockInvocationSelection::EldritchMind,
            WarlockInvocationSelection::ThirstingBlade,
        ]),
        3,
        6,
        2,
        3,
        5,
    );
    assert!(projection.locked_replacement_rejected);
    assert!(projection
        .selected_invocations
        .contains(&WarlockInvocationSelection::ThirstingBlade));
    assert_eq!(
        WarlockInvocationSelection::ThirstingBlade.as_str(),
        "thirsting_blade"
    );
}

#[test]
fn warlock_rejects_duplicate_non_repeatable_and_repeatable_same_choice() {
    let projection = project_warlock_invocation_lifecycle(
        WarlockInvocationLifecycleCase::RejectDuplicateInvocationSelections,
    );

    assert_warlock_projection(
        &projection,
        BTreeSet::from([WarlockInvocationSelection::ArmorOfShadows]),
        2,
        2,
        1,
        1,
        1,
    );
    assert!(projection.duplicate_non_repeatable_rejected);
    assert!(projection.duplicate_repeatable_choice_rejected);
    assert!(!projection.locked_replacement_rejected);
    assert_eq!(
        WarlockInvocationSelection::ArmorOfShadows.as_str(),
        "armor_of_shadows"
    );
}

fn assert_fighter_fighting_style_projection(
    projection: FighterFightingStyleProjection,
    expected_feat: FightingStyleFeatUnitRef,
    expected_total_level: u8,
) {
    assert_eq!(
        projection.selected_from_unit,
        ClassFeatureUnitRef::FighterFightingStyle
    );
    assert_eq!(
        projection.selected_from_unit.as_str(),
        "fighter_fighting_style"
    );
    assert_eq!(projection.selected_feat, expected_feat);
    assert_eq!(projection.selected_feat.as_str(), expected_feat.as_str());
    assert_eq!(projection.selected_fighting_style_feature_ref_count, 1);
    assert!(projection.fighter_fighting_style_unit_ref_present());
    assert_eq!(projection.total_level, expected_total_level);
}

#[test]
fn fighter_fighting_style_finalizes_defense_feat_choice() {
    let projection = finalize_fighter_defense_fighting_style();

    assert_fighter_fighting_style_projection(projection, FightingStyleFeatUnitRef::Defense, 1);
    assert!(projection.defense_unit_ref_present());
    assert_eq!(projection.selected_feat.as_str(), "defense");
    assert!(!projection.archery_unit_ref_present());
}

#[test]
fn fighter_level_gain_replaces_defense_with_archery_feat_choice() {
    let projection = replace_fighter_defense_with_archery_on_level_gain();

    assert_fighter_fighting_style_projection(projection, FightingStyleFeatUnitRef::Archery, 2);
    assert!(projection.archery_unit_ref_present());
    assert_eq!(projection.selected_feat.as_str(), "feat_archery");
    assert!(!projection.defense_unit_ref_present());
}

fn assert_order_projection(
    projection: ClassFeatureOrderProjection,
    expected_order_unit: ClassFeatureUnitRef,
    expected_option: ClassFeatureOrderOption,
    expected_extra_cantrip: Option<SpellUnitRef>,
    expected_bonus: OrderAbilityCheckBonusKind,
) {
    assert_eq!(projection.selected_order_unit, expected_order_unit);
    assert_eq!(
        projection.selected_order_unit.as_str(),
        expected_order_unit.as_str()
    );
    assert_eq!(projection.selected_order_option, expected_option);
    assert_eq!(
        projection.selected_order_option.as_str(),
        expected_option.as_str()
    );
    assert_eq!(projection.extra_cantrip, expected_extra_cantrip);
    assert_eq!(projection.selected_order_option_count, 1);
    assert_eq!(projection.selected_suborder_class_choice_feature_count, 0);
    assert!(projection.order_unit_ref_present());
    assert_eq!(
        projection.extra_cantrip_unit_ref_present(),
        expected_extra_cantrip.is_some()
    );
    assert_eq!(projection.ability_check_bonus_kind, expected_bonus);
    assert_eq!(
        projection.ability_check_bonus_kind.as_str(),
        expected_bonus.as_str()
    );
    assert_eq!(projection.total_level, 1);
}

#[test]
fn cleric_protector_order_projects_martial_and_armor_training() {
    let projection = project_cleric_protector_order();

    assert_order_projection(
        projection,
        ClassFeatureUnitRef::ClericDivineOrder,
        ClassFeatureOrderOption::Protector,
        None,
        OrderAbilityCheckBonusKind::None,
    );
    assert!(projection.martial_weapon_proficiency_present);
    assert!(projection.heavy_armor_training_present);
    assert!(projection.medium_armor_training_present);
    assert_eq!(projection.ability_check_bonus_feature_count, 0);
}

#[test]
fn cleric_thaumaturge_order_projects_extra_cantrip_and_arcana_religion_bonus() {
    let projection = project_cleric_thaumaturge_order();

    assert_order_projection(
        projection,
        ClassFeatureUnitRef::ClericDivineOrder,
        ClassFeatureOrderOption::Thaumaturge,
        Some(SpellUnitRef::Light),
        OrderAbilityCheckBonusKind::IntArcanaReligionWisMin1,
    );
    assert_eq!(
        projection.extra_cantrip.map(|spell| spell.as_str()),
        Some("light")
    );
    assert!(!projection.martial_weapon_proficiency_present);
    assert!(!projection.heavy_armor_training_present);
    assert!(projection.medium_armor_training_present);
    assert_eq!(projection.ability_check_bonus_feature_count, 1);
}

#[test]
fn druid_magician_order_projects_extra_cantrip_and_arcana_nature_bonus() {
    let projection = project_druid_magician_order();

    assert_order_projection(
        projection,
        ClassFeatureUnitRef::DruidPrimalOrder,
        ClassFeatureOrderOption::Magician,
        Some(SpellUnitRef::Guidance),
        OrderAbilityCheckBonusKind::IntArcanaNatureWisMin1,
    );
    assert_eq!(
        projection.extra_cantrip.map(|spell| spell.as_str()),
        Some("guidance")
    );
    assert!(!projection.martial_weapon_proficiency_present);
    assert!(!projection.heavy_armor_training_present);
    assert!(!projection.medium_armor_training_present);
    assert_eq!(projection.ability_check_bonus_feature_count, 1);
}

#[test]
fn druid_warden_order_projects_martial_and_medium_armor_training() {
    let projection = project_druid_warden_order();

    assert_order_projection(
        projection,
        ClassFeatureUnitRef::DruidPrimalOrder,
        ClassFeatureOrderOption::Warden,
        None,
        OrderAbilityCheckBonusKind::None,
    );
    assert!(projection.martial_weapon_proficiency_present);
    assert!(!projection.heavy_armor_training_present);
    assert!(projection.medium_armor_training_present);
    assert_eq!(projection.ability_check_bonus_feature_count, 0);
}
