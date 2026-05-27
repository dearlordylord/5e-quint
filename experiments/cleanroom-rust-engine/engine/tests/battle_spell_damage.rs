use dnd_cleanroom_engine::battle::*;

fn attack_roll(natural_d20: i32, total: i32, armor_class: i32) -> AttackRollProcedureFacts {
    AttackRollProcedureFacts {
        natural_d20,
        total,
        armor_class,
        critical_threshold: 20,
    }
}

fn attack_facts(
    attack_roll: AttackRollProcedureFacts,
    profile: SpellAttackDamageProfile,
    base_damage_dice: i32,
    rolled_damage_dice_count: i32,
    damage_die_size: i32,
    damage_roll: i32,
) -> SpellAttackDamageBranchFacts {
    SpellAttackDamageBranchFacts {
        attack_roll,
        damage_type: spell_attack_damage_profile_damage_type(profile),
        hit_projections: spell_attack_damage_profile_hit_effects(profile),
        base_damage_dice,
        maximum_base_damage_dice: 10,
        rolled_damage_dice_count,
        damage_die_size,
        damage_roll,
    }
}

fn save_facts(
    profile: SpellSaveGatedDamageProfile,
    saving_throw_failed: bool,
    damage_roll: i32,
) -> SpellSaveDamageBranchFacts {
    SpellSaveDamageBranchFacts {
        damage_type: spell_save_gated_damage_type(profile),
        success_policy: spell_save_gated_damage_success(profile),
        failed_save_projections: spell_save_gated_damage_failed_save_effects(profile),
        saving_throw_failed,
        damage_roll,
    }
}

#[test]
fn spell_attack_profiles_project_damage_type_hit_effects_and_object_support() {
    assert_eq!(
        spell_attack_damage_profile_damage_type(
            SpellAttackDamageProfile::RayOfFrostSpellAttackProfile
        ),
        DamageType::Cold
    );
    assert_eq!(
        spell_attack_damage_profile_damage_type(
            SpellAttackDamageProfile::GuidingBoltSpellAttackProfile
        ),
        DamageType::Radiant
    );
    assert_eq!(
        spell_attack_damage_profile_hit_effects(
            SpellAttackDamageProfile::GuidingBoltSpellAttackProfile
        ),
        vec![SpellAttackHitProjection::SpellAttackNextAttackAdvantageHitProjection]
    );
    assert_eq!(
        spell_attack_damage_profile_hit_effects(
            SpellAttackDamageProfile::RayOfFrostSpellAttackProfile
        ),
        vec![SpellAttackHitProjection::SpellAttackSpeedReductionHitProjection]
    );
    assert!(spell_attack_damage_profile_supports_object_target(
        SpellAttackDamageProfile::FireBoltSpellAttackProfile
    ));
    assert!(!spell_attack_damage_profile_supports_object_target(
        SpellAttackDamageProfile::RayOfFrostSpellAttackProfile
    ));
}

#[test]
fn spell_attack_damage_branch_projects_hit_miss_and_critical_dice_count() {
    let hit = resolve_spell_attack_damage_branch(attack_facts(
        attack_roll(12, 18, 15),
        SpellAttackDamageProfile::RayOfFrostSpellAttackProfile,
        1,
        1,
        8,
        6,
    ));
    let miss = resolve_spell_attack_damage_branch(attack_facts(
        attack_roll(5, 10, 15),
        SpellAttackDamageProfile::GuidingBoltSpellAttackProfile,
        4,
        4,
        6,
        18,
    ));
    let critical = resolve_spell_attack_damage_branch(attack_facts(
        attack_roll(20, 20, 25),
        SpellAttackDamageProfile::GuidingBoltSpellAttackProfile,
        4,
        8,
        6,
        28,
    ));
    let invalid_critical_dice = resolve_spell_attack_damage_branch(attack_facts(
        attack_roll(20, 20, 25),
        SpellAttackDamageProfile::GuidingBoltSpellAttackProfile,
        4,
        4,
        6,
        18,
    ));

    assert_eq!(hit.damage_amount, 6);
    assert_eq!(hit.damage_type, DamageType::Cold);
    assert_eq!(
        hit.hit_projections,
        vec![SpellAttackHitProjection::SpellAttackSpeedReductionHitProjection]
    );
    assert_eq!(miss.damage_amount, 0);
    assert!(miss.hit_projections.is_empty());
    assert_eq!(critical.damage_amount, 28);
    assert_eq!(
        critical.hit_projections,
        vec![SpellAttackHitProjection::SpellAttackNextAttackAdvantageHitProjection]
    );
    assert_eq!(invalid_critical_dice.damage_amount, 0);
    assert!(invalid_critical_dice.hit_projections.is_empty());
}

