use dnd_cleanroom_engine::character_creation::{
    admit_sheet_slot_facts, apply_arcane_recovery_level2, apply_lay_on_hands,
    apply_magical_cunning, complete_long_rest_feature_resources, complete_long_rest_slot_benefits,
    complete_short_rest_slot_benefits, complete_short_rest_with_arcane_recovery_level2,
    convert_font_of_magic_slot_to_sorcery_points, create_font_of_magic_level3_slot,
    interrupted_long_rest_slot_benefits, interrupted_short_rest_slot_benefits,
    project_metamagic_shared_point_pool, short_rest_feature_resources, use_uncanny_metabolism,
    FeatureResourceTransitionIssue, FeatureResourceTransitionResult, FontOfMagicSlotSource,
    OrdinarySpellSlotFacts, PactSlotFacts, SheetFeatureResourceFacts, SheetSlotExpectedCapacities,
    SheetSlotFacts, SheetSlotTransitionIssue, SheetSlotTransitionResult,
};

fn empty_slot_facts() -> SheetSlotFacts {
    SheetSlotFacts::empty()
}

fn wizard_warlock_spent() -> SheetSlotFacts {
    SheetSlotFacts {
        ordinary: OrdinarySpellSlotFacts {
            level1_capacity: 2,
            level1_expended: 1,
            level2_capacity: 0,
            level2_expended: 0,
            created_level1_capacity: 0,
            created_level1_expended: 0,
        },
        pact: PactSlotFacts {
            slot_level: 1,
            capacity: 1,
            expended: 1,
        },
        arcane_recovery_used_since_long_rest: false,
        magical_cunning_used_since_long_rest: false,
    }
}

fn wizard_arcane_recovery_spent() -> SheetSlotFacts {
    SheetSlotFacts {
        ordinary: OrdinarySpellSlotFacts {
            level1_capacity: 4,
            level1_expended: 2,
            level2_capacity: 3,
            level2_expended: 1,
            created_level1_capacity: 0,
            created_level1_expended: 0,
        },
        pact: PactSlotFacts {
            slot_level: 1,
            capacity: 1,
            expended: 1,
        },
        arcane_recovery_used_since_long_rest: false,
        magical_cunning_used_since_long_rest: false,
    }
}

fn sorcerer_warlock_long_rest_spent() -> SheetSlotFacts {
    SheetSlotFacts {
        ordinary: OrdinarySpellSlotFacts {
            level1_capacity: 3,
            level1_expended: 2,
            level2_capacity: 0,
            level2_expended: 0,
            created_level1_capacity: 1,
            created_level1_expended: 0,
        },
        pact: PactSlotFacts {
            slot_level: 1,
            capacity: 2,
            expended: 1,
        },
        arcane_recovery_used_since_long_rest: false,
        magical_cunning_used_since_long_rest: false,
    }
}

fn assert_rejected(
    result: SheetSlotTransitionResult,
    expected_sheet: SheetSlotFacts,
    expected_issue: SheetSlotTransitionIssue,
) {
    match result {
        SheetSlotTransitionResult::Rejected { sheet, issue } => {
            assert_eq!(sheet, expected_sheet);
            assert_eq!(issue, expected_issue);
            assert_eq!(issue.message(), expected_issue.message());
        }
        SheetSlotTransitionResult::Accepted { sheet } => {
            panic!("expected rejection, accepted {sheet:?}");
        }
    }
}

fn assert_accepted(result: SheetSlotTransitionResult, expected_sheet: SheetSlotFacts) {
    match result {
        SheetSlotTransitionResult::Accepted { sheet } => assert_eq!(sheet, expected_sheet),
        SheetSlotTransitionResult::Rejected { sheet, issue } => {
            panic!(
                "expected acceptance, rejected {sheet:?}: {}",
                issue.message()
            );
        }
    }
}

fn empty_feature_resource_facts() -> SheetFeatureResourceFacts {
    SheetFeatureResourceFacts::empty()
}

