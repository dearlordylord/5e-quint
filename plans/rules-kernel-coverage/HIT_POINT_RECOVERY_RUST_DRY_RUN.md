# Hit Point Recovery Rust Dry Run

Manual dry run for `SHEET.HP_REST_HIT_DICE.TRANSITIONS`, scoped to the pure
healing transition in `hit-point-recovery.qnt`.

This is C-lane generator-readiness evidence only. It is not generated Rust
source, does not introduce a Rust ABI, and does not change reducer behavior.

## Inputs

- Semantic core:
  `packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`
- Imported semantic cores:
  `packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt` and
  `packages/shared-algebras/proofs/rule-core/zero-hit-point-lifecycle.qnt`
- Proof-only companions:
  `packages/shared-algebras/proofs/rule-core/hit-point-recovery-inductive.qnt`
  and `packages/shared-algebras/proofs/rule-core/hit-point-recovery-examples.qnt`
- Runtime parity route:
  `packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts`
- Production runtime owner:
  `packages/character-sheet-runtime/src/index.ts`

## DRP-T14 Replay Audit

The deterministic replay for `SHEET.HP_REST_HIT_DICE.TRANSITIONS` remains a
closed Character Sheet fixture, not focused random MBT coverage. The replay
covers the sheet boundary cases where a sibling-language harness needs concrete
projection evidence:

- Short Rest and Long Rest start gates requiring at least 1 Hit Point.
- The 16-hour Long Rest calendar wait gate.
- Short Rest and Long Rest completion-duration rejection at the benefit
  boundary.
- One-die and two-die sequential Short Rest Hit Point Dice spending through the
  existing Character Sheet benefit path.
- Interrupted Short Rest with no benefits.
- Long Rest restoration of Hit Points, spent Hit Point Dice, Hit Point Maximum
  reduction, and Temporary Hit Points through existing sheet state.
- Interrupted Long Rest before and after the one-hour Short Rest benefit
  threshold.
- Long Rest physical-exertion interruption threshold rejection and
  interruption-at-required-duration rejection.

`packages/character-sheet-runtime/character-sheet-hp-rest-hit-dice.mbt.qnt`
computes healing projections through `applyHitPointHealing` from the shared
semantic core, while
`packages/character-sheet-runtime/src/hp-rest-hit-dice.mbt.test.ts` compares
those QNT-owned fields with production `startShortRest`, `finishShortRest`,
`completeShortRest`, `interruptShortRest`, `startLongRest`, `finishLongRest`,
`completeLongRest`, and `interruptLongRest` results. The replay index is only
the closed case-table ordering mechanism; it does not stand in for sequencing,
resource, or interleaving coverage.

This dry run remains aligned with the replay by keeping the generator-facing
scope to positive Hit Point healing projection. Short Rest timing, Long Rest
timing, Hit Point Dice spending, Stable calendar recovery, and positive
Hit Point healing are distinct rule facts with distinct Character Sheet source
owners. The dry run does not add generated Rust source, a Rust runtime
boundary, an ABI, stored recovery facts beside `CharacterSheet`, or a second
Hit Point/Death Saving Throw/Stable model.

## RAW And Language Anchors

- `.references/srd-5.2.1/Playing-the-Game.md#Healing`: healing restores Hit
  Points, Hit Points cannot exceed the Hit Point Maximum, and excess regained
  Hit Points are lost.
- `.references/srd-5.2.1/Playing-the-Game.md#Falling Unconscious`: a character
  that reaches 0 Hit Points and does not die instantly has the Unconscious
  condition until it regains any Hit Points.
- `.references/srd-5.2.1/Playing-the-Game.md#Death Saving Throws`: Death Saving
  Throw successes and failures reset to zero when the creature regains any Hit
  Points.
- `.references/srd-5.2.1/Rules-Glossary.md#Knocking Out a Creature`: the
  positive-Hit-Point Unconscious state created by a qualifying melee knockout
  ends when the creature regains any Hit Points or receives first aid.
- `UBIQUITOUS_LANGUAGE.md#Hit Points and Death`: use Hit Points, Hit Point
  Maximum, Death Saving Throw, Stable, and Unconscious as domain terms.

Short Rest timing, Long Rest timing, Hit Point Dice spending, Stable elapsed
time recovery, and Knock Out creation or first-aid recovery are out of scope for
this dry run.

## QNT Semantic Core

