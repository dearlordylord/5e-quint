# Shared Algebras

This package contains reusable reducer/model algebras. It is separate from
`@dnd/shared` on purpose:

- `@dnd/shared` owns low-level scalar/domain types and package-neutral utilities.
- `@dnd/shared-algebras` owns reusable semantic algebras that can be consumed by
  runtime packages such as `@dnd/battle-runtime` and
  `@dnd/character-creation-runtime`.

## Surface Dependency Policy

This package may depend on `@dnd/surface` when an algebra or adapter intentionally speaks Surface vocabulary. That is allowed here, but it must stay explicit.

Rules:

- Keep Surface-free algebras Surface-free. Death saves, initiative, conditions, and pure action-resource spending should not import Surface.
- Put Surface-specific adapters next to the algebra only when the adapter's job is to translate Surface vocabulary into algebra facts.
- Do not let a Surface import leak into an algebra just because it is convenient. If the algebra only needs reducer facts, model those facts directly.
- `@dnd/shared` should remain the lower-level package. Since `@dnd/shared-algebras` depends on `@dnd/shared`, `@dnd/shared` should not re-export `@dnd/shared-algebras`.

Runtime packages import reusable algebras from this package. `@dnd/shared`
should not contain algebra modules.

## Algebra Inventory

- `ability-score-algebra` - ability-score generation and assignment rules.
  `abilityScoreAssignment(...)` parses boundary input into
  `ParsedAbilityScoreAssignment` values backed by the shared `AbilityScore`
  primitive for durable character-creation state.
- `action-economy-algebra` - turn resource availability, spending, and reset.
- `armor-class-algebra` - structured Armor Class state and current AC reading.
- `attack-roll-algebra` - d20 attack-roll hit adjudication.
- `character-advancement-algebra` - ordered class progression and derived class-level facts.
- `conditions-algebra` - condition set operations.
- `death-saves-algebra` - death-save counter state.
- `initiative-algebra` - Initiative order and turn advancement.
- `multiclass-prerequisite-algebra` - SRD multiclass ability prerequisite facts
  and checks. It owns the canonical table for adding a new class to a character
  that already has current classes; runtime and replay callers should establish
  the non-empty current class set plus the class being added through this
  algebra before calling the check.
- `runtime-dice-algebra` - rolled-dice validation and totaling.
- `runtime-hole-algebra` - shared hole identity/refill vocabulary.
- `validation-algebra` - small validation/result helpers.

## Runtime Hole Algebra

`runtime-hole-algebra` owns reducer-facing hole/fill identity and refill
vocabulary:

- stable `HoleId` values pair holes with submitted fills across replay;
- `HoleInstanceKey` identifies one concrete occurrence in a replay path;
- `RuntimeHole` describes caller-visible asks such as target choice, attack
  roll, rolled dice, saving throw outcome, or fillable Surface payloads;
- `FilledHoleValue` carries keyed answers supplied by the caller.

The algebra intentionally does not own act subjects, battle state, Unit support
gates, or execution semantics. Those remain in the consuming runtime.
`@dnd/battle-runtime` may reuse the branded hole identity types, but it should
expose only the battle hole/fill variants that its own reducer can discover and
resolve.

## MBT Boundary

MBT should prove reducer facts after Surface decode/projection. It must not
enumerate all Surface-authored content multiplied by all battle or character
states. Use ordinary table-driven contract tests for broad Surface vocabulary
and authored-unit coverage. Reserve MBT for small semantic algebras and selected
high-risk integrated reducer flows where state transition parity is the fact
being proved.

Keep coverage goals distinct:

- **Surface vocabulary coverage:** representative fixtures for Surface language
  constructs and their projection contract into reducer facts.
- **Authored-unit coverage:** deterministic contract tests for each shipped
  authored record's decode, support-profile result, projected holes/effects,
  resource cost, and expected resolver frontier or execution path.
- **Reducer behavior coverage:** focused algebra tests and selective MBT for
  state transitions after inputs have already crossed the Surface boundary.

## Verification

Algebras should have focused deterministic tests. When an algebra models state
transition behavior with a corresponding Quint file, its package tests should
replay that model against the TypeScript module that runtime packages import.