fn assert_feature_rejected(
    result: FeatureResourceTransitionResult,
    expected_sheet: SheetFeatureResourceFacts,
    expected_issue: FeatureResourceTransitionIssue,
) {
    match result {
        FeatureResourceTransitionResult::Rejected { sheet, issue } => {
            assert_eq!(sheet, expected_sheet);
            assert_eq!(issue, expected_issue);
            assert_eq!(issue.message(), expected_issue.message());
        }
        FeatureResourceTransitionResult::Accepted { sheet } => {
            panic!("expected feature-resource rejection, accepted {sheet:?}");
        }
    }
}

fn assert_feature_accepted(
    result: FeatureResourceTransitionResult,
    expected_sheet: SheetFeatureResourceFacts,
) {
    match result {
        FeatureResourceTransitionResult::Accepted { sheet } => assert_eq!(sheet, expected_sheet),
        FeatureResourceTransitionResult::Rejected { sheet, issue } => {
            panic!(
                "expected feature-resource acceptance, rejected {sheet:?}: {}",
                issue.message()
            );
        }
    }
}

#[test]
fn rejects_mismatched_ordinary_spell_slot_capacity_for_level_one() {
    let sheet = SheetSlotFacts {
        ordinary: OrdinarySpellSlotFacts {
            level1_capacity: 3,
            ..OrdinarySpellSlotFacts::none()
        },
        ..empty_slot_facts()
    };

    let result = admit_sheet_slot_facts(
        sheet,
        SheetSlotExpectedCapacities {
            ordinary_level1_capacity: 0,
            pact_slot_level: 0,
            pact_capacity: 0,
        },
    );

    assert_rejected(
        result,
        sheet,
        SheetSlotTransitionIssue::OrdinarySpellSlotCapacityMismatchForLevel1,
    );
    assert_eq!(
        SheetSlotTransitionIssue::OrdinarySpellSlotCapacityMismatchForLevel1.message(),
        "Spell Slot state does not match build capacity for level 1."
    );
}

#[test]
fn rejects_pact_slot_expenditure_over_capacity() {
    let sheet = SheetSlotFacts {
        pact: PactSlotFacts {
            slot_level: 1,
            capacity: 2,
            expended: 3,
        },
        ..empty_slot_facts()
    };

    let result = admit_sheet_slot_facts(
        sheet,
        SheetSlotExpectedCapacities {
            ordinary_level1_capacity: 0,
            pact_slot_level: 1,
            pact_capacity: 2,
        },
    );

    assert_rejected(
        result,
        sheet,
        SheetSlotTransitionIssue::PactSlotStateDoesNotMatchPactMagicBuildCapacity,
    );
    assert_eq!(
        SheetSlotTransitionIssue::PactSlotStateDoesNotMatchPactMagicBuildCapacity.message(),
        "Pact Slot state must match Pact Magic build capacity."
    );
}

#[test]
fn short_rest_restores_pact_slots_without_restoring_ordinary_spell_slots() {
    let sheet = complete_short_rest_slot_benefits(wizard_warlock_spent());

    assert_eq!(sheet.ordinary.level1_expended, 1);
    assert_eq!(sheet.pact.expended, 0);
    assert!(!sheet.arcane_recovery_used_since_long_rest);
    assert!(!sheet.magical_cunning_used_since_long_rest);
}

#[test]
fn short_rest_with_arcane_recovery_refunds_level_two_ordinary_spell_slot() {
    let expected = SheetSlotFacts {
        ordinary: OrdinarySpellSlotFacts {
            level2_expended: 0,
            ..wizard_arcane_recovery_spent().ordinary
        },
        pact: PactSlotFacts {
            expended: 0,
            ..wizard_arcane_recovery_spent().pact
        },
        arcane_recovery_used_since_long_rest: true,
        ..wizard_arcane_recovery_spent()
    };

    assert_accepted(
        complete_short_rest_with_arcane_recovery_level2(wizard_arcane_recovery_spent()),
        expected,
    );
}