The generator-facing core for this vertical is the pure healing subset of
`hit-point-recovery.qnt` plus the imported state shapes it reuses:

- `CreatureKind`
- `CreatureVitals`
- `DeathSavingThrowLifecycle`
- `resetDeathSavingThrowLifecycle`
- `PositiveHitPointUnconsciousRecovery`
- `HitPointRecoveryResult`
- `nonnegative`
- `clampHitPoints`
- `legalVitals`
- `legalPlayerCharacterDeathSavingThrowState`
- `legalPositiveHitPointUnconsciousRecovery`
- `legalHitPointRecoveryState`
- `applyHitPointHealing`

`applyKnockOutDisposition` and `applyFirstAidToKnockOutUnconscious` are later
recovery sub-verticals. They are not generator input for this artifact.

## Runtime Projection Boundary

Generated Rust must not own or persist Character Sheet state. The durable state
owner remains `CharacterSheet` and `CharacterSheetHitPoints` in
`packages/character-sheet-runtime/src/index.ts`.

The Rust-facing recovery state is a projection of existing sheet facts:

| QNT fact | Character Sheet source | Projection note |
| --- | --- | --- |
| `CreatureVitals.kind` | Character Sheet domain | Character Sheet healing uses `PlayerCharacter`; no authored identity enters the transition. |
| `CreatureVitals.hitPoints` | `characterSheetCurrentHp(sheet)` | `positive` carries its `currentHp`, `knockedOut` projects as 1, and `zero` projects as 0. |
| `CreatureVitals.hitPointMaximum` | `characterSheetHitPointMaximum(sheet)` | Derived from `maximumHp - hitPointMaximumReduction`; do not store a second maximum. |
| `CreatureVitals.temporaryHitPoints` | `characterSheetTempHp(sheet)` | Preserved by healing and projected from the existing HP union. |
| `CreatureVitals.dead` | `sheet.hitPoints.tag === "zero" && lifecycle.tag === "dead"` | Dead is derived from the zero-HP lifecycle variant. |
| `CreatureVitals.unconscious` | `sheet.hitPoints.tag === "zero" || sheet.hitPoints.tag === "knockedOut"` | Character Sheet stores zero-HP and Knocked Out states separately; the projection supplies the QNT Boolean. |
| `DeathSavingThrowLifecycle` | `CharacterSheetZeroHpLifecycle` | Unstable maps success/failure counts; dead maps failure count 3; Stable maps the stable flag; positive and Knocked Out states project as reset. |
| `PositiveHitPointUnconsciousRecovery` | `sheet.hitPoints.tag === "knockedOut"` | Knocked Out projects to `EndsWhenHitPointsRegained`; all other sheet states project to `NoPositiveHitPointUnconsciousRecovery`. |

The reverse projection consumes `HitPointRecoveryResult` through the existing
`characterSheetHitPoints(...)` constructor and the source `CharacterSheet` that
was projected into the pure transition. It does not write a parallel HP, Death
Saving Throw, Stable, or Knocked Out model:

| Recovery result fact | Character Sheet projection |
| --- | --- |
| `vitals.hitPoints > 0` and recovery is `NoPositiveHitPointUnconsciousRecovery` | `CharacterSheetHitPoints` variant `positive` with `currentHp` from `vitals.hitPoints`. |
| `vitals.hitPoints > 0` and recovery is `EndsWhenHitPointsRegained` | `CharacterSheetHitPoints` variant `knockedOut`; legal state requires exactly 1 Hit Point. |
| `vitals.hitPoints == 0`, not dead, and `hitPointsRegained == 0` | Preserve the source sheet's `zero` lifecycle, including any `CharacterSheetStableRecovery` timer. |
| `vitals.hitPoints == 0`, not dead, and `hitPointsRegained > 0` | Unreachable for a legal recovery result because regained Hit Points imply positive resulting Hit Points. |
| `vitals.dead` | `CharacterSheetHitPoints` variant `zero` with lifecycle `dead`. |
| `hitPointsRegained` | Returned as a pure result fact for callers that need the regained-Hit-Point amount; it is not stored on the sheet. |

Current TS callers already construct sheet HP through `characterSheetHitPoints`.
A future generated transition should be called only after projecting from that
canonical state, then should return the new canonical sheet HP through the same
constructor.

