# QNT Rust Pilot

This crate is Lane C pilot evidence for QNT-to-Rust generation. It is not
production reducer code, is not generated output, and does not define a stable
ABI.

## Command

```sh
cargo test --manifest-path crates/qnt-rust-pilot/Cargo.toml
```

Use this command for Lane C Rust pilot tasks unless a later task deliberately
changes the crate boundary. The command is narrow and does not run QNT proofs,
MBT, TypeScript tests, or production reducers.

## Boundary

- Runtime owner state remains in the TypeScript packages named by
  `plans/rules-kernel-coverage/kernel-ir-boundaries.jsonl`.
- Rust pilot state is a generator-facing projection of semantic-core QNT facts.
- The crate must not call TypeScript reducers or duplicate durable
  `CharacterSheet`, `BattleState`, active-effect, resource, handoff, support
  profile, or authored catalog state.
- Ordinary invalid input is represented as typed Rust `Result` errors.
- Internal constructors may assume invariants only after a public constructor,
  admission constructor, or local transition logic has established them.

## Shared HP Shapes

Tasks `QNTR-C02` and `QNTR-C04` share these Rust-side projections:

| QNT fact | Rust pilot shape | Boundary note |
| --- | --- | --- |
| `CreatureKind` | `CreatureKind` enum | Rule-domain creature kind only; no authored identity. |
| `CreatureVitals.hitPoints` | `HitPoints` | Legal only paired with `HitPointMaximum` in `CreatureVitals`. |
| `CreatureVitals.hitPointMaximum` | `HitPointMaximum` | Positive scalar; future sheet wrappers derive it from existing sheet maximum facts. |
| `CreatureVitals.temporaryHitPoints` | `TemporaryHitPoints` | Nonnegative scalar, consumed before Hit Points. |
| `CreatureVitals.dead` / `unconscious` | `CreatureVitals` booleans | Validity is enforced by `CreatureVitals::try_new`. |
| `DamageResult` | `DamageResult` | Pure transition output for positive-Hit-Point damage. |

Recovery-specific shapes from `HIT_POINT_RECOVERY_RUST_DRY_RUN.md`, such as
Death Saving Throw lifecycle and positive-Hit-Point Unconscious recovery
markers, will be added by `QNTR-C04` in this same crate so they can reuse the
HP scalar and `CreatureVitals` boundary.
