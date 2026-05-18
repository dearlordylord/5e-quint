# Hit Point Damage Generator Readiness Dry Run

Obligation: `SHARED.HIT_POINTS.POSITIVE_DAMAGE`

This is a manual QNT-to-Rust shape check for the smallest B/C vertical. It does
not introduce a generator. It records which parts of the QNT owner are shaped
like semantic core that a later generator could consume.

## Semantic Core

- `CreatureKind` maps to a Rust enum with `PlayerCharacter` and
  `MonsterCreature`.
- `CreatureVitals` maps to a Rust struct with integer HP fields and boolean
  lifecycle fields.
- `DamageResult` maps to a Rust struct containing the next vitals plus the
  damage projection.
- `nonnegative`, `clampHitPoints`, `legalVitals`,
  `canApplyResolvedDamageToPositiveHitPoints`, `absorbTemporaryHitPoints`, and
  `applyResolvedDamageToPositiveHitPoints` are pure functions over records,
  variants, integers, booleans, `if` expressions, local `val` bindings,
  arithmetic, comparisons, boolean connectives, `implies`, and `all` blocks.

## Proof-Only Boundary

`hit-point-damage-inductive.qnt` remains proof-only. It is useful validation
evidence, but it should not be part of a first semantic-core generation subset.

`hit-point-damage.qnt` is still fixture-bound at the file level because the
semantic definitions and `run` tests live in the same module. The semantic core
is the type and pure-definition subset listed above. Before this row can become
`generation-subset-clean`, either split the run tests out of the file or teach
the generator to ignore `run` blocks explicitly.

## Runtime Projection Boundary

The TS parity witness compares the QNT lifecycle projection to
`applyBattleHitPointDamage` in `packages/battle-runtime/src/battle-reducer`.
For this obligation, `unconscious` means non-terminal unconscious lifecycle.
Dead-creature condition bookkeeping is not widened into this obligation.

## Rust Sketch

```rust
enum CreatureKind {
    PlayerCharacter,
    MonsterCreature,
}

struct CreatureVitals {
    kind: CreatureKind,
    hit_points: i64,
    hit_point_maximum: i64,
    temporary_hit_points: i64,
    dead: bool,
    unconscious: bool,
}

struct DamageResult {
    vitals: CreatureVitals,
    damage_to_hit_points: i64,
    remaining_damage_at_zero: i64,
}
```

The first generator subset only needs value-level pure code generation. It does
not need Surface admission, MBT scheduling, battle state construction, or Rust
runtime packaging.