The QNT recovery marker admits any legal positive-Hit-Point Unconscious vitals.
The Character Sheet owner currently projects that marker only from the
`knockedOut` HP variant, whose constructor requires exactly 1 Hit Point. That is
a boundary invariant, not a second runtime model: if a future owner needs a
different positive-Hit-Point Unconscious source, it should define its own
projection boundary instead of widening Character Sheet HP state.

Dead-character healing remains an effect-facing Character Sheet boundary error.
The pure QNT transition returns a no-op for `vitals.dead`, matching the shared
algebra shape, but the current Character Sheet callers keep their typed
`CharacterSheetIssue` rejection before projecting into this pure rule. A future
generated wrapper must preserve that caller-facing invalid result instead of
exposing the no-op branch as successful sheet behavior.

## Hypothetical Rust Shapes

The future generated slice would reuse the QCORE1 `CreatureVitals` and Hit
Point newtypes from `HIT_POINT_DAMAGE_RUST_DRY_RUN.md`, plus a QCORE2 Death
Saving Throw lifecycle shape. These are Rust-like sketches for review, not
compilable committed source:

```rust
enum PositiveHitPointUnconsciousRecovery {
    NoPositiveHitPointUnconsciousRecovery,
    EndsWhenHitPointsRegained,
}

struct DeathSavingThrowCount(i64);

struct DeathSavingThrowLifecycle {
    successes: DeathSavingThrowCount,
    failures: DeathSavingThrowCount,
    stable: bool,
    hp_regained: bool,
}

struct HealingInput(i64);
struct HitPointsRegained(i64);

struct HitPointRecoveryState {
    vitals: CreatureVitals,
    death_saving_throws: DeathSavingThrowLifecycle,
    positive_hit_point_unconscious_recovery:
        PositiveHitPointUnconsciousRecovery,
}

struct HitPointRecoveryResult {
    vitals: CreatureVitals,
    death_saving_throws: DeathSavingThrowLifecycle,
    positive_hit_point_unconscious_recovery:
        PositiveHitPointUnconsciousRecovery,
    hit_points_regained: HitPointsRegained,
}
```

Constructor obligations:

- `DeathSavingThrowCount` admits values from 0 through 3.
- `DeathSavingThrowLifecycle` construction enforces
  `legalDeathSavingThrowLifecycle`: Stable and HP-regained are mutually
  exclusive, and either one resets success and failure counts to 0.
- `PositiveHitPointUnconsciousRecovery::EndsWhenHitPointsRegained` is admitted
  only for legal non-dead, positive-Hit-Point, Unconscious vitals.
- `HitPointRecoveryState::try_new(...)` enforces
  `legalHitPointRecoveryState`, including the player-character Death Saving
  Throw lifecycle rule and the monster reset-lifecycle rule.
- `HealingInput` is the caller-supplied healing integer before the QNT
  `nonnegative` step; nonpositive values are admissible inputs because the
  transition treats them as no regained Hit Points.
- `HitPointsRegained` admits values greater than or equal to 0 and bounded by
  the distance from current Hit Points to Hit Point Maximum.

## Function Mapping

| QNT definition | Rust shape | Notes |
| --- | --- | --- |
| `PositiveHitPointUnconsciousRecovery` | `enum PositiveHitPointUnconsciousRecovery` | Two variants; no authored identity. |
| `HitPointRecoveryResult` | `struct HitPointRecoveryResult` | Reuses `CreatureVitals` and `DeathSavingThrowLifecycle`; adds the regained-Hit-Point result. |
| `legalPositiveHitPointUnconsciousRecovery(...)` | `PositiveHitPointUnconsciousRecovery::try_for_vitals(...) -> Result<_, PositiveHitPointUnconsciousRecoveryRejection>` | Admission constructor for the Knocked Out recovery marker. |
| `legalHitPointRecoveryState(...)` | `HitPointRecoveryState::try_new(...) -> Result<_, HitPointRecoveryStateError>` | Boundary parser; downstream generated functions receive the narrowed state. |
| `applyHitPointHealing(...)` | `fn apply_hit_point_healing(state: HitPointRecoveryState, raw_healing: HealingInput) -> HitPointRecoveryResult` | Pure state transition after projection from existing Character Sheet state. |

The main transition maps mechanically:

