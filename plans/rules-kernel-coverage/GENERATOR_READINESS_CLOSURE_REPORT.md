# Generator Readiness Closure Report

Prepared for `MBTRUST-A-CLOSURE-REPORT`.

The refreshed checker output is
[`REPORT.md`](REPORT.md). The source-of-truth row data remains in
[`generator-readiness.jsonl`](generator-readiness.jsonl),
[`qnt-owner-roles.jsonl`](qnt-owner-roles.jsonl), and
[`kernel-ir-boundaries.jsonl`](kernel-ir-boundaries.jsonl); this note is only a
lane closeout summary.

## Closure Status

Rules-kernel B coverage remains closed: the generated report has no open
transitional obligations. The C-lane readiness artifacts now identify the
semantic-core QNT owners, fixture or proof roles, generator-subset vocabulary,
blocker vocabulary, kernel IR boundary inventory, and one manual Rust dry run.

No covered obligation is certified as `generation-subset-clean` yet. The checked
readiness rows for hit point damage, movement, reaction windows, and spell
procedure profiles are all `fixture-bound`, so this lane stops before real Rust
generation.

## Generator-Ready Inputs

The next lane can start from checked inputs instead of redoing discovery:

- `generator-readiness.jsonl` records obligation-centered readiness rows with
  explicit `semanticCore`, `proofOnly`, `generatorSubset`, and `blockedBy`
  arrays.
- `qnt-owner-roles.jsonl` classifies every covered QNT owner as semantic core,
  MBT fixture, selected-identity trace, or proof-only.
- `kernel-ir-boundaries.jsonl` records the existing command, fill, result,
  state, active-effect, support-profile, resource, and handoff runtime
  boundaries.
- [`HIT_POINT_DAMAGE_RUST_DRY_RUN.md`](HIT_POINT_DAMAGE_RUST_DRY_RUN.md)
  demonstrates the smallest QNT-to-Rust mapping slice without committing
  generated Rust.

## Fixture-Bound Or Proof-Only Work

The checked readiness rows are blocked by run-block coupling, fixture-world
coupling, and unsupported QNT constructs. Their semantic functions are useful as
future generator inputs, but a generator must split executable definitions
from run/assert blocks, bounded fixture worlds, and induction-only helpers.

The role inventory and readiness rows also show QNT files that are intentionally
not generator inputs: MBT fixtures exercise bounded replay or trace protocol,
selected-identity traces prove authored Surface identity reaches runtime
admission, and proof-only files support algebraic proof rather than
implementation semantics.

## Next Lane Needed

Before real Rust generation, open a focused generator-subset lane that:

1. Selects one `fixture-bound` obligation, preferably the hit point damage dry
   run, as the initial vertical.
2. Splits semantic definitions from run/assert/proof fixtures or teaches the
   generator to ignore those constructs through a checked module boundary.
3. Defines a generator IR and ABI from the checked kernel IR boundary
   inventory, without duplicating runtime state.
4. Either admits each needed QNT construct into a generator contract or rewrites
   the semantic core into the documented subset.
5. Produces generated Rust for that single vertical and keeps TS parity through
   the existing rules-kernel coverage gate.

Authored catalog breadth remains out of scope for generator readiness. Future
work should continue to use support profiles and typed procedure facts rather
than spell, feature, or Unit identity as implementation dispatch.
