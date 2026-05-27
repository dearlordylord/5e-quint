use std::collections::BTreeSet;

use dnd_cleanroom_engine::character_creation::{
    empty_draft, fighter_standard_array, fill_creation_holes, initial_manifest_fills,
    manifest_choice_fills, manifest_loadout_fills, manifest_purchase_fills, BatchIssueCode,
    CharacterLevelScope, ChoiceOptionId, Fill, FillBatchResult, FillIssue, FillIssueCode,
    FinalizationStatus, HoleId, ProgressionSelection, SupportedAbilityScoreMethod,
};
use dnd_cleanroom_engine::types::AbilityScores;

fn hole_set<const N: usize>(items: [HoleId; N]) -> BTreeSet<HoleId> {
    BTreeSet::from(items)
}

fn accept(result: FillBatchResult) -> dnd_cleanroom_engine::character_creation::Draft {
    match result {
        FillBatchResult::Accepted { draft, .. } => draft,
        FillBatchResult::Rejected { issues, .. } => panic!("expected accepted batch: {issues:?}"),
    }
}

#[test]
fn empty_draft_exposes_initial_holes() {
    let draft = empty_draft();

    assert_eq!(draft.revision(), 0);
    assert_eq!(draft.finalization_status(), FinalizationStatus::Incomplete);
    assert_eq!(
        draft.open_holes(),
        hole_set([
            HoleId::Progression,
            HoleId::Background,
            HoleId::Species,
            HoleId::AbilityScores,
            HoleId::Languages,
            HoleId::Alignment,
        ])
    );
}

#[test]
fn accepted_initial_manifest_advances_revision_and_opens_dependent_holes() {
    let draft = empty_draft();

    let result = fill_creation_holes(&draft, 0, &initial_manifest_fills());

    match result {
        FillBatchResult::Accepted {
            draft,
            holes,
            finalization,
        } => {
            assert_eq!(draft.revision(), 1);
            assert_eq!(draft.progression(), ProgressionSelection::FighterLevel1);
            assert_eq!(draft.ability_scores(), Some(fighter_standard_array()));
            assert_eq!(finalization, FinalizationStatus::Incomplete);
            assert_eq!(
                holes,
                hole_set([
                    HoleId::ClassSkills,
                    HoleId::FighterFightingStyle,
                    HoleId::FighterWeaponMastery,
                    HoleId::BackgroundAbilityScoreIncrease,
                    HoleId::BackgroundTool,
                    HoleId::ClassEquipment,
                    HoleId::BackgroundEquipment,
                ])
            );
        }
        FillBatchResult::Rejected { issues, .. } => panic!("expected accepted batch: {issues:?}"),
    }
}

#[test]
fn stale_revision_rejects_without_applying_any_fill() {
    let draft = empty_draft();

    let result = fill_creation_holes(&draft, 999, &initial_manifest_fills());

    match result {
        FillBatchResult::Rejected {
            draft: rejected_draft,
            holes,
            issues,
            finalization,
        } => {
            assert_eq!(rejected_draft, draft);
            assert_eq!(holes, draft.open_holes());
            assert_eq!(finalization, FinalizationStatus::Incomplete);
            assert_eq!(
                issues.batch,
                BTreeSet::from([BatchIssueCode::StaleRevision])
            );
            assert!(issues.fills.is_empty());
        }
        FillBatchResult::Accepted { draft, .. } => panic!("expected stale rejection: {draft:?}"),
    }
}

#[test]
fn invalid_fill_rejects_batch_atomically() {
    let draft = empty_draft();
    let fills = vec![
        Fill::Choice {
            hole: HoleId::Progression,
            options: vec![ChoiceOptionId::ClassFighterLevel1],
        },
        Fill::Choice {
            hole: HoleId::Languages,
            options: vec![
                ChoiceOptionId::LanguageDwarvish,
                ChoiceOptionId::LanguageElvish,
            ],
        },
    ];

    let result = fill_creation_holes(&draft, 0, &fills);

    match result {
        FillBatchResult::Rejected {
            draft: rejected_draft,
            issues,
            ..
        } => {
            assert_eq!(rejected_draft, draft);
            assert!(issues.batch.is_empty());
            assert_eq!(
                issues.fills,
                BTreeSet::from([FillIssue {
                    fill_index: 1,
                    hole: HoleId::Languages,
                    code: FillIssueCode::UnsupportedChoice,
                }])
            );
        }
        FillBatchResult::Accepted { draft, .. } => panic!("expected atomic rejection: {draft:?}"),
    }
}