```rust
fn apply_hit_point_healing(
    state: HitPointRecoveryState,
    raw_healing: HealingInput,
) -> HitPointRecoveryResult {
    let vitals = state.vitals;
    let lifecycle = state.death_saving_throws;
    let recovery = state.positive_hit_point_unconscious_recovery;

    if vitals.dead || raw_healing.0 <= 0 {
        return HitPointRecoveryResult {
            vitals,
            death_saving_throws: lifecycle,
            positive_hit_point_unconscious_recovery: recovery,
            hit_points_regained: HitPointsRegained(0),
        };
    }

    let healing = nonnegative(raw_healing.0);
    let next_hit_points =
        clamp_hit_points(vitals.hit_points.0 + healing, vitals.hit_point_maximum);
    let regained_hit_points = next_hit_points.0 - vitals.hit_points.0;
    let healed_from_zero = vitals.hit_points.0 == 0 && next_hit_points.0 > 0;
    let healed_positive_recovery =
        vitals.hit_points.0 > 0
            && regained_hit_points > 0
            && matches!(
                recovery,
                PositiveHitPointUnconsciousRecovery::EndsWhenHitPointsRegained
            );

    HitPointRecoveryResult {
        vitals: CreatureVitals::from_legal_parts(
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
            reset_death_saving_throw_lifecycle()
        } else {
            lifecycle
        },
        positive_hit_point_unconscious_recovery: if healed_positive_recovery {
            PositiveHitPointUnconsciousRecovery::NoPositiveHitPointUnconsciousRecovery
        } else {
            recovery
        },
        hit_points_regained: HitPointsRegained(regained_hit_points),
    }
}
```

`from_legal_parts` is shown as an internal constructor because the preceding
calculation preserves `legalVitals` and `legalHitPointRecoveryState` by
construction. A public boundary should return a typed error instead.

## Generator Notes

- The recovery core uses imports, variants, records, pure definitions, integer
  and Boolean fields, `if` expressions, local bindings, arithmetic,
  comparisons, Boolean connectives, implication, and `all` blocks.
- No collection operators, nondeterminism, actions, mutable QNT variables, or
  authored identity appear in the pure healing transition.
- `HitPointRecoveryState` is a generator-facing projection, not a second
  Character Sheet model. State ownership remains at
  `packages/character-sheet-runtime/src/index.ts`.
- The projection intentionally derives Hit Point Maximum from existing
  Character Sheet maximum and reduction facts rather than storing an additional
  effective maximum.
- Death Saving Throw reset and positive-Hit-Point Unconscious recovery cleanup
  are coupled by the SRD phrase "regains any Hit Points"; the generated
  boundary should keep both facts in the single `HitPointRecoveryResult` shape.

## Task 2 Review Outcome

The dry run was reviewed against
`plans/rules-kernel-coverage/kernel-ir-boundaries.jsonl`,
`packages/character-sheet-runtime/src/index.ts`,
`packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`, the SRD
anchors above, and `UBIQUITOUS_LANGUAGE.md#Hit Points and Death`.

Review findings:

- No duplicated durable Character Sheet state remains. `HitPointRecoveryState`
  is a rule-core projection, `hitPointMaximum` is derived from existing
  `maximumHp` and `hitPointMaximumReduction`, and `hitPointsRegained` is a
  result fact rather than stored sheet state.
- The ambiguous raw optional fields are outside the generator-facing boundary.
  `positiveHpUnconscious` and `zeroHpLifecycle` are accepted only by
  `CharacterSheetHitPointsInput`; the dry run projects from the canonical
  `CharacterSheetHitPoints` union after `characterSheetHitPoints(...)` has
  collapsed those inputs into `positive`, `knockedOut`, or `zero`.
- Stable recovery elapsed-time details are intentionally not added to the Rust
  recovery shape. The QNT `DeathSavingThrowLifecycle` owns only the Stable flag;
  the reverse projection preserves any source `CharacterSheetStableRecovery`
  timer when `hitPointsRegained == 0`, and drops it only when regained Hit
  Points move the sheet out of the zero-HP lifecycle.
- The strong connascence around the SRD phrase "regains any Hit Points" is
  localized in one result boundary: the same `hitPointsRegained > 0` fact drives
  Death Saving Throw reset, zero-HP Unconscious cleanup, and positive-Hit-Point
  Knock Out cleanup. Future wrappers should not split these into separate
  caller protocols.
- Domain language stays in the repo vocabulary: Hit Points, Hit Point Maximum,
  Temporary Hit Points, Death Saving Throw, Stable, Unconscious, and Knock Out.

Conclusion: no reasonable unresolved projection or connascence finding remains
after the boundary clarifications above. No repair task is appended for this
lane.
