#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CreatureKind {
    PlayerCharacter,
    MonsterCreature,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HitPoints(i64);

impl HitPoints {
    pub const fn get(self) -> i64 {
        self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HitPointMaximum(i64);

impl HitPointMaximum {
    pub fn try_new(value: i64) -> Result<Self, HitPointMaximumError> {
        if value > 0 {
            Ok(Self(value))
        } else {
            Err(HitPointMaximumError::NotPositive { value })
        }
    }

    pub const fn get(self) -> i64 {
        self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HitPointMaximumError {
    NotPositive { value: i64 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TemporaryHitPoints(i64);

impl TemporaryHitPoints {
    pub fn try_new(value: i64) -> Result<Self, TemporaryHitPointsError> {
        if value >= 0 {
            Ok(Self(value))
        } else {
            Err(TemporaryHitPointsError::Negative { value })
        }
    }

    pub const fn get(self) -> i64 {
        self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TemporaryHitPointsError {
    Negative { value: i64 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DamageInput(pub i64);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HitPointDamageAmount(i64);

impl HitPointDamageAmount {
    pub fn try_new(value: i64) -> Result<Self, HitPointDamageAmountError> {
        if value >= 0 {
            Ok(Self(value))
        } else {
            Err(HitPointDamageAmountError::Negative { value })
        }
    }

    pub const fn get(self) -> i64 {
        self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HitPointDamageAmountError {
    Negative { value: i64 },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CreatureVitals {
    kind: CreatureKind,
    hit_points: HitPoints,
    hit_point_maximum: HitPointMaximum,
    temporary_hit_points: TemporaryHitPoints,
    dead: bool,
    unconscious: bool,
}

impl CreatureVitals {
    pub fn try_new(
        kind: CreatureKind,
        hit_points: i64,
        hit_point_maximum: i64,
        temporary_hit_points: i64,
        dead: bool,
        unconscious: bool,
    ) -> Result<Self, VitalsError> {
        let hit_point_maximum = HitPointMaximum::try_new(hit_point_maximum).map_err(|_| {
            VitalsError::HitPointMaximumNotPositive {
                value: hit_point_maximum,
            }
        })?;
        let temporary_hit_points =
            TemporaryHitPoints::try_new(temporary_hit_points).map_err(|_| {
                VitalsError::TemporaryHitPointsNegative {
                    value: temporary_hit_points,
                }
            })?;

        if hit_points < 0 {
            return Err(VitalsError::HitPointsNegative { value: hit_points });
        }
        if hit_points > hit_point_maximum.get() {
            return Err(VitalsError::HitPointsAboveMaximum {
                hit_points,
                hit_point_maximum: hit_point_maximum.get(),
            });
        }
        if dead && hit_points != 0 {
            return Err(VitalsError::DeadMustHaveZeroHitPoints { hit_points });
        }
        if kind == CreatureKind::MonsterCreature && hit_points == 0 && !dead {
            return Err(VitalsError::MonsterAtZeroHitPointsMustBeDead);
        }
        if kind == CreatureKind::PlayerCharacter && hit_points == 0 && !dead && !unconscious {
            return Err(VitalsError::PlayerCharacterAtZeroHitPointsMustBeUnconscious);
        }

        Ok(Self {
            kind,
            hit_points: HitPoints(hit_points),
            hit_point_maximum,
            temporary_hit_points,
            dead,
            unconscious,
        })
    }

    fn from_legal_parts(
        kind: CreatureKind,
        hit_points: HitPoints,
        hit_point_maximum: HitPointMaximum,
        temporary_hit_points: TemporaryHitPoints,
        dead: bool,
        unconscious: bool,
    ) -> Self {
        Self {
            kind,
            hit_points,
            hit_point_maximum,
            temporary_hit_points,
            dead,
            unconscious,
        }
    }

    pub const fn kind(self) -> CreatureKind {
        self.kind
    }

    pub const fn hit_points(self) -> HitPoints {
        self.hit_points
    }

    pub const fn hit_point_maximum(self) -> HitPointMaximum {
        self.hit_point_maximum
    }

    pub const fn temporary_hit_points(self) -> TemporaryHitPoints {
        self.temporary_hit_points
    }

    pub const fn dead(self) -> bool {
        self.dead
    }

    pub const fn unconscious(self) -> bool {
        self.unconscious
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VitalsError {
    HitPointMaximumNotPositive {
        value: i64,
    },
    HitPointsNegative {
        value: i64,
    },
    HitPointsAboveMaximum {
        hit_points: i64,
        hit_point_maximum: i64,
    },
    TemporaryHitPointsNegative {
        value: i64,
    },
    DeadMustHaveZeroHitPoints {
        hit_points: i64,
    },
    MonsterAtZeroHitPointsMustBeDead,
    PlayerCharacterAtZeroHitPointsMustBeUnconscious,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PositiveHitPointDamageVitals(CreatureVitals);

impl PositiveHitPointDamageVitals {
    pub fn try_new(vitals: CreatureVitals) -> Result<Self, PositiveHitPointDamageRejection> {
        if vitals.dead() || vitals.hit_points().get() > 0 {
            Ok(Self(vitals))
        } else {
            Err(PositiveHitPointDamageRejection::ZeroHitPointsNonDead)
        }
    }

    pub const fn into_inner(self) -> CreatureVitals {
        self.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PositiveHitPointDamageRejection {
    ZeroHitPointsNonDead,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DamageResult {
    vitals: CreatureVitals,
    damage_to_hit_points: HitPointDamageAmount,
    remaining_damage_at_zero: HitPointDamageAmount,
}

impl DamageResult {
    pub const fn vitals(self) -> CreatureVitals {
        self.vitals
    }

    pub const fn damage_to_hit_points(self) -> HitPointDamageAmount {
        self.damage_to_hit_points
    }

    pub const fn remaining_damage_at_zero(self) -> HitPointDamageAmount {
        self.remaining_damage_at_zero
    }
}

pub fn nonnegative(input: DamageInput) -> HitPointDamageAmount {
    HitPointDamageAmount(if input.0 < 0 { 0 } else { input.0 })
}

pub fn clamp_hit_points(hit_points: i64, hit_point_maximum: HitPointMaximum) -> HitPoints {
    if hit_points < 0 {
        HitPoints(0)
    } else if hit_points > hit_point_maximum.get() {
        HitPoints(hit_point_maximum.get())
    } else {
        HitPoints(hit_points)
    }
}

pub fn absorb_temporary_hit_points(
    vitals: &CreatureVitals,
    damage: HitPointDamageAmount,
) -> HitPointDamageAmount {
    HitPointDamageAmount(if damage.get() > vitals.temporary_hit_points().get() {
        vitals.temporary_hit_points().get()
    } else {
        damage.get()
    })
}

pub fn apply_resolved_damage_to_positive_hit_points(
    vitals: PositiveHitPointDamageVitals,
    raw_damage: DamageInput,
) -> DamageResult {
    let vitals = vitals.into_inner();

    if vitals.dead() {
        return DamageResult {
            vitals,
            damage_to_hit_points: HitPointDamageAmount(0),
            remaining_damage_at_zero: HitPointDamageAmount(0),
        };
    }

    let resolved_damage = nonnegative(raw_damage);
    let absorbed_by_temporary_hit_points = absorb_temporary_hit_points(&vitals, resolved_damage);
    let damage_to_hit_points =
        HitPointDamageAmount(resolved_damage.get() - absorbed_by_temporary_hit_points.get());
    let remaining_damage_at_zero =
        HitPointDamageAmount(if damage_to_hit_points.get() > vitals.hit_points().get() {
            damage_to_hit_points.get() - vitals.hit_points().get()
        } else {
            0
        });
    let next_hit_points = clamp_hit_points(
        vitals.hit_points().get() - damage_to_hit_points.get(),
        vitals.hit_point_maximum(),
    );
    let drops_to_zero = vitals.hit_points().get() > 0 && next_hit_points.get() == 0;
    let instant_death = drops_to_zero
        && vitals.kind() == CreatureKind::PlayerCharacter
        && remaining_damage_at_zero.get() >= vitals.hit_point_maximum().get();
    let next_dead = vitals.dead()
        || (vitals.kind() == CreatureKind::MonsterCreature && next_hit_points.get() == 0)
        || instant_death;
    let next_unconscious = vitals.unconscious()
        || (drops_to_zero && vitals.kind() == CreatureKind::PlayerCharacter && !instant_death);

    DamageResult {
        vitals: CreatureVitals::from_legal_parts(
            vitals.kind(),
            next_hit_points,
            vitals.hit_point_maximum(),
            TemporaryHitPoints(
                vitals.temporary_hit_points().get() - absorbed_by_temporary_hit_points.get(),
            ),
            next_dead,
            next_unconscious,
        ),
        damage_to_hit_points,
        remaining_damage_at_zero,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn admitted(vitals: CreatureVitals) -> PositiveHitPointDamageVitals {
        match PositiveHitPointDamageVitals::try_new(vitals) {
            Ok(vitals) => vitals,
            Err(err) => panic!("expected positive-Hit-Point damage admission: {err:?}"),
        }
    }

    #[test]
    fn legal_vitals_reject_invalid_hit_point_states() {
        assert_eq!(
            CreatureVitals::try_new(CreatureKind::PlayerCharacter, 4, 0, 0, false, false),
            Err(VitalsError::HitPointMaximumNotPositive { value: 0 })
        );
        assert_eq!(
            CreatureVitals::try_new(CreatureKind::PlayerCharacter, -1, 10, 0, false, false),
            Err(VitalsError::HitPointsNegative { value: -1 })
        );
        assert_eq!(
            CreatureVitals::try_new(CreatureKind::PlayerCharacter, 11, 10, 0, false, false),
            Err(VitalsError::HitPointsAboveMaximum {
                hit_points: 11,
                hit_point_maximum: 10,
            })
        );
        assert_eq!(
            CreatureVitals::try_new(CreatureKind::PlayerCharacter, 4, 10, -1, false, false),
            Err(VitalsError::TemporaryHitPointsNegative { value: -1 })
        );
        assert_eq!(
            CreatureVitals::try_new(CreatureKind::PlayerCharacter, 4, 10, 0, true, false),
            Err(VitalsError::DeadMustHaveZeroHitPoints { hit_points: 4 })
        );
        assert_eq!(
            CreatureVitals::try_new(CreatureKind::MonsterCreature, 0, 10, 0, false, false),
            Err(VitalsError::MonsterAtZeroHitPointsMustBeDead)
        );
        assert_eq!(
            CreatureVitals::try_new(CreatureKind::PlayerCharacter, 0, 10, 0, false, false),
            Err(VitalsError::PlayerCharacterAtZeroHitPointsMustBeUnconscious)
        );
    }

    #[test]
    fn positive_hit_point_damage_admission_rejects_non_dead_zero_hp_characters() {
        let vitals = CreatureVitals::try_new(CreatureKind::PlayerCharacter, 0, 10, 0, false, true)
            .expect("zero-HP unconscious player character is legal vitals");

        assert_eq!(
            PositiveHitPointDamageVitals::try_new(vitals),
            Err(PositiveHitPointDamageRejection::ZeroHitPointsNonDead)
        );
    }

    #[test]
    fn already_dead_creatures_are_admitted_but_damage_is_noop() {
        let vitals = CreatureVitals::try_new(CreatureKind::MonsterCreature, 0, 10, 0, true, false)
            .expect("dead monster at 0 Hit Points is legal");

        let result =
            apply_resolved_damage_to_positive_hit_points(admitted(vitals), DamageInput(20));

        assert_eq!(result.vitals(), vitals);
        assert_eq!(result.damage_to_hit_points().get(), 0);
        assert_eq!(result.remaining_damage_at_zero().get(), 0);
    }

    #[test]
    fn negative_damage_is_clamped_to_zero() {
        let vitals = CreatureVitals::try_new(CreatureKind::PlayerCharacter, 8, 10, 0, false, false)
            .expect("positive-Hit-Point player character is legal");

        let result =
            apply_resolved_damage_to_positive_hit_points(admitted(vitals), DamageInput(-3));

        assert_eq!(result.vitals().hit_points().get(), 8);
        assert_eq!(result.damage_to_hit_points().get(), 0);
        assert_eq!(result.remaining_damage_at_zero().get(), 0);
    }

    #[test]
    fn temporary_hit_points_absorb_damage_before_hit_points() {
        let vitals = CreatureVitals::try_new(CreatureKind::PlayerCharacter, 8, 10, 5, false, false)
            .expect("positive-Hit-Point player character with Temporary Hit Points is legal");

        let result = apply_resolved_damage_to_positive_hit_points(admitted(vitals), DamageInput(7));

        assert_eq!(result.vitals().temporary_hit_points().get(), 0);
        assert_eq!(result.vitals().hit_points().get(), 6);
        assert_eq!(result.damage_to_hit_points().get(), 2);
        assert_eq!(result.remaining_damage_at_zero().get(), 0);
    }

    #[test]
    fn monster_dies_when_damage_reduces_it_to_zero_hit_points() {
        let vitals = CreatureVitals::try_new(CreatureKind::MonsterCreature, 4, 10, 0, false, false)
            .expect("positive-Hit-Point monster is legal");

        let result = apply_resolved_damage_to_positive_hit_points(admitted(vitals), DamageInput(4));

        assert_eq!(result.vitals().hit_points().get(), 0);
        assert!(result.vitals().dead());
        assert!(!result.vitals().unconscious());
        assert_eq!(result.damage_to_hit_points().get(), 4);
        assert_eq!(result.remaining_damage_at_zero().get(), 0);
    }

    #[test]
    fn player_character_falls_unconscious_at_zero_without_instant_death() {
        let vitals = CreatureVitals::try_new(CreatureKind::PlayerCharacter, 4, 10, 0, false, false)
            .expect("positive-Hit-Point player character is legal");

        let result = apply_resolved_damage_to_positive_hit_points(admitted(vitals), DamageInput(9));

        assert_eq!(result.vitals().hit_points().get(), 0);
        assert!(!result.vitals().dead());
        assert!(result.vitals().unconscious());
        assert_eq!(result.damage_to_hit_points().get(), 9);
        assert_eq!(result.remaining_damage_at_zero().get(), 5);
    }

    #[test]
    fn player_character_dies_when_remaining_damage_equals_hit_point_maximum() {
        let vitals = CreatureVitals::try_new(CreatureKind::PlayerCharacter, 6, 12, 0, false, false)
            .expect("positive-Hit-Point player character is legal");

        let result =
            apply_resolved_damage_to_positive_hit_points(admitted(vitals), DamageInput(18));

        assert_eq!(result.vitals().hit_points().get(), 0);
        assert!(result.vitals().dead());
        assert!(!result.vitals().unconscious());
        assert_eq!(result.damage_to_hit_points().get(), 18);
        assert_eq!(result.remaining_damage_at_zero().get(), 12);
    }
}