#[test]
fn complete_long_rest_restores_ordinary_pact_and_clears_created_slots() {
    let sheet = complete_long_rest_slot_benefits(sorcerer_warlock_long_rest_spent());

    assert_eq!(sheet.ordinary.level1_capacity, 3);
    assert_eq!(sheet.ordinary.level1_expended, 0);
    assert_eq!(sheet.ordinary.created_level1_capacity, 0);
    assert_eq!(sheet.ordinary.created_level1_expended, 0);
    assert_eq!(sheet.pact.slot_level, 1);
    assert_eq!(sheet.pact.capacity, 2);
    assert_eq!(sheet.pact.expended, 0);
    assert!(!sheet.arcane_recovery_used_since_long_rest);
    assert!(!sheet.magical_cunning_used_since_long_rest);
}

#[test]
fn interrupted_short_rest_confers_no_slot_benefit() {
    assert_eq!(
        interrupted_short_rest_slot_benefits(wizard_warlock_spent()),
        wizard_warlock_spent()
    );
}

#[test]
fn interrupted_long_rest_before_one_hour_confers_no_slot_benefit() {
    assert_eq!(
        interrupted_long_rest_slot_benefits(wizard_warlock_spent(), false),
        wizard_warlock_spent()
    );
}

#[test]
fn interrupted_long_rest_after_one_hour_confers_short_rest_slot_benefits() {
    let sheet = interrupted_long_rest_slot_benefits(wizard_warlock_spent(), true);

    assert_eq!(sheet.ordinary.level1_expended, 1);
    assert_eq!(sheet.pact.expended, 0);
}

#[test]
fn magical_cunning_recovers_half_of_pact_slots_rounded_up() {
    let sheet = SheetSlotFacts {
        pact: PactSlotFacts {
            slot_level: 1,
            capacity: 2,
            expended: 2,
        },
        ..empty_slot_facts()
    };
    let expected = SheetSlotFacts {
        pact: PactSlotFacts {
            slot_level: 1,
            capacity: 2,
            expended: 1,
        },
        magical_cunning_used_since_long_rest: true,
        ..empty_slot_facts()
    };

    assert_accepted(apply_magical_cunning(sheet), expected);
}

#[test]
fn magical_cunning_rejects_when_no_pact_slots_are_expended() {
    let sheet = SheetSlotFacts {
        pact: PactSlotFacts {
            slot_level: 1,
            capacity: 1,
            expended: 0,
        },
        ..empty_slot_facts()
    };

    assert_rejected(
        apply_magical_cunning(sheet),
        sheet,
        SheetSlotTransitionIssue::MagicalCunningMustRecoverExpendedPactSlots,
    );
    assert_eq!(
        SheetSlotTransitionIssue::MagicalCunningMustRecoverExpendedPactSlots.message(),
        "Magical Cunning must recover expended Pact Slots."
    );
}

#[test]
fn arcane_recovery_rejects_when_no_ordinary_spell_slot_can_be_refunded() {
    let sheet = SheetSlotFacts {
        ordinary: OrdinarySpellSlotFacts {
            level1_expended: 0,
            level2_expended: 0,
            ..wizard_arcane_recovery_spent().ordinary
        },
        ..wizard_arcane_recovery_spent()
    };

    assert_rejected(
        apply_arcane_recovery_level2(sheet),
        sheet,
        SheetSlotTransitionIssue::ArcaneRecoveryCannotRefundMoreSpellSlotsThanExpended,
    );
    assert_eq!(
        SheetSlotTransitionIssue::ArcaneRecoveryCannotRefundMoreSpellSlotsThanExpended.message(),
        "Arcane Recovery cannot refund more Spell Slots than are expended."
    );
}

#[test]
fn lay_on_hands_restores_hit_points_removes_poisoned_and_spends_pool() {
    let sheet = SheetFeatureResourceFacts {
        source_current_hp: 12,
        target_current_hp: 3,
        target_poisoned: true,
        lay_on_hands_capacity: 10,
        ..empty_feature_resource_facts()
    };
    let expected = SheetFeatureResourceFacts {
        source_current_hp: 12,
        target_current_hp: 5,
        target_poisoned: false,
        lay_on_hands_capacity: 10,
        lay_on_hands_expended: 7,
        ..empty_feature_resource_facts()
    };

    assert_feature_accepted(apply_lay_on_hands(sheet, 10, 2, true), expected);
}

