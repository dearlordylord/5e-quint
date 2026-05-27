use std::collections::BTreeSet;

use dnd_cleanroom_engine::character_creation::{
    finalize_rogue_skill_expertise, project_monk_focus_and_uncanny_metabolism,
    project_sorcerer_font_of_magic_and_metamagic, ClassFeatureResourceKind,
    ClassFeatureSourceFactProjection, ClassFeatureUnitRef, ExpertiseSkill, MetamagicEffectKind,
    MetamagicOptionId, MetamagicSelectionRepeatability, MetamagicStackingMode, SorceryPointPoolId,
    SpellUseLimit,
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
