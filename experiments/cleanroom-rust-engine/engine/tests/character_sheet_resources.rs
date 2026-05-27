use dnd_cleanroom_engine::character_creation::{
    admit_sheet_slot_facts, apply_arcane_recovery_level2, apply_magical_cunning,
    complete_long_rest_slot_benefits, complete_short_rest_slot_benefits,
    complete_short_rest_with_arcane_recovery_level2, interrupted_long_rest_slot_benefits,
    interrupted_short_rest_slot_benefits, OrdinarySpellSlotFacts, PactSlotFacts,
    SheetSlotExpectedCapacities, SheetSlotFacts, SheetSlotTransitionIssue,
    SheetSlotTransitionResult,
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