#[test]
fn lay_on_hands_rejects_pool_overspend() {
    let sheet = SheetFeatureResourceFacts {
        source_current_hp: 6,
        target_current_hp: 6,
        target_poisoned: true,
        lay_on_hands_capacity: 5,
        ..empty_feature_resource_facts()
    };

    assert_feature_rejected(
        apply_lay_on_hands(sheet, 10, 6, false),
        sheet,
        FeatureResourceTransitionIssue::LayOnHandsOverspend,
    );
    assert_eq!(
        FeatureResourceTransitionIssue::LayOnHandsOverspend.message(),
        "Lay On Hands cannot spend more healing pool than remains."
    );
}

#[test]
fn long_rest_clears_lay_on_hands_pool() {
    let sheet = complete_long_rest_feature_resources(SheetFeatureResourceFacts {
        source_current_hp: 12,
        target_current_hp: 12,
        lay_on_hands_capacity: 5,
        lay_on_hands_expended: 4,
        ..empty_feature_resource_facts()
    });

    assert_eq!(sheet.lay_on_hands_capacity, 5);
    assert_eq!(sheet.lay_on_hands_expended, 0);
}

#[test]
fn short_rest_recovers_wild_shape_one_use_and_all_monk_focus() {
    let sheet = short_rest_feature_resources(SheetFeatureResourceFacts {
        druid_wild_shape_expended: 2,
        monk_focus_expended: 2,
        ..empty_feature_resource_facts()
    });

    assert_eq!(sheet.druid_wild_shape_expended, 1);
    assert_eq!(sheet.monk_focus_expended, 0);
}

#[test]
fn long_rest_clears_sorcery_points_created_slots_and_uncanny_use_state() {
    let sheet = complete_long_rest_feature_resources(SheetFeatureResourceFacts {
        sorcery_point_capacity: 2,
        sorcery_point_expended: 2,
        created_level3_capacity: 1,
        created_level3_expended: 1,
        uncanny_used_since_long_rest: true,
        ..empty_feature_resource_facts()
    });

    assert_eq!(sheet.sorcery_point_capacity, 2);
    assert_eq!(sheet.sorcery_point_expended, 0);
    assert_eq!(sheet.created_level3_capacity, 0);
    assert_eq!(sheet.created_level3_expended, 0);
    assert!(!sheet.uncanny_used_since_long_rest);
}

#[test]
fn font_of_magic_converts_ordinary_level_two_slot_to_sorcery_points() {
    let sheet = SheetFeatureResourceFacts {
        sorcery_point_capacity: 3,
        sorcery_point_expended: 3,
        ordinary_level2_expended: 1,
        ..empty_feature_resource_facts()
    };
    let expected = SheetFeatureResourceFacts {
        sorcery_point_capacity: 3,
        sorcery_point_expended: 1,
        ordinary_level2_expended: 2,
        ..empty_feature_resource_facts()
    };

    assert_feature_accepted(
        convert_font_of_magic_slot_to_sorcery_points(
            sheet,
            Some(FontOfMagicSlotSource::OrdinaryLevel2),
        ),
        expected,
    );
}

#[test]
fn font_of_magic_rejects_ambiguous_slot_source() {
    let sheet = SheetFeatureResourceFacts {
        sorcery_point_capacity: 5,
        sorcery_point_expended: 5,
        created_level3_capacity: 1,
        created_level3_expended: 0,
        ..empty_feature_resource_facts()
    };

    assert_feature_rejected(
        convert_font_of_magic_slot_to_sorcery_points(sheet, None),
        sheet,
        FeatureResourceTransitionIssue::FontOfMagicAmbiguousSlotSource,
    );
    assert_eq!(
        FeatureResourceTransitionIssue::FontOfMagicAmbiguousSlotSource.message(),
        "Font of Magic conversion requires a Spell Slot source when ordinary and created Spell Slots are both available."
    );
}

