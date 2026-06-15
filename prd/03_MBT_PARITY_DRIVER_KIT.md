# PRD: MBT Parity Driver Kit

Date: 2026-06-10

Status: Draft

Owner: battle-runtime verification architecture

Origin: architecture review 2026-06-10, candidate 2 ("deepen the 106 MBT
drivers into one parity-driver kit"). Companion PRDs:
`prd/02_QNT_BATTLE_PROTOCOL_KERNEL.md` (its new witnesses should be written
through this kit) and `prd/04_TYPED_WITNESS_PROTOCOL.md` (the QNT-side half of
the same seam; the kit isolates drivers from that migration). Recommended
execution order: this PRD first.

## Context Primer For A Fresh Agent

Read before writing anything:

1. `CLAUDE.md` — "MBT runs are expensive", "MBT driver closure discipline",
   "Quint gotchas" (especially the ITF variant format note: parameterized
   variants arrive as `{tag, value}` objects), "TypeScript conventions",
   "Connascence discipline".
2. `docs/adr/0001-forest-of-qnt-slices.md` — driver shapes (literal projection
   witness vs computed-oracle), closure budget, and the consequence that each
   language target gets its own harness.
3. `ARCHITECTURE.md` — "Quint And Parity" (oracle direction: QNT owns expected
   state; TS drives production APIs).
4. Three representative drivers end to end:
   `packages/battle-runtime/src/death-saving-throw.mbt.test.ts` (literal
   witness, parameterless actions, file-local decode helpers),
   `src/direct-condition-lifecycle.mbt.test.ts` (computed oracle, nondet picks
   consumed via the action schema — see lines ~110–145),
   `src/weapon-attack-skeleton.mbt.test.ts` (integration fixture lane).
5. The existing shared modules:
   `src/battle-runtime-mbt-fixtures.ts` (2,447 lines — promoted-lane driver
   factory, `focusedMbtMaxSteps`, state-check combinator; imported by only 8
   of 106 drivers) and `src/battle-runtime-test-support.ts` (4,091 lines —
   semantic fixture builders only; not decode machinery; stays as is).
6. quint-connect's public API (the repo pins `@firfi/quint-connect@2.0.0`):
   `dist/simple.d.ts` and `dist/effect.d.ts` in the installed package. Note
   what already exists upstream: `transformITFValue` (from
   `@firfi/itf-trace-parser`), ITF schema exports (`ITFBigInt`, `ITFList`,
   `ITFMap`, `ITFSet`, `ITFVariant`, `ITFTuple`…), per-action `picks` schemas
   (StandardSchema), and `stateCheck(deserialize, compare)`.

Repo ground rules: pnpm only; never run MBT exploratorily (focused files only,
one process at a time, reproduce failures with the reported `QUINT_SEED`);
parse-don't-validate; `effect/Match` with `Match.exhaustive` for union
dispatch; assertions only for already-proven invariants — runtime/domain
failures stay typed.

## Problem Statement

Every battle-runtime MBT driver is a shallow module: a tiny interface (replay
one witness against production APIs) over a re-implemented body. Measured on
master (2026-06-10):

- 106 `src/*.mbt.test.ts` drivers totalling 64,410 lines.
- File-local copies of the same mechanical helpers:
  `numberFromQuintInt` ×39, `booleanField` ×39, `quintStateRecord` ×36,
  `isRecord` ×26, `quintVariantTag` ×10 — plus per-file `focusedMbtMaxSteps`,
  env-knob reads (`MBT_TRACES`, `MBT_STEPS`), spec-path resolution, timeout
  constants, picks-schema plumbing (`Schema.standardSchemaV1(QuintIntAsNumber)`
  re-derived per driver), and a near-identical `submit`/`recordResult` state
  machine translating `BattleResolutionResult` into the witness-protocol
  fields (`lastResult`, `lastInvalidReason`, `holes`).
- An estimated 30–40% of each driver is this mechanical layer; the genuinely
  semantic residue is the fixture, the action→production-API mapping, and the
  per-witness projection.
- quint-connect already exports generic ITF decode machinery that no driver
  uses; `battle-runtime-mbt-fixtures.ts` exists but serves only 8 drivers.

Two costs follow. Locally: decode bugs and protocol-recording drift have 39
homes; every new witness pays ~600 lines. Strategically: ADR-0001's model is
one harness per language target against the same QNT sources. The target
acceptance phase of
`plans/PRD_CLEANROOM_QNT_BRANCH_COVERAGE_AND_HARNESS.md` therefore inherits
whatever shape this harness has. Today that price is "re-implement the union of
106 hand-rolled drivers"; after this PRD it is "implement one kit interface
plus thin per-obligation mappings" — and the kit's interface doubles as the
written specification of what any language's harness must provide.

## Solution

One deep module: a **parity driver kit** for battle-runtime MBT drivers,
package-local (changing quint-connect releases is out of scope; see
Implementation Decisions).

Kit surface (names indicative, implementer refines against
`UBIQUITOUS_LANGUAGE.md` and existing vocabulary):

1. **ITF decode.** Typed field readers over raw Quint/ITF state built on
   quint-connect's exported ITF schemas / `transformITFValue`: int (number |
   bigint), bool, string-literal unions, variant tag + parameterized variant
   value (per the CLAUDE.md `{tag, value}` gotcha), `Set`, `List`, nested
   records. One error style: precise field-named failures.
