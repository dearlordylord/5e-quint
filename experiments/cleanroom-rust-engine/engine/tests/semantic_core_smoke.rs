use dnd_cleanroom_engine::battle::HitPoints;
use dnd_cleanroom_engine::types::{Ability, AbilityScores};

fn representative_scores() -> AbilityScores {
    AbilityScores {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 12,
        wisdom: 10,
        charisma: 8,
    }
}

#[test]
fn ability_score_projection_covers_the_six_qnt_abilities() {
    // Sources:
    // - input/packages/battle-runtime/battle-runtime-model.qnt type Ability
    // - input/UBIQUITOUS_LANGUAGE.md "Ability Scores"
    let scores = representative_scores();

    let cases = [
        (Ability::Strength, 15),
        (Ability::Dexterity, 14),
        (Ability::Constitution, 13),
        (Ability::Intelligence, 12),
        (Ability::Wisdom, 10),
        (Ability::Charisma, 8),
    ];

    for (ability, expected_score) in cases {
        assert_eq!(scores.score(ability), expected_score);
    }
}

#[test]
fn hit_point_record_preserves_available_qnt_vitals_fields() {
    // Source: input/packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt
    // CreatureVitals includes hitPoints, hitPointMaximum, and temporaryHitPoints.
    let hit_points = HitPoints::new(7, 12, 3);

    assert_eq!(hit_points.current, 7);
    assert_eq!(hit_points.maximum, 12);
    assert_eq!(hit_points.temporary, 3);
}