#[test]
fn font_of_magic_creates_level_three_slot_from_sorcery_points() {
    let sheet = SheetFeatureResourceFacts {
        sorcery_point_capacity: 5,
        ..empty_feature_resource_facts()
    };
    let expected = SheetFeatureResourceFacts {
        sorcery_point_capacity: 5,
        sorcery_point_expended: 5,
        created_level3_capacity: 1,
        ..empty_feature_resource_facts()
    };

    assert_feature_accepted(create_font_of_magic_level3_slot(sheet), expected);
}

#[test]
fn font_of_magic_rejects_created_slot_when_sorcery_points_are_insufficient() {
    let sheet = SheetFeatureResourceFacts {
        sorcery_point_capacity: 3,
        sorcery_point_expended: 1,
        ..empty_feature_resource_facts()
    };

    assert_feature_rejected(
        create_font_of_magic_level3_slot(sheet),
        sheet,
        FeatureResourceTransitionIssue::FontOfMagicInsufficientSorceryPoints,
    );
    assert_eq!(
        FeatureResourceTransitionIssue::FontOfMagicInsufficientSorceryPoints.message(),
        "Font of Magic Spell Slot creation requires enough unexpended Sorcery Points."
    );
}

#[test]
fn short_rest_preserves_uncanny_metabolism_use_state() {
    let sheet = short_rest_feature_resources(SheetFeatureResourceFacts {
        monk_focus_expended: 2,
        uncanny_used_since_long_rest: true,
        ..empty_feature_resource_facts()
    });

    assert_eq!(sheet.monk_focus_expended, 0);
    assert!(sheet.uncanny_used_since_long_rest);
}

#[test]
fn long_rest_clears_uncanny_metabolism_use_state() {
    let sheet = complete_long_rest_feature_resources(SheetFeatureResourceFacts {
        monk_focus_expended: 2,
        uncanny_used_since_long_rest: true,
        ..empty_feature_resource_facts()
    });

    assert_eq!(sheet.monk_focus_expended, 0);
    assert!(!sheet.uncanny_used_since_long_rest);
}

#[test]
fn uncanny_metabolism_recovers_focus_and_heals_source() {
    let sheet = SheetFeatureResourceFacts {
        source_current_hp: 8,
        temporary_hit_points: 3,
        monk_focus_expended: 2,
        ..empty_feature_resource_facts()
    };
    let expected = SheetFeatureResourceFacts {
        source_current_hp: 14,
        temporary_hit_points: 3,
        monk_focus_expended: 0,
        uncanny_used_since_long_rest: true,
        ..empty_feature_resource_facts()
    };

    assert_feature_accepted(use_uncanny_metabolism(sheet, 15, 2, 4), expected);
}

#[test]
fn uncanny_metabolism_rejects_repeat_use_before_long_rest() {
    let sheet = SheetFeatureResourceFacts {
        source_current_hp: 14,
        temporary_hit_points: 3,
        uncanny_used_since_long_rest: true,
        ..empty_feature_resource_facts()
    };

    assert_feature_rejected(
        use_uncanny_metabolism(sheet, 15, 2, 4),
        sheet,
        FeatureResourceTransitionIssue::UncannyMetabolismRepeatUse,
    );
    assert_eq!(
        FeatureResourceTransitionIssue::UncannyMetabolismRepeatUse.message(),
        "Uncanny Metabolism cannot be used again until a Long Rest."
    );
}

#[test]
fn metamagic_bridge_projects_shared_sorcery_point_pool_expenditure() {
    let sheet = project_metamagic_shared_point_pool(SheetFeatureResourceFacts {
        sorcery_point_capacity: 5,
        sorcery_point_expended: 3,
        metamagic_known_options: 2,
        ..empty_feature_resource_facts()
    });

    assert_eq!(sheet.sorcery_point_capacity, 5);
    assert_eq!(sheet.sorcery_point_expended, 3);
    assert_eq!(sheet.metamagic_known_options, 2);
    assert_eq!(sheet.metamagic_shared_resource_expended, 3);
}