#[test]
fn save_gated_damage_profiles_project_targeting_policy_type_and_riders() {
    assert_eq!(
        spell_save_gated_damage_targeting(
            SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile
        ),
        SpellSaveGatedTargeting::SpellSingleSaveTarget
    );
    assert_eq!(
        spell_save_gated_damage_targeting(SpellSaveGatedDamageProfile::FireballSaveDamageProfile),
        SpellSaveGatedTargeting::SpellAreaSaveTargets
    );
    assert_eq!(
        spell_save_gated_damage_success(SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile),
        SpellSaveSuccessDamagePolicy::SpellNoDamageOnSuccessfulSave
    );
    assert_eq!(
        spell_save_gated_damage_success(SpellSaveGatedDamageProfile::FireballSaveDamageProfile),
        SpellSaveSuccessDamagePolicy::SpellHalfDamageOnSuccessfulSave
    );
    assert_eq!(
        spell_save_gated_damage_type(SpellSaveGatedDamageProfile::ThunderwaveSaveDamageProfile),
        DamageType::Thunder
    );
    assert!(spell_save_gated_damage_requires_slot(
        SpellSaveGatedDamageProfile::FireballSaveDamageProfile
    ));
    assert!(!spell_save_gated_damage_requires_slot(
        SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile
    ));
    assert!(spell_save_gated_damage_requires_concentration(
        SpellSaveGatedDamageProfile::MindSpikeSaveDamageProfile
    ));
    assert_eq!(
        spell_save_gated_damage_failed_save_effects(
            SpellSaveGatedDamageProfile::ViciousMockerySaveDamageProfile
        ),
        vec![SpellFailedSaveProjection::SpellSaveNextAttackDisadvantageFailedProjection]
    );
}

#[test]
fn save_gated_damage_branch_handles_no_damage_half_damage_and_failed_save_riders() {
    let sacred_flame_success = resolve_spell_save_damage_branch(save_facts(
        SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile,
        false,
        8,
    ));
    let sacred_flame_failure = resolve_spell_save_damage_branch(save_facts(
        SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile,
        true,
        8,
    ));
    let fireball_success = resolve_spell_save_damage_branch(save_facts(
        SpellSaveGatedDamageProfile::FireballSaveDamageProfile,
        false,
        27,
    ));
    let vicious_mockery_failure = resolve_spell_save_damage_branch(save_facts(
        SpellSaveGatedDamageProfile::ViciousMockerySaveDamageProfile,
        true,
        5,
    ));

    assert_eq!(sacred_flame_success.damage_amount, 0);
    assert!(sacred_flame_success.failed_save_projections.is_empty());
    assert_eq!(sacred_flame_failure.damage_amount, 8);
    assert_eq!(fireball_success.damage_amount, 13);
    assert_eq!(fireball_success.damage_type, DamageType::Fire);
    assert!(fireball_success.failed_save_projections.is_empty());
    assert_eq!(vicious_mockery_failure.damage_amount, 5);
    assert_eq!(
        vicious_mockery_failure.failed_save_projections,
        vec![SpellFailedSaveProjection::SpellSaveNextAttackDisadvantageFailedProjection]
    );
}

#[test]
fn save_gated_damage_branch_rejects_negative_damage_rolls() {
    let result = resolve_spell_save_damage_branch(save_facts(
        SpellSaveGatedDamageProfile::ThunderwaveSaveDamageProfile,
        true,
        -1,
    ));

    assert_eq!(result.damage_amount, 0);
    assert_eq!(result.damage_type, DamageType::Thunder);
    assert!(result.failed_save_projections.is_empty());
}