2. **Witness-protocol decode + recorder.** The shared protocol shape
   (`holes`, `lastResult`, `lastInvalidReason`) decoded from spec state once,
   and a production-side recorder that wraps
   `resolveBattleSubject`/`resolveBattleInterrupt` calls and folds
   `BattleResolutionResult` into the same shape (today's duplicated
   `submit`/`recordResult` pattern). This module is the single point that
   absorbs `prd/04`'s migration from string vars to a typed protocol record —
   drivers should not notice that change.
3. **Run conventions.** `focusedMbtMaxSteps` (domain cap wins over
   `MBT_STEPS`), `MBT_TRACES` default 1, standard timeout, spec-path
   resolution relative to the test file.
4. **Picks plumbing.** Shared StandardSchema pick schemas (`int`, `bool`,
   string-literal) so drivers declare `picks` without re-deriving transforms.

Explicit non-goals for the kit interface (prd/01 warns against a catch-all
helper layer): fixture builders stay in `battle-runtime-test-support.ts`;
per-witness projections and action handlers stay in each driver; the kit never
interprets domain semantics.

A migrated driver should contain only: imports, fixture, driver schema +
action handlers (production API calls and fills), the spec-state field map,
the production-state projection, and the `run` invocation — target ≈150 lines
for a typical literal witness.

## User Stories

1. As a witness author, I want a new parity driver to cost a fixture, a
   handful of handlers, and a projection, so that adding QNT coverage is not
   taxed by 400 lines of plumbing.
2. As a maintainer, I want ITF decode and result-recording semantics in one
   tested module, so that a decode bug is one fix, not 39.
3. As the future Rust harness author (cleanroom phase 2), I want the TS kit's
   interface to be the explicit contract a Rust harness must implement, so
   that the port is bounded and specifiable.
4. As a reviewer, I want drivers to read as semantic content only, so that
   parity review means reviewing the mapping, not the boilerplate.

## Implementation Decisions

- The kit is package-local to `@dnd/battle-runtime`
  (e.g. `src/battle-runtime-mbt-driver-kit.ts`, or a small directory beside
  `battle-runtime-mbt-fixtures.ts`). Upstreaming generic parts into
  `@firfi/quint-connect` is a possible follow-up once the shape stabilizes —
  out of scope here because the package is externally versioned.
- Reuse, don't wrap blindly: where quint-connect already exports the needed
  machinery (`transformITFValue`, ITF schemas, `stateCheck`), the kit adapts
  it; it must not re-implement trace parsing.
- `battle-runtime-mbt-fixtures.ts` (promoted lane) either merges into the kit
  or imports it; no third parallel helper layer may remain.
- Migration is mechanical and batched; each batch's drivers must keep their
  spec files, action names, projections, and assertions semantically
  unchanged (this PRD changes plumbing, not parity meaning). If a migration
  exposes a latent driver bug, fix it in its own commit with the focused MBT
  rerun as evidence.
- Drivers in other packages (`character-creation-runtime` ×9,
  `character-sheet-runtime` ×11, `character-battle-runtime` ×4) are a stretch
  batch: if the kit generalizes trivially, host the generic decode part in a
  shared location (`@dnd/shared` or a test-support entry) — but do not force
  it in this PRD if it resists; note the outcome.
- Guard against regression to file-local copies: extend `pnpm quality` with a
  check (pattern: `scripts/check-mbt-driver-closure.cjs`) that fails when a
  `*.mbt.test.ts` re-declares kit-owned helper names. Keep the list in one
  place, named after the invariant.
- Kit code follows repo TS conventions: branded/narrow types, typed failures
  (no throwing on ordinary decode failure of *domain* outcomes — but malformed
  ITF state from the evaluator is a harness invariant violation, where a
  precise thrown error is acceptable and matches current driver style).

