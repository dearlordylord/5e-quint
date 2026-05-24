# Hit Point Damage Rust Dry Run

Manual dry run for `SHARED.HIT_POINTS.POSITIVE_DAMAGE`.

This is C-lane generator-readiness evidence only. It is not generated Rust
source, does not introduce a Rust ABI, and does not change reducer behavior.

## Inputs

- Semantic core: `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- Proof-only companion:
  `packages/shared-algebras/proofs/rule-core/hit-point-damage-inductive.qnt`
- Runtime parity route:
  `packages/battle-runtime/src/rule-core-hit-point-damage.mbt.test.ts`
- Production runtime owner:
  `packages/battle-runtime/src/battle-reducer/damage-apply.ts`

## RAW And Language Anchors

- `.references/srd-5.2.1/Playing-the-Game.md#Hit Points`: Hit Points range
  from Hit Point Maximum down to 0, and damage subtracts from Hit Points.
- `.references/srd-5.2.1/Playing-the-Game.md#Damage Rolls`: a damage penalty
  can reduce damage to 0 but not below 0.
- `.references/srd-5.2.1/Playing-the-Game.md#Instant Death`: monsters die at
  0 Hit Points, and a character dies from massive damage when the remainder
  equals or exceeds Hit Point Maximum.
- `.references/srd-5.2.1/Playing-the-Game.md#Falling Unconscious`: a character
  at 0 Hit Points falls Unconscious when not killed instantly.
- `.references/srd-5.2.1/Playing-the-Game.md#Temporary Hit Points`: Temporary
  Hit Points are lost before Hit Points, and leftover damage carries over.
- `UBIQUITOUS_LANGUAGE.md#Hit Points and Death`: use Hit Points, Hit Point
  Maximum, Temporary Hit Points, and Instant Death as domain terms.

## QNT Semantic Core

The generator-facing core is the pure portion of `hit-point-damage.qnt`:

- `CreatureKind = PlayerCharacter | MonsterCreature`
- `CreatureVitals`
- `DamageResult`
- `nonnegative`
- `clampHitPoints`
- `legalVitals`
- `canApplyResolvedDamageToPositiveHitPoints`
- `absorbTemporaryHitPoints`
- `applyResolvedDamageToPositiveHitPoints`

The former `run test_*` blocks were fixture evidence, not semantic input, and
now live outside this generator-facing core. The readiness row is
`generation-subset-clean`.

## Hypothetical Rust Shapes

The future generated slice would need domain constructors rather than raw
integers at public boundaries. These are Rust-like sketches for review, not
compilable committed source:

```rust
enum CreatureKind {
    PlayerCharacter,
    MonsterCreature,
}

struct HitPoints(i64);
struct HitPointMaximum(i64);
struct TemporaryHitPoints(i64);
struct DamageInput(i64);
struct HitPointDamageAmount(i64);

struct CreatureVitals {
    kind: CreatureKind,
    hit_points: HitPoints,
    hit_point_maximum: HitPointMaximum,
    temporary_hit_points: TemporaryHitPoints,
    dead: bool,
    unconscious: bool,
}

struct PositiveHitPointDamageVitals(CreatureVitals);

struct DamageResult {
    vitals: CreatureVitals,
    damage_to_hit_points: HitPointDamageAmount,
    remaining_damage_at_zero: HitPointDamageAmount,
}
```

Constructor obligations:

- `HitPointMaximum` admits values greater than 0.
- `HitPoints` admits values from 0 through `HitPointMaximum` when paired with a
  `CreatureVitals` value.
- `TemporaryHitPoints` admits values greater than or equal to 0.
- `DamageInput` is the caller-supplied damage integer before the QNT
  `nonnegative` step; negative values are admissible intermediate input because
  penalties can reduce damage to 0 but not below 0.
- `HitPointDamageAmount` admits values greater than or equal to 0 and is not
  bounded by Hit Point Maximum because massive damage can exceed remaining Hit
  Points.
- `CreatureVitals` construction enforces `legalVitals` so downstream generated
  functions do not rediscover ordinary invalid state.
- `PositiveHitPointDamageVitals` is constructed from `CreatureVitals` only when
  `canApplyResolvedDamageToPositiveHitPoints` holds: the creature is legal and
  either already dead, which is the QNT no-op branch, or has more than 0 Hit
  Points. A legal non-dead 0-HP player character is rejected to the separate
  damage-at-0-HP procedure.

