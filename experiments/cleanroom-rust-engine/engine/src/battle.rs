//! Battle module for the cleanroom experiment.
//!
//! Implemented from `input/packages/shared-algebras/proofs/rule-core/*.qnt`
//! and SRD 5.2.1 RAW under `input/.references/srd-5.2.1/`.
//! Table-owned facts such as spatial membership, target legality witnesses,
//! player choices, and dice rolls enter as explicit inputs.

use crate::types::Ability;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HitPoints {
    pub current: i16,
    pub maximum: i16,
    pub temporary: i16,
}

impl HitPoints {
    pub fn new(current: i16, maximum: i16, temporary: i16) -> Self {
        Self {
            current,
            maximum,
            temporary,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BattleStateError {
    HitPointMaximumMustBePositive,
    HitPointsOutOfRange,
    TemporaryHitPointsNegative,
    DeadCreatureMustHaveZeroHitPoints,
    MonsterAtZeroHitPointsMustBeDead,
    PlayerCharacterAtZeroHitPointsMustBeUnconsciousUnlessDead,
    DeathSavingThrowCountOutOfRange,
    StableOrHitPointRegainedLifecycleMustResetCounts,
    StableAndHitPointRegainedLifecycleConflict,
    DeadPlayerCharacterLifecycleMustHaveThreeFailures,
    HitPointRegainedLifecycleVitalsMismatch,
    StableLifecycleVitalsMismatch,
    PositiveHitPointUnconsciousRecoveryMismatch,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CreatureKind {
    PlayerCharacter,
    MonsterCreature,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CreatureVitals {
    kind: CreatureKind,
    hit_points: i32,
    hit_point_maximum: i32,
    temporary_hit_points: i32,
    dead: bool,
    unconscious: bool,
}

impl CreatureVitals {
    pub fn new(
        kind: CreatureKind,
        hit_points: i32,
        hit_point_maximum: i32,
        temporary_hit_points: i32,
        dead: bool,
        unconscious: bool,
    ) -> Result<Self, BattleStateError> {
        let vitals = Self {
            kind,
            hit_points,
            hit_point_maximum,
            temporary_hit_points,
            dead,
            unconscious,
        };
        vitals.validate()?;
        Ok(vitals)
    }

    fn assume_legal(
        kind: CreatureKind,
        hit_points: i32,
        hit_point_maximum: i32,
        temporary_hit_points: i32,
        dead: bool,
        unconscious: bool,
    ) -> Self {
        let vitals = Self {
            kind,
            hit_points,
            hit_point_maximum,
            temporary_hit_points,
            dead,
            unconscious,
        };
        debug_assert!(vitals.validate().is_ok());
        vitals
    }

    pub fn validate(&self) -> Result<(), BattleStateError> {
        if self.hit_point_maximum <= 0 {
            return Err(BattleStateError::HitPointMaximumMustBePositive);
        }
        if self.hit_points < 0 || self.hit_points > self.hit_point_maximum {
            return Err(BattleStateError::HitPointsOutOfRange);
        }
        if self.temporary_hit_points < 0 {
            return Err(BattleStateError::TemporaryHitPointsNegative);
        }
        if self.dead && self.hit_points != 0 {
            return Err(BattleStateError::DeadCreatureMustHaveZeroHitPoints);
        }
        if self.kind == CreatureKind::MonsterCreature && self.hit_points == 0 && !self.dead {
            return Err(BattleStateError::MonsterAtZeroHitPointsMustBeDead);
        }
        if self.kind == CreatureKind::PlayerCharacter
            && self.hit_points == 0
            && !self.dead
            && !self.unconscious
        {
            return Err(
                BattleStateError::PlayerCharacterAtZeroHitPointsMustBeUnconsciousUnlessDead,
            );
        }
        Ok(())
    }

    pub fn kind(&self) -> CreatureKind {
        self.kind
    }

    pub fn hit_points(&self) -> i32 {
        self.hit_points
    }

    pub fn hit_point_maximum(&self) -> i32 {
        self.hit_point_maximum
    }

    pub fn temporary_hit_points(&self) -> i32 {
        self.temporary_hit_points
    }

    pub fn is_dead(&self) -> bool {
        self.dead
    }

    pub fn is_unconscious(&self) -> bool {
        self.unconscious
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DamageResult {
    pub vitals: CreatureVitals,
    pub damage_to_hit_points: i32,
    pub remaining_damage_at_zero: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DeathSavingThrowLifecycle {
    successes: u8,
    failures: u8,
    stable: bool,
    hit_point_regained: bool,
}

impl DeathSavingThrowLifecycle {
    pub fn new(
        successes: u8,
        failures: u8,
        stable: bool,
        hit_point_regained: bool,
    ) -> Result<Self, BattleStateError> {
        let lifecycle = Self {
            successes,
            failures,
            stable,
            hit_point_regained,
        };
        lifecycle.validate()?;
        Ok(lifecycle)
    }

    pub fn reset() -> Self {
        Self {
            successes: 0,
            failures: 0,
            stable: false,
            hit_point_regained: false,
        }
    }

    fn assume_legal(successes: u8, failures: u8, stable: bool, hit_point_regained: bool) -> Self {
        let lifecycle = Self {
            successes,
            failures,
            stable,
            hit_point_regained,
        };
        debug_assert!(lifecycle.validate().is_ok());
        lifecycle
    }

    pub fn validate(&self) -> Result<(), BattleStateError> {
        if self.successes > 3 || self.failures > 3 {
            return Err(BattleStateError::DeathSavingThrowCountOutOfRange);
        }
        if self.stable && self.hit_point_regained {
            return Err(BattleStateError::StableAndHitPointRegainedLifecycleConflict);
        }
        if (self.stable || self.hit_point_regained) && (self.successes != 0 || self.failures != 0) {
            return Err(BattleStateError::StableOrHitPointRegainedLifecycleMustResetCounts);
        }
        Ok(())
    }

    pub fn successes(&self) -> u8 {
        self.successes
    }

    pub fn failures(&self) -> u8 {
        self.failures
    }

    pub fn is_stable(&self) -> bool {
        self.stable
    }

    pub fn hit_point_regained(&self) -> bool {
        self.hit_point_regained
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ZeroHitPointLifecycleResult {
    pub vitals: CreatureVitals,
    pub death_saving_throws: DeathSavingThrowLifecycle,
    pub death_saving_throw_failures_added: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PositiveHitPointUnconsciousRecovery {
    NoPositiveHitPointUnconsciousRecovery,
    EndsWhenHitPointsRegained,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HitPointRecoveryResult {
    pub vitals: CreatureVitals,
    pub death_saving_throws: DeathSavingThrowLifecycle,
    pub positive_hit_point_unconscious_recovery: PositiveHitPointUnconsciousRecovery,
    pub hit_points_regained: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TemporaryHitPointChoice {
    KeepExisting,
    GainNew,
}

pub fn nonnegative(n: i32) -> i32 {
    n.max(0)
}

pub fn clamp_hit_points(hit_points: i32, hit_point_maximum: i32) -> i32 {
    hit_points.clamp(0, hit_point_maximum)
}

pub fn can_apply_resolved_damage_to_positive_hit_points(vitals: CreatureVitals) -> bool {
    vitals.validate().is_ok() && (vitals.dead || vitals.hit_points > 0)
}

pub fn absorb_temporary_hit_points(vitals: CreatureVitals, damage: i32) -> i32 {
    damage.min(vitals.temporary_hit_points)
}

pub fn apply_resolved_damage_to_positive_hit_points(
    vitals: CreatureVitals,
    raw_damage: i32,
) -> DamageResult {
    if vitals.dead {
        return DamageResult {
            vitals,
            damage_to_hit_points: 0,
            remaining_damage_at_zero: 0,
        };
    }

    let resolved_damage = nonnegative(raw_damage);
    let absorbed_by_temporary_hit_points = absorb_temporary_hit_points(vitals, resolved_damage);
    let damage_to_hit_points = resolved_damage - absorbed_by_temporary_hit_points;
    let remaining_damage_at_zero = (damage_to_hit_points - vitals.hit_points).max(0);
    let next_hit_points = clamp_hit_points(
        vitals.hit_points - damage_to_hit_points,
        vitals.hit_point_maximum,
    );
    let drops_to_zero = vitals.hit_points > 0 && next_hit_points == 0;
    let instant_death = drops_to_zero
        && vitals.kind == CreatureKind::PlayerCharacter
        && remaining_damage_at_zero >= vitals.hit_point_maximum;
    let next_dead = vitals.dead
        || (vitals.kind == CreatureKind::MonsterCreature && next_hit_points == 0)
        || instant_death;
    let next_unconscious = vitals.unconscious
        || (drops_to_zero && vitals.kind == CreatureKind::PlayerCharacter && !instant_death);

    DamageResult {
        vitals: CreatureVitals::assume_legal(
            vitals.kind,
            next_hit_points,
            vitals.hit_point_maximum,
            vitals.temporary_hit_points - absorbed_by_temporary_hit_points,
            next_dead,
            next_unconscious,
        ),
        damage_to_hit_points,
        remaining_damage_at_zero,
    }
}

fn death_saving_throw_count(value: i32) -> u8 {
    value.clamp(0, 3) as u8
}

pub fn legal_player_character_death_saving_throw_state(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
) -> bool {
    vitals.validate().is_ok()
        && vitals.kind == CreatureKind::PlayerCharacter
        && lifecycle.validate().is_ok()
        && (!vitals.dead || (vitals.hit_points == 0 && lifecycle.failures == 3))
        && (!lifecycle.hit_point_regained
            || (vitals.hit_points == 1 && !vitals.dead && !vitals.unconscious))
        && (!lifecycle.stable || (vitals.hit_points == 0 && vitals.unconscious && !vitals.dead))
        && (vitals.hit_points != 0 || vitals.dead || vitals.unconscious)
}

pub fn can_use_death_saving_throw_lifecycle(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
) -> bool {
    legal_player_character_death_saving_throw_state(vitals, lifecycle)
        && vitals.hit_points == 0
        && !vitals.dead
        && !lifecycle.hit_point_regained
}

pub fn add_death_saving_throw_failures(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    raw_count: i32,
) -> ZeroHitPointLifecycleResult {
    if vitals.dead || lifecycle.hit_point_regained {
        return ZeroHitPointLifecycleResult {
            vitals,
            death_saving_throws: lifecycle,
            death_saving_throw_failures_added: 0,
        };
    }

    let count = death_saving_throw_count(raw_count);
    let next_failures = death_saving_throw_count(i32::from(lifecycle.failures) + i32::from(count));
    let next_dead = next_failures >= 3;

    ZeroHitPointLifecycleResult {
        vitals: CreatureVitals::assume_legal(
            vitals.kind,
            vitals.hit_points,
            vitals.hit_point_maximum,
            vitals.temporary_hit_points,
            next_dead,
            vitals.unconscious,
        ),
        death_saving_throws: DeathSavingThrowLifecycle::assume_legal(
            lifecycle.successes,
            next_failures,
            false,
            lifecycle.hit_point_regained,
        ),
        death_saving_throw_failures_added: count,
    }
}

pub fn apply_damage_at_zero_hit_points(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    raw_damage: i32,
    critical_hit_damage: bool,
) -> ZeroHitPointLifecycleResult {
    if !can_use_death_saving_throw_lifecycle(vitals, lifecycle) || raw_damage <= 0 {
        return ZeroHitPointLifecycleResult {
            vitals,
            death_saving_throws: lifecycle,
            death_saving_throw_failures_added: 0,
        };
    }

    if raw_damage >= vitals.hit_point_maximum {
        add_death_saving_throw_failures(vitals, lifecycle, 3)
    } else {
        add_death_saving_throw_failures(vitals, lifecycle, if critical_hit_damage { 2 } else { 1 })
    }
}

pub fn apply_damage_to_zero_hit_point_creature(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    raw_damage: i32,
    critical_hit_damage: bool,
) -> ZeroHitPointLifecycleResult {
    if !can_use_death_saving_throw_lifecycle(vitals, lifecycle) || raw_damage <= 0 {
        return ZeroHitPointLifecycleResult {
            vitals,
            death_saving_throws: lifecycle,
            death_saving_throw_failures_added: 0,
        };
    }

    let resolved_damage = nonnegative(raw_damage);
    let absorbed_by_temporary_hit_points = absorb_temporary_hit_points(vitals, resolved_damage);
    let damage_after_temporary_hit_points = resolved_damage - absorbed_by_temporary_hit_points;
    let next_vitals = CreatureVitals::assume_legal(
        vitals.kind,
        vitals.hit_points,
        vitals.hit_point_maximum,
        vitals.temporary_hit_points - absorbed_by_temporary_hit_points,
        vitals.dead,
        vitals.unconscious,
    );

    if damage_after_temporary_hit_points <= 0 {
        ZeroHitPointLifecycleResult {
            vitals: next_vitals,
            death_saving_throws: lifecycle,
            death_saving_throw_failures_added: 0,
        }
    } else {
        apply_damage_at_zero_hit_points(
            next_vitals,
            lifecycle,
            damage_after_temporary_hit_points,
            critical_hit_damage,
        )
    }
}

pub fn resolve_start_turn_death_saving_throw(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    d20_roll: i32,
) -> ZeroHitPointLifecycleResult {
    if !can_use_death_saving_throw_lifecycle(vitals, lifecycle) || lifecycle.stable || d20_roll <= 0
    {
        return ZeroHitPointLifecycleResult {
            vitals,
            death_saving_throws: lifecycle,
            death_saving_throw_failures_added: 0,
        };
    }

    if d20_roll == 20 {
        ZeroHitPointLifecycleResult {
            vitals: CreatureVitals::assume_legal(
                vitals.kind,
                1,
                vitals.hit_point_maximum,
                vitals.temporary_hit_points,
                false,
                false,
            ),
            death_saving_throws: DeathSavingThrowLifecycle::assume_legal(0, 0, false, true),
            death_saving_throw_failures_added: 0,
        }
    } else if d20_roll == 1 {
        add_death_saving_throw_failures(vitals, lifecycle, 2)
    } else if d20_roll >= 10 {
        let next_successes = death_saving_throw_count(i32::from(lifecycle.successes) + 1);
        if next_successes >= 3 {
            ZeroHitPointLifecycleResult {
                vitals,
                death_saving_throws: DeathSavingThrowLifecycle::assume_legal(0, 0, true, false),
                death_saving_throw_failures_added: 0,
            }
        } else {
            ZeroHitPointLifecycleResult {
                vitals,
                death_saving_throws: DeathSavingThrowLifecycle::assume_legal(
                    next_successes,
                    lifecycle.failures,
                    lifecycle.stable,
                    lifecycle.hit_point_regained,
                ),
                death_saving_throw_failures_added: 0,
            }
        }
    } else {
        add_death_saving_throw_failures(vitals, lifecycle, 1)
    }
}

pub fn death_saving_throw_lifecycle_after_positive_hit_point_damage(
    previous: DeathSavingThrowLifecycle,
    damage_result: DamageResult,
) -> DeathSavingThrowLifecycle {
    if damage_result.vitals.kind == CreatureKind::PlayerCharacter
        && damage_result.vitals.hit_points == 0
    {
        if damage_result.vitals.dead {
            DeathSavingThrowLifecycle::assume_legal(0, 3, false, false)
        } else {
            DeathSavingThrowLifecycle::reset()
        }
    } else {
        previous
    }
}

pub fn legal_positive_hit_point_unconscious_recovery(
    vitals: CreatureVitals,
    recovery: PositiveHitPointUnconsciousRecovery,
) -> bool {
    recovery == PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery
        || (vitals.hit_points > 0
            && vitals.hit_points <= vitals.hit_point_maximum
            && vitals.unconscious
            && !vitals.dead)
}

pub fn legal_hit_point_recovery_state(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
) -> bool {
    if vitals.validate().is_err()
        || !legal_positive_hit_point_unconscious_recovery(vitals, recovery)
    {
        return false;
    }

    let no_positive_recovery =
        recovery == PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery;
    if (vitals.hit_points == 0 || vitals.dead) && !no_positive_recovery {
        return false;
    }

    match vitals.kind {
        CreatureKind::PlayerCharacter => {
            legal_player_character_death_saving_throw_state(vitals, lifecycle)
        }
        CreatureKind::MonsterCreature => lifecycle == DeathSavingThrowLifecycle::reset(),
    }
}

pub fn apply_hit_point_healing(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
    raw_healing: i32,
) -> HitPointRecoveryResult {
    if vitals.dead || raw_healing <= 0 {
        return HitPointRecoveryResult {
            vitals,
            death_saving_throws: lifecycle,
            positive_hit_point_unconscious_recovery: recovery,
            hit_points_regained: 0,
        };
    }

    let healing = nonnegative(raw_healing);
    let next_hit_points = clamp_hit_points(vitals.hit_points + healing, vitals.hit_point_maximum);
    let regained_hit_points = next_hit_points - vitals.hit_points;
    let healed_from_zero = vitals.hit_points == 0 && next_hit_points > 0;
    let healed_positive_recovery = vitals.hit_points > 0
        && regained_hit_points > 0
        && recovery == PositiveHitPointUnconsciousRecovery::EndsWhenHitPointsRegained;

    HitPointRecoveryResult {
        vitals: CreatureVitals::assume_legal(
            vitals.kind,
            next_hit_points,
            vitals.hit_point_maximum,
            vitals.temporary_hit_points,
            false,
            if healed_from_zero || healed_positive_recovery {
                false
            } else {
                vitals.unconscious
            },
        ),
        death_saving_throws: if regained_hit_points > 0 {
            DeathSavingThrowLifecycle::reset()
        } else {
            lifecycle
        },
        positive_hit_point_unconscious_recovery: if healed_positive_recovery {
            PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery
        } else {
            recovery
        },
        hit_points_regained: regained_hit_points,
    }
}

pub fn apply_knock_out_disposition(damage_result: DamageResult) -> HitPointRecoveryResult {
    if damage_result.vitals.hit_points != 0 || damage_result.damage_to_hit_points <= 0 {
        HitPointRecoveryResult {
            vitals: damage_result.vitals,
            death_saving_throws: death_saving_throw_lifecycle_after_positive_hit_point_damage(
                DeathSavingThrowLifecycle::reset(),
                damage_result,
            ),
            positive_hit_point_unconscious_recovery:
                PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
            hit_points_regained: 0,
        }
    } else {
        HitPointRecoveryResult {
            vitals: CreatureVitals::assume_legal(
                damage_result.vitals.kind,
                1,
                damage_result.vitals.hit_point_maximum,
                damage_result.vitals.temporary_hit_points,
                false,
                true,
            ),
            death_saving_throws: DeathSavingThrowLifecycle::reset(),
            positive_hit_point_unconscious_recovery:
                PositiveHitPointUnconsciousRecovery::EndsWhenHitPointsRegained,
            hit_points_regained: 0,
        }
    }
}

pub fn apply_first_aid_to_knock_out_unconscious(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
    medicine_check_succeeded: bool,
) -> HitPointRecoveryResult {
    if !medicine_check_succeeded
        || recovery != PositiveHitPointUnconsciousRecovery::EndsWhenHitPointsRegained
    {
        HitPointRecoveryResult {
            vitals,
            death_saving_throws: lifecycle,
            positive_hit_point_unconscious_recovery: recovery,
            hit_points_regained: 0,
        }
    } else {
        HitPointRecoveryResult {
            vitals: CreatureVitals::assume_legal(
                vitals.kind,
                vitals.hit_points,
                vitals.hit_point_maximum,
                vitals.temporary_hit_points,
                vitals.dead,
                false,
            ),
            death_saving_throws: lifecycle,
            positive_hit_point_unconscious_recovery:
                PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
            hit_points_regained: 0,
        }
    }
}

pub fn grant_temporary_hit_points(
    vitals: CreatureVitals,
    raw_temporary_hit_points: i32,
    choice: TemporaryHitPointChoice,
) -> CreatureVitals {
    let granted = nonnegative(raw_temporary_hit_points);
    let next_temporary_hit_points = match choice {
        TemporaryHitPointChoice::KeepExisting => vitals.temporary_hit_points,
        TemporaryHitPointChoice::GainNew => granted,
    };

    CreatureVitals::assume_legal(
        vitals.kind,
        vitals.hit_points,
        vitals.hit_point_maximum,
        next_temporary_hit_points,
        vitals.dead,
        vitals.unconscious,
    )
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DirectHitPointRestorationProfile {
    CureWounds,
    HealingWord,
    MassCureWounds,
    MassHealingWord,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HitPointRestorationAreaProfile {
    NoHitPointRestorationAreaProfile,
    MassCureWoundsPointOriginSphereArea,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DirectHitPointRestorationEffectFacts {
    pub profile: DirectHitPointRestorationProfile,
    pub slot_level: i32,
    pub healing_dice_roll: i32,
    pub spellcasting_ability_modifier: i32,
}

pub const MASS_CURE_WOUNDS_POINT_ORIGIN_SPHERE_RADIUS_FEET: i32 = 30;
pub const DIRECT_HIT_POINT_RESTORATION_MAXIMUM_SLOT_LEVEL: i32 = 9;

pub fn hit_point_restoration_area_profile(
    profile: DirectHitPointRestorationProfile,
) -> HitPointRestorationAreaProfile {
    match profile {
        DirectHitPointRestorationProfile::MassCureWounds => {
            HitPointRestorationAreaProfile::MassCureWoundsPointOriginSphereArea
        }
        DirectHitPointRestorationProfile::CureWounds
        | DirectHitPointRestorationProfile::HealingWord
        | DirectHitPointRestorationProfile::MassHealingWord => {
            HitPointRestorationAreaProfile::NoHitPointRestorationAreaProfile
        }
    }
}

pub fn direct_hit_point_restoration_minimum_slot_level(
    profile: DirectHitPointRestorationProfile,
) -> i32 {
    match profile {
        DirectHitPointRestorationProfile::CureWounds
        | DirectHitPointRestorationProfile::HealingWord => 1,
        DirectHitPointRestorationProfile::MassHealingWord => 3,
        DirectHitPointRestorationProfile::MassCureWounds => 5,
    }
}

pub fn direct_hit_point_restoration_dice_count(
    profile: DirectHitPointRestorationProfile,
    slot_level: i32,
) -> i32 {
    match profile {
        DirectHitPointRestorationProfile::CureWounds
        | DirectHitPointRestorationProfile::HealingWord => 2 + (2 * (slot_level - 1)),
        DirectHitPointRestorationProfile::MassHealingWord => 2 + (slot_level - 3),
        DirectHitPointRestorationProfile::MassCureWounds => 5 + (slot_level - 5),
    }
}

pub fn direct_hit_point_restoration_die_size(profile: DirectHitPointRestorationProfile) -> i32 {
    match profile {
        DirectHitPointRestorationProfile::CureWounds
        | DirectHitPointRestorationProfile::MassCureWounds => 8,
        DirectHitPointRestorationProfile::HealingWord
        | DirectHitPointRestorationProfile::MassHealingWord => 4,
    }
}

pub fn legal_direct_hit_point_restoration_effect_facts(
    facts: DirectHitPointRestorationEffectFacts,
) -> bool {
    let dice_count = direct_hit_point_restoration_dice_count(facts.profile, facts.slot_level);
    let die_size = direct_hit_point_restoration_die_size(facts.profile);

    facts.slot_level >= direct_hit_point_restoration_minimum_slot_level(facts.profile)
        && facts.slot_level <= DIRECT_HIT_POINT_RESTORATION_MAXIMUM_SLOT_LEVEL
        && facts.healing_dice_roll >= dice_count
        && facts.healing_dice_roll <= dice_count * die_size
        && facts.spellcasting_ability_modifier >= -5
        && facts.spellcasting_ability_modifier <= 10
}

pub fn resolve_direct_hit_point_restoration_effect(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    recovery: PositiveHitPointUnconsciousRecovery,
    facts: DirectHitPointRestorationEffectFacts,
) -> HitPointRecoveryResult {
    if !legal_direct_hit_point_restoration_effect_facts(facts) {
        HitPointRecoveryResult {
            vitals,
            death_saving_throws: lifecycle,
            positive_hit_point_unconscious_recovery: recovery,
            hit_points_regained: 0,
        }
    } else {
        apply_hit_point_healing(
            vitals,
            lifecycle,
            recovery,
            facts.healing_dice_roll + facts.spellcasting_ability_modifier,
        )
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DirectHitPointRestorationTargetWitness {
    pub selected_by_caster: bool,
    pub spell_spatial_requirements_satisfied: bool,
}

impl DirectHitPointRestorationTargetWitness {
    pub fn valid() -> Self {
        Self {
            selected_by_caster: true,
            spell_spatial_requirements_satisfied: true,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DirectHitPointRestorationTarget {
    pub vitals: CreatureVitals,
    pub death_saving_throws: DeathSavingThrowLifecycle,
    pub positive_hit_point_unconscious_recovery: PositiveHitPointUnconsciousRecovery,
    pub witness: DirectHitPointRestorationTargetWitness,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DirectHitPointRestorationSpellFacts {
    pub has_spell_access: bool,
    pub effect: DirectHitPointRestorationEffectFacts,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DirectHitPointRestorationSpellResult {
    pub invocation: SpellInvocationResult,
    pub targets: Vec<HitPointRecoveryResult>,
}

pub fn direct_hit_point_restoration_spell_definition_profile(
    profile: DirectHitPointRestorationProfile,
) -> SpellDefinitionProfile {
    match profile {
        DirectHitPointRestorationProfile::CureWounds => SpellDefinitionProfile::CureWounds,
        DirectHitPointRestorationProfile::HealingWord => SpellDefinitionProfile::HealingWord,
        DirectHitPointRestorationProfile::MassCureWounds => SpellDefinitionProfile::MassCureWounds,
        DirectHitPointRestorationProfile::MassHealingWord => {
            SpellDefinitionProfile::MassHealingWord
        }
    }
}

pub fn direct_hit_point_restoration_target_count(
    targets: &[DirectHitPointRestorationTarget],
) -> i32 {
    if targets.len() > i32::MAX as usize {
        i32::MAX
    } else {
        targets.len() as i32
    }
}

pub fn direct_hit_point_restoration_targets_are_valid(
    targets: &[DirectHitPointRestorationTarget],
) -> bool {
    targets.iter().all(|target| {
        target.witness.selected_by_caster && target.witness.spell_spatial_requirements_satisfied
    })
}

pub fn direct_hit_point_restoration_spell_invocation_facts(
    facts: DirectHitPointRestorationSpellFacts,
    targets: &[DirectHitPointRestorationTarget],
) -> SpellInvocationFacts {
    SpellInvocationFacts {
        profile: direct_hit_point_restoration_spell_definition_profile(facts.effect.profile),
        has_spell_access: facts.has_spell_access,
        selected_slot_level: facts.effect.slot_level,
        target_count: direct_hit_point_restoration_target_count(targets),
        targets_are_valid: direct_hit_point_restoration_targets_are_valid(targets),
    }
}

fn unchanged_hit_point_restoration_target(
    target: DirectHitPointRestorationTarget,
) -> HitPointRecoveryResult {
    HitPointRecoveryResult {
        vitals: target.vitals,
        death_saving_throws: target.death_saving_throws,
        positive_hit_point_unconscious_recovery: target.positive_hit_point_unconscious_recovery,
        hit_points_regained: 0,
    }
}

pub fn resolve_direct_hit_point_restoration_spell(
    state: SpellcastingProcedureState,
    targets: &[DirectHitPointRestorationTarget],
    facts: DirectHitPointRestorationSpellFacts,
) -> DirectHitPointRestorationSpellResult {
    let effect_facts_are_legal = legal_direct_hit_point_restoration_effect_facts(facts.effect);
    let invocation_facts = direct_hit_point_restoration_spell_invocation_facts(facts, targets);
    let invocation = if effect_facts_are_legal {
        resolve_spell_invocation(state, invocation_facts)
    } else {
        SpellInvocationResult {
            state,
            admitted: false,
            slot_expended: false,
        }
    };
    let can_apply_effect =
        effect_facts_are_legal && spell_invocation_can_affect_targets(invocation, invocation_facts);
    let targets = targets
        .iter()
        .map(|target| {
            if can_apply_effect {
                resolve_direct_hit_point_restoration_effect(
                    target.vitals,
                    target.death_saving_throws,
                    target.positive_hit_point_unconscious_recovery,
                    facts.effect,
                )
            } else {
                unchanged_hit_point_restoration_target(*target)
            }
        })
        .collect();

    DirectHitPointRestorationSpellResult {
        invocation,
        targets,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpareTheDyingInvocationFacts {
    pub character_level: i32,
    pub has_spell_access: bool,
    pub target_within_range: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpareTheDyingResult {
    pub turn: TurnProcedureState,
    pub vitals: CreatureVitals,
    pub death_saving_throws: DeathSavingThrowLifecycle,
    pub admitted: bool,
}

pub fn spare_the_dying_range_feet(character_level: i32) -> i32 {
    if character_level >= 17 {
        120
    } else if character_level >= 11 {
        60
    } else if character_level >= 5 {
        30
    } else {
        15
    }
}

pub fn legal_spare_the_dying_invocation_facts(facts: SpareTheDyingInvocationFacts) -> bool {
    facts.character_level >= 1
}

pub fn spare_the_dying_target_admitted(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
) -> bool {
    legal_player_character_death_saving_throw_state(vitals, lifecycle)
        && vitals.hit_points() == 0
        && vitals.kind() == CreatureKind::PlayerCharacter
        && lifecycle.failures() < 3
}

pub fn apply_spare_the_dying(
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
) -> (CreatureVitals, DeathSavingThrowLifecycle) {
    if !spare_the_dying_target_admitted(vitals, lifecycle) {
        (vitals, lifecycle)
    } else {
        (
            vitals,
            DeathSavingThrowLifecycle::assume_legal(0, 0, true, false),
        )
    }
}

pub fn resolve_spare_the_dying(
    turn: TurnProcedureState,
    vitals: CreatureVitals,
    lifecycle: DeathSavingThrowLifecycle,
    facts: SpareTheDyingInvocationFacts,
) -> SpareTheDyingResult {
    let spent_turn = spend_action_cost(turn, ActionCost::StandardActionCost(StandardAction::Magic));
    let admitted = legal_spare_the_dying_invocation_facts(facts)
        && facts.has_spell_access
        && facts.target_within_range
        && spent_turn != turn
        && spare_the_dying_target_admitted(vitals, lifecycle);
    let (next_vitals, next_lifecycle) = if admitted {
        apply_spare_the_dying(vitals, lifecycle)
    } else {
        (vitals, lifecycle)
    };

    SpareTheDyingResult {
        turn: if admitted { spent_turn } else { turn },
        vitals: next_vitals,
        death_saving_throws: next_lifecycle,
        admitted,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellDefinitionProfile {
    MagicMissile,
    RayOfFrost,
    AcidSplash,
    HealingWord,
    CureWounds,
    MassCureWounds,
    MassHealingWord,
    MageArmor,
    Command,
    Sanctuary,
    FalseLife,
    Longstrider,
    ShieldOfFaith,
    SpiderClimb,
    Fly,
    Barkskin,
    Aid,
    BlindnessDeafness,
    FaerieFire,
    DivineSmite,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpellSlotLedger {
    pub slot_level: i32,
    pub slots_remaining: i32,
}

impl SpellSlotLedger {
    pub fn initial() -> Self {
        Self {
            slot_level: 1,
            slots_remaining: 2,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpellSlotExpenditureState {
    pub slot_ledger: SpellSlotLedger,
    pub slot_spell_cast_this_turn: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellSlotExpenditureRequest {
    SpellSlotExpenditureNotRequired,
    SpellSlotExpenditureRequired { slot_level: i32 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellSlotExpenditureResult {
    SpellSlotExpenditureRejected,
    SpellSlotExpenditureAcceptedSlotless,
    SpellSlotExpended { state: SpellSlotExpenditureState },
}

pub fn legal_spell_slot_ledger(ledger: SpellSlotLedger) -> bool {
    ledger.slot_level >= 1
        && ledger.slot_level <= 9
        && ledger.slots_remaining >= 0
        && ledger.slots_remaining <= 6
}

pub fn legal_spell_slot_expenditure_state(state: SpellSlotExpenditureState) -> bool {
    legal_spell_slot_ledger(state.slot_ledger)
}

pub fn legal_spell_slot_expenditure_request(request: SpellSlotExpenditureRequest) -> bool {
    match request {
        SpellSlotExpenditureRequest::SpellSlotExpenditureNotRequired => true,
        SpellSlotExpenditureRequest::SpellSlotExpenditureRequired { slot_level } => {
            (1..=9).contains(&slot_level)
        }
    }
}

pub fn can_expend_spell_slot(
    state: SpellSlotExpenditureState,
    request: SpellSlotExpenditureRequest,
) -> bool {
    if !legal_spell_slot_expenditure_state(state) || !legal_spell_slot_expenditure_request(request)
    {
        return false;
    }

    match request {
        SpellSlotExpenditureRequest::SpellSlotExpenditureNotRequired => true,
        SpellSlotExpenditureRequest::SpellSlotExpenditureRequired { slot_level } => {
            !state.slot_spell_cast_this_turn
                && slot_level == state.slot_ledger.slot_level
                && state.slot_ledger.slots_remaining > 0
        }
    }
}

pub fn apply_spell_slot_expenditure(
    state: SpellSlotExpenditureState,
    request: SpellSlotExpenditureRequest,
) -> SpellSlotExpenditureResult {
    if !can_expend_spell_slot(state, request) {
        SpellSlotExpenditureResult::SpellSlotExpenditureRejected
    } else {
        match request {
            SpellSlotExpenditureRequest::SpellSlotExpenditureNotRequired => {
                SpellSlotExpenditureResult::SpellSlotExpenditureAcceptedSlotless
            }
            SpellSlotExpenditureRequest::SpellSlotExpenditureRequired { .. } => {
                SpellSlotExpenditureResult::SpellSlotExpended {
                    state: SpellSlotExpenditureState {
                        slot_ledger: SpellSlotLedger {
                            slots_remaining: state.slot_ledger.slots_remaining - 1,
                            ..state.slot_ledger
                        },
                        slot_spell_cast_this_turn: true,
                    },
                }
            }
        }
    }
}

pub fn spell_slot_expenditure_result_state(
    prior_state: SpellSlotExpenditureState,
    result: SpellSlotExpenditureResult,
) -> SpellSlotExpenditureState {
    match result {
        SpellSlotExpenditureResult::SpellSlotExpenditureRejected
        | SpellSlotExpenditureResult::SpellSlotExpenditureAcceptedSlotless => prior_state,
        SpellSlotExpenditureResult::SpellSlotExpended { state } => state,
    }
}

pub fn spell_slot_expenditure_accepted(result: SpellSlotExpenditureResult) -> bool {
    result != SpellSlotExpenditureResult::SpellSlotExpenditureRejected
}

pub fn spell_slot_was_expended(result: SpellSlotExpenditureResult) -> bool {
    matches!(result, SpellSlotExpenditureResult::SpellSlotExpended { .. })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellInvocationAction {
    ActionTimeSpellInvocation,
    BonusActionSpellInvocation,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellInvocationSlotSpend {
    SpellInvocationWithoutSlot,
    SpellInvocationWithSlot { minimum_slot_level: i32 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellInvocationTargetCardinality {
    SpellInvocationBoundedTargets {
        minimum_target_count: i32,
        maximum_target_count: i32,
    },
    SpellInvocationOpenUpperTargets {
        minimum_target_count: i32,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpellInvocationResourceFacts {
    pub invocation_action: SpellInvocationAction,
    pub has_spell_access: bool,
    pub slot_spend: SpellInvocationSlotSpend,
    pub selected_slot_level: i32,
    pub target_count: i32,
    pub target_cardinality: SpellInvocationTargetCardinality,
    pub targets_are_valid: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpellcastingProcedureState {
    pub turn: TurnProcedureState,
    pub slot_ledger: SpellSlotLedger,
    pub slot_spell_cast_this_turn: bool,
}

impl SpellcastingProcedureState {
    pub fn initial() -> Self {
        Self {
            turn: TurnProcedureState::initial(),
            slot_ledger: SpellSlotLedger::initial(),
            slot_spell_cast_this_turn: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpellInvocationResult {
    pub state: SpellcastingProcedureState,
    pub admitted: bool,
    pub slot_expended: bool,
}

pub fn spell_action_cost(invocation_action: SpellInvocationAction) -> ActionCost {
    match invocation_action {
        SpellInvocationAction::BonusActionSpellInvocation => ActionCost::BonusActionCost,
        SpellInvocationAction::ActionTimeSpellInvocation => {
            ActionCost::StandardActionCost(StandardAction::Magic)
        }
    }
}

pub fn legal_spellcasting_procedure_state(state: SpellcastingProcedureState) -> bool {
    legal_turn_procedure_state(state.turn) && legal_spell_slot_ledger(state.slot_ledger)
}

pub fn legal_spell_invocation_slot_spend(
    slot_spend: SpellInvocationSlotSpend,
    selected_slot_level: i32,
) -> bool {
    match slot_spend {
        SpellInvocationSlotSpend::SpellInvocationWithoutSlot => selected_slot_level == 0,
        SpellInvocationSlotSpend::SpellInvocationWithSlot { minimum_slot_level } => {
            (1..=9).contains(&minimum_slot_level)
                && selected_slot_level >= minimum_slot_level
                && selected_slot_level <= 9
        }
    }
}

pub fn spell_invocation_slot_spend_requires_slot(slot_spend: SpellInvocationSlotSpend) -> bool {
    matches!(
        slot_spend,
        SpellInvocationSlotSpend::SpellInvocationWithSlot { .. }
    )
}

pub fn spell_invocation_resource_requires_slot(facts: SpellInvocationResourceFacts) -> bool {
    spell_invocation_slot_spend_requires_slot(facts.slot_spend)
}

pub fn spell_invocation_expenditure_request(
    facts: SpellInvocationResourceFacts,
) -> SpellSlotExpenditureRequest {
    match facts.slot_spend {
        SpellInvocationSlotSpend::SpellInvocationWithoutSlot => {
            SpellSlotExpenditureRequest::SpellSlotExpenditureNotRequired
        }
        SpellInvocationSlotSpend::SpellInvocationWithSlot { .. } => {
            SpellSlotExpenditureRequest::SpellSlotExpenditureRequired {
                slot_level: facts.selected_slot_level,
            }
        }
    }
}

pub fn spell_invocation_expenditure_state(
    state: SpellcastingProcedureState,
) -> SpellSlotExpenditureState {
    SpellSlotExpenditureState {
        slot_ledger: state.slot_ledger,
        slot_spell_cast_this_turn: state.slot_spell_cast_this_turn,
    }
}

pub fn legal_spell_invocation_target_cardinality(
    target_cardinality: SpellInvocationTargetCardinality,
    target_count: i32,
) -> bool {
    match target_cardinality {
        SpellInvocationTargetCardinality::SpellInvocationBoundedTargets {
            minimum_target_count,
            maximum_target_count,
        } => {
            minimum_target_count >= 1
                && maximum_target_count >= minimum_target_count
                && target_count >= minimum_target_count
                && target_count <= maximum_target_count
        }
        SpellInvocationTargetCardinality::SpellInvocationOpenUpperTargets {
            minimum_target_count,
        } => minimum_target_count >= 1 && target_count >= minimum_target_count,
    }
}

pub fn legal_spell_invocation_resource_facts(facts: SpellInvocationResourceFacts) -> bool {
    legal_spell_invocation_slot_spend(facts.slot_spend, facts.selected_slot_level)
        && legal_spell_invocation_target_cardinality(facts.target_cardinality, facts.target_count)
}

pub fn resolve_spell_invocation_resource_with_action_cost(
    state: SpellcastingProcedureState,
    facts: SpellInvocationResourceFacts,
    action_cost: ActionCost,
) -> SpellInvocationResult {
    let spent_turn = spend_action_cost(state.turn, action_cost);
    let slot_expenditure_state = spell_invocation_expenditure_state(state);
    let slot_expenditure = apply_spell_slot_expenditure(
        slot_expenditure_state,
        spell_invocation_expenditure_request(facts),
    );
    let admitted = facts.has_spell_access
        && legal_spell_invocation_resource_facts(facts)
        && legal_spellcasting_procedure_state(state)
        && spent_turn != state.turn
        && spell_slot_expenditure_accepted(slot_expenditure);
    let slot_expended = admitted && spell_slot_was_expended(slot_expenditure);
    let next_slot_expenditure_state =
        spell_slot_expenditure_result_state(slot_expenditure_state, slot_expenditure);

    SpellInvocationResult {
        state: if !admitted {
            state
        } else {
            SpellcastingProcedureState {
                turn: spent_turn,
                slot_ledger: next_slot_expenditure_state.slot_ledger,
                slot_spell_cast_this_turn: next_slot_expenditure_state.slot_spell_cast_this_turn,
            }
        },
        admitted,
        slot_expended,
    }
}

pub fn resolve_spell_invocation_resource(
    state: SpellcastingProcedureState,
    facts: SpellInvocationResourceFacts,
) -> SpellInvocationResult {
    resolve_spell_invocation_resource_with_action_cost(
        state,
        facts,
        spell_action_cost(facts.invocation_action),
    )
}

pub fn spell_invocation_resource_can_affect_targets(
    invocation: SpellInvocationResult,
    facts: SpellInvocationResourceFacts,
) -> bool {
    invocation.admitted && facts.targets_are_valid
}

pub fn magic_missile_dart_count(slot_level: i32) -> i32 {
    3 + (slot_level - 1)
}

pub fn spell_invocation_target_cardinality(
    profile: SpellDefinitionProfile,
    slot_level: i32,
) -> SpellInvocationTargetCardinality {
    match profile {
        SpellDefinitionProfile::AcidSplash => {
            SpellInvocationTargetCardinality::SpellInvocationOpenUpperTargets {
                minimum_target_count: 1,
            }
        }
        SpellDefinitionProfile::MagicMissile => {
            SpellInvocationTargetCardinality::SpellInvocationBoundedTargets {
                minimum_target_count: 1,
                maximum_target_count: magic_missile_dart_count(slot_level),
            }
        }
        SpellDefinitionProfile::Command => {
            SpellInvocationTargetCardinality::SpellInvocationBoundedTargets {
                minimum_target_count: 1,
                maximum_target_count: command_max_targets(slot_level),
            }
        }
        SpellDefinitionProfile::Longstrider
        | SpellDefinitionProfile::SpiderClimb
        | SpellDefinitionProfile::Fly
        | SpellDefinitionProfile::Aid => {
            let maximum_target_count = scalar_buff_for_spell_profile(profile)
                .map(|spell| scalar_buff_maximum_targets(spell, slot_level))
                .unwrap_or(1);
            SpellInvocationTargetCardinality::SpellInvocationBoundedTargets {
                minimum_target_count: 1,
                maximum_target_count,
            }
        }
        SpellDefinitionProfile::MassHealingWord | SpellDefinitionProfile::MassCureWounds => {
            SpellInvocationTargetCardinality::SpellInvocationBoundedTargets {
                minimum_target_count: 1,
                maximum_target_count: 6,
            }
        }
        SpellDefinitionProfile::RayOfFrost
        | SpellDefinitionProfile::HealingWord
        | SpellDefinitionProfile::CureWounds
        | SpellDefinitionProfile::MageArmor
        | SpellDefinitionProfile::Sanctuary
        | SpellDefinitionProfile::FalseLife
        | SpellDefinitionProfile::ShieldOfFaith
        | SpellDefinitionProfile::Barkskin
        | SpellDefinitionProfile::BlindnessDeafness
        | SpellDefinitionProfile::FaerieFire
        | SpellDefinitionProfile::DivineSmite => {
            SpellInvocationTargetCardinality::SpellInvocationBoundedTargets {
                minimum_target_count: 1,
                maximum_target_count: if profile == SpellDefinitionProfile::BlindnessDeafness {
                    blindness_deafness_maximum_targets(slot_level)
                } else {
                    1
                },
            }
        }
    }
}

pub fn legal_spell_invocation_target_count(
    profile: SpellDefinitionProfile,
    slot_level: i32,
    target_count: i32,
) -> bool {
    legal_spell_invocation_target_cardinality(
        spell_invocation_target_cardinality(profile, slot_level),
        target_count,
    )
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SpellInvocationFacts {
    pub profile: SpellDefinitionProfile,
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub target_count: i32,
    pub targets_are_valid: bool,
}

pub fn spell_profile_action(profile: SpellDefinitionProfile) -> SpellInvocationAction {
    match profile {
        SpellDefinitionProfile::HealingWord
        | SpellDefinitionProfile::MassHealingWord
        | SpellDefinitionProfile::Sanctuary
        | SpellDefinitionProfile::ShieldOfFaith
        | SpellDefinitionProfile::Barkskin
        | SpellDefinitionProfile::DivineSmite => SpellInvocationAction::BonusActionSpellInvocation,
        SpellDefinitionProfile::MagicMissile
        | SpellDefinitionProfile::RayOfFrost
        | SpellDefinitionProfile::AcidSplash
        | SpellDefinitionProfile::CureWounds
        | SpellDefinitionProfile::MassCureWounds
        | SpellDefinitionProfile::MageArmor
        | SpellDefinitionProfile::Command
        | SpellDefinitionProfile::FalseLife
        | SpellDefinitionProfile::Longstrider
        | SpellDefinitionProfile::SpiderClimb
        | SpellDefinitionProfile::Fly
        | SpellDefinitionProfile::Aid
        | SpellDefinitionProfile::BlindnessDeafness
        | SpellDefinitionProfile::FaerieFire => SpellInvocationAction::ActionTimeSpellInvocation,
    }
}

pub fn spell_profile_minimum_slot_level(profile: SpellDefinitionProfile) -> i32 {
    match profile {
        SpellDefinitionProfile::RayOfFrost | SpellDefinitionProfile::AcidSplash => 0,
        SpellDefinitionProfile::MassHealingWord => 3,
        SpellDefinitionProfile::MassCureWounds => 5,
        SpellDefinitionProfile::MagicMissile
        | SpellDefinitionProfile::HealingWord
        | SpellDefinitionProfile::CureWounds
        | SpellDefinitionProfile::MageArmor
        | SpellDefinitionProfile::Command
        | SpellDefinitionProfile::Sanctuary
        | SpellDefinitionProfile::FalseLife
        | SpellDefinitionProfile::Longstrider
        | SpellDefinitionProfile::ShieldOfFaith
        | SpellDefinitionProfile::DivineSmite => 1,
        SpellDefinitionProfile::SpiderClimb
        | SpellDefinitionProfile::Barkskin
        | SpellDefinitionProfile::Aid
        | SpellDefinitionProfile::BlindnessDeafness => 2,
        SpellDefinitionProfile::FaerieFire => 1,
        SpellDefinitionProfile::Fly => 3,
    }
}

pub fn spell_profile_slot_spend(profile: SpellDefinitionProfile) -> SpellInvocationSlotSpend {
    let minimum_slot = spell_profile_minimum_slot_level(profile);
    if minimum_slot == 0 {
        SpellInvocationSlotSpend::SpellInvocationWithoutSlot
    } else {
        SpellInvocationSlotSpend::SpellInvocationWithSlot {
            minimum_slot_level: minimum_slot,
        }
    }
}

pub fn spell_profile_requires_slot(profile: SpellDefinitionProfile) -> bool {
    spell_invocation_slot_spend_requires_slot(spell_profile_slot_spend(profile))
}

pub fn spell_invocation_resource_facts(
    facts: SpellInvocationFacts,
) -> SpellInvocationResourceFacts {
    SpellInvocationResourceFacts {
        invocation_action: spell_profile_action(facts.profile),
        has_spell_access: facts.has_spell_access,
        slot_spend: spell_profile_slot_spend(facts.profile),
        selected_slot_level: facts.selected_slot_level,
        target_count: facts.target_count,
        target_cardinality: spell_invocation_target_cardinality(
            facts.profile,
            facts.selected_slot_level,
        ),
        targets_are_valid: facts.targets_are_valid,
    }
}

pub fn legal_spell_invocation_facts(facts: SpellInvocationFacts) -> bool {
    legal_spell_invocation_resource_facts(spell_invocation_resource_facts(facts))
}

pub fn resolve_spell_invocation(
    state: SpellcastingProcedureState,
    facts: SpellInvocationFacts,
) -> SpellInvocationResult {
    resolve_spell_invocation_resource(state, spell_invocation_resource_facts(facts))
}

pub fn spell_invocation_can_affect_targets(
    invocation: SpellInvocationResult,
    facts: SpellInvocationFacts,
) -> bool {
    spell_invocation_resource_can_affect_targets(invocation, spell_invocation_resource_facts(facts))
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactionSpellProfile {
    Counterspell,
    HellishRebuke,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactionSpellTrigger {
    SpellCastSeenWithin60FeetWithComponents,
    DamageFromVisibleCreatureWithin60Feet,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReactionSpellInvocationFacts {
    pub profile: ReactionSpellProfile,
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub trigger: ReactionSpellTrigger,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CounterspellCastingResource {
    CounterspellMagicAction,
    CounterspellBonusAction,
    CounterspellReaction,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CounterspellReactionFacts {
    pub has_spell_access: bool,
    pub counterspell_slot_level: i32,
    pub triggering_spell_level: i32,
    pub triggering_spell_uses_slot: bool,
    pub triggering_caster_constitution_save_succeeded: bool,
    pub triggering_casting_resource: CounterspellCastingResource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CounterspellReactionResult {
    pub reactor: SpellcastingProcedureState,
    pub triggering_caster: SpellcastingProcedureState,
    pub triggering_spell_ended: bool,
    pub triggering_spell_slot_expended: bool,
    pub reaction_window_cleared: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HellishRebukeReactionFacts {
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub damage_roll: i32,
    pub saving_throw_succeeded: bool,
    pub trigger: ReactionSpellTrigger,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HellishRebukeReactionResult {
    pub reactor: SpellcastingProcedureState,
    pub damaged_reactor: CreatureVitals,
    pub triggering_creature: HitPointRecoveryResult,
    pub reaction_window_cleared: bool,
}

pub fn reaction_spell_minimum_slot_level(profile: ReactionSpellProfile) -> i32 {
    match profile {
        ReactionSpellProfile::Counterspell => 3,
        ReactionSpellProfile::HellishRebuke => 1,
    }
}

pub fn reaction_spell_trigger_matches(
    profile: ReactionSpellProfile,
    trigger: ReactionSpellTrigger,
) -> bool {
    match profile {
        ReactionSpellProfile::Counterspell => {
            trigger == ReactionSpellTrigger::SpellCastSeenWithin60FeetWithComponents
        }
        ReactionSpellProfile::HellishRebuke => {
            trigger == ReactionSpellTrigger::DamageFromVisibleCreatureWithin60Feet
        }
    }
}

pub fn legal_reaction_spell_invocation_facts(facts: ReactionSpellInvocationFacts) -> bool {
    facts.selected_slot_level >= reaction_spell_minimum_slot_level(facts.profile)
        && facts.selected_slot_level <= 9
        && reaction_spell_trigger_matches(facts.profile, facts.trigger)
}

pub fn resolve_reaction_spell_invocation(
    state: SpellcastingProcedureState,
    facts: ReactionSpellInvocationFacts,
) -> SpellInvocationResult {
    let spent_reaction = spend_reaction(state.turn);
    let slot_expenditure_state = spell_invocation_expenditure_state(state);
    let slot_expenditure = apply_spell_slot_expenditure(
        slot_expenditure_state,
        SpellSlotExpenditureRequest::SpellSlotExpenditureRequired {
            slot_level: facts.selected_slot_level,
        },
    );
    let admitted = facts.has_spell_access
        && legal_spellcasting_procedure_state(state)
        && legal_reaction_spell_invocation_facts(facts)
        && spent_reaction != state.turn
        && spell_slot_expenditure_accepted(slot_expenditure);
    let next_slot_expenditure_state =
        spell_slot_expenditure_result_state(slot_expenditure_state, slot_expenditure);

    SpellInvocationResult {
        state: if admitted {
            SpellcastingProcedureState {
                turn: spent_reaction,
                slot_ledger: next_slot_expenditure_state.slot_ledger,
                slot_spell_cast_this_turn: next_slot_expenditure_state.slot_spell_cast_this_turn,
            }
        } else {
            state
        },
        admitted,
        slot_expended: admitted && spell_slot_was_expended(slot_expenditure),
    }
}

pub fn pending_counterspell_ends_triggering_spell(facts: CounterspellReactionFacts) -> bool {
    facts.counterspell_slot_level >= facts.triggering_spell_level
        || !facts.triggering_caster_constitution_save_succeeded
}

pub fn waste_countered_spell_casting_resource(
    state: SpellcastingProcedureState,
    resource: CounterspellCastingResource,
) -> SpellcastingProcedureState {
    let turn = match resource {
        CounterspellCastingResource::CounterspellMagicAction => spend_action_cost(
            state.turn,
            ActionCost::StandardActionCost(StandardAction::Magic),
        ),
        CounterspellCastingResource::CounterspellBonusAction => {
            spend_action_cost(state.turn, ActionCost::BonusActionCost)
        }
        CounterspellCastingResource::CounterspellReaction => spend_reaction(state.turn),
    };

    SpellcastingProcedureState { turn, ..state }
}

pub fn resolve_counterspell_reaction(
    reactor: SpellcastingProcedureState,
    triggering_caster: SpellcastingProcedureState,
    facts: CounterspellReactionFacts,
) -> CounterspellReactionResult {
    let reaction = resolve_reaction_spell_invocation(
        reactor,
        ReactionSpellInvocationFacts {
            profile: ReactionSpellProfile::Counterspell,
            has_spell_access: facts.has_spell_access,
            selected_slot_level: facts.counterspell_slot_level,
            trigger: ReactionSpellTrigger::SpellCastSeenWithin60FeetWithComponents,
        },
    );
    if !reaction.admitted {
        return CounterspellReactionResult {
            reactor,
            triggering_caster,
            triggering_spell_ended: false,
            triggering_spell_slot_expended: false,
            reaction_window_cleared: false,
        };
    }

    let triggering_spell_ended = pending_counterspell_ends_triggering_spell(facts);
    let (triggering_caster, triggering_spell_slot_expended) = if triggering_spell_ended {
        (
            waste_countered_spell_casting_resource(
                triggering_caster,
                facts.triggering_casting_resource,
            ),
            false,
        )
    } else if facts.triggering_spell_uses_slot {
        let expenditure_state = spell_invocation_expenditure_state(triggering_caster);
        let expenditure = apply_spell_slot_expenditure(
            expenditure_state,
            SpellSlotExpenditureRequest::SpellSlotExpenditureRequired {
                slot_level: facts.triggering_spell_level,
            },
        );
        let next_expenditure_state =
            spell_slot_expenditure_result_state(expenditure_state, expenditure);
        (
            SpellcastingProcedureState {
                slot_ledger: next_expenditure_state.slot_ledger,
                slot_spell_cast_this_turn: next_expenditure_state.slot_spell_cast_this_turn,
                ..triggering_caster
            },
            spell_slot_was_expended(expenditure),
        )
    } else {
        (triggering_caster, false)
    };

    CounterspellReactionResult {
        reactor: reaction.state,
        triggering_caster,
        triggering_spell_ended,
        triggering_spell_slot_expended,
        reaction_window_cleared: true,
    }
}

pub fn hellish_rebuke_damage_dice(slot_level: i32) -> i32 {
    if slot_level < 1 {
        0
    } else {
        2 + (slot_level - 1)
    }
}

pub fn legal_hellish_rebuke_reaction_facts(facts: HellishRebukeReactionFacts) -> bool {
    let dice = hellish_rebuke_damage_dice(facts.selected_slot_level);
    facts.damage_roll >= dice
        && facts.damage_roll <= dice * 10
        && facts.trigger == ReactionSpellTrigger::DamageFromVisibleCreatureWithin60Feet
}

pub fn resolve_hellish_rebuke_reaction(
    reactor: SpellcastingProcedureState,
    damaged_reactor: CreatureVitals,
    triggering_creature: CreatureVitals,
    facts: HellishRebukeReactionFacts,
) -> HellishRebukeReactionResult {
    let reaction = if legal_hellish_rebuke_reaction_facts(facts) {
        resolve_reaction_spell_invocation(
            reactor,
            ReactionSpellInvocationFacts {
                profile: ReactionSpellProfile::HellishRebuke,
                has_spell_access: facts.has_spell_access,
                selected_slot_level: facts.selected_slot_level,
                trigger: facts.trigger,
            },
        )
    } else {
        SpellInvocationResult {
            state: reactor,
            admitted: false,
            slot_expended: false,
        }
    };
    let damage = if !reaction.admitted {
        0
    } else if facts.saving_throw_succeeded {
        facts.damage_roll / 2
    } else {
        facts.damage_roll
    };

    HellishRebukeReactionResult {
        reactor: reaction.state,
        damaged_reactor,
        triggering_creature: if reaction.admitted {
            let damage_result =
                apply_resolved_damage_to_positive_hit_points(triggering_creature, damage);
            HitPointRecoveryResult {
                vitals: damage_result.vitals,
                death_saving_throws: death_saving_throw_lifecycle_after_positive_hit_point_damage(
                    DeathSavingThrowLifecycle::reset(),
                    damage_result,
                ),
                positive_hit_point_unconscious_recovery:
                    PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
                hit_points_regained: 0,
            }
        } else {
            HitPointRecoveryResult {
                vitals: triggering_creature,
                death_saving_throws: DeathSavingThrowLifecycle::reset(),
                positive_hit_point_unconscious_recovery:
                    PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
                hit_points_regained: 0,
            }
        },
        reaction_window_cleared: reaction.admitted,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RollModifierSpell {
    BaneRollModifier,
    BlessRollModifier,
    GuidanceRollModifier,
    PassWithoutTraceRollModifier,
    EnhanceAbilityRollModifier,
    EnthrallRollModifier,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RollModifierSkill {
    StealthSkill,
    PerceptionSkill,
    IntimidationSkill,
    OtherSkill,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum D20ModifierSign {
    NoD20Modifier,
    D20ModifierBonus,
    D20ModifierPenalty,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbilityCheckRollMode {
    NormalAbilityCheck,
    AdvantageAbilityCheck,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum D20RollKind {
    AttackRoll,
    SavingThrow,
    AbilityCheck {
        ability: Ability,
        skill: RollModifierSkill,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RollModifierActiveEffect {
    BaneD20RollPenalty,
    BlessD20RollBonus,
    GuidanceAbilityCheckBonus { skill: RollModifierSkill },
    PassWithoutTraceStealthBonus,
    EnhanceAbilityCheckAdvantage { ability: Ability },
    EnthrallPerceptionPenalty,
    ThaumaturgyBoomingVoice { duration_ticks: i32 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct D20RollModifierProjection {
    pub sign: D20ModifierSign,
    pub attack_roll: bool,
    pub saving_throw: bool,
    pub ability_check: bool,
    pub skill: Option<RollModifierSkill>,
}

pub const THAUMATURGY_BOOMING_VOICE_DURATION_TICKS: i32 = 10;
pub const THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS: i32 = 3;

pub fn roll_modifier_choice_active_effect(
    invocation: RollModifierSpell,
    chosen_ability: Ability,
    chosen_skill: RollModifierSkill,
) -> RollModifierActiveEffect {
    match invocation {
        RollModifierSpell::BaneRollModifier => RollModifierActiveEffect::BaneD20RollPenalty,
        RollModifierSpell::BlessRollModifier => RollModifierActiveEffect::BlessD20RollBonus,
        RollModifierSpell::GuidanceRollModifier => {
            RollModifierActiveEffect::GuidanceAbilityCheckBonus {
                skill: chosen_skill,
            }
        }
        RollModifierSpell::PassWithoutTraceRollModifier => {
            RollModifierActiveEffect::PassWithoutTraceStealthBonus
        }
        RollModifierSpell::EnhanceAbilityRollModifier => {
            RollModifierActiveEffect::EnhanceAbilityCheckAdvantage {
                ability: chosen_ability,
            }
        }
        RollModifierSpell::EnthrallRollModifier => {
            RollModifierActiveEffect::EnthrallPerceptionPenalty
        }
    }
}

pub fn roll_modifier_fixed_ability_check_delta(
    effect: RollModifierActiveEffect,
    skill: RollModifierSkill,
) -> i32 {
    match effect {
        RollModifierActiveEffect::PassWithoutTraceStealthBonus => {
            if skill == RollModifierSkill::StealthSkill {
                10
            } else {
                0
            }
        }
        RollModifierActiveEffect::EnthrallPerceptionPenalty => {
            if skill == RollModifierSkill::PerceptionSkill {
                -10
            } else {
                0
            }
        }
        _ => 0,
    }
}

pub fn passive_perception_modifier_delta(effects: &[RollModifierActiveEffect]) -> i32 {
    effects
        .iter()
        .map(|effect| {
            roll_modifier_fixed_ability_check_delta(*effect, RollModifierSkill::PerceptionSkill)
        })
        .sum()
}

pub fn d20_roll_modifier_projection(effect: RollModifierActiveEffect) -> D20RollModifierProjection {
    match effect {
        RollModifierActiveEffect::BaneD20RollPenalty => D20RollModifierProjection {
            sign: D20ModifierSign::D20ModifierPenalty,
            attack_roll: true,
            saving_throw: true,
            ability_check: false,
            skill: None,
        },
        RollModifierActiveEffect::BlessD20RollBonus => D20RollModifierProjection {
            sign: D20ModifierSign::D20ModifierBonus,
            attack_roll: true,
            saving_throw: true,
            ability_check: false,
            skill: None,
        },
        RollModifierActiveEffect::GuidanceAbilityCheckBonus { skill } => {
            D20RollModifierProjection {
                sign: D20ModifierSign::D20ModifierBonus,
                attack_roll: false,
                saving_throw: false,
                ability_check: true,
                skill: Some(skill),
            }
        }
        _ => D20RollModifierProjection {
            sign: D20ModifierSign::NoD20Modifier,
            attack_roll: false,
            saving_throw: false,
            ability_check: false,
            skill: None,
        },
    }
}

pub fn d20_roll_modifier_delta(
    effect: RollModifierActiveEffect,
    roll_kind: D20RollKind,
    d4_roll: i32,
) -> i32 {
    if !(1..=4).contains(&d4_roll) {
        return 0;
    }

    match (effect, roll_kind) {
        (RollModifierActiveEffect::BaneD20RollPenalty, D20RollKind::AttackRoll)
        | (RollModifierActiveEffect::BaneD20RollPenalty, D20RollKind::SavingThrow) => -d4_roll,
        (RollModifierActiveEffect::BlessD20RollBonus, D20RollKind::AttackRoll)
        | (RollModifierActiveEffect::BlessD20RollBonus, D20RollKind::SavingThrow) => d4_roll,
        (
            RollModifierActiveEffect::GuidanceAbilityCheckBonus { skill: selected },
            D20RollKind::AbilityCheck { skill, .. },
        ) if selected == skill => d4_roll,
        _ => roll_modifier_fixed_ability_check_delta(effect, roll_modifier_skill_for(roll_kind)),
    }
}

fn roll_modifier_skill_for(roll_kind: D20RollKind) -> RollModifierSkill {
    match roll_kind {
        D20RollKind::AttackRoll | D20RollKind::SavingThrow => RollModifierSkill::OtherSkill,
        D20RollKind::AbilityCheck { skill, .. } => skill,
    }
}

pub fn thaumaturgy_booming_voice_active_effect() -> RollModifierActiveEffect {
    RollModifierActiveEffect::ThaumaturgyBoomingVoice {
        duration_ticks: THAUMATURGY_BOOMING_VOICE_DURATION_TICKS,
    }
}

pub fn active_effects_contain_thaumaturgy_booming_voice(
    effects: &[RollModifierActiveEffect],
) -> bool {
    effects.iter().any(|effect| {
        matches!(
            effect,
            RollModifierActiveEffect::ThaumaturgyBoomingVoice { .. }
        )
    })
}

pub fn thaumaturgy_active_one_minute_effect_count_after_booming_voice_cast(
    effects: &[RollModifierActiveEffect],
    active_one_minute_effect_count: i32,
) -> i32 {
    if active_effects_contain_thaumaturgy_booming_voice(effects) {
        active_one_minute_effect_count
    } else {
        active_one_minute_effect_count + 1
    }
}

pub fn thaumaturgy_booming_voice_ability_check_roll_mode(
    effects: &[RollModifierActiveEffect],
    ability: Ability,
    skill: RollModifierSkill,
) -> AbilityCheckRollMode {
    if ability == Ability::Charisma
        && skill == RollModifierSkill::IntimidationSkill
        && active_effects_contain_thaumaturgy_booming_voice(effects)
    {
        AbilityCheckRollMode::AdvantageAbilityCheck
    } else {
        AbilityCheckRollMode::NormalAbilityCheck
    }
}

pub fn can_add_thaumaturgy_booming_voice(
    effects: &[RollModifierActiveEffect],
    active_one_minute_effect_count: i32,
) -> bool {
    active_one_minute_effect_count >= 0
        && thaumaturgy_active_one_minute_effect_count_after_booming_voice_cast(
            effects,
            active_one_minute_effect_count,
        ) <= THAUMATURGY_MAX_ACTIVE_ONE_MINUTE_EFFECTS
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScalarBuffSpell {
    FalseLifeScalarBuff,
    LongstriderScalarBuff,
    ShieldOfFaithScalarBuff,
    SpiderClimbScalarBuff,
    FlyScalarBuff,
    BarkskinScalarBuff,
    AidScalarBuff,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ScalarBuffActiveEffect {
    LongstriderSpeedDelta,
    ShieldOfFaithArmorClassBonus,
    SpiderClimbClimbSpeedGrant { duration_ticks: i32 },
    FlySpeedHoverGrant { duration_ticks: i32 },
    BarkskinArmorClassFloor { duration_ticks: i32 },
    AidHitPointMaximumIncrease { amount: i32, duration_ticks: i32 },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScalarBuffTargetState {
    pub vitals: CreatureVitals,
    pub active_effects: Vec<ScalarBuffActiveEffect>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScalarBuffBaseStats {
    pub armor_class: i32,
    pub speed_feet: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScalarBuffProjection {
    pub armor_class: i32,
    pub speed_feet: i32,
    pub climb_speed_feet: i32,
    pub fly_speed_feet: i32,
    pub hit_points: i32,
    pub hit_point_maximum: i32,
    pub temporary_hit_points: i32,
    pub armor_class_bonus_active: bool,
    pub speed_delta_active: bool,
    pub special_speed_grant_active: bool,
    pub hit_point_maximum_increase_active: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ScalarBuffSpellFacts {
    pub invocation: ScalarBuffSpell,
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub target_count: i32,
    pub targets_are_valid: bool,
    pub all_targets_willing: bool,
    pub false_life_rolled_dice: i32,
    pub temporary_hit_point_choice: TemporaryHitPointChoice,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScalarBuffSpellResult {
    pub invocation: SpellInvocationResult,
    pub target: ScalarBuffTargetState,
    pub caster_concentrating: bool,
    pub target_effected: bool,
}

pub const LONGSTRIDER_SPEED_DELTA_FEET: i32 = 10;
pub const SHIELD_OF_FAITH_ARMOR_CLASS_BONUS: i32 = 2;
pub const BARKSKIN_ARMOR_CLASS_FLOOR: i32 = 17;
pub const SPIDER_CLIMB_DURATION_TICKS: i32 = 600;
pub const FLY_DURATION_TICKS: i32 = 100;
pub const BARKSKIN_DURATION_TICKS: i32 = 600;
pub const AID_DURATION_TICKS: i32 = 4800;

pub fn scalar_buff_spell_profile(spell: ScalarBuffSpell) -> SpellDefinitionProfile {
    match spell {
        ScalarBuffSpell::FalseLifeScalarBuff => SpellDefinitionProfile::FalseLife,
        ScalarBuffSpell::LongstriderScalarBuff => SpellDefinitionProfile::Longstrider,
        ScalarBuffSpell::ShieldOfFaithScalarBuff => SpellDefinitionProfile::ShieldOfFaith,
        ScalarBuffSpell::SpiderClimbScalarBuff => SpellDefinitionProfile::SpiderClimb,
        ScalarBuffSpell::FlyScalarBuff => SpellDefinitionProfile::Fly,
        ScalarBuffSpell::BarkskinScalarBuff => SpellDefinitionProfile::Barkskin,
        ScalarBuffSpell::AidScalarBuff => SpellDefinitionProfile::Aid,
    }
}

pub fn scalar_buff_for_spell_profile(profile: SpellDefinitionProfile) -> Option<ScalarBuffSpell> {
    match profile {
        SpellDefinitionProfile::FalseLife => Some(ScalarBuffSpell::FalseLifeScalarBuff),
        SpellDefinitionProfile::Longstrider => Some(ScalarBuffSpell::LongstriderScalarBuff),
        SpellDefinitionProfile::ShieldOfFaith => Some(ScalarBuffSpell::ShieldOfFaithScalarBuff),
        SpellDefinitionProfile::SpiderClimb => Some(ScalarBuffSpell::SpiderClimbScalarBuff),
        SpellDefinitionProfile::Fly => Some(ScalarBuffSpell::FlyScalarBuff),
        SpellDefinitionProfile::Barkskin => Some(ScalarBuffSpell::BarkskinScalarBuff),
        SpellDefinitionProfile::Aid => Some(ScalarBuffSpell::AidScalarBuff),
        _ => None,
    }
}

pub fn scalar_buff_maximum_targets(spell: ScalarBuffSpell, slot_level: i32) -> i32 {
    match spell {
        ScalarBuffSpell::LongstriderScalarBuff => slot_level,
        ScalarBuffSpell::SpiderClimbScalarBuff => 1 + (slot_level - 2).max(0),
        ScalarBuffSpell::FlyScalarBuff => 1 + (slot_level - 3).max(0),
        ScalarBuffSpell::AidScalarBuff => 3,
        ScalarBuffSpell::FalseLifeScalarBuff
        | ScalarBuffSpell::ShieldOfFaithScalarBuff
        | ScalarBuffSpell::BarkskinScalarBuff => 1,
    }
}

pub fn scalar_buff_requires_willing_targets(spell: ScalarBuffSpell) -> bool {
    matches!(
        spell,
        ScalarBuffSpell::BarkskinScalarBuff
            | ScalarBuffSpell::SpiderClimbScalarBuff
            | ScalarBuffSpell::FlyScalarBuff
    )
}

pub fn scalar_buff_requires_concentration(spell: ScalarBuffSpell) -> bool {
    matches!(
        spell,
        ScalarBuffSpell::ShieldOfFaithScalarBuff
            | ScalarBuffSpell::SpiderClimbScalarBuff
            | ScalarBuffSpell::FlyScalarBuff
    )
}

pub fn scalar_buff_target_disposition_is_satisfied(
    spell: ScalarBuffSpell,
    all_targets_willing: bool,
) -> bool {
    !scalar_buff_requires_willing_targets(spell) || all_targets_willing
}

pub fn scalar_buff_temporary_hit_points(
    spell: ScalarBuffSpell,
    slot_level: i32,
    rolled_dice: i32,
) -> i32 {
    match spell {
        ScalarBuffSpell::FalseLifeScalarBuff => rolled_dice + 4 + (slot_level - 1).max(0) * 5,
        _ => 0,
    }
}

pub fn scalar_buff_aid_hit_point_maximum_increase(slot_level: i32) -> i32 {
    5 + (slot_level - 2).max(0) * 5
}

pub fn scalar_buff_active_effects(
    spell: ScalarBuffSpell,
    slot_level: i32,
) -> Vec<ScalarBuffActiveEffect> {
    match spell {
        ScalarBuffSpell::FalseLifeScalarBuff => Vec::new(),
        ScalarBuffSpell::LongstriderScalarBuff => {
            vec![ScalarBuffActiveEffect::LongstriderSpeedDelta]
        }
        ScalarBuffSpell::ShieldOfFaithScalarBuff => {
            vec![ScalarBuffActiveEffect::ShieldOfFaithArmorClassBonus]
        }
        ScalarBuffSpell::SpiderClimbScalarBuff => {
            vec![ScalarBuffActiveEffect::SpiderClimbClimbSpeedGrant {
                duration_ticks: SPIDER_CLIMB_DURATION_TICKS,
            }]
        }
        ScalarBuffSpell::FlyScalarBuff => vec![ScalarBuffActiveEffect::FlySpeedHoverGrant {
            duration_ticks: FLY_DURATION_TICKS,
        }],
        ScalarBuffSpell::BarkskinScalarBuff => {
            vec![ScalarBuffActiveEffect::BarkskinArmorClassFloor {
                duration_ticks: BARKSKIN_DURATION_TICKS,
            }]
        }
        ScalarBuffSpell::AidScalarBuff => {
            vec![ScalarBuffActiveEffect::AidHitPointMaximumIncrease {
                amount: scalar_buff_aid_hit_point_maximum_increase(slot_level),
                duration_ticks: AID_DURATION_TICKS,
            }]
        }
    }
}

pub fn active_effects_contain_scalar_buff(
    effects: &[ScalarBuffActiveEffect],
    effect: ScalarBuffActiveEffect,
) -> bool {
    effects.contains(&effect)
}

pub fn active_effects_contain_kind_longstrider(effects: &[ScalarBuffActiveEffect]) -> bool {
    effects.contains(&ScalarBuffActiveEffect::LongstriderSpeedDelta)
}

pub fn active_effects_contain_kind_shield_of_faith(effects: &[ScalarBuffActiveEffect]) -> bool {
    effects.contains(&ScalarBuffActiveEffect::ShieldOfFaithArmorClassBonus)
}

pub fn active_effects_contain_kind_spider_climb(effects: &[ScalarBuffActiveEffect]) -> bool {
    effects.iter().any(|effect| {
        matches!(
            effect,
            ScalarBuffActiveEffect::SpiderClimbClimbSpeedGrant { .. }
        )
    })
}

pub fn active_effects_contain_kind_fly(effects: &[ScalarBuffActiveEffect]) -> bool {
    effects
        .iter()
        .any(|effect| matches!(effect, ScalarBuffActiveEffect::FlySpeedHoverGrant { .. }))
}

pub fn active_effects_contain_kind_barkskin(effects: &[ScalarBuffActiveEffect]) -> bool {
    effects.iter().any(|effect| {
        matches!(
            effect,
            ScalarBuffActiveEffect::BarkskinArmorClassFloor { .. }
        )
    })
}

pub fn aid_hit_point_maximum_increase_applied_amount(effects: &[ScalarBuffActiveEffect]) -> i32 {
    effects
        .iter()
        .map(|effect| match effect {
            ScalarBuffActiveEffect::AidHitPointMaximumIncrease { amount, .. } => *amount,
            _ => 0,
        })
        .max()
        .unwrap_or(0)
}

pub fn active_effects_contain_kind_aid(effects: &[ScalarBuffActiveEffect]) -> bool {
    aid_hit_point_maximum_increase_applied_amount(effects) > 0
}

fn scalar_buff_effects_with_added(
    mut effects: Vec<ScalarBuffActiveEffect>,
    added: &[ScalarBuffActiveEffect],
) -> Vec<ScalarBuffActiveEffect> {
    for effect in added {
        if !effects.contains(effect) {
            effects.push(*effect);
        }
    }
    effects
}

pub fn scalar_buff_project_target(
    target: &ScalarBuffTargetState,
    base_stats: ScalarBuffBaseStats,
) -> ScalarBuffProjection {
    let speed_delta = if active_effects_contain_kind_longstrider(&target.active_effects) {
        LONGSTRIDER_SPEED_DELTA_FEET
    } else {
        0
    };
    let speed_feet = base_stats.speed_feet + speed_delta;
    let armor_class_with_bonus = base_stats.armor_class
        + if active_effects_contain_kind_shield_of_faith(&target.active_effects) {
            SHIELD_OF_FAITH_ARMOR_CLASS_BONUS
        } else {
            0
        };
    let armor_class = if active_effects_contain_kind_barkskin(&target.active_effects) {
        armor_class_with_bonus.max(BARKSKIN_ARMOR_CLASS_FLOOR)
    } else {
        armor_class_with_bonus
    };
    let climb_speed_feet = if active_effects_contain_kind_spider_climb(&target.active_effects) {
        speed_feet
    } else {
        0
    };
    let fly_speed_feet = if active_effects_contain_kind_fly(&target.active_effects) {
        60 + speed_delta
    } else {
        0
    };

    ScalarBuffProjection {
        armor_class,
        speed_feet,
        climb_speed_feet,
        fly_speed_feet,
        hit_points: target.vitals.hit_points(),
        hit_point_maximum: target.vitals.hit_point_maximum(),
        temporary_hit_points: target.vitals.temporary_hit_points(),
        armor_class_bonus_active: active_effects_contain_kind_shield_of_faith(
            &target.active_effects,
        ),
        speed_delta_active: active_effects_contain_kind_longstrider(&target.active_effects),
        special_speed_grant_active: active_effects_contain_kind_spider_climb(
            &target.active_effects,
        ) || active_effects_contain_kind_fly(&target.active_effects),
        hit_point_maximum_increase_active: active_effects_contain_kind_aid(&target.active_effects),
    }
}

pub fn scalar_buff_target_after_aid(
    target: ScalarBuffTargetState,
    effects: &[ScalarBuffActiveEffect],
) -> ScalarBuffTargetState {
    let active_amount = aid_hit_point_maximum_increase_applied_amount(&target.active_effects);
    let active_effects = scalar_buff_effects_with_added(target.active_effects, effects);
    let next_active_amount = aid_hit_point_maximum_increase_applied_amount(&active_effects);
    let increase = next_active_amount - active_amount;

    ScalarBuffTargetState {
        vitals: CreatureVitals::assume_legal(
            target.vitals.kind(),
            target.vitals.hit_points() + increase,
            target.vitals.hit_point_maximum() + increase,
            target.vitals.temporary_hit_points(),
            target.vitals.is_dead(),
            target.vitals.is_unconscious(),
        ),
        active_effects,
    }
}

pub fn scalar_buff_target_after_effect(
    target: ScalarBuffTargetState,
    spell: ScalarBuffSpell,
    slot_level: i32,
    rolled_dice: i32,
    temporary_hit_point_choice: TemporaryHitPointChoice,
) -> ScalarBuffTargetState {
    let effects = scalar_buff_active_effects(spell, slot_level);
    match spell {
        ScalarBuffSpell::FalseLifeScalarBuff => ScalarBuffTargetState {
            vitals: grant_temporary_hit_points(
                target.vitals,
                scalar_buff_temporary_hit_points(spell, slot_level, rolled_dice),
                temporary_hit_point_choice,
            ),
            active_effects: target.active_effects,
        },
        ScalarBuffSpell::AidScalarBuff => scalar_buff_target_after_aid(target, &effects),
        _ => ScalarBuffTargetState {
            vitals: target.vitals,
            active_effects: scalar_buff_effects_with_added(target.active_effects, &effects),
        },
    }
}

pub fn legal_scalar_buff_spell_facts(facts: ScalarBuffSpellFacts) -> bool {
    facts.target_count >= 1
        && scalar_buff_target_disposition_is_satisfied(facts.invocation, facts.all_targets_willing)
        && (facts.invocation != ScalarBuffSpell::FalseLifeScalarBuff
            || (2..=8).contains(&facts.false_life_rolled_dice))
}

pub fn resolve_scalar_buff_spell(
    state: SpellcastingProcedureState,
    caster_concentrating: bool,
    target: ScalarBuffTargetState,
    facts: ScalarBuffSpellFacts,
) -> ScalarBuffSpellResult {
    let invocation_facts = SpellInvocationFacts {
        profile: scalar_buff_spell_profile(facts.invocation),
        has_spell_access: facts.has_spell_access,
        selected_slot_level: facts.selected_slot_level,
        target_count: facts.target_count,
        targets_are_valid: facts.targets_are_valid,
    };
    let invocation = if legal_scalar_buff_spell_facts(facts) {
        resolve_spell_invocation(state, invocation_facts)
    } else {
        SpellInvocationResult {
            state,
            admitted: false,
            slot_expended: false,
        }
    };
    let target_effected = spell_invocation_can_affect_targets(invocation, invocation_facts);
    let target = if target_effected {
        scalar_buff_target_after_effect(
            target,
            facts.invocation,
            facts.selected_slot_level,
            facts.false_life_rolled_dice,
            facts.temporary_hit_point_choice,
        )
    } else {
        target
    };
    let caster_concentrating =
        if invocation.admitted && scalar_buff_requires_concentration(facts.invocation) {
            true
        } else {
            caster_concentrating
        };

    ScalarBuffSpellResult {
        invocation,
        target,
        caster_concentrating,
        target_effected,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellSavingThrowAbility {
    SpellStrengthSavingThrow,
    SpellDexteritySavingThrow,
    SpellConstitutionSavingThrow,
    SpellWisdomSavingThrow,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BlindnessDeafnessConditionChoice {
    BlindnessDeafnessBlindedChoice,
    BlindnessDeafnessDeafenedChoice,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SaveGatedConditionSource {
    PrimaryCaster,
    OtherSource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SaveGatedConditionActiveEffect {
    BlindnessDeafnessBlinded {
        source: SaveGatedConditionSource,
        duration_ticks: i32,
    },
    BlindnessDeafnessDeafened {
        source: SaveGatedConditionSource,
        duration_ticks: i32,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SaveGatedConditionTargetState {
    pub active_effects: Vec<SaveGatedConditionActiveEffect>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SaveGatedConditionProjection {
    pub blinded: bool,
    pub deafened: bool,
    pub restrained: bool,
    pub paralyzed: bool,
    pub incapacitated: bool,
    pub unconscious: bool,
    pub prone: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BlindnessDeafnessSpellFacts {
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub target_count: i32,
    pub targets_are_valid: bool,
    pub source: SaveGatedConditionSource,
    pub choice: BlindnessDeafnessConditionChoice,
    pub saving_throw_succeeded: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlindnessDeafnessSpellResult {
    pub invocation: SpellInvocationResult,
    pub target: SaveGatedConditionTargetState,
    pub target_effected: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlindnessDeafnessRepeatSaveResult {
    pub target: SaveGatedConditionTargetState,
    pub effect_ended: bool,
}

pub const BLINDNESS_DEAFNESS_DURATION_TICKS: i32 = 10;

pub fn blindness_deafness_maximum_targets(slot_level: i32) -> i32 {
    1 + (slot_level - 2).max(0)
}

pub fn blindness_deafness_saving_throw_ability() -> SpellSavingThrowAbility {
    SpellSavingThrowAbility::SpellConstitutionSavingThrow
}

pub fn blindness_deafness_active_effect(
    choice: BlindnessDeafnessConditionChoice,
    source: SaveGatedConditionSource,
) -> SaveGatedConditionActiveEffect {
    match choice {
        BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice => {
            SaveGatedConditionActiveEffect::BlindnessDeafnessBlinded {
                source,
                duration_ticks: BLINDNESS_DEAFNESS_DURATION_TICKS,
            }
        }
        BlindnessDeafnessConditionChoice::BlindnessDeafnessDeafenedChoice => {
            SaveGatedConditionActiveEffect::BlindnessDeafnessDeafened {
                source,
                duration_ticks: BLINDNESS_DEAFNESS_DURATION_TICKS,
            }
        }
    }
}

pub fn blindness_deafness_effect_matches_choice_source(
    effect: SaveGatedConditionActiveEffect,
    choice: BlindnessDeafnessConditionChoice,
    source: SaveGatedConditionSource,
) -> bool {
    matches!(
        (effect, choice),
        (
            SaveGatedConditionActiveEffect::BlindnessDeafnessBlinded {
                source: effect_source,
                ..
            },
            BlindnessDeafnessConditionChoice::BlindnessDeafnessBlindedChoice
        ) if effect_source == source
    ) || matches!(
        (effect, choice),
        (
            SaveGatedConditionActiveEffect::BlindnessDeafnessDeafened {
                source: effect_source,
                ..
            },
            BlindnessDeafnessConditionChoice::BlindnessDeafnessDeafenedChoice
        ) if effect_source == source
    )
}

pub fn active_effects_without_blindness_deafness_choice_from(
    effects: &[SaveGatedConditionActiveEffect],
    choice: BlindnessDeafnessConditionChoice,
    source: SaveGatedConditionSource,
) -> Vec<SaveGatedConditionActiveEffect> {
    effects
        .iter()
        .copied()
        .filter(|effect| !blindness_deafness_effect_matches_choice_source(*effect, choice, source))
        .collect()
}

pub fn blindness_deafness_repeat_save_due(
    effects: &[SaveGatedConditionActiveEffect],
    source: SaveGatedConditionSource,
    choice: BlindnessDeafnessConditionChoice,
) -> bool {
    effects
        .iter()
        .any(|effect| blindness_deafness_effect_matches_choice_source(*effect, choice, source))
}

pub fn save_gated_condition_projection(
    target: &SaveGatedConditionTargetState,
) -> SaveGatedConditionProjection {
    SaveGatedConditionProjection {
        blinded: target.active_effects.iter().any(|effect| {
            matches!(
                effect,
                SaveGatedConditionActiveEffect::BlindnessDeafnessBlinded { .. }
            )
        }),
        deafened: target.active_effects.iter().any(|effect| {
            matches!(
                effect,
                SaveGatedConditionActiveEffect::BlindnessDeafnessDeafened { .. }
            )
        }),
        restrained: false,
        paralyzed: false,
        incapacitated: false,
        unconscious: false,
        prone: false,
    }
}

pub fn blindness_deafness_target(
    target: SaveGatedConditionTargetState,
    saving_throw_succeeded: bool,
    source: SaveGatedConditionSource,
    choice: BlindnessDeafnessConditionChoice,
) -> SaveGatedConditionTargetState {
    if saving_throw_succeeded {
        return target;
    }

    let mut active_effects = active_effects_without_blindness_deafness_choice_from(
        &target.active_effects,
        choice,
        source,
    );
    let effect = blindness_deafness_active_effect(choice, source);
    if !active_effects.contains(&effect) {
        active_effects.push(effect);
    }

    SaveGatedConditionTargetState { active_effects }
}

pub fn legal_blindness_deafness_spell_facts(facts: BlindnessDeafnessSpellFacts) -> bool {
    legal_spell_invocation_target_count(
        SpellDefinitionProfile::BlindnessDeafness,
        facts.selected_slot_level,
        facts.target_count,
    )
}

pub fn resolve_blindness_deafness_spell(
    state: SpellcastingProcedureState,
    target: SaveGatedConditionTargetState,
    facts: BlindnessDeafnessSpellFacts,
) -> BlindnessDeafnessSpellResult {
    let invocation_facts = SpellInvocationFacts {
        profile: SpellDefinitionProfile::BlindnessDeafness,
        has_spell_access: facts.has_spell_access,
        selected_slot_level: facts.selected_slot_level,
        target_count: facts.target_count,
        targets_are_valid: facts.targets_are_valid,
    };
    let invocation = if legal_blindness_deafness_spell_facts(facts) {
        resolve_spell_invocation(state, invocation_facts)
    } else {
        SpellInvocationResult {
            state,
            admitted: false,
            slot_expended: false,
        }
    };
    let target_effected = spell_invocation_can_affect_targets(invocation, invocation_facts);
    let target = if target_effected {
        blindness_deafness_target(
            target,
            facts.saving_throw_succeeded,
            facts.source,
            facts.choice,
        )
    } else {
        target
    };

    BlindnessDeafnessSpellResult {
        invocation,
        target,
        target_effected,
    }
}

pub fn end_turn_with_blindness_deafness_repeat_save(
    target: SaveGatedConditionTargetState,
    source: SaveGatedConditionSource,
    choice: BlindnessDeafnessConditionChoice,
    saving_throw_succeeded: bool,
) -> BlindnessDeafnessRepeatSaveResult {
    let effect_due = blindness_deafness_repeat_save_due(&target.active_effects, source, choice);
    if saving_throw_succeeded && effect_due {
        BlindnessDeafnessRepeatSaveResult {
            target: SaveGatedConditionTargetState {
                active_effects: active_effects_without_blindness_deafness_choice_from(
                    &target.active_effects,
                    choice,
                    source,
                ),
            },
            effect_ended: true,
        }
    } else {
        BlindnessDeafnessRepeatSaveResult {
            target,
            effect_ended: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellAttackRollMode {
    NormalSpellAttackRoll,
    AdvantageSpellAttackRoll,
    DisadvantageSpellAttackRoll,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FaerieFireActiveEffect {
    FaerieFireOutline,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FaerieFireObjectOutline {
    pub object_id: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FaerieFireTargetState {
    pub active_effects: Vec<FaerieFireActiveEffect>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FaerieFireSpellFacts {
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub area_witness_valid: bool,
    pub creature_target_count: i32,
    pub failed_creature_save_count: i32,
    pub failed_creatures_are_in_area: bool,
    pub object_target_count: i32,
    pub object_targets_are_in_area: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FaerieFireSpellResult {
    pub invocation: SpellInvocationResult,
    pub outlined_creature_count: i32,
    pub object_outlines: Vec<FaerieFireObjectOutline>,
    pub caster_concentrating: bool,
}

pub fn attack_roll_mode_from_flags(
    has_advantage: bool,
    has_disadvantage: bool,
) -> SpellAttackRollMode {
    match (has_advantage, has_disadvantage) {
        (true, false) => SpellAttackRollMode::AdvantageSpellAttackRoll,
        (false, true) => SpellAttackRollMode::DisadvantageSpellAttackRoll,
        _ => SpellAttackRollMode::NormalSpellAttackRoll,
    }
}

pub fn faerie_fire_failed_save_active_effects() -> Vec<FaerieFireActiveEffect> {
    vec![FaerieFireActiveEffect::FaerieFireOutline]
}

pub fn faerie_fire_target(
    target: FaerieFireTargetState,
    saving_throw_succeeded: bool,
) -> FaerieFireTargetState {
    if saving_throw_succeeded {
        return target;
    }

    let mut active_effects = target.active_effects;
    for effect in faerie_fire_failed_save_active_effects() {
        if !active_effects.contains(&effect) {
            active_effects.push(effect);
        }
    }
    FaerieFireTargetState { active_effects }
}

pub fn faerie_fire_target_is_outlined(effects: &[FaerieFireActiveEffect]) -> bool {
    effects.contains(&FaerieFireActiveEffect::FaerieFireOutline)
}

pub fn faerie_fire_active_effects_grant_attack_roll_advantage(
    target_effects: &[FaerieFireActiveEffect],
    attacker_can_see_target: bool,
) -> bool {
    attacker_can_see_target && faerie_fire_target_is_outlined(target_effects)
}

pub fn faerie_fire_creature_attack_roll_mode(
    attacker_has_disadvantage: bool,
    target_effects: &[FaerieFireActiveEffect],
    attacker_can_see_target: bool,
) -> SpellAttackRollMode {
    attack_roll_mode_from_flags(
        faerie_fire_active_effects_grant_attack_roll_advantage(
            target_effects,
            attacker_can_see_target,
        ),
        attacker_has_disadvantage,
    )
}

pub fn faerie_fire_active_effects_deny_invisible_benefit(
    target_effects: &[FaerieFireActiveEffect],
) -> bool {
    faerie_fire_target_is_outlined(target_effects)
}

pub fn faerie_fire_object_outline_matches(
    outline: FaerieFireObjectOutline,
    object_id: i32,
) -> bool {
    outline.object_id == object_id
}

pub fn faerie_fire_object_outlines_grant_attack_roll_advantage(
    outlines: &[FaerieFireObjectOutline],
    object_id: i32,
    attacker_can_see_object: bool,
) -> bool {
    attacker_can_see_object
        && outlines
            .iter()
            .any(|outline| faerie_fire_object_outline_matches(*outline, object_id))
}

pub fn faerie_fire_object_attack_roll_mode(
    attacker_has_disadvantage: bool,
    outlines: &[FaerieFireObjectOutline],
    object_id: i32,
    attacker_can_see_object: bool,
) -> SpellAttackRollMode {
    attack_roll_mode_from_flags(
        faerie_fire_object_outlines_grant_attack_roll_advantage(
            outlines,
            object_id,
            attacker_can_see_object,
        ),
        attacker_has_disadvantage,
    )
}

pub fn faerie_fire_object_outlines_deny_invisible_benefit(
    outlines: &[FaerieFireObjectOutline],
    object_id: i32,
) -> bool {
    outlines
        .iter()
        .any(|outline| faerie_fire_object_outline_matches(*outline, object_id))
}

pub fn legal_faerie_fire_spell_facts(facts: &FaerieFireSpellFacts) -> bool {
    facts.creature_target_count >= 0
        && facts.failed_creature_save_count >= 0
        && facts.failed_creature_save_count <= facts.creature_target_count
        && facts.failed_creatures_are_in_area
        && facts.object_target_count >= 0
        && facts.object_targets_are_in_area
}

pub fn resolve_faerie_fire_spell(
    state: SpellcastingProcedureState,
    facts: FaerieFireSpellFacts,
) -> FaerieFireSpellResult {
    let invocation_facts = SpellInvocationFacts {
        profile: SpellDefinitionProfile::FaerieFire,
        has_spell_access: facts.has_spell_access,
        selected_slot_level: facts.selected_slot_level,
        target_count: 1,
        targets_are_valid: facts.area_witness_valid,
    };
    let invocation = if legal_faerie_fire_spell_facts(&facts) {
        resolve_spell_invocation(state, invocation_facts)
    } else {
        SpellInvocationResult {
            state,
            admitted: false,
            slot_expended: false,
        }
    };
    let can_affect_targets = spell_invocation_can_affect_targets(invocation, invocation_facts);
    let object_outlines = if can_affect_targets {
        (0..facts.object_target_count)
            .map(|object_id| FaerieFireObjectOutline { object_id })
            .collect()
    } else {
        Vec::new()
    };

    FaerieFireSpellResult {
        invocation,
        outlined_creature_count: if can_affect_targets {
            facts.failed_creature_save_count
        } else {
            0
        },
        object_outlines,
        caster_concentrating: can_affect_targets,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum DamageType {
    Acid,
    Bludgeoning,
    Cold,
    Fire,
    Force,
    Lightning,
    Necrotic,
    Piercing,
    Poison,
    Psychic,
    Radiant,
    Slashing,
    Thunder,
}

pub const ALL_DAMAGE_TYPES: [DamageType; 13] = [
    DamageType::Acid,
    DamageType::Bludgeoning,
    DamageType::Cold,
    DamageType::Fire,
    DamageType::Force,
    DamageType::Lightning,
    DamageType::Necrotic,
    DamageType::Piercing,
    DamageType::Poison,
    DamageType::Psychic,
    DamageType::Radiant,
    DamageType::Slashing,
    DamageType::Thunder,
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellAttackHitProjection {
    SpellAttackSpeedReductionHitProjection,
    SpellAttackHitPointRegainPreventionHitProjection,
    SpellAttackInvisibleBenefitDeniedHitProjection,
    SpellAttackOpportunityAttackDeniedHitProjection,
    SpellAttackNextAttackAdvantageHitProjection,
    SpellAttackPoisonedHitProjection,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellFailedSaveProjection {
    SpellSaveNextAttackDisadvantageFailedProjection,
    SpellSavePush10FeetFailedProjection,
    SpellSaveForcedReactionMovementFailedProjection,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellSaveSuccessDamagePolicy {
    SpellNoDamageOnSuccessfulSave,
    SpellHalfDamageOnSuccessfulSave,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellAttackDamageProfile {
    RayOfFrostSpellAttackProfile,
    PoisonSpraySpellAttackProfile,
    ChillTouchSpellAttackProfile,
    StarryWispSpellAttackProfile,
    FireBoltSpellAttackProfile,
    ShockingGraspSpellAttackProfile,
    GuidingBoltSpellAttackProfile,
    RayOfSicknessSpellAttackProfile,
    ProduceFlameHurlSpellAttackProfile,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellSaveGatedDamageProfile {
    AcidSplashSaveDamageProfile,
    SacredFlameSaveDamageProfile,
    InflictWoundsSaveDamageProfile,
    BurningHandsSaveDamageProfile,
    FireballSaveDamageProfile,
    LightningBoltSaveDamageProfile,
    ViciousMockerySaveDamageProfile,
    ThunderwaveSaveDamageProfile,
    DissonantWhispersSaveDamageProfile,
    HellishRebukeSaveDamageProfile,
    MindSpikeSaveDamageProfile,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SpellSaveGatedTargeting {
    SpellSingleSaveTarget,
    SpellAreaSaveTargets,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpellAttackDamageBranchFacts {
    pub attack_roll: AttackRollProcedureFacts,
    pub damage_type: DamageType,
    pub hit_projections: Vec<SpellAttackHitProjection>,
    pub base_damage_dice: i32,
    pub maximum_base_damage_dice: i32,
    pub rolled_damage_dice_count: i32,
    pub damage_die_size: i32,
    pub damage_roll: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpellAttackDamageBranchResult {
    pub damage_amount: i32,
    pub damage_type: DamageType,
    pub hit_projections: Vec<SpellAttackHitProjection>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpellSaveDamageBranchFacts {
    pub damage_type: DamageType,
    pub success_policy: SpellSaveSuccessDamagePolicy,
    pub failed_save_projections: Vec<SpellFailedSaveProjection>,
    pub saving_throw_failed: bool,
    pub damage_roll: i32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpellSaveDamageBranchResult {
    pub damage_amount: i32,
    pub damage_type: DamageType,
    pub failed_save_projections: Vec<SpellFailedSaveProjection>,
}

pub fn spell_attack_damage_profile_damage_type(profile: SpellAttackDamageProfile) -> DamageType {
    match profile {
        SpellAttackDamageProfile::RayOfFrostSpellAttackProfile => DamageType::Cold,
        SpellAttackDamageProfile::PoisonSpraySpellAttackProfile => DamageType::Poison,
        SpellAttackDamageProfile::ChillTouchSpellAttackProfile => DamageType::Necrotic,
        SpellAttackDamageProfile::StarryWispSpellAttackProfile => DamageType::Radiant,
        SpellAttackDamageProfile::FireBoltSpellAttackProfile => DamageType::Fire,
        SpellAttackDamageProfile::ShockingGraspSpellAttackProfile => DamageType::Lightning,
        SpellAttackDamageProfile::GuidingBoltSpellAttackProfile => DamageType::Radiant,
        SpellAttackDamageProfile::RayOfSicknessSpellAttackProfile => DamageType::Poison,
        SpellAttackDamageProfile::ProduceFlameHurlSpellAttackProfile => DamageType::Fire,
    }
}

pub fn spell_attack_damage_profile_hit_effects(
    profile: SpellAttackDamageProfile,
) -> Vec<SpellAttackHitProjection> {
    match profile {
        SpellAttackDamageProfile::RayOfFrostSpellAttackProfile => {
            vec![SpellAttackHitProjection::SpellAttackSpeedReductionHitProjection]
        }
        SpellAttackDamageProfile::ChillTouchSpellAttackProfile => {
            vec![SpellAttackHitProjection::SpellAttackHitPointRegainPreventionHitProjection]
        }
        SpellAttackDamageProfile::StarryWispSpellAttackProfile => {
            vec![SpellAttackHitProjection::SpellAttackInvisibleBenefitDeniedHitProjection]
        }
        SpellAttackDamageProfile::ShockingGraspSpellAttackProfile => {
            vec![SpellAttackHitProjection::SpellAttackOpportunityAttackDeniedHitProjection]
        }
        SpellAttackDamageProfile::GuidingBoltSpellAttackProfile => {
            vec![SpellAttackHitProjection::SpellAttackNextAttackAdvantageHitProjection]
        }
        SpellAttackDamageProfile::RayOfSicknessSpellAttackProfile => {
            vec![SpellAttackHitProjection::SpellAttackPoisonedHitProjection]
        }
        SpellAttackDamageProfile::PoisonSpraySpellAttackProfile
        | SpellAttackDamageProfile::FireBoltSpellAttackProfile
        | SpellAttackDamageProfile::ProduceFlameHurlSpellAttackProfile => Vec::new(),
    }
}

pub fn spell_attack_damage_profile_supports_object_target(
    profile: SpellAttackDamageProfile,
) -> bool {
    matches!(
        profile,
        SpellAttackDamageProfile::ChillTouchSpellAttackProfile
            | SpellAttackDamageProfile::StarryWispSpellAttackProfile
            | SpellAttackDamageProfile::FireBoltSpellAttackProfile
            | SpellAttackDamageProfile::ProduceFlameHurlSpellAttackProfile
    )
}

pub fn spell_save_gated_damage_targeting(
    profile: SpellSaveGatedDamageProfile,
) -> SpellSaveGatedTargeting {
    match profile {
        SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile
        | SpellSaveGatedDamageProfile::InflictWoundsSaveDamageProfile
        | SpellSaveGatedDamageProfile::ViciousMockerySaveDamageProfile
        | SpellSaveGatedDamageProfile::DissonantWhispersSaveDamageProfile
        | SpellSaveGatedDamageProfile::HellishRebukeSaveDamageProfile
        | SpellSaveGatedDamageProfile::MindSpikeSaveDamageProfile => {
            SpellSaveGatedTargeting::SpellSingleSaveTarget
        }
        SpellSaveGatedDamageProfile::AcidSplashSaveDamageProfile
        | SpellSaveGatedDamageProfile::BurningHandsSaveDamageProfile
        | SpellSaveGatedDamageProfile::FireballSaveDamageProfile
        | SpellSaveGatedDamageProfile::LightningBoltSaveDamageProfile
        | SpellSaveGatedDamageProfile::ThunderwaveSaveDamageProfile => {
            SpellSaveGatedTargeting::SpellAreaSaveTargets
        }
    }
}

pub fn spell_save_gated_damage_success(
    profile: SpellSaveGatedDamageProfile,
) -> SpellSaveSuccessDamagePolicy {
    match profile {
        SpellSaveGatedDamageProfile::AcidSplashSaveDamageProfile
        | SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile
        | SpellSaveGatedDamageProfile::ViciousMockerySaveDamageProfile => {
            SpellSaveSuccessDamagePolicy::SpellNoDamageOnSuccessfulSave
        }
        SpellSaveGatedDamageProfile::InflictWoundsSaveDamageProfile
        | SpellSaveGatedDamageProfile::BurningHandsSaveDamageProfile
        | SpellSaveGatedDamageProfile::FireballSaveDamageProfile
        | SpellSaveGatedDamageProfile::LightningBoltSaveDamageProfile
        | SpellSaveGatedDamageProfile::ThunderwaveSaveDamageProfile
        | SpellSaveGatedDamageProfile::DissonantWhispersSaveDamageProfile
        | SpellSaveGatedDamageProfile::HellishRebukeSaveDamageProfile
        | SpellSaveGatedDamageProfile::MindSpikeSaveDamageProfile => {
            SpellSaveSuccessDamagePolicy::SpellHalfDamageOnSuccessfulSave
        }
    }
}

pub fn spell_save_gated_damage_type(profile: SpellSaveGatedDamageProfile) -> DamageType {
    match profile {
        SpellSaveGatedDamageProfile::AcidSplashSaveDamageProfile => DamageType::Acid,
        SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile => DamageType::Radiant,
        SpellSaveGatedDamageProfile::InflictWoundsSaveDamageProfile => DamageType::Necrotic,
        SpellSaveGatedDamageProfile::BurningHandsSaveDamageProfile => DamageType::Fire,
        SpellSaveGatedDamageProfile::FireballSaveDamageProfile => DamageType::Fire,
        SpellSaveGatedDamageProfile::LightningBoltSaveDamageProfile => DamageType::Lightning,
        SpellSaveGatedDamageProfile::ViciousMockerySaveDamageProfile => DamageType::Psychic,
        SpellSaveGatedDamageProfile::ThunderwaveSaveDamageProfile => DamageType::Thunder,
        SpellSaveGatedDamageProfile::DissonantWhispersSaveDamageProfile => DamageType::Psychic,
        SpellSaveGatedDamageProfile::HellishRebukeSaveDamageProfile => DamageType::Fire,
        SpellSaveGatedDamageProfile::MindSpikeSaveDamageProfile => DamageType::Psychic,
    }
}

pub fn spell_save_gated_damage_requires_slot(profile: SpellSaveGatedDamageProfile) -> bool {
    !matches!(
        profile,
        SpellSaveGatedDamageProfile::AcidSplashSaveDamageProfile
            | SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile
            | SpellSaveGatedDamageProfile::ViciousMockerySaveDamageProfile
    )
}

pub fn spell_save_gated_damage_requires_concentration(
    profile: SpellSaveGatedDamageProfile,
) -> bool {
    profile == SpellSaveGatedDamageProfile::MindSpikeSaveDamageProfile
}

pub fn spell_save_gated_damage_failed_save_effects(
    profile: SpellSaveGatedDamageProfile,
) -> Vec<SpellFailedSaveProjection> {
    match profile {
        SpellSaveGatedDamageProfile::ViciousMockerySaveDamageProfile => {
            vec![SpellFailedSaveProjection::SpellSaveNextAttackDisadvantageFailedProjection]
        }
        SpellSaveGatedDamageProfile::ThunderwaveSaveDamageProfile => {
            vec![SpellFailedSaveProjection::SpellSavePush10FeetFailedProjection]
        }
        SpellSaveGatedDamageProfile::DissonantWhispersSaveDamageProfile => {
            vec![SpellFailedSaveProjection::SpellSaveForcedReactionMovementFailedProjection]
        }
        SpellSaveGatedDamageProfile::AcidSplashSaveDamageProfile
        | SpellSaveGatedDamageProfile::SacredFlameSaveDamageProfile
        | SpellSaveGatedDamageProfile::InflictWoundsSaveDamageProfile
        | SpellSaveGatedDamageProfile::BurningHandsSaveDamageProfile
        | SpellSaveGatedDamageProfile::FireballSaveDamageProfile
        | SpellSaveGatedDamageProfile::LightningBoltSaveDamageProfile
        | SpellSaveGatedDamageProfile::HellishRebukeSaveDamageProfile
        | SpellSaveGatedDamageProfile::MindSpikeSaveDamageProfile => Vec::new(),
    }
}

pub fn legal_spell_attack_damage_branch_facts(facts: &SpellAttackDamageBranchFacts) -> bool {
    legal_attack_roll_procedure_facts(facts.attack_roll)
        && facts.base_damage_dice >= 1
        && facts.maximum_base_damage_dice >= 1
        && facts.maximum_base_damage_dice <= 10
        && facts.base_damage_dice <= facts.maximum_base_damage_dice
        && facts.damage_die_size >= 1
        && facts.damage_die_size <= 12
        && damage_dice_count_matches_critical(
            facts.base_damage_dice,
            facts.rolled_damage_dice_count,
            resolve_attack_roll(facts.attack_roll).critical,
        )
        && facts.damage_roll >= facts.rolled_damage_dice_count
        && facts.damage_roll <= facts.rolled_damage_dice_count * facts.damage_die_size
}

pub fn resolve_spell_attack_damage_branch(
    facts: SpellAttackDamageBranchFacts,
) -> SpellAttackDamageBranchResult {
    let outcome = resolve_attack_roll(facts.attack_roll);
    if !legal_spell_attack_damage_branch_facts(&facts) || !outcome.hits {
        SpellAttackDamageBranchResult {
            damage_amount: 0,
            damage_type: facts.damage_type,
            hit_projections: Vec::new(),
        }
    } else {
        SpellAttackDamageBranchResult {
            damage_amount: nonnegative(facts.damage_roll),
            damage_type: facts.damage_type,
            hit_projections: facts.hit_projections,
        }
    }
}

pub fn spell_save_success_damage_amount(
    policy: SpellSaveSuccessDamagePolicy,
    damage_roll: i32,
) -> i32 {
    match policy {
        SpellSaveSuccessDamagePolicy::SpellNoDamageOnSuccessfulSave => 0,
        SpellSaveSuccessDamagePolicy::SpellHalfDamageOnSuccessfulSave => {
            nonnegative(damage_roll) / 2
        }
    }
}

pub fn legal_spell_save_damage_branch_facts(facts: &SpellSaveDamageBranchFacts) -> bool {
    facts.damage_roll >= 0
}

pub fn resolve_spell_save_damage_branch(
    facts: SpellSaveDamageBranchFacts,
) -> SpellSaveDamageBranchResult {
    if !legal_spell_save_damage_branch_facts(&facts) {
        return SpellSaveDamageBranchResult {
            damage_amount: 0,
            damage_type: facts.damage_type,
            failed_save_projections: Vec::new(),
        };
    }

    if facts.saving_throw_failed {
        SpellSaveDamageBranchResult {
            damage_amount: nonnegative(facts.damage_roll),
            damage_type: facts.damage_type,
            failed_save_projections: facts.failed_save_projections,
        }
    } else {
        SpellSaveDamageBranchResult {
            damage_amount: spell_save_success_damage_amount(
                facts.success_policy,
                facts.damage_roll,
            ),
            damage_type: facts.damage_type,
            failed_save_projections: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DamageRiderSpellProfile {
    DivineFavorWeaponDamageRiderProfile,
    DivineSmiteAfterHitDamageProfile,
    HuntersMarkMarkedDamageRiderProfile,
    EnsnaringStrikeAfterHitConditionProfile,
    SearingSmiteAfterHitTimedDamageProfile,
    ShiningSmiteAfterHitDamageIlluminationProfile,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DivineSmiteAfterHitFacts {
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub melee_hit_trigger_witness: bool,
    pub target_fiend_or_undead: bool,
    pub smite_damage_roll: i32,
    pub attack_critical: bool,
    pub target_adjustments: DamageAdjustmentFacts,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DivineSmiteAfterHitResult {
    pub invocation: SpellInvocationResult,
    pub damage_result: HitPointRecoveryResult,
    pub damage_amount: i32,
    pub damage_dice: i32,
    pub damage_die_size: i32,
    pub damage_type: DamageType,
}

pub fn damage_rider_spell_action(_profile: DamageRiderSpellProfile) -> SpellInvocationAction {
    SpellInvocationAction::BonusActionSpellInvocation
}

pub fn damage_rider_requires_concentration(profile: DamageRiderSpellProfile) -> bool {
    matches!(
        profile,
        DamageRiderSpellProfile::HuntersMarkMarkedDamageRiderProfile
            | DamageRiderSpellProfile::EnsnaringStrikeAfterHitConditionProfile
            | DamageRiderSpellProfile::ShiningSmiteAfterHitDamageIlluminationProfile
    )
}

pub fn divine_smite_damage_type() -> DamageType {
    DamageType::Radiant
}

pub fn divine_smite_damage_die_size() -> i32 {
    8
}

pub fn divine_smite_damage_dice(slot_level: i32, target_fiend_or_undead: bool) -> i32 {
    2 + if slot_level > 1 { slot_level - 1 } else { 0 } + if target_fiend_or_undead { 1 } else { 0 }
}

pub fn legal_divine_smite_after_hit_facts(facts: &DivineSmiteAfterHitFacts) -> bool {
    facts.melee_hit_trigger_witness
        && facts.selected_slot_level >= 1
        && facts.smite_damage_roll >= 0
}

pub fn divine_smite_raw_damage_amount(facts: DivineSmiteAfterHitFacts) -> i32 {
    let damage_roll = nonnegative(facts.smite_damage_roll);
    if facts.attack_critical {
        damage_roll * 2
    } else {
        damage_roll
    }
}

pub fn divine_smite_damage_amount_after_adjustments(facts: DivineSmiteAfterHitFacts) -> i32 {
    total_damage_after_target_adjustments(
        DamageByType::empty().add_amount_for_type(
            divine_smite_damage_type(),
            divine_smite_raw_damage_amount(facts),
        ),
        facts.target_adjustments,
    )
}

pub fn resolve_divine_smite_after_melee_hit(
    state: SpellcastingProcedureState,
    target_vitals: CreatureVitals,
    facts: DivineSmiteAfterHitFacts,
) -> DivineSmiteAfterHitResult {
    let rejected_invocation = SpellInvocationResult {
        state,
        admitted: false,
        slot_expended: false,
    };
    let unchanged_damage = HitPointRecoveryResult {
        vitals: target_vitals,
        death_saving_throws: DeathSavingThrowLifecycle::reset(),
        positive_hit_point_unconscious_recovery:
            PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
        hit_points_regained: 0,
    };
    let damage_dice =
        divine_smite_damage_dice(facts.selected_slot_level, facts.target_fiend_or_undead);

    if !legal_divine_smite_after_hit_facts(&facts) {
        return DivineSmiteAfterHitResult {
            invocation: rejected_invocation,
            damage_result: unchanged_damage,
            damage_amount: 0,
            damage_dice,
            damage_die_size: divine_smite_damage_die_size(),
            damage_type: divine_smite_damage_type(),
        };
    }

    let invocation_facts = SpellInvocationFacts {
        profile: SpellDefinitionProfile::DivineSmite,
        has_spell_access: facts.has_spell_access,
        selected_slot_level: facts.selected_slot_level,
        target_count: 1,
        targets_are_valid: true,
    };
    let invocation = resolve_spell_invocation(state, invocation_facts);
    if !spell_invocation_can_affect_targets(invocation, invocation_facts) {
        return DivineSmiteAfterHitResult {
            invocation,
            damage_result: unchanged_damage,
            damage_amount: 0,
            damage_dice,
            damage_die_size: divine_smite_damage_die_size(),
            damage_type: divine_smite_damage_type(),
        };
    }

    let damage_amount = divine_smite_damage_amount_after_adjustments(facts);
    let damage_result = apply_resolved_damage_to_positive_hit_points(target_vitals, damage_amount);
    DivineSmiteAfterHitResult {
        invocation,
        damage_result: HitPointRecoveryResult {
            vitals: damage_result.vitals,
            death_saving_throws: death_saving_throw_lifecycle_after_positive_hit_point_damage(
                DeathSavingThrowLifecycle::reset(),
                damage_result,
            ),
            positive_hit_point_unconscious_recovery:
                PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
            hit_points_regained: 0,
        },
        damage_amount,
        damage_dice,
        damage_die_size: divine_smite_damage_die_size(),
        damage_type: divine_smite_damage_type(),
    }
}

fn damage_type_slot(damage_type: DamageType) -> usize {
    match damage_type {
        DamageType::Acid => 0,
        DamageType::Bludgeoning => 1,
        DamageType::Cold => 2,
        DamageType::Fire => 3,
        DamageType::Force => 4,
        DamageType::Lightning => 5,
        DamageType::Necrotic => 6,
        DamageType::Piercing => 7,
        DamageType::Poison => 8,
        DamageType::Psychic => 9,
        DamageType::Radiant => 10,
        DamageType::Slashing => 11,
        DamageType::Thunder => 12,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DamageByType {
    amounts: [i32; ALL_DAMAGE_TYPES.len()],
}

impl DamageByType {
    pub fn empty() -> Self {
        Self {
            amounts: [0; ALL_DAMAGE_TYPES.len()],
        }
    }

    pub fn amount_for_type(&self, damage_type: DamageType) -> i32 {
        self.amounts[damage_type_slot(damage_type)]
    }

    pub fn add_amount_for_type(mut self, damage_type: DamageType, raw_amount: i32) -> Self {
        self.amounts[damage_type_slot(damage_type)] += nonnegative(raw_amount);
        self
    }

    pub fn total(&self) -> i32 {
        self.amounts.iter().copied().sum()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DamageAdjustmentFacts {
    immunities: [bool; ALL_DAMAGE_TYPES.len()],
    resistances: [bool; ALL_DAMAGE_TYPES.len()],
    vulnerabilities: [bool; ALL_DAMAGE_TYPES.len()],
}

impl DamageAdjustmentFacts {
    pub fn none() -> Self {
        Self {
            immunities: [false; ALL_DAMAGE_TYPES.len()],
            resistances: [false; ALL_DAMAGE_TYPES.len()],
            vulnerabilities: [false; ALL_DAMAGE_TYPES.len()],
        }
    }

    pub fn with_immunity(mut self, damage_type: DamageType) -> Self {
        self.immunities[damage_type_slot(damage_type)] = true;
        self
    }

    pub fn with_resistance(mut self, damage_type: DamageType) -> Self {
        self.resistances[damage_type_slot(damage_type)] = true;
        self
    }

    pub fn with_vulnerability(mut self, damage_type: DamageType) -> Self {
        self.vulnerabilities[damage_type_slot(damage_type)] = true;
        self
    }

    pub fn is_immune(&self, damage_type: DamageType) -> bool {
        self.immunities[damage_type_slot(damage_type)]
    }

    pub fn is_resistant(&self, damage_type: DamageType) -> bool {
        self.resistances[damage_type_slot(damage_type)]
    }

    pub fn is_vulnerable(&self, damage_type: DamageType) -> bool {
        self.vulnerabilities[damage_type_slot(damage_type)]
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DamagePair {
    pub first_type: DamageType,
    pub first_amount: i32,
    pub second_type: DamageType,
    pub second_amount: i32,
}

pub fn aggregate_damage_pair(pair: DamagePair) -> DamageByType {
    DamageByType::empty()
        .add_amount_for_type(pair.first_type, pair.first_amount)
        .add_amount_for_type(pair.second_type, pair.second_amount)
}

pub fn adjusted_damage_roll_amount(base_amount: i32, modifier: i32) -> i32 {
    nonnegative(base_amount + modifier)
}

pub fn damage_amount_after_target_adjustments(
    amount: i32,
    damage_type: DamageType,
    facts: DamageAdjustmentFacts,
) -> i32 {
    if facts.is_immune(damage_type) {
        0
    } else {
        let amount = nonnegative(amount);
        let after_resistance = if facts.is_resistant(damage_type) {
            amount / 2
        } else {
            amount
        };
        if facts.is_vulnerable(damage_type) {
            after_resistance * 2
        } else {
            after_resistance
        }
    }
}

pub fn damage_by_type_after_target_adjustments(
    amounts: DamageByType,
    facts: DamageAdjustmentFacts,
) -> DamageByType {
    ALL_DAMAGE_TYPES
        .into_iter()
        .fold(DamageByType::empty(), |adjusted, damage_type| {
            adjusted.add_amount_for_type(
                damage_type,
                damage_amount_after_target_adjustments(
                    amounts.amount_for_type(damage_type),
                    damage_type,
                    facts,
                ),
            )
        })
}

pub fn total_damage_after_target_adjustments(
    amounts: DamageByType,
    facts: DamageAdjustmentFacts,
) -> i32 {
    damage_by_type_after_target_adjustments(amounts, facts).total()
}

pub fn pair_total(pair: DamagePair) -> i32 {
    nonnegative(pair.first_amount) + nonnegative(pair.second_amount)
}

pub fn capped_reduction(total: i32, reduction: i32) -> i32 {
    if reduction < 0 {
        0
    } else if reduction > total {
        total
    } else {
        reduction
    }
}

pub fn largest_remainder_bonus_goes_to_first(
    first_amount: i32,
    second_amount: i32,
    reduction: i32,
) -> bool {
    let total = first_amount + second_amount;
    let first_product = first_amount * reduction;
    let second_product = second_amount * reduction;
    let first_base = first_product / total;
    let second_base = second_product / total;
    let first_remainder = first_product - (first_base * total);
    let second_remainder = second_product - (second_base * total);
    first_remainder >= second_remainder
}

pub fn damage_pair_after_scalar_reduction(pair: DamagePair, raw_reduction: i32) -> DamagePair {
    let first = nonnegative(pair.first_amount);
    let second = nonnegative(pair.second_amount);
    let total = first + second;

    if total == 0 {
        return DamagePair {
            first_type: pair.first_type,
            first_amount: 0,
            second_type: pair.second_type,
            second_amount: 0,
        };
    }

    let reduction = capped_reduction(total, raw_reduction);
    let first_base = (first * reduction) / total;
    let second_base = (second * reduction) / total;
    let base_reduction = first_base + second_base;
    let extra_reduction = reduction - base_reduction;
    let first_gets_extra =
        extra_reduction > 0 && largest_remainder_bonus_goes_to_first(first, second, reduction);
    let second_gets_extra = extra_reduction > 0 && !first_gets_extra;

    DamagePair {
        first_type: pair.first_type,
        first_amount: first - first_base - if first_gets_extra { 1 } else { 0 },
        second_type: pair.second_type,
        second_amount: second - second_base - if second_gets_extra { 1 } else { 0 },
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttackRangeFact {
    WithinMeleeReach,
    WithinNormalRange,
    WithinLongRange,
    BeyondRange,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttackKind {
    MeleeAttack,
    RangedAttack,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttackRollProcedureFacts {
    pub natural_d20: i32,
    pub total: i32,
    pub armor_class: i32,
    pub critical_threshold: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttackRollOutcome {
    pub hits: bool,
    pub critical: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActionQuota {
    ActionAvailable,
    ActionSpent,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AttackDamageDisposition {
    OrdinaryAttackDamage,
    KnockOutAttackDamage,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttackDamageProcedureFacts {
    pub attack_kind: AttackKind,
    pub damage_type: DamageType,
    pub rolled_damage: i32,
    pub damage_modifier: i32,
    pub target_adjustments: DamageAdjustmentFacts,
    pub disposition: AttackDamageDisposition,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttackProcedureResult {
    pub action_quota: ActionQuota,
    pub attack_roll_outcome: AttackRollOutcome,
    pub damage_result: HitPointRecoveryResult,
}

pub fn legal_attack_roll_procedure_facts(facts: AttackRollProcedureFacts) -> bool {
    facts.natural_d20 >= 1
        && facts.natural_d20 <= 20
        && facts.total >= 0
        && facts.total <= 40
        && facts.armor_class >= 1
        && facts.armor_class <= 30
        && (facts.critical_threshold == 19 || facts.critical_threshold == 20)
}

pub fn natural_d20_meets_critical_threshold(natural_d20: i32, critical_threshold: i32) -> bool {
    natural_d20 >= critical_threshold
}

pub fn attack_roll_is_critical_hit(facts: AttackRollProcedureFacts) -> bool {
    natural_d20_meets_critical_threshold(facts.natural_d20, facts.critical_threshold)
}

pub fn resolve_attack_roll(facts: AttackRollProcedureFacts) -> AttackRollOutcome {
    let critical = attack_roll_is_critical_hit(facts);
    AttackRollOutcome {
        hits: if facts.natural_d20 == 1 {
            false
        } else if critical {
            true
        } else {
            facts.total >= facts.armor_class
        },
        critical,
    }
}

pub fn legal_attack_target_fact(attack_kind: AttackKind, range_fact: AttackRangeFact) -> bool {
    match attack_kind {
        AttackKind::MeleeAttack => range_fact == AttackRangeFact::WithinMeleeReach,
        AttackKind::RangedAttack => {
            range_fact == AttackRangeFact::WithinNormalRange
                || range_fact == AttackRangeFact::WithinLongRange
        }
    }
}

pub fn critical_damage_dice_count(base_dice: i32, critical: bool) -> i32 {
    if critical {
        base_dice * 2
    } else {
        base_dice
    }
}

pub fn damage_dice_count_matches_critical(
    base_dice: i32,
    filled_dice_count: i32,
    critical: bool,
) -> bool {
    filled_dice_count == critical_damage_dice_count(base_dice, critical)
}

pub fn light_property_extra_attack_damage_modifier(ability_modifier: i32) -> i32 {
    if ability_modifier < 0 {
        ability_modifier
    } else {
        0
    }
}

pub fn light_property_extra_attack_damage_amount(rolled_damage: i32, ability_modifier: i32) -> i32 {
    adjusted_damage_roll_amount(
        rolled_damage,
        light_property_extra_attack_damage_modifier(ability_modifier),
    )
}

pub fn spend_action_quota(_quota: ActionQuota) -> ActionQuota {
    ActionQuota::ActionSpent
}

pub fn damage_amount_before_hit_points(facts: AttackDamageProcedureFacts) -> i32 {
    let adjusted_roll = adjusted_damage_roll_amount(facts.rolled_damage, facts.damage_modifier);
    let damage_by_type =
        DamageByType::empty().add_amount_for_type(facts.damage_type, adjusted_roll);
    total_damage_after_target_adjustments(damage_by_type, facts.target_adjustments)
}

pub fn attack_damage_disposition_is_legal(
    vitals: CreatureVitals,
    damage_amount: i32,
    facts: AttackDamageProcedureFacts,
) -> bool {
    facts.disposition == AttackDamageDisposition::OrdinaryAttackDamage
        || (facts.attack_kind == AttackKind::MeleeAttack
            && damage_amount > 0
            && apply_resolved_damage_to_positive_hit_points(vitals, damage_amount)
                .vitals
                .hit_points()
                == 0)
}

pub fn resolve_attack_damage(
    vitals: CreatureVitals,
    facts: AttackDamageProcedureFacts,
) -> HitPointRecoveryResult {
    let damage_amount = damage_amount_before_hit_points(facts);
    let damage_result = apply_resolved_damage_to_positive_hit_points(vitals, damage_amount);

    if facts.disposition == AttackDamageDisposition::KnockOutAttackDamage {
        apply_knock_out_disposition(damage_result)
    } else {
        HitPointRecoveryResult {
            vitals: damage_result.vitals,
            death_saving_throws: death_saving_throw_lifecycle_after_positive_hit_point_damage(
                DeathSavingThrowLifecycle::reset(),
                damage_result,
            ),
            positive_hit_point_unconscious_recovery:
                PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
            hit_points_regained: 0,
        }
    }
}

pub fn resolve_attack_procedure(
    quota: ActionQuota,
    range_fact: AttackRangeFact,
    roll_facts: AttackRollProcedureFacts,
    target_vitals: CreatureVitals,
    damage_facts: AttackDamageProcedureFacts,
) -> AttackProcedureResult {
    let roll_outcome = resolve_attack_roll(roll_facts);
    let damage_amount = damage_amount_before_hit_points(damage_facts);
    let attack_admitted = quota == ActionQuota::ActionAvailable
        && legal_attack_target_fact(damage_facts.attack_kind, range_fact)
        && legal_attack_roll_procedure_facts(roll_facts)
        && can_apply_resolved_damage_to_positive_hit_points(target_vitals);
    let disposition_admitted = damage_facts.disposition
        == AttackDamageDisposition::OrdinaryAttackDamage
        || (roll_outcome.hits
            && attack_damage_disposition_is_legal(target_vitals, damage_amount, damage_facts));
    let procedure_admitted = attack_admitted && disposition_admitted;
    let can_apply_damage = procedure_admitted && roll_outcome.hits;

    AttackProcedureResult {
        action_quota: if procedure_admitted {
            spend_action_quota(quota)
        } else {
            quota
        },
        attack_roll_outcome: roll_outcome,
        damage_result: if can_apply_damage {
            resolve_attack_damage(target_vitals, damage_facts)
        } else {
            HitPointRecoveryResult {
                vitals: target_vitals,
                death_saving_throws: DeathSavingThrowLifecycle::reset(),
                positive_hit_point_unconscious_recovery:
                    PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery,
                hit_points_regained: 0,
            }
        },
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StandardAction {
    Dash,
    Disengage,
    Dodge,
    Help,
    Hide,
    Search,
    Ready,
    Magic,
    Attack,
    EscapeGrapple,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActionCost {
    StandardActionCost(StandardAction),
    BonusActionCost,
    FreeCost,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TurnProcedureState {
    pub action_quota: ActionQuota,
    pub bonus_action_available: bool,
    pub reaction_available: bool,
    pub dash_movement_bonus_feet: i32,
    pub disengaged: bool,
    pub dodging: bool,
    pub hidden: bool,
    pub help_attack_held: bool,
    pub readied_movement_held: bool,
    pub start_of_turn_hook_active: bool,
    pub end_of_turn_hook_active: bool,
    pub current_actor_owns_turn: bool,
}

impl TurnProcedureState {
    pub fn initial() -> Self {
        Self {
            action_quota: ActionQuota::ActionAvailable,
            bonus_action_available: true,
            reaction_available: true,
            dash_movement_bonus_feet: 0,
            disengaged: false,
            dodging: false,
            hidden: false,
            help_attack_held: false,
            readied_movement_held: false,
            start_of_turn_hook_active: false,
            end_of_turn_hook_active: false,
            current_actor_owns_turn: true,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HideProcedureFacts {
    pub prerequisite_satisfied: bool,
    pub check_total: i32,
    pub dc: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SearchProcedureFacts {
    pub hidden_target_exists: bool,
    pub check_total: i32,
    pub dc: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LightPropertyExtraAttackFacts {
    pub prior_attack_action_light_weapon_attack: bool,
    pub different_light_weapon: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct LightPropertyExtraAttackResult {
    pub turn: TurnProcedureState,
    pub admitted: bool,
}

pub fn legal_turn_procedure_state(state: TurnProcedureState) -> bool {
    state.dash_movement_bonus_feet >= 0
        && state.dash_movement_bonus_feet <= 80
        && (!(state.action_quota == ActionQuota::ActionAvailable && state.bonus_action_available)
            || state.dash_movement_bonus_feet == 0)
        && (!(state.action_quota == ActionQuota::ActionSpent && state.bonus_action_available)
            || state.dash_movement_bonus_feet <= 40)
        && (state.action_quota != ActionQuota::ActionAvailable
            || state.bonus_action_available
            || state.dash_movement_bonus_feet <= 40)
}

pub fn can_spend_action(state: TurnProcedureState) -> bool {
    state.current_actor_owns_turn && state.action_quota == ActionQuota::ActionAvailable
}

pub fn can_spend_bonus_action(state: TurnProcedureState) -> bool {
    state.current_actor_owns_turn && state.bonus_action_available
}

pub fn can_spend_action_cost(state: TurnProcedureState, cost: ActionCost) -> bool {
    match cost {
        ActionCost::FreeCost => true,
        ActionCost::BonusActionCost => can_spend_bonus_action(state),
        ActionCost::StandardActionCost(_) => can_spend_action(state),
    }
}

pub fn spend_action_cost(mut state: TurnProcedureState, cost: ActionCost) -> TurnProcedureState {
    if !can_spend_action_cost(state, cost) {
        return state;
    }

    match cost {
        ActionCost::FreeCost => state,
        ActionCost::BonusActionCost => {
            state.bonus_action_available = false;
            state
        }
        ActionCost::StandardActionCost(_) => {
            state.action_quota = ActionQuota::ActionSpent;
            state
        }
    }
}

pub fn resolve_dash(
    state: TurnProcedureState,
    speed_feet: i32,
    cost: ActionCost,
) -> TurnProcedureState {
    let spent = spend_action_cost(state, cost);
    if spent == state && cost != ActionCost::FreeCost {
        state
    } else {
        TurnProcedureState {
            dash_movement_bonus_feet: spent.dash_movement_bonus_feet + speed_feet,
            ..spent
        }
    }
}

pub fn resolve_disengage(state: TurnProcedureState, cost: ActionCost) -> TurnProcedureState {
    let spent = spend_action_cost(state, cost);
    if spent == state && cost != ActionCost::FreeCost {
        state
    } else {
        TurnProcedureState {
            disengaged: true,
            ..spent
        }
    }
}

pub fn resolve_dodge(state: TurnProcedureState) -> TurnProcedureState {
    let spent = spend_action_cost(state, ActionCost::StandardActionCost(StandardAction::Dodge));
    if spent == state {
        state
    } else {
        TurnProcedureState {
            dodging: true,
            ..spent
        }
    }
}

pub fn resolve_help_attack(
    state: TurnProcedureState,
    target_fact_satisfied: bool,
) -> TurnProcedureState {
    let spent = spend_action_cost(state, ActionCost::StandardActionCost(StandardAction::Help));
    if !target_fact_satisfied || spent == state {
        state
    } else {
        TurnProcedureState {
            help_attack_held: true,
            ..spent
        }
    }
}

pub fn resolve_hide(
    state: TurnProcedureState,
    facts: HideProcedureFacts,
    cost: ActionCost,
) -> TurnProcedureState {
    let spent = spend_action_cost(state, cost);
    if !facts.prerequisite_satisfied || spent == state {
        state
    } else {
        TurnProcedureState {
            hidden: facts.check_total >= facts.dc,
            ..spent
        }
    }
}

pub fn resolve_search(
    state: TurnProcedureState,
    facts: SearchProcedureFacts,
) -> TurnProcedureState {
    let spent = spend_action_cost(
        state,
        ActionCost::StandardActionCost(StandardAction::Search),
    );
    if !facts.hidden_target_exists || spent == state {
        state
    } else {
        TurnProcedureState {
            hidden: if facts.check_total >= facts.dc {
                false
            } else {
                spent.hidden
            },
            ..spent
        }
    }
}

pub fn resolve_light_property_extra_attack(
    state: TurnProcedureState,
    facts: LightPropertyExtraAttackFacts,
) -> LightPropertyExtraAttackResult {
    let admitted = legal_turn_procedure_state(state)
        && can_spend_bonus_action(state)
        && facts.prior_attack_action_light_weapon_attack
        && facts.different_light_weapon;

    LightPropertyExtraAttackResult {
        turn: if admitted {
            spend_action_cost(state, ActionCost::BonusActionCost)
        } else {
            state
        },
        admitted,
    }
}

pub fn resolve_ready_movement(
    state: TurnProcedureState,
    trigger_selected: bool,
) -> TurnProcedureState {
    let spent = spend_action_cost(state, ActionCost::StandardActionCost(StandardAction::Ready));
    if !trigger_selected || spent == state {
        state
    } else {
        TurnProcedureState {
            readied_movement_held: true,
            start_of_turn_hook_active: true,
            ..spent
        }
    }
}

pub fn spend_reaction(mut state: TurnProcedureState) -> TurnProcedureState {
    if state.reaction_available {
        state.reaction_available = false;
    }
    state
}

pub fn start_turn(state: TurnProcedureState) -> TurnProcedureState {
    TurnProcedureState {
        hidden: state.hidden,
        end_of_turn_hook_active: state.end_of_turn_hook_active,
        ..TurnProcedureState::initial()
    }
}

pub fn end_turn(state: TurnProcedureState) -> TurnProcedureState {
    TurnProcedureState {
        end_of_turn_hook_active: false,
        current_actor_owns_turn: false,
        ..state
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FeatureUsePool {
    pub uses_remaining: i32,
    pub maximum_uses: i32,
}

pub fn legal_feature_use_pool(pool: FeatureUsePool) -> bool {
    pool.maximum_uses >= 0
        && pool.maximum_uses <= 6
        && pool.uses_remaining >= 0
        && pool.uses_remaining <= pool.maximum_uses
}

pub fn spend_feature_use_pool(pool: FeatureUsePool) -> FeatureUsePool {
    if pool.uses_remaining <= 0 {
        pool
    } else {
        FeatureUsePool {
            uses_remaining: pool.uses_remaining - 1,
            ..pool
        }
    }
}

pub fn resolve_temporary_hit_points_choice(
    existing_temporary_hit_points: i32,
    new_temporary_hit_points: i32,
    choose_new_temporary_hit_points: bool,
) -> i32 {
    if choose_new_temporary_hit_points {
        new_temporary_hit_points
    } else {
        existing_temporary_hit_points
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InnateSorceryOccurrence {
    NoInnateSorceryOccurrence,
    InnateSorceryOneMinuteDuration,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct InnateSorceryState {
    pub turn: TurnProcedureState,
    pub pool: FeatureUsePool,
    pub occurrence: InnateSorceryOccurrence,
}

pub fn legal_innate_sorcery_state(state: InnateSorceryState) -> bool {
    legal_feature_use_pool(state.pool)
        && (state.occurrence == InnateSorceryOccurrence::NoInnateSorceryOccurrence
            || state.pool.uses_remaining < state.pool.maximum_uses)
}

pub fn activate_innate_sorcery(state: InnateSorceryState) -> InnateSorceryState {
    let admitted = legal_innate_sorcery_state(state)
        && can_spend_bonus_action(state.turn)
        && state.pool.uses_remaining > 0
        && state.occurrence == InnateSorceryOccurrence::NoInnateSorceryOccurrence;

    if admitted {
        InnateSorceryState {
            turn: spend_action_cost(state.turn, ActionCost::BonusActionCost),
            pool: spend_feature_use_pool(state.pool),
            occurrence: InnateSorceryOccurrence::InnateSorceryOneMinuteDuration,
        }
    } else {
        state
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SecondWindFacts {
    pub healing_roll: i32,
    pub fighter_level: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SecondWindResult {
    pub turn: TurnProcedureState,
    pub pool: FeatureUsePool,
    pub recovery: HitPointRecoveryResult,
}

pub fn legal_second_wind_facts(facts: SecondWindFacts) -> bool {
    facts.healing_roll >= 1
        && facts.healing_roll <= 10
        && facts.fighter_level >= 1
        && facts.fighter_level <= 20
}

pub fn resolve_second_wind(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    vitals: CreatureVitals,
    death_saving_throws: DeathSavingThrowLifecycle,
    positive_hit_point_unconscious_recovery: PositiveHitPointUnconsciousRecovery,
    facts: SecondWindFacts,
) -> SecondWindResult {
    let admitted =
        legal_second_wind_facts(facts) && can_spend_bonus_action(turn) && pool.uses_remaining > 0;
    let spent_turn = if admitted {
        spend_action_cost(turn, ActionCost::BonusActionCost)
    } else {
        turn
    };
    let spent_pool = if admitted {
        spend_feature_use_pool(pool)
    } else {
        pool
    };

    SecondWindResult {
        turn: spent_turn,
        pool: spent_pool,
        recovery: if admitted {
            apply_hit_point_healing(
                vitals,
                death_saving_throws,
                positive_hit_point_unconscious_recovery,
                facts.healing_roll + facts.fighter_level,
            )
        } else {
            HitPointRecoveryResult {
                vitals,
                death_saving_throws,
                positive_hit_point_unconscious_recovery,
                hit_points_regained: 0,
            }
        },
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FailedAbilityCheckResourceBoostFacts {
    pub original_total: i32,
    pub dc: i32,
    pub boost_roll: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FailedAbilityCheckResourceBoostResult {
    pub pool: FeatureUsePool,
    pub original_succeeded: bool,
    pub boosted_total: i32,
    pub boosted_succeeded: bool,
}

pub fn legal_failed_ability_check_resource_boost_facts(
    facts: FailedAbilityCheckResourceBoostFacts,
) -> bool {
    facts.boost_roll >= 1 && facts.boost_roll <= 10
}

pub fn resolve_failed_ability_check_resource_boost(
    pool: FeatureUsePool,
    facts: FailedAbilityCheckResourceBoostFacts,
) -> FailedAbilityCheckResourceBoostResult {
    let original_succeeded = facts.original_total >= facts.dc;
    let boosted_total = facts.original_total + facts.boost_roll;
    let boosted_succeeded = boosted_total >= facts.dc;
    let admitted = legal_feature_use_pool(pool)
        && legal_failed_ability_check_resource_boost_facts(facts)
        && pool.uses_remaining > 0
        && !original_succeeded;
    let spend = admitted && boosted_succeeded;

    FailedAbilityCheckResourceBoostResult {
        pool: if spend {
            spend_feature_use_pool(pool)
        } else {
            pool
        },
        original_succeeded,
        boosted_total,
        boosted_succeeded,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CunningActionChoice {
    CunningDash,
    CunningDisengage,
    CunningHide,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CunningActionFacts {
    pub choice: CunningActionChoice,
    pub speed_feet: i32,
    pub hide_facts: HideProcedureFacts,
}

pub fn resolve_cunning_action(
    turn: TurnProcedureState,
    facts: CunningActionFacts,
) -> TurnProcedureState {
    match facts.choice {
        CunningActionChoice::CunningDash => {
            resolve_dash(turn, facts.speed_feet, ActionCost::BonusActionCost)
        }
        CunningActionChoice::CunningDisengage => {
            resolve_disengage(turn, ActionCost::BonusActionCost)
        }
        CunningActionChoice::CunningHide => {
            resolve_hide(turn, facts.hide_facts, ActionCost::BonusActionCost)
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BonusActionDashTemporaryHitPointsFacts {
    pub speed_feet: i32,
    pub proficiency_bonus: i32,
    pub existing_temporary_hit_points: i32,
    pub choose_new_temporary_hit_points: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BonusActionDashTemporaryHitPointsResult {
    pub turn: TurnProcedureState,
    pub pool: FeatureUsePool,
    pub temporary_hit_points: i32,
}

pub fn resolve_bonus_action_dash_temporary_hit_points(
    turn: TurnProcedureState,
    pool: FeatureUsePool,
    facts: BonusActionDashTemporaryHitPointsFacts,
) -> BonusActionDashTemporaryHitPointsResult {
    let admitted = legal_feature_use_pool(pool)
        && pool.uses_remaining > 0
        && can_spend_bonus_action(turn)
        && facts.speed_feet >= 0
        && facts.proficiency_bonus >= 2
        && facts.proficiency_bonus <= 6
        && facts.existing_temporary_hit_points >= 0;
    let dashed = if admitted {
        resolve_dash(turn, facts.speed_feet, ActionCost::BonusActionCost)
    } else {
        turn
    };

    BonusActionDashTemporaryHitPointsResult {
        turn: dashed,
        pool: if admitted {
            spend_feature_use_pool(pool)
        } else {
            pool
        },
        temporary_hit_points: if admitted {
            resolve_temporary_hit_points_choice(
                facts.existing_temporary_hit_points,
                facts.proficiency_bonus,
                facts.choose_new_temporary_hit_points,
            )
        } else {
            facts.existing_temporary_hit_points
        },
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActionSurgeActionGrant {
    NoActionSurgeActionGrant,
    ActionSurgeActionAvailable,
    ActionSurgeActionSpent,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ActionSurgeState {
    pub pool: FeatureUsePool,
    pub action_grant: ActionSurgeActionGrant,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ActionSurgeActionResult {
    pub action_surge: ActionSurgeState,
    pub action_was_taken: bool,
}

pub fn legal_action_surge_state(state: ActionSurgeState) -> bool {
    legal_feature_use_pool(state.pool)
        && (state.action_grant == ActionSurgeActionGrant::NoActionSurgeActionGrant
            || state.pool.uses_remaining < state.pool.maximum_uses)
}

pub fn initial_action_surge_state(pool: FeatureUsePool) -> ActionSurgeState {
    ActionSurgeState {
        pool,
        action_grant: ActionSurgeActionGrant::NoActionSurgeActionGrant,
    }
}

pub fn start_turn_action_surge(state: ActionSurgeState) -> ActionSurgeState {
    ActionSurgeState {
        action_grant: ActionSurgeActionGrant::NoActionSurgeActionGrant,
        ..state
    }
}

pub fn activate_action_surge(state: ActionSurgeState, on_turn: bool) -> ActionSurgeState {
    if !on_turn
        || state.action_grant != ActionSurgeActionGrant::NoActionSurgeActionGrant
        || state.pool.uses_remaining <= 0
    {
        state
    } else {
        ActionSurgeState {
            pool: spend_feature_use_pool(state.pool),
            action_grant: ActionSurgeActionGrant::ActionSurgeActionAvailable,
        }
    }
}

pub fn action_surge_permits_action(requested_action: StandardAction) -> bool {
    requested_action != StandardAction::Magic
}

pub fn spend_action_surge_action(
    state: ActionSurgeState,
    requested_action: StandardAction,
) -> ActionSurgeActionResult {
    if state.action_grant != ActionSurgeActionGrant::ActionSurgeActionAvailable
        || !action_surge_permits_action(requested_action)
    {
        ActionSurgeActionResult {
            action_surge: state,
            action_was_taken: false,
        }
    } else {
        ActionSurgeActionResult {
            action_surge: ActionSurgeState {
                action_grant: ActionSurgeActionGrant::ActionSurgeActionSpent,
                ..state
            },
            action_was_taken: true,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttackActionAttackCountState {
    pub action_available: bool,
    pub extra_attack_slot_open: bool,
    pub attacks_resolved: i32,
    pub movement_segments_taken: i32,
    pub turn_ended: bool,
}

impl AttackActionAttackCountState {
    pub fn initial() -> Self {
        Self {
            action_available: true,
            extra_attack_slot_open: false,
            attacks_resolved: 0,
            movement_segments_taken: 0,
            turn_ended: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttackActionAttackCountFacts {
    pub additional_attacks: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AttackActionAttackCountResult {
    pub state: AttackActionAttackCountState,
    pub action_was_spent: bool,
    pub attack_was_resolved: bool,
}

pub fn legal_attack_action_attack_count_facts(facts: AttackActionAttackCountFacts) -> bool {
    facts.additional_attacks == 1
}

pub fn take_attack_action_with_attack_count_scaling(
    state: AttackActionAttackCountState,
    facts: AttackActionAttackCountFacts,
) -> AttackActionAttackCountResult {
    let admitted = legal_attack_action_attack_count_facts(facts)
        && state.action_available
        && !state.extra_attack_slot_open
        && !state.turn_ended;

    AttackActionAttackCountResult {
        state: if admitted {
            AttackActionAttackCountState {
                action_available: false,
                extra_attack_slot_open: true,
                attacks_resolved: state.attacks_resolved + 1,
                ..state
            }
        } else {
            state
        },
        action_was_spent: admitted,
        attack_was_resolved: admitted,
    }
}

pub fn resolve_extra_attack_slot(
    state: AttackActionAttackCountState,
) -> AttackActionAttackCountResult {
    let admitted = state.extra_attack_slot_open && !state.turn_ended;

    AttackActionAttackCountResult {
        state: if admitted {
            AttackActionAttackCountState {
                extra_attack_slot_open: false,
                attacks_resolved: state.attacks_resolved + 1,
                ..state
            }
        } else {
            state
        },
        action_was_spent: false,
        attack_was_resolved: admitted,
    }
}

pub fn move_during_attack_action_attack_count(
    state: AttackActionAttackCountState,
) -> AttackActionAttackCountState {
    if state.turn_ended {
        state
    } else {
        AttackActionAttackCountState {
            movement_segments_taken: state.movement_segments_taken + 1,
            ..state
        }
    }
}

pub fn end_turn_during_attack_action_attack_count(
    state: AttackActionAttackCountState,
) -> AttackActionAttackCountState {
    AttackActionAttackCountState {
        extra_attack_slot_open: false,
        turn_ended: true,
        ..state
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MovementResource {
    OwnMovementActionBonusReactionOrSpeed,
    TeleportResource,
    ForcedMovementNoOwnResource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OpportunityAttackTriggerFacts {
    pub hostile_creature: bool,
    pub observer_can_see: bool,
    pub leaves_reach: bool,
    pub movement_resource: MovementResource,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MovementSpendFacts {
    pub distance_feet: i32,
    pub extra_cost_feet: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GrappleState {
    NoGrapple,
    Grappled { escape_dc: i32 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MovementGrappleState {
    pub turn: TurnProcedureState,
    pub speed_feet: i32,
    pub movement_spent_feet: i32,
    pub prone: bool,
    pub grapple: GrappleState,
}

impl MovementGrappleState {
    pub fn initial() -> Self {
        Self {
            turn: TurnProcedureState::initial(),
            speed_feet: 30,
            movement_spent_feet: 0,
            prone: false,
            grapple: GrappleState::NoGrapple,
        }
    }
}

pub const MINIMUM_GRAPPLE_ESCAPE_DC: i32 = 5;
pub const MAXIMUM_GRAPPLE_ESCAPE_DC: i32 = 27;

pub fn legal_movement_spend_facts(facts: MovementSpendFacts) -> bool {
    facts.distance_feet >= 0
        && facts.distance_feet <= 80
        && facts.extra_cost_feet >= 0
        && facts.extra_cost_feet <= 80
}

pub fn movement_cost_feet(facts: MovementSpendFacts) -> i32 {
    facts.distance_feet + facts.extra_cost_feet
}

pub fn active_grapple(grapple: GrappleState) -> bool {
    grapple != GrappleState::NoGrapple
}

pub fn legal_grapple_escape_dc(escape_dc: i32) -> bool {
    (MINIMUM_GRAPPLE_ESCAPE_DC..=MAXIMUM_GRAPPLE_ESCAPE_DC).contains(&escape_dc)
}

pub fn legal_grapple_state(grapple: GrappleState) -> bool {
    match grapple {
        GrappleState::NoGrapple => true,
        GrappleState::Grappled { escape_dc } => legal_grapple_escape_dc(escape_dc),
    }
}

pub fn effective_speed_feet(state: MovementGrappleState) -> i32 {
    if active_grapple(state.grapple) {
        0
    } else {
        state.speed_feet
    }
}

pub fn movement_budget_feet(state: MovementGrappleState) -> i32 {
    if effective_speed_feet(state) == 0 {
        0
    } else {
        effective_speed_feet(state) + state.turn.dash_movement_bonus_feet
    }
}

pub fn movement_remaining_feet(state: MovementGrappleState) -> i32 {
    (movement_budget_feet(state) - state.movement_spent_feet).max(0)
}

pub fn legal_movement_grapple_state(state: MovementGrappleState) -> bool {
    legal_turn_procedure_state(state.turn)
        && state.speed_feet >= 0
        && state.speed_feet <= 40
        && state.movement_spent_feet >= 0
        && state.movement_spent_feet <= 120
        && legal_grapple_state(state.grapple)
        && movement_remaining_feet(state) >= 0
}

pub fn can_spend_movement(state: MovementGrappleState, facts: MovementSpendFacts) -> bool {
    let cost = movement_cost_feet(facts);
    state.turn.current_actor_owns_turn
        && legal_movement_spend_facts(facts)
        && cost > 0
        && effective_speed_feet(state) > 0
        && movement_remaining_feet(state) >= cost
}

pub fn opportunity_attack_triggered(
    turn: TurnProcedureState,
    facts: OpportunityAttackTriggerFacts,
) -> bool {
    facts.hostile_creature
        && facts.observer_can_see
        && facts.leaves_reach
        && facts.movement_resource == MovementResource::OwnMovementActionBonusReactionOrSpeed
        && !turn.disengaged
}

pub fn spend_movement(
    state: MovementGrappleState,
    facts: MovementSpendFacts,
) -> MovementGrappleState {
    if !can_spend_movement(state, facts) {
        state
    } else {
        MovementGrappleState {
            movement_spent_feet: state.movement_spent_feet + movement_cost_feet(facts),
            ..state
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommandOption {
    CommandApproach,
    CommandDrop,
    CommandFlee,
    CommandGrovel,
    CommandHalt,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CommandPendingEffect {
    pub option: CommandOption,
    pub expires_on_current_turn: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CommandSpellFacts {
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub target_count: i32,
    pub targets_are_valid: bool,
    pub failed_target_count: i32,
    pub failed_targets_are_selected_targets: bool,
    pub option: CommandOption,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CommandSpellResult {
    pub invocation: SpellInvocationResult,
    pub pending_effect_count: i32,
    pub option: CommandOption,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommandGrovelFollowOutcome {
    CommandGrovelIgnored,
    CommandGrovelAppliesProneEndsTurn,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommandDropFollowOutcome {
    CommandDropIgnored,
    CommandDropObjectsAndEndsTurn { dropped_object_count: i32 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommandHaltFollowOutcome {
    CommandHaltIgnored,
    CommandHaltSuppressesActionBonusAndMovement,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommandApproachFollowOutcome {
    CommandApproachNoMovement,
    CommandApproachMovementRejected,
    CommandApproachMovementContinues,
    CommandApproachMovementEndsTurn,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CommandFleeFollowOutcome {
    CommandFleeNoMovementEndsTurn,
    CommandFleeMovementRejected,
    CommandFleeOpportunityAttackContinuation,
    CommandFleeMovementEndsTurn,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CommandFollowResult {
    pub movement: MovementGrappleState,
    pub pending: Option<CommandPendingEffect>,
    pub dropped_object_count: i32,
    pub reaction_window: ReactionWindowState,
}

pub fn command_max_targets(slot_level: i32) -> i32 {
    slot_level
}

pub fn command_pending_applies(
    pending: Option<CommandPendingEffect>,
    option: CommandOption,
) -> bool {
    matches!(
        pending,
        Some(CommandPendingEffect {
            option: pending_option,
            expires_on_current_turn: true,
        }) if pending_option == option
    )
}

pub fn clear_command_pending(
    pending: Option<CommandPendingEffect>,
    option: CommandOption,
) -> Option<CommandPendingEffect> {
    if command_pending_applies(pending, option) {
        None
    } else {
        pending
    }
}

pub fn legal_command_spell_facts(facts: CommandSpellFacts) -> bool {
    facts.target_count >= 1
        && facts.failed_target_count >= 0
        && facts.failed_target_count <= facts.target_count
        && facts.failed_targets_are_selected_targets
}

pub fn resolve_command_spell(
    state: SpellcastingProcedureState,
    facts: CommandSpellFacts,
) -> CommandSpellResult {
    let invocation_facts = SpellInvocationFacts {
        profile: SpellDefinitionProfile::Command,
        has_spell_access: facts.has_spell_access,
        selected_slot_level: facts.selected_slot_level,
        target_count: facts.target_count,
        targets_are_valid: facts.targets_are_valid,
    };
    let invocation = if legal_command_spell_facts(facts) {
        resolve_spell_invocation(state, invocation_facts)
    } else {
        SpellInvocationResult {
            state,
            admitted: false,
            slot_expended: false,
        }
    };
    let pending_effect_count = if spell_invocation_can_affect_targets(invocation, invocation_facts)
    {
        facts.failed_target_count
    } else {
        0
    };

    CommandSpellResult {
        invocation,
        pending_effect_count,
        option: facts.option,
    }
}

pub fn command_grovel_follow_outcome(has_pending_command: bool) -> CommandGrovelFollowOutcome {
    if has_pending_command {
        CommandGrovelFollowOutcome::CommandGrovelAppliesProneEndsTurn
    } else {
        CommandGrovelFollowOutcome::CommandGrovelIgnored
    }
}

pub fn command_drop_follow_outcome(
    has_pending_command: bool,
    held_object_count: i32,
) -> CommandDropFollowOutcome {
    if has_pending_command && held_object_count >= 0 {
        CommandDropFollowOutcome::CommandDropObjectsAndEndsTurn {
            dropped_object_count: held_object_count,
        }
    } else {
        CommandDropFollowOutcome::CommandDropIgnored
    }
}

pub fn command_halt_follow_outcome(has_pending_command: bool) -> CommandHaltFollowOutcome {
    if has_pending_command {
        CommandHaltFollowOutcome::CommandHaltSuppressesActionBonusAndMovement
    } else {
        CommandHaltFollowOutcome::CommandHaltIgnored
    }
}

pub fn command_approach_follow_outcome(
    has_movement_available: bool,
    movement_can_be_spent: bool,
    moved_within_five_feet_of_caster: bool,
) -> CommandApproachFollowOutcome {
    if !has_movement_available {
        CommandApproachFollowOutcome::CommandApproachNoMovement
    } else if !movement_can_be_spent {
        CommandApproachFollowOutcome::CommandApproachMovementRejected
    } else if moved_within_five_feet_of_caster {
        CommandApproachFollowOutcome::CommandApproachMovementEndsTurn
    } else {
        CommandApproachFollowOutcome::CommandApproachMovementContinues
    }
}

pub fn command_flee_follow_outcome(
    has_movement_available: bool,
    movement_cost: i32,
    movement_remaining: i32,
    movement_can_be_spent: bool,
    provokes_opportunity_attack: bool,
) -> CommandFleeFollowOutcome {
    if !has_movement_available {
        CommandFleeFollowOutcome::CommandFleeNoMovementEndsTurn
    } else if movement_cost != movement_remaining || !movement_can_be_spent {
        CommandFleeFollowOutcome::CommandFleeMovementRejected
    } else if provokes_opportunity_attack {
        CommandFleeFollowOutcome::CommandFleeOpportunityAttackContinuation
    } else {
        CommandFleeFollowOutcome::CommandFleeMovementEndsTurn
    }
}

fn command_follow_result(
    movement: MovementGrappleState,
    pending: Option<CommandPendingEffect>,
    dropped_object_count: i32,
    reaction_window: ReactionWindowState,
) -> CommandFollowResult {
    CommandFollowResult {
        movement,
        pending,
        dropped_object_count,
        reaction_window,
    }
}

pub fn follow_command_grovel(
    movement: MovementGrappleState,
    pending: Option<CommandPendingEffect>,
) -> CommandFollowResult {
    match command_grovel_follow_outcome(command_pending_applies(
        pending,
        CommandOption::CommandGrovel,
    )) {
        CommandGrovelFollowOutcome::CommandGrovelAppliesProneEndsTurn => command_follow_result(
            MovementGrappleState {
                turn: end_turn(movement.turn),
                prone: true,
                ..movement
            },
            clear_command_pending(pending, CommandOption::CommandGrovel),
            0,
            ReactionWindowState::NoReactionWindow,
        ),
        CommandGrovelFollowOutcome::CommandGrovelIgnored => {
            command_follow_result(movement, pending, 0, ReactionWindowState::NoReactionWindow)
        }
    }
}

pub fn follow_command_drop(
    movement: MovementGrappleState,
    pending: Option<CommandPendingEffect>,
    held_object_count: i32,
) -> CommandFollowResult {
    match command_drop_follow_outcome(
        command_pending_applies(pending, CommandOption::CommandDrop),
        held_object_count,
    ) {
        CommandDropFollowOutcome::CommandDropObjectsAndEndsTurn {
            dropped_object_count,
        } => command_follow_result(
            MovementGrappleState {
                turn: end_turn(movement.turn),
                ..movement
            },
            clear_command_pending(pending, CommandOption::CommandDrop),
            dropped_object_count,
            ReactionWindowState::NoReactionWindow,
        ),
        CommandDropFollowOutcome::CommandDropIgnored => {
            command_follow_result(movement, pending, 0, ReactionWindowState::NoReactionWindow)
        }
    }
}

pub fn follow_command_halt(
    movement: MovementGrappleState,
    pending: Option<CommandPendingEffect>,
) -> CommandFollowResult {
    match command_halt_follow_outcome(command_pending_applies(pending, CommandOption::CommandHalt))
    {
        CommandHaltFollowOutcome::CommandHaltSuppressesActionBonusAndMovement => {
            command_follow_result(
                MovementGrappleState {
                    turn: TurnProcedureState {
                        action_quota: ActionQuota::ActionSpent,
                        bonus_action_available: false,
                        ..movement.turn
                    },
                    movement_spent_feet: movement_budget_feet(movement),
                    ..movement
                },
                pending,
                0,
                ReactionWindowState::NoReactionWindow,
            )
        }
        CommandHaltFollowOutcome::CommandHaltIgnored => {
            command_follow_result(movement, pending, 0, ReactionWindowState::NoReactionWindow)
        }
    }
}

pub fn end_command_halt_turn(
    movement: MovementGrappleState,
    pending: Option<CommandPendingEffect>,
) -> CommandFollowResult {
    command_follow_result(
        MovementGrappleState {
            turn: end_turn(movement.turn),
            ..movement
        },
        clear_command_pending(pending, CommandOption::CommandHalt),
        0,
        ReactionWindowState::NoReactionWindow,
    )
}

pub fn follow_command_approach(
    movement: MovementGrappleState,
    pending: Option<CommandPendingEffect>,
    facts: MovementSpendFacts,
    moved_within_five_feet_of_caster: bool,
) -> CommandFollowResult {
    if !command_pending_applies(pending, CommandOption::CommandApproach) {
        return command_follow_result(movement, pending, 0, ReactionWindowState::NoReactionWindow);
    }

    let one_foot_step = MovementSpendFacts {
        distance_feet: 1,
        extra_cost_feet: 0,
    };
    match command_approach_follow_outcome(
        can_spend_movement(movement, one_foot_step),
        can_spend_movement(movement, facts),
        moved_within_five_feet_of_caster,
    ) {
        CommandApproachFollowOutcome::CommandApproachNoMovement => command_follow_result(
            movement,
            clear_command_pending(pending, CommandOption::CommandApproach),
            0,
            ReactionWindowState::NoReactionWindow,
        ),
        CommandApproachFollowOutcome::CommandApproachMovementRejected => {
            command_follow_result(movement, pending, 0, ReactionWindowState::NoReactionWindow)
        }
        CommandApproachFollowOutcome::CommandApproachMovementContinues => command_follow_result(
            spend_movement(movement, facts),
            clear_command_pending(pending, CommandOption::CommandApproach),
            0,
            ReactionWindowState::NoReactionWindow,
        ),
        CommandApproachFollowOutcome::CommandApproachMovementEndsTurn => command_follow_result(
            MovementGrappleState {
                turn: end_turn(movement.turn),
                ..spend_movement(movement, facts)
            },
            clear_command_pending(pending, CommandOption::CommandApproach),
            0,
            ReactionWindowState::NoReactionWindow,
        ),
    }
}

pub fn follow_command_flee(
    movement: MovementGrappleState,
    pending: Option<CommandPendingEffect>,
    facts: MovementSpendFacts,
    provokes_opportunity_attack: bool,
) -> CommandFollowResult {
    if !command_pending_applies(pending, CommandOption::CommandFlee) {
        return command_follow_result(movement, pending, 0, ReactionWindowState::NoReactionWindow);
    }

    let one_foot_step = MovementSpendFacts {
        distance_feet: 1,
        extra_cost_feet: 0,
    };
    let movement_cost = movement_cost_feet(facts);
    match command_flee_follow_outcome(
        can_spend_movement(movement, one_foot_step),
        movement_cost,
        movement_remaining_feet(movement),
        can_spend_movement(movement, facts),
        provokes_opportunity_attack,
    ) {
        CommandFleeFollowOutcome::CommandFleeNoMovementEndsTurn => command_follow_result(
            MovementGrappleState {
                turn: end_turn(movement.turn),
                ..movement
            },
            clear_command_pending(pending, CommandOption::CommandFlee),
            0,
            ReactionWindowState::NoReactionWindow,
        ),
        CommandFleeFollowOutcome::CommandFleeMovementRejected => {
            command_follow_result(movement, pending, 0, ReactionWindowState::NoReactionWindow)
        }
        CommandFleeFollowOutcome::CommandFleeOpportunityAttackContinuation => {
            command_follow_result(
                movement,
                pending,
                0,
                offer_reaction_window(
                    ReactionWindowState::NoReactionWindow,
                    ReactionWindowKind::OpportunityAttackReactionWindow,
                ),
            )
        }
        CommandFleeFollowOutcome::CommandFleeMovementEndsTurn => command_follow_result(
            MovementGrappleState {
                turn: end_turn(movement.turn),
                ..spend_movement(movement, facts)
            },
            clear_command_pending(pending, CommandOption::CommandFlee),
            0,
            ReactionWindowState::NoReactionWindow,
        ),
    }
}

pub const SANCTUARY_DURATION_TICKS: i32 = 10;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SanctuaryWardState {
    pub active: bool,
    pub source_is_sanctuary: bool,
    pub duration_ticks: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SanctuarySpellFacts {
    pub has_spell_access: bool,
    pub selected_slot_level: i32,
    pub target_within_range: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SanctuarySpellResult {
    pub invocation: SpellInvocationResult,
    pub ward: SanctuaryWardState,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SanctuaryTargetingTrigger {
    SanctuaryAttackRollTargeting,
    SanctuaryDamagingSpellTargeting,
    SanctuaryAreaOfEffectTargeting,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SanctuaryTargetIdentity {
    WardedCreature,
    ReplacementCreature,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SanctuaryReplacementTargetWitness {
    pub replacement: SanctuaryTargetIdentity,
    pub caller_target_legal: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SanctuaryInterdictionOutcome {
    SanctuarySaveSucceeded,
    SanctuaryLoseAttackOrSpell,
    SanctuaryChooseNewTarget {
        witness: SanctuaryReplacementTargetWitness,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SanctuaryTargetingInterdictionResult {
    pub wisdom_save_requested: bool,
    pub attack_or_spell_lost: bool,
    pub outcome_applies: bool,
    pub replacement_admitted: bool,
    pub resolved_target: SanctuaryTargetIdentity,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SanctuaryWardedAction {
    AttackRoll,
    SpellCast,
    DamageDealt,
    OtherAction,
}

pub fn sanctuary_ward_active_effect() -> SanctuaryWardState {
    SanctuaryWardState {
        active: true,
        source_is_sanctuary: true,
        duration_ticks: SANCTUARY_DURATION_TICKS,
    }
}

pub fn sanctuary_ward_absent() -> SanctuaryWardState {
    SanctuaryWardState {
        active: false,
        source_is_sanctuary: false,
        duration_ticks: 0,
    }
}

pub fn resolve_sanctuary_spell(
    state: SpellcastingProcedureState,
    facts: SanctuarySpellFacts,
) -> SanctuarySpellResult {
    let invocation_facts = SpellInvocationFacts {
        profile: SpellDefinitionProfile::Sanctuary,
        has_spell_access: facts.has_spell_access,
        selected_slot_level: facts.selected_slot_level,
        target_count: 1,
        targets_are_valid: facts.target_within_range,
    };
    let invocation = resolve_spell_invocation(state, invocation_facts);

    SanctuarySpellResult {
        invocation,
        ward: if spell_invocation_can_affect_targets(invocation, invocation_facts) {
            sanctuary_ward_active_effect()
        } else {
            sanctuary_ward_absent()
        },
    }
}

pub fn ward_targeting_interdiction_applies(trigger: SanctuaryTargetingTrigger) -> bool {
    match trigger {
        SanctuaryTargetingTrigger::SanctuaryAttackRollTargeting
        | SanctuaryTargetingTrigger::SanctuaryDamagingSpellTargeting => true,
        SanctuaryTargetingTrigger::SanctuaryAreaOfEffectTargeting => false,
    }
}

pub fn ward_interdiction_loses_attack_or_spell(outcome: SanctuaryInterdictionOutcome) -> bool {
    match outcome {
        SanctuaryInterdictionOutcome::SanctuarySaveSucceeded
        | SanctuaryInterdictionOutcome::SanctuaryChooseNewTarget { .. } => false,
        SanctuaryInterdictionOutcome::SanctuaryLoseAttackOrSpell => true,
    }
}

pub fn sanctuary_replacement_target_admitted(witness: SanctuaryReplacementTargetWitness) -> bool {
    witness.replacement != SanctuaryTargetIdentity::WardedCreature && witness.caller_target_legal
}

pub fn ward_interdiction_target(outcome: SanctuaryInterdictionOutcome) -> SanctuaryTargetIdentity {
    match outcome {
        SanctuaryInterdictionOutcome::SanctuarySaveSucceeded
        | SanctuaryInterdictionOutcome::SanctuaryLoseAttackOrSpell => {
            SanctuaryTargetIdentity::WardedCreature
        }
        SanctuaryInterdictionOutcome::SanctuaryChooseNewTarget { witness } => witness.replacement,
    }
}

pub fn resolve_sanctuary_targeting_interdiction(
    ward: SanctuaryWardState,
    trigger: SanctuaryTargetingTrigger,
    outcome: SanctuaryInterdictionOutcome,
) -> SanctuaryTargetingInterdictionResult {
    let wisdom_save_requested = ward.active && ward_targeting_interdiction_applies(trigger);
    let replacement_admitted = match outcome {
        SanctuaryInterdictionOutcome::SanctuaryChooseNewTarget { witness } => {
            sanctuary_replacement_target_admitted(witness)
        }
        _ => false,
    };
    let attack_or_spell_lost =
        wisdom_save_requested && ward_interdiction_loses_attack_or_spell(outcome);
    let outcome_applies = wisdom_save_requested
        && !attack_or_spell_lost
        && (!matches!(
            outcome,
            SanctuaryInterdictionOutcome::SanctuaryChooseNewTarget { .. }
        ) || replacement_admitted);

    SanctuaryTargetingInterdictionResult {
        wisdom_save_requested,
        attack_or_spell_lost,
        outcome_applies,
        replacement_admitted,
        resolved_target: if outcome_applies || attack_or_spell_lost {
            ward_interdiction_target(outcome)
        } else {
            SanctuaryTargetIdentity::WardedCreature
        },
    }
}

pub fn sanctuary_ward_after_warded_action(
    ward: SanctuaryWardState,
    action: SanctuaryWardedAction,
) -> SanctuaryWardState {
    match action {
        SanctuaryWardedAction::AttackRoll
        | SanctuaryWardedAction::SpellCast
        | SanctuaryWardedAction::DamageDealt => sanctuary_ward_absent(),
        SanctuaryWardedAction::OtherAction => ward,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactionWindowKind {
    OpportunityAttackReactionWindow,
    DamageInterruptionReactionWindow,
    ReadiedMovementReactionWindow,
    ReadiedSpellReactionWindow,
    StatBlockReactionWindow,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SuspendedReactionWindowKind {
    NoSuspendedReactionWindow,
    SuspendedOpportunityAttackReactionWindow,
    SuspendedDamageInterruptionReactionWindow,
    SuspendedReadiedMovementReactionWindow,
    SuspendedReadiedSpellReactionWindow,
    SuspendedStatBlockReactionWindow,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactionWindowState {
    NoReactionWindow,
    OfferedOpportunityAttackWindow {
        suspended: SuspendedReactionWindowKind,
    },
    OfferedDamageInterruptionWindow {
        suspended: SuspendedReactionWindowKind,
    },
    OfferedReadiedMovementWindow {
        suspended: SuspendedReactionWindowKind,
    },
    OfferedReadiedSpellWindow {
        suspended: SuspendedReactionWindowKind,
    },
    OfferedStatBlockReactionWindow {
        suspended: SuspendedReactionWindowKind,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactionChoice {
    DeclineReaction,
    TakeOpportunityAttackReaction,
    TakeDamageInterruptionReaction,
    TakeReadiedMovementReaction,
    TakeReadiedSpellReaction,
    TakeStatBlockReaction,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConcentrationState {
    NoConcentration,
    Concentrating,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReactionProtocolActor {
    InterruptedActor,
    Reactor,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ActorConcentrationState {
    pub interrupted_actor: ConcentrationState,
    pub reactor: ConcentrationState,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConcentrationDamageTarget {
    pub actor: ReactionProtocolActor,
    pub vitals: CreatureVitals,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ConcentrationDamageResult {
    pub concentration: ConcentrationState,
    pub save_required: bool,
    pub save_dc: i32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReactionProtocolState {
    pub interrupted_actor: MovementGrappleState,
    pub reactor: MovementGrappleState,
    pub reaction_window: ReactionWindowState,
    pub concentration: ActorConcentrationState,
}

impl ReactionProtocolState {
    pub fn initial() -> Self {
        Self {
            interrupted_actor: MovementGrappleState::initial(),
            reactor: MovementGrappleState::initial(),
            reaction_window: ReactionWindowState::NoReactionWindow,
            concentration: ActorConcentrationState {
                interrupted_actor: ConcentrationState::NoConcentration,
                reactor: ConcentrationState::NoConcentration,
            },
        }
    }
}

pub const MAXIMUM_REACTION_WINDOW_DEPTH: i32 = 2;

pub fn legal_reaction_window_state(window: ReactionWindowState) -> bool {
    match window {
        ReactionWindowState::NoReactionWindow
        | ReactionWindowState::OfferedOpportunityAttackWindow { .. }
        | ReactionWindowState::OfferedDamageInterruptionWindow { .. }
        | ReactionWindowState::OfferedReadiedMovementWindow { .. }
        | ReactionWindowState::OfferedReadiedSpellWindow { .. }
        | ReactionWindowState::OfferedStatBlockReactionWindow { .. } => true,
    }
}

pub fn legal_reaction_protocol_state(state: ReactionProtocolState) -> bool {
    legal_movement_grapple_state(state.interrupted_actor)
        && legal_movement_grapple_state(state.reactor)
        && legal_reaction_window_state(state.reaction_window)
}

pub fn reaction_window_is_open(window: ReactionWindowState) -> bool {
    window != ReactionWindowState::NoReactionWindow
}

pub fn reaction_window_is_kind(window: ReactionWindowState, kind: ReactionWindowKind) -> bool {
    match window {
        ReactionWindowState::NoReactionWindow => false,
        ReactionWindowState::OfferedOpportunityAttackWindow { .. } => {
            kind == ReactionWindowKind::OpportunityAttackReactionWindow
        }
        ReactionWindowState::OfferedDamageInterruptionWindow { .. } => {
            kind == ReactionWindowKind::DamageInterruptionReactionWindow
        }
        ReactionWindowState::OfferedReadiedMovementWindow { .. } => {
            kind == ReactionWindowKind::ReadiedMovementReactionWindow
        }
        ReactionWindowState::OfferedReadiedSpellWindow { .. } => {
            kind == ReactionWindowKind::ReadiedSpellReactionWindow
        }
        ReactionWindowState::OfferedStatBlockReactionWindow { .. } => {
            kind == ReactionWindowKind::StatBlockReactionWindow
        }
    }
}

fn reaction_window_suspended_kind(window: ReactionWindowState) -> SuspendedReactionWindowKind {
    match window {
        ReactionWindowState::NoReactionWindow => {
            SuspendedReactionWindowKind::NoSuspendedReactionWindow
        }
        ReactionWindowState::OfferedOpportunityAttackWindow { suspended }
        | ReactionWindowState::OfferedDamageInterruptionWindow { suspended }
        | ReactionWindowState::OfferedReadiedMovementWindow { suspended }
        | ReactionWindowState::OfferedReadiedSpellWindow { suspended }
        | ReactionWindowState::OfferedStatBlockReactionWindow { suspended } => suspended,
    }
}

pub fn reaction_window_depth(window: ReactionWindowState) -> i32 {
    match window {
        ReactionWindowState::NoReactionWindow => 0,
        _ if reaction_window_suspended_kind(window)
            == SuspendedReactionWindowKind::NoSuspendedReactionWindow =>
        {
            1
        }
        _ => 2,
    }
}

pub fn reaction_choice_matches_window(choice: ReactionChoice, window: ReactionWindowState) -> bool {
    match choice {
        ReactionChoice::DeclineReaction => true,
        ReactionChoice::TakeOpportunityAttackReaction => {
            reaction_window_is_kind(window, ReactionWindowKind::OpportunityAttackReactionWindow)
        }
        ReactionChoice::TakeDamageInterruptionReaction => {
            reaction_window_is_kind(window, ReactionWindowKind::DamageInterruptionReactionWindow)
        }
        ReactionChoice::TakeReadiedMovementReaction => {
            reaction_window_is_kind(window, ReactionWindowKind::ReadiedMovementReactionWindow)
        }
        ReactionChoice::TakeReadiedSpellReaction => {
            reaction_window_is_kind(window, ReactionWindowKind::ReadiedSpellReactionWindow)
        }
        ReactionChoice::TakeStatBlockReaction => {
            reaction_window_is_kind(window, ReactionWindowKind::StatBlockReactionWindow)
        }
    }
}

pub fn suspended_reaction_window_kind(window: ReactionWindowState) -> SuspendedReactionWindowKind {
    match window {
        ReactionWindowState::NoReactionWindow => {
            SuspendedReactionWindowKind::NoSuspendedReactionWindow
        }
        ReactionWindowState::OfferedOpportunityAttackWindow { .. } => {
            SuspendedReactionWindowKind::SuspendedOpportunityAttackReactionWindow
        }
        ReactionWindowState::OfferedDamageInterruptionWindow { .. } => {
            SuspendedReactionWindowKind::SuspendedDamageInterruptionReactionWindow
        }
        ReactionWindowState::OfferedReadiedMovementWindow { .. } => {
            SuspendedReactionWindowKind::SuspendedReadiedMovementReactionWindow
        }
        ReactionWindowState::OfferedReadiedSpellWindow { .. } => {
            SuspendedReactionWindowKind::SuspendedReadiedSpellReactionWindow
        }
        ReactionWindowState::OfferedStatBlockReactionWindow { .. } => {
            SuspendedReactionWindowKind::SuspendedStatBlockReactionWindow
        }
    }
}

pub fn reaction_window_for_kind(
    kind: ReactionWindowKind,
    suspended: SuspendedReactionWindowKind,
) -> ReactionWindowState {
    match kind {
        ReactionWindowKind::OpportunityAttackReactionWindow => {
            ReactionWindowState::OfferedOpportunityAttackWindow { suspended }
        }
        ReactionWindowKind::DamageInterruptionReactionWindow => {
            ReactionWindowState::OfferedDamageInterruptionWindow { suspended }
        }
        ReactionWindowKind::ReadiedMovementReactionWindow => {
            ReactionWindowState::OfferedReadiedMovementWindow { suspended }
        }
        ReactionWindowKind::ReadiedSpellReactionWindow => {
            ReactionWindowState::OfferedReadiedSpellWindow { suspended }
        }
        ReactionWindowKind::StatBlockReactionWindow => {
            ReactionWindowState::OfferedStatBlockReactionWindow { suspended }
        }
    }
}

pub fn reaction_window_for_suspended_kind(
    suspended: SuspendedReactionWindowKind,
) -> ReactionWindowState {
    match suspended {
        SuspendedReactionWindowKind::NoSuspendedReactionWindow => {
            ReactionWindowState::NoReactionWindow
        }
        SuspendedReactionWindowKind::SuspendedOpportunityAttackReactionWindow => {
            ReactionWindowState::OfferedOpportunityAttackWindow {
                suspended: SuspendedReactionWindowKind::NoSuspendedReactionWindow,
            }
        }
        SuspendedReactionWindowKind::SuspendedDamageInterruptionReactionWindow => {
            ReactionWindowState::OfferedDamageInterruptionWindow {
                suspended: SuspendedReactionWindowKind::NoSuspendedReactionWindow,
            }
        }
        SuspendedReactionWindowKind::SuspendedReadiedMovementReactionWindow => {
            ReactionWindowState::OfferedReadiedMovementWindow {
                suspended: SuspendedReactionWindowKind::NoSuspendedReactionWindow,
            }
        }
        SuspendedReactionWindowKind::SuspendedReadiedSpellReactionWindow => {
            ReactionWindowState::OfferedReadiedSpellWindow {
                suspended: SuspendedReactionWindowKind::NoSuspendedReactionWindow,
            }
        }
        SuspendedReactionWindowKind::SuspendedStatBlockReactionWindow => {
            ReactionWindowState::OfferedStatBlockReactionWindow {
                suspended: SuspendedReactionWindowKind::NoSuspendedReactionWindow,
            }
        }
    }
}

pub fn restore_suspended_reaction_window(window: ReactionWindowState) -> ReactionWindowState {
    match window {
        ReactionWindowState::NoReactionWindow => ReactionWindowState::NoReactionWindow,
        _ => reaction_window_for_suspended_kind(reaction_window_suspended_kind(window)),
    }
}

pub fn offer_reaction_window(
    window: ReactionWindowState,
    kind: ReactionWindowKind,
) -> ReactionWindowState {
    match window {
        ReactionWindowState::NoReactionWindow => {
            reaction_window_for_kind(kind, SuspendedReactionWindowKind::NoSuspendedReactionWindow)
        }
        _ if reaction_window_depth(window) >= MAXIMUM_REACTION_WINDOW_DEPTH => window,
        _ => reaction_window_for_kind(kind, suspended_reaction_window_kind(window)),
    }
}

pub fn decline_reaction_window(window: ReactionWindowState) -> ReactionWindowState {
    restore_suspended_reaction_window(window)
}

pub fn advance_continuation(window: ReactionWindowState) -> ReactionWindowState {
    restore_suspended_reaction_window(window)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ReactionChoiceResult {
    pub turn: TurnProcedureState,
    pub reaction_window: ReactionWindowState,
}

pub fn resolve_reaction_choice(
    reactor_turn: TurnProcedureState,
    window: ReactionWindowState,
    choice: ReactionChoice,
) -> ReactionChoiceResult {
    match window {
        ReactionWindowState::NoReactionWindow => ReactionChoiceResult {
            turn: reactor_turn,
            reaction_window: ReactionWindowState::NoReactionWindow,
        },
        _ if !reaction_choice_matches_window(choice, window) => ReactionChoiceResult {
            turn: reactor_turn,
            reaction_window: window,
        },
        _ if choice == ReactionChoice::DeclineReaction => ReactionChoiceResult {
            turn: reactor_turn,
            reaction_window: decline_reaction_window(window),
        },
        _ => {
            let spent = spend_reaction(reactor_turn);
            if spent == reactor_turn {
                ReactionChoiceResult {
                    turn: reactor_turn,
                    reaction_window: window,
                }
            } else {
                ReactionChoiceResult {
                    turn: spent,
                    reaction_window: advance_continuation(window),
                }
            }
        }
    }
}

pub fn offer_opportunity_attack_reaction(
    state: ReactionProtocolState,
    facts: OpportunityAttackTriggerFacts,
) -> ReactionProtocolState {
    if opportunity_attack_triggered(state.interrupted_actor.turn, facts) {
        ReactionProtocolState {
            reaction_window: offer_reaction_window(
                state.reaction_window,
                ReactionWindowKind::OpportunityAttackReactionWindow,
            ),
            ..state
        }
    } else {
        state
    }
}

pub fn resolve_opportunity_attack_continuation(
    state: ReactionProtocolState,
) -> ReactionProtocolState {
    let choice = resolve_reaction_choice(
        state.reactor.turn,
        state.reaction_window,
        ReactionChoice::TakeOpportunityAttackReaction,
    );
    if choice.reaction_window == state.reaction_window {
        state
    } else {
        ReactionProtocolState {
            reactor: MovementGrappleState {
                turn: choice.turn,
                ..state.reactor
            },
            reaction_window: choice.reaction_window,
            ..state
        }
    }
}

pub fn offer_damage_interruption_reaction(
    state: ReactionProtocolState,
    effective_damage: i32,
) -> ReactionProtocolState {
    if effective_damage > 0 {
        ReactionProtocolState {
            reaction_window: offer_reaction_window(
                state.reaction_window,
                ReactionWindowKind::DamageInterruptionReactionWindow,
            ),
            ..state
        }
    } else {
        state
    }
}

pub fn can_spend_readied_reaction_movement(
    reactor: MovementGrappleState,
    facts: MovementSpendFacts,
) -> bool {
    let cost = movement_cost_feet(facts);
    legal_movement_spend_facts(facts)
        && cost > 0
        && reactor.turn.readied_movement_held
        && effective_speed_feet(reactor) > 0
        && cost <= effective_speed_feet(reactor)
        && reactor.movement_spent_feet + cost <= 120
}

pub fn spend_readied_reaction_movement(
    reactor: MovementGrappleState,
    facts: MovementSpendFacts,
) -> MovementGrappleState {
    if !can_spend_readied_reaction_movement(reactor, facts) {
        reactor
    } else {
        MovementGrappleState {
            turn: TurnProcedureState {
                readied_movement_held: false,
                ..reactor.turn
            },
            movement_spent_feet: reactor.movement_spent_feet + movement_cost_feet(facts),
            ..reactor
        }
    }
}

pub fn resolve_readied_movement_reaction(
    state: ReactionProtocolState,
    facts: MovementSpendFacts,
) -> ReactionProtocolState {
    let can_release = reaction_window_is_kind(
        state.reaction_window,
        ReactionWindowKind::ReadiedMovementReactionWindow,
    ) && can_spend_readied_reaction_movement(state.reactor, facts);
    let choice = resolve_reaction_choice(
        state.reactor.turn,
        state.reaction_window,
        ReactionChoice::TakeReadiedMovementReaction,
    );
    let moved = if !can_release || choice.reaction_window == state.reaction_window {
        state.reactor
    } else {
        spend_readied_reaction_movement(
            MovementGrappleState {
                turn: choice.turn,
                ..state.reactor
            },
            facts,
        )
    };

    ReactionProtocolState {
        reactor: moved,
        reaction_window: if !can_release {
            state.reaction_window
        } else {
            choice.reaction_window
        },
        ..state
    }
}

pub fn concentration_for_actor(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor,
) -> ConcentrationState {
    match actor {
        ReactionProtocolActor::InterruptedActor => concentration.interrupted_actor,
        ReactionProtocolActor::Reactor => concentration.reactor,
    }
}

pub fn set_concentration_for_actor(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor,
    actor_concentration: ConcentrationState,
) -> ActorConcentrationState {
    match actor {
        ReactionProtocolActor::InterruptedActor => ActorConcentrationState {
            interrupted_actor: actor_concentration,
            reactor: concentration.reactor,
        },
        ReactionProtocolActor::Reactor => ActorConcentrationState {
            interrupted_actor: concentration.interrupted_actor,
            reactor: actor_concentration,
        },
    }
}

pub fn start_concentration(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor,
    can_concentrate: bool,
) -> ActorConcentrationState {
    if can_concentrate {
        set_concentration_for_actor(concentration, actor, ConcentrationState::Concentrating)
    } else {
        concentration
    }
}

pub fn end_concentration(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor,
) -> ActorConcentrationState {
    set_concentration_for_actor(concentration, actor, ConcentrationState::NoConcentration)
}

pub fn break_concentration_if_prevented(
    concentration: ActorConcentrationState,
    actor: ReactionProtocolActor,
    incapacitated_or_dead: bool,
) -> ActorConcentrationState {
    if incapacitated_or_dead {
        set_concentration_for_actor(concentration, actor, ConcentrationState::NoConcentration)
    } else {
        concentration
    }
}

pub fn concentration_saving_throw_dc(effective_damage: i32) -> i32 {
    let half_damage = effective_damage / 2;
    half_damage.clamp(10, 30)
}

pub fn resolve_concentration_after_damage(
    concentration: ConcentrationState,
    effective_damage: i32,
    save_succeeded: bool,
) -> ConcentrationDamageResult {
    let save_required = concentration == ConcentrationState::Concentrating && effective_damage > 0;
    let save_dc = if save_required {
        concentration_saving_throw_dc(effective_damage)
    } else {
        0
    };
    ConcentrationDamageResult {
        concentration: if save_required && !save_succeeded {
            ConcentrationState::NoConcentration
        } else {
            concentration
        },
        save_required,
        save_dc,
    }
}

pub fn apply_damage_target_with_concentration_interruption(
    state: ReactionProtocolState,
    target: ConcentrationDamageTarget,
    effective_damage: i32,
    concentration_save_succeeded: bool,
) -> ReactionProtocolState {
    if !can_apply_resolved_damage_to_positive_hit_points(target.vitals) {
        return state;
    }

    let damaged = apply_resolved_damage_to_positive_hit_points(target.vitals, effective_damage);
    let after_damage_concentration = resolve_concentration_after_damage(
        concentration_for_actor(state.concentration, target.actor),
        damaged.damage_to_hit_points,
        concentration_save_succeeded,
    );
    let after_damage = ReactionProtocolState {
        concentration: set_concentration_for_actor(
            state.concentration,
            target.actor,
            after_damage_concentration.concentration,
        ),
        ..state
    };

    if damaged.damage_to_hit_points > 0 {
        ReactionProtocolState {
            reaction_window: offer_reaction_window(
                after_damage.reaction_window,
                ReactionWindowKind::DamageInterruptionReactionWindow,
            ),
            ..after_damage
        }
    } else {
        after_damage
    }
}