#[test]
fn fill_issue_precedence_matches_slice_protocol() {
    let draft = empty_draft();

    let duplicate_language_result = fill_creation_holes(
        &draft,
        0,
        &[Fill::Choice {
            hole: HoleId::Languages,
            options: vec![
                ChoiceOptionId::LanguageDwarvish,
                ChoiceOptionId::LanguageDwarvish,
            ],
        }],
    );
    assert_fill_issues(
        duplicate_language_result,
        [FillIssue {
            fill_index: 0,
            hole: HoleId::Languages,
            code: FillIssueCode::InvalidChoice,
        }],
    );

    let duplicate_fill_result = fill_creation_holes(
        &draft,
        0,
        &[
            Fill::Choice {
                hole: HoleId::Alignment,
                options: vec![ChoiceOptionId::AlignmentLawfulGood],
            },
            Fill::Choice {
                hole: HoleId::Alignment,
                options: vec![ChoiceOptionId::AlignmentLawfulGood],
            },
        ],
    );
    assert_fill_issues(
        duplicate_fill_result,
        [FillIssue {
            fill_index: 1,
            hole: HoleId::Alignment,
            code: FillIssueCode::DuplicateFill,
        }],
    );

    let wrong_kind_result = fill_creation_holes(
        &draft,
        0,
        &[Fill::AbilityScores {
            hole: HoleId::Progression,
            method: SupportedAbilityScoreMethod::StandardArray,
            scores: fighter_standard_array(),
        }],
    );
    assert_fill_issues(
        wrong_kind_result,
        [FillIssue {
            fill_index: 0,
            hole: HoleId::Progression,
            code: FillIssueCode::WrongFillKind,
        }],
    );

    let unknown_hole_result = fill_creation_holes(
        &draft,
        0,
        &[Fill::Choice {
            hole: HoleId::LoadoutArmor,
            options: vec![ChoiceOptionId::LoadoutWorn],
        }],
    );
    assert_fill_issues(
        unknown_hole_result,
        [FillIssue {
            fill_index: 0,
            hole: HoleId::LoadoutArmor,
            code: FillIssueCode::UnknownHole,
        }],
    );
}

#[test]
fn choice_cardinality_issues_match_slice_protocol() {
    let draft = empty_draft();

    let too_few_result = fill_creation_holes(
        &draft,
        0,
        &[Fill::Choice {
            hole: HoleId::Languages,
            options: vec![ChoiceOptionId::LanguageDwarvish],
        }],
    );
    assert_fill_issues(
        too_few_result,
        [FillIssue {
            fill_index: 0,
            hole: HoleId::Languages,
            code: FillIssueCode::TooFewChoices,
        }],
    );

    let too_many_result = fill_creation_holes(
        &draft,
        0,
        &[Fill::Choice {
            hole: HoleId::Languages,
            options: vec![
                ChoiceOptionId::LanguageDwarvish,
                ChoiceOptionId::LanguageGoblin,
                ChoiceOptionId::LanguageElvish,
            ],
        }],
    );
    assert_fill_issues(
        too_many_result,
        [
            FillIssue {
                fill_index: 0,
                hole: HoleId::Languages,
                code: FillIssueCode::TooManyChoices,
            },
            FillIssue {
                fill_index: 0,
                hole: HoleId::Languages,
                code: FillIssueCode::UnsupportedChoice,
            },
        ],
    );
}

#[test]
fn unsupported_class_equipment_is_rejected_after_class_hole_opens() {
    let draft = accept(fill_creation_holes(
        &empty_draft(),
        0,
        &initial_manifest_fills(),
    ));

    let result = fill_creation_holes(
        &draft,
        1,
        &[Fill::Choice {
            hole: HoleId::ClassEquipment,
            options: vec![ChoiceOptionId::ClassEquipmentPackageA],
        }],
    );

    assert_fill_issues(
        result,
        [FillIssue {
            fill_index: 0,
            hole: HoleId::ClassEquipment,
            code: FillIssueCode::UnsupportedChoice,
        }],
    );
}