## Milestones

- **M1 — kit + pilots.** Build the kit; migrate 8–10 representative drivers:
  death-saving-throw (literal witness), direct-condition-lifecycle (computed
  oracle with picks), one selected-identity driver, weapon-attack-skeleton
  (integration lane), and the 8 current `battle-runtime-mbt-fixtures.ts`
  consumers (merging that module's responsibilities). Kit gets focused unit
  tests (decode, recorder, env conventions).
- **M2 — batch migration.** Remaining battle-runtime drivers in mechanical
  batches (suggest ~15–20 per batch, focused MBT after each batch).
- **M3 — gate + docs.** Quality-lane check against re-declared helpers;
  update `packages/battle-runtime/README.md` driver-authoring section and
  `docs/adr/0001-forest-of-qnt-slices.md` only if the driver-shape guidance
  text needs the kit reference (no ADR semantics change).

## Testing Decisions

- Kit unit tests are deterministic and fast (no Quint invocation): decode
  fixtures including bigint ints, `{tag, value}` variants, Sets, nested
  records; recorder transitions for `resolved`/`needsHoles`/`invalid`.
- Per migrated batch: run exactly those drivers' focused MBT files with
  default `MBT_TRACES=1`; one consolidated `MBT_TRACES=3` pass at the end of
  M2. Use the CLAUDE.md observation protocol (background run, timing wrapper)
  for anything expected >60s.
- Never run the full 106-file MBT suite as a development loop; batch scope
  only. Nondeterministic failures: reproduce with the reported seed before
  touching code.

## Acceptance Criteria

- `grep -l "^function numberFromQuintInt" src/*.mbt.test.ts` (and the other
  four helper names) returns zero files in `packages/battle-runtime`.
- No `*.mbt.test.ts` in battle-runtime imports `@firfi/quint-connect` decode
  primitives directly except through the kit (schema/`defineDriver`/`run`
  imports remain fine; the point is decode/recorder unification, not an import
  ban).
- Total battle-runtime `*.mbt.test.ts` line count reduced from 64,410 by at
  least ~20% with witness semantics unchanged (report the actual number).
- Kit has its own unit tests; `pnpm quality` includes the no-redeclared-helpers
  check; full `pnpm --filter @dnd/battle-runtime test` green.
- A short "writing a parity driver" section in the battle-runtime README shows
  the post-kit driver skeleton.

## Ralph Lane Intervention

Date: 2026-06-11

Lane A PDS-A09 attempted to close this PRD after the kit migration batches.
Those attempts established that the 20% line-footprint target was not achieved:
the comparable battle-runtime driver source footprint remained about 62,568
lines, above the 51,528-line target. Moving large bodies into imported support
modules was not accepted as a real reduction because it preserved comparable
driver source.

This miss is recorded as a PRD/03 closeout finding, not as a dependency for
`prd/04_TYPED_WITNESS_PROTOCOL.md`. The typed witness-protocol lane depends on
the completed driver kit and migrated driver surface, not on satisfying this
line-count success metric. Future work may either add explicit extraction scope
to remove the remaining comparable-source gap or revise this PRD's acceptance
target; neither blocks PDS-A10+ witness-protocol tasks.

## Verification

1. Reviewer-loop convergence: RAW/UL pass (kit vocabulary and README wording),
   architecture/connascence pass (the kit must weaken the 39-way duplicated
   meaning-connascence into one module; confirm no new distant coupling was
   introduced), code-review pass; repeat until no reasonable findings.
2. Oracle-direction audit: confirm no migrated driver started deriving QNT
   expectations from TS results; spec files untouched in M1/M2 (git diff over
   `*.mbt.qnt` must be empty for this PRD).
3. Parity-meaning audit per batch: diff each migrated driver's projection
   fields and assertions against its pre-migration version.

## Out of Scope

- Changing any `*.mbt.qnt` witness (that is `prd/04`).
- Publishing changes to `@firfi/quint-connect`.
- New QNT coverage (that is `prd/02`).
- A Rust harness implementation (cleanroom experiment owns it; this PRD only
  shapes the contract it will copy).

## Further Notes

Baseline numbers (2026-06-10, master c5d64a4) for the M2 closeout report:
106 drivers / 64,410 lines; helper copies 39/39/36/26/10; 8 drivers on
`battle-runtime-mbt-fixtures.ts`. The kit interface should be documented with
the future Rust harness explicitly in mind: each exported kit capability is a
sentence in that harness's spec.