## Function Mapping

| QNT definition | Rust shape | Notes |
| --- | --- | --- |
| `nonnegative(n)` | `fn nonnegative(n: i64) -> HitPointDamageAmount` | Pure scalar clamp from damage input to legal damage amount. |
| `clampHitPoints(hitPoints, hitPointMaximum)` | `fn clamp_hit_points(hit_points: i64, maximum: HitPointMaximum) -> HitPoints` | Output is typed as legal Hit Points. |
| `legalVitals(vitals)` | `CreatureVitals::try_new(...) -> Result<CreatureVitals, VitalsError>` | Boundary parser, not a reducer branch. |
| `canApplyResolvedDamageToPositiveHitPoints(vitals)` | `PositiveHitPointDamageVitals::try_from(vitals) -> Result<PositiveHitPointDamageVitals, PositiveHitPointDamageRejection>` | Admission constructor for callers that may still hold zero-HP non-dead creatures. |
| `absorbTemporaryHitPoints(vitals, damage)` | `fn absorb_temporary_hit_points(vitals: &CreatureVitals, damage: HitPointDamageAmount) -> HitPointDamageAmount` | Private/helper-safe shape; nonnegative input is required for nonnegative output. |
| `applyResolvedDamageToPositiveHitPoints(vitals, rawDamage)` | `fn apply_resolved_damage_to_positive_hit_points(vitals: PositiveHitPointDamageVitals, raw_damage: DamageInput) -> DamageResult` | Main state transition after admission. |

The main transition maps mechanically:

```rust
fn apply_resolved_damage_to_positive_hit_points(
    vitals: PositiveHitPointDamageVitals,
    raw_damage: DamageInput,
) -> DamageResult {
    let vitals = vitals.into_inner();

    if vitals.dead {
        return DamageResult {
            vitals,
            damage_to_hit_points: HitPointDamageAmount(0),
            remaining_damage_at_zero: HitPointDamageAmount(0),
        };
    }

    let resolved_damage = nonnegative(raw_damage.0);
    let absorbed_by_temporary_hit_points =
        absorb_temporary_hit_points(&vitals, resolved_damage);
    let damage_to_hit_points =
        resolved_damage.0 - absorbed_by_temporary_hit_points.0;
    let remaining_damage_at_zero =
        if damage_to_hit_points > vitals.hit_points.0 {
            damage_to_hit_points - vitals.hit_points.0
        } else {
            0
        };
    let next_hit_points = clamp_hit_points(
        vitals.hit_points.0 - damage_to_hit_points,
        vitals.hit_point_maximum,
    );
    let drops_to_zero = vitals.hit_points.0 > 0 && next_hit_points.0 == 0;
    let instant_death =
        drops_to_zero
            && matches!(vitals.kind, CreatureKind::PlayerCharacter)
            && remaining_damage_at_zero >= vitals.hit_point_maximum.0;
    let next_dead =
        vitals.dead
            || (matches!(vitals.kind, CreatureKind::MonsterCreature)
                && next_hit_points.0 == 0)
            || instant_death;
    let next_unconscious =
        vitals.unconscious
            || (drops_to_zero
                && matches!(vitals.kind, CreatureKind::PlayerCharacter)
                && !instant_death);

    DamageResult {
        vitals: CreatureVitals::from_legal_parts(
            vitals.kind,
            next_hit_points,
            vitals.hit_point_maximum,
            TemporaryHitPoints(
                vitals.temporary_hit_points.0
                    - absorbed_by_temporary_hit_points.0,
            ),
            next_dead,
            next_unconscious,
        ),
        damage_to_hit_points: HitPointDamageAmount(damage_to_hit_points),
        remaining_damage_at_zero: HitPointDamageAmount(remaining_damage_at_zero),
    }
}
```

`from_legal_parts` is shown as an internal constructor because the preceding
calculation proves the `legalVitals` invariant by construction. A public
constructor should return a typed error instead.

## Generator Notes

- The core uses variants, records, pure definitions, integer and Boolean
  fields, `if` expressions, local bindings, arithmetic, comparisons, Boolean
  connectives, implication, and `all` blocks.
- No collection operators, imports, pattern matches, nondeterminism, actions, or
  mutable QNT variables appear in the semantic core.
- No readiness blockers remain for direct generator consumption of this file.
- Damage at 0 Hit Points is intentionally out of scope for this obligation and
  belongs to the death-saving-throw failure procedure.
