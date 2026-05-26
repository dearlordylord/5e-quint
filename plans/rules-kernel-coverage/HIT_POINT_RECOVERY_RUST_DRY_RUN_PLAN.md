# Hit Point Recovery Rust Dry Run Plan

Plan for the next manual Rust dry run after
`HIT_POINT_DAMAGE_RUST_DRY_RUN.md`.

This is C-lane generator-readiness planning only. It is not generated Rust
source, does not introduce a Rust ABI, and does not change reducer behavior.

## Selected Row

- Obligation: `SHEET.HP_REST_HIT_DICE.TRANSITIONS`
- Readiness status: `generation-subset-clean`
- Semantic core:
  `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`
- Proof-only companions:
  `packages/shared-algebras/proofs/rule-core/hit-point-recovery-inductive.qnt`
  and `packages/shared-algebras/proofs/rule-core/hit-point-recovery-examples.qnt`
- Runtime parity route:
  `packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts`
- Production runtime owner:
  `packages/character-sheet-runtime/src/index.ts`

This row is the next bounded candidate because it reuses the first dry run's
`CreatureVitals` shape, already has a TS mirror, and adds one small imported
state shape: the Death Saving Throw lifecycle from
`zero-hit-point-lifecycle.qnt`.

## RAW And Language Anchors

- `.references/srd-5.2.1/Playing-the-Game.md#Healing`: healing restores Hit
  Points up to the Hit Point Maximum; excess regained Hit Points are lost.
- `.references/srd-5.2.1/Playing-the-Game.md#Falling Unconscious`: regaining
  any Hit Points ends the zero-Hit-Point Unconscious state and resets Death
  Saving Throws.
- `.references/srd-5.2.1/Rules-Glossary.md#Knocking Out a Creature`: a
  qualifying melee reduction to 0 Hit Points can become 1 Hit Point plus
  Unconscious, ending when Hit Points are regained or first aid succeeds.
- `.references/srd-5.2.1/Rules-Glossary.md#Short Rest` and
  `.references/srd-5.2.1/Rules-Glossary.md#Long Rest`: rest and Hit Point Dice
  facts remain later sub-verticals for this broad row.
- `UBIQUITOUS_LANGUAGE.md#Hit Points and Death`: use Hit Points, Hit Point
  Maximum, Hit Die, Death Saving Throw, Stable, and Unconscious consistently.

## First Vertical Scope

The next dry run should cover only the pure healing transition:

- `PositiveHitPointUnconsciousRecovery`
- `HitPointRecoveryResult`
- `legalPositiveHitPointUnconsciousRecovery`
- `legalHitPointRecoveryState`
- `applyHitPointHealing`

Out of scope for the first recovery dry run:

- Short Rest and Long Rest timing gates.
- Hit Point Dice pool spend bookkeeping.
- Stable 1d4-hour elapsed-time recovery.
- `applyKnockOutDisposition` and `applyFirstAidToKnockOutUnconscious`; these
  are good second recovery sub-verticals after the healing transition is mapped.

## State Ownership Constraint

Generated Rust must not own or persist Character Sheet state. The runtime owner
remains the existing `CharacterSheet` and `CharacterSheetHitPoints` union in
`packages/character-sheet-runtime/src/index.ts`.

The generated boundary should accept a rule-core projection made from existing
TS state and return a pure result:

```rust
struct HitPointRecoveryState {
    vitals: CreatureVitals,
    death_saving_throws: DeathSavingThrowLifecycle,
    positive_hit_point_unconscious_recovery: PositiveHitPointUnconsciousRecovery,
}

struct HitPointRecoveryResult {
    vitals: CreatureVitals,
    death_saving_throws: DeathSavingThrowLifecycle,
    positive_hit_point_unconscious_recovery: PositiveHitPointUnconsciousRecovery,
    hit_points_regained: HitPointsRegained,
}
```

`HitPointRecoveryState` is not a second Character Sheet model. It is a
generator-facing projection of the facts that `hit-point-recovery.qnt` already
requires. TS should continue to construct canonical sheet state through
`characterSheetHitPoints(...)`, then project the existing facts for the generated
pure transition.

## Proposed Mapping

| QNT definition | Rust shape | Notes |
| --- | --- | --- |
| `PositiveHitPointUnconsciousRecovery` | `enum PositiveHitPointUnconsciousRecovery` | Two variants, no authored identity. |
| `HitPointRecoveryResult` | `struct HitPointRecoveryResult` | Reuses QCORE1 `CreatureVitals` and QCORE2 Death Saving Throw lifecycle. |
| `legalPositiveHitPointUnconsciousRecovery(...)` | `fn legal_positive_hit_point_unconscious_recovery(...) -> bool` | Internal admission predicate or constructor guard. |
| `legalHitPointRecoveryState(...)` | `HitPointRecoveryState::try_new(...) -> Result<_, HitPointRecoveryStateError>` | Boundary parser; downstream functions should receive the narrowed state. |
| `applyHitPointHealing(...)` | `fn apply_hit_point_healing(state: HitPointRecoveryState, raw_healing: HealingInput) -> HitPointRecoveryResult` | First dry-run transition. |

The dry run should reuse the `CreatureVitals` and Hit Point newtypes from
`HIT_POINT_DAMAGE_RUST_DRY_RUN.md`. It should also reuse the nonnegative amount
pattern, but with healing-domain names such as `HealingInput` and
`HitPointsRegained`, not damage-domain amount names.

## Future Task Steps

1. Create a manual dry-run artifact for the first recovery vertical, parallel to
   `HIT_POINT_DAMAGE_RUST_DRY_RUN.md`.
2. Map `applyHitPointHealing` only, using the existing TS state owner as the
   source of projection facts.
3. Check the manual mapping against
   `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt` and the
   existing deterministic replay witness.
4. After the healing dry run is concrete, decide whether the next sub-vertical
   is positive-Hit-Point Knock Out recovery or full Short Rest Hit Point Dice
   spending. Do not jump directly to the full rest lifecycle.

## Verification For The Future Dry Run

- Confirm every mapped recovery rule still traces to the SRD anchors above in
  `.references/srd-5.2.1/Playing-the-Game.md` and
  `.references/srd-5.2.1/Rules-Glossary.md`.
- Recheck `UBIQUITOUS_LANGUAGE.md#Hit Points and Death` and keep the mapping in
  the repo's Hit Points, Hit Point Maximum, Death Saving Throw, Stable, and
  Unconscious terminology.
- Run reviewer-loop convergence after implementation: RAW traceability,
  ubiquitous-language/domain-language review, architecture/connascence review,
  and code review. Fix every reasonable finding, explicitly reject only with a
  concrete recorded reason, and repeat until no reasonable findings remain.
- `pnpm rules-kernel-coverage:check`
- If any runtime or parity path changes:
  `pnpm --filter @dnd/character-sheet-runtime test -- hp-rest-hit-dice`
- No battle MBT is required for this character-sheet scoped planning vertical.