#[test]
fn ability_score_methods_validate_standard_array_and_point_buy() {
    let duplicate_standard_array_score = AbilityScores {
        strength: 15,
        dexterity: 15,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
    };
    assert_fill_issues(
        fill_creation_holes(
            &empty_draft(),
            0,
            &[Fill::AbilityScores {
                hole: HoleId::AbilityScores,
                method: SupportedAbilityScoreMethod::StandardArray,
                scores: duplicate_standard_array_score,
            }],
        ),
        [FillIssue {
            fill_index: 0,
            hole: HoleId::AbilityScores,
            code: FillIssueCode::InvalidAbilityScores,
        }],
    );

    let point_buy_scores = AbilityScores {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
    };
    let result = fill_creation_holes(
        &empty_draft(),
        0,
        &[Fill::AbilityScores {
            hole: HoleId::AbilityScores,
            method: SupportedAbilityScoreMethod::PointBuy,
            scores: point_buy_scores,
        }],
    );
    match result {
        FillBatchResult::Accepted { draft, .. } => {
            assert_eq!(draft.ability_scores(), Some(point_buy_scores));
        }
        FillBatchResult::Rejected { issues, .. } => {
            panic!("expected point-buy ability score fill to be accepted: {issues:?}")
        }
    }

    let too_expensive_point_buy_scores = AbilityScores {
        strength: 15,
        dexterity: 15,
        constitution: 15,
        intelligence: 15,
        wisdom: 15,
        charisma: 15,
    };
    assert_fill_issues(
        fill_creation_holes(
            &empty_draft(),
            0,
            &[Fill::AbilityScores {
                hole: HoleId::AbilityScores,
                method: SupportedAbilityScoreMethod::PointBuy,
                scores: too_expensive_point_buy_scores,
            }],
        ),
        [FillIssue {
            fill_index: 0,
            hole: HoleId::AbilityScores,
            code: FillIssueCode::InvalidAbilityScores,
        }],
    );
}

#[test]
fn stale_revision_and_fill_issues_are_reported_together_without_apply() {
    let draft = empty_draft();

    let result = fill_creation_holes(
        &draft,
        999,
        &[Fill::Choice {
            hole: HoleId::Languages,
            options: vec![
                ChoiceOptionId::LanguageDwarvish,
                ChoiceOptionId::LanguageElvish,
            ],
        }],
    );

    match result {
        FillBatchResult::Rejected {
            draft: rejected_draft,
            issues,
            ..
        } => {
            assert_eq!(rejected_draft, draft);
            assert_eq!(
                issues.batch,
                BTreeSet::from([BatchIssueCode::StaleRevision])
            );
            assert_eq!(
                issues.fills,
                BTreeSet::from([FillIssue {
                    fill_index: 0,
                    hole: HoleId::Languages,
                    code: FillIssueCode::UnsupportedChoice,
                }])
            );
        }
        FillBatchResult::Accepted { draft, .. } => panic!("expected rejected batch: {draft:?}"),
    }
}

#[test]
fn manifest_path_finalizes_level_one_fighter_build() {
    let draft = fill_complete_manifest(initial_manifest_fills());

    assert_eq!(draft.finalization_status(), FinalizationStatus::Ready);
    assert!(draft.open_holes().is_empty());

    let build = draft.finalize_build().expect("ready draft finalizes");
    assert_eq!(build.level_scope, CharacterLevelScope::Level1);
    assert_eq!(build.ability_scores, fighter_standard_array());
}

#[test]
fn manifest_path_finalizes_level_two_fighter_build() {
    let mut initial = initial_manifest_fills();
    initial[0] = Fill::Choice {
        hole: HoleId::Progression,
        options: vec![ChoiceOptionId::ClassFighterLevel2],
    };

    let draft = fill_complete_manifest(initial);

    assert_eq!(draft.progression(), ProgressionSelection::FighterLevel2);
    assert_eq!(draft.finalization_status(), FinalizationStatus::Ready);

    let build = draft.finalize_build().expect("ready draft finalizes");
    assert_eq!(build.level_scope, CharacterLevelScope::Level2);
}

fn assert_fill_issues<const N: usize>(result: FillBatchResult, expected: [FillIssue; N]) {
    match result {
        FillBatchResult::Rejected { issues, .. } => {
            assert!(issues.batch.is_empty());
            assert_eq!(issues.fills, BTreeSet::from(expected));
        }
        FillBatchResult::Accepted { draft, .. } => panic!("expected rejected batch: {draft:?}"),
    }
}

fn fill_complete_manifest(initial: Vec<Fill>) -> dnd_cleanroom_engine::character_creation::Draft {
    let draft = accept(fill_creation_holes(&empty_draft(), 0, &initial));
    let draft = accept(fill_creation_holes(&draft, 1, &manifest_choice_fills()));
    let draft = accept(fill_creation_holes(&draft, 2, &manifest_purchase_fills()));
    accept(fill_creation_holes(&draft, 3, &manifest_loadout_fills()))
}
