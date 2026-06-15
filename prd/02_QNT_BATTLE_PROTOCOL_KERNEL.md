# PRD: QNT Battle Protocol Kernel

Date: 2026-06-10

Status: Draft

Owner: battle-runtime QNT architecture

Origin: architecture review 2026-06-10, candidate 1 ("give the battle protocol
a QNT owner"). Companion PRDs: `prd/03_MBT_PARITY_DRIVER_KIT.md` and
`prd/04_TYPED_WITNESS_PROTOCOL.md`. This PRD does not depend on them, but its
new parity witnesses get cheaper if they land first.

## Context Primer For A Fresh Agent

Read, in this order, before writing anything:

1. `CLAUDE.md` — especially "SRD feature parity", "Quint parity", "MBT runs are
   expensive", "MBT driver closure discipline", "Connascence discipline",
   "Quint gotchas".
2. `ARCHITECTURE.md` — sections "QNT Verification Shape", "Runtime Boundaries",
   "Rules Kernel Coverage And Generator Readiness", "Spatial Modeling
   Frontier".
3. `docs/adr/0001-forest-of-qnt-slices.md` (forest shape, import-closure cost)
   and `docs/adr/0004-light-obscurement-sight-source-facts-and-witnesses.md`
   (table-supplied facts stay table-owned).
4. `plans/PRD_CLEANROOM_QNT_BRANCH_COVERAGE_AND_HARNESS.md` and
   `plans/CLEANROOM_QNT_BRANCH_COVERAGE_AND_HARNESS_IMPLEMENTATION_PLAN.md` —
   the active cleanroom readiness program this PRD serves.
5. `plans/rules-kernel-coverage/README.md`, `obligations.jsonl`,
   `battle-hole-frontier.jsonl`, and the checkers
   `scripts/rules-kernel-coverage-check.cjs` /
   `rules-kernel-coverage-claim-scan.cjs` /
   `rules-kernel-coverage-self-test.cjs`.
6. Existing protocol-adjacent QNT:
   `packages/battle-runtime/battle-runtime-reaction-window.qnt`,
   `battle-runtime-interrupt-bridge.qnt`,
   `battle-runtime-public-trace-contract.qnt`,
   `battle-runtime-reaction-kinds.qnt` (the leaf-module pattern),
   `packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`.
7. TS protocol owners: `packages/battle-runtime/src/battle-reducer.ts:5620`
   (BattleHole union), `:5771` (BattleFill union),
   `src/battle-subjects.ts:898` (BattleSubject),
   `src/battle-reducer/dispatcher.ts`, `src/battle-reducer/hole-helpers.ts`,
   `src/battle-reducer/turn-end-movement.ts`.

Repo ground rules that bind this work: pnpm only; focused MBT only (never
broad/exploratory runs; one MBT process at a time; reproduce failures with the
reported `QUINT_SEED` before fixing); every modeled rule must cite SRD text in
`.references/srd-5.2.1/` and use `UBIQUITOUS_LANGUAGE.md` terms; deviations go
to `ASSUMPTIONS.md` via the project owner, not silently.

## Problem Statement

The QNT corpus owns rule semantics but not the battle **protocol**. Measured on
master (2026-06-10):

- The protocol vocabulary is TypeScript-owned: 75 `BattleHole` variants, 46
  fill kinds, ~40 `BattleSubject` variants. Witness QNT files re-declare
  private 1–3 variant `Hole` types per witness; no QNT module owns the
  vocabulary.
- The sequencing protocol is TypeScript-only: which holes a procedure opens and
  in what order (attack roll before damage dice; saving-throw outcome before
  condition choice), how fills validate, how interrupt frames nest and resume,
  and how replay-from-root reconstructs state live only in the ~111k-line
  `src/battle-reducer/` composition layer (`dispatcher.ts` 4,989 lines,
  `turn-end-movement.ts` 7,281 lines).
- The coverage ledger says so explicitly:
  `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` is `boundary-only` with empty
  `qntOwners`, and `battle-hole-frontier.jsonl` rows defer QNT ownership to
  named follow-up tasks.
- Consequence for the active cleanroom readiness program
  (`plans/PRD_CLEANROOM_QNT_BRANCH_COVERAGE_AND_HARNESS.md`): the copied QNT
  corpus underdetermines the engine. A cleanroom Rust agent could satisfy every
  focused witness and still be unable to implement act discovery, hole
  frontiers, or interrupt resume without reading production TypeScript — the
  exact blocker class the experiment exists to detect. Closing it in QNT is
  the highest-leverage preparation for that experiment.
- Domain-language symptom: per-spell hole kinds
  (`gustOfWindLineDirectionChoice`, `levitateAltitudeChange`,
  `levitateInitialRise`) where the SRD defines procedure families, and one
  frontier row with `holeKind: null`. The vocabulary currently grows per
  authored spell, which deepens TS ownership over time.

What already exists and must be built on, not duplicated:

- `plans/rules-kernel-coverage/battle-hole-frontier.jsonl` (121 rows: 75
  `battle-hole-family`, 46 `battle-fill-kind`) already classifies every TS
  variant with a family-grain `holeKind` (48 distinct values), a
  `classification` of `semantic-frontier` (92) or `table-owned-fact` (29),
  covering obligation ids, and rationale. The vocabulary design input is this
  registry, not a fresh survey.
- `battle-runtime-reaction-window.qnt` + `battle-runtime-interrupt-bridge.qnt`
  + rule-core `reactions-continuations-concentration.qnt` already own the
  single reaction window offer/decline/spend/resume
  (`BATTLE.REACTION.OFFER_DECLINE_RESUME`, covered). The gap is nesting,
  resume interleaved with active-effect mutation, and replay-from-root — not
  the basic window.
- `battle-runtime-public-trace-contract.qnt` owns public checkpoint order for
  a weapon-attack trace with a 3-kind `PublicTraceHole` type. It is a narrow
  precedent for ordering ownership, not a general frontier model.

## Solution

Give the protocol a QNT owner in three slice families, all inside the
ADR-0001 forest (small slices, leaves for vocabulary, composition stays at the
TS reducer; no whole-battle model):

**1. Protocol vocabulary leaves.** New leaf modules (pattern:
`battle-runtime-reaction-kinds.qnt`) defining the hole-kind, fill-kind, and
subject-kind vocabularies as pure variant types at **procedure-family grain**,
promoted from the `holeKind` values of `semantic-frontier` rows in
`battle-hole-frontier.jsonl`. Leaves must contain only types/tags and
`pure def` facts, import nothing behavioural, and be importable by `*.mbt.qnt`
witnesses within the ≤8-file closure budget
(`scripts/check-mbt-driver-closure.cjs`).

The join becomes executable in both directions at the existing checker
boundary:

- every `semantic-frontier` frontier row's `holeKind` must name a QNT
  vocabulary variant (and `holeKind: null` becomes a checker error);
- every QNT vocabulary variant must be named by at least one frontier row;
- TS side: an exhaustive `Match.discriminator`-based mapping
  `BattleHole → hole family kind` in `@dnd/battle-runtime`, so adding a TS
  hole variant without classifying it fails to compile, and a contract test
  ties the mapping to the frontier registry.

After landing, the QNT vocabulary is the owner; the frontier registry rows and
TS mapping are checked against it. (Authoring may read the registry as
structured input — that is import-time inspiration, not oracle inversion.)

**2. Hole-frontier ordering slice.** A focused QNT slice owning, per procedure
shape (weapon attack, save-gated spell, attack-roll spell, healing, command…),
the legal order of hole frontiers from act selection to resolution: which kinds
appear in `needsHoles`, which kinds may not appear before others, and which
fill rejections are ordering errors. This generalizes the per-trace checkpoint
lists in `battle-runtime-public-trace-contract.qnt` into relations over the
vocabulary from (1). One focused MBT witness drives `resolveBattleSubject`
through a bounded fixture per procedure shape and asserts the projected
frontier order.

**3. Interrupt/resume/replay protocol slice.** Extend the existing
reaction-window family (do not create a parallel spec) to own, at abstract
procedure grain: interrupt frame nesting depth and discipline, decline/resume
semantics when active effects mutate between offer and resume, and
replay-from-root equivalence (replaying the recorded subject+fills from the
root state reproduces the resolved state). Focused MBT witnesses drive
`resolveBattleSubject`/`resolveBattleInterrupt` through bounded fixtures.

**Registry deliverables.** New `covered` obligation rows (suggested ids:
`BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY`,
`BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`,
`BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY`) following the existing row
shape (`id`, `title`, `runtime`, `kind`, `status`, `surfaceEvidence` with SRD +
UL citations, `qntOwners`, `runtimeOwners`, `parityWitnesses` with
`focused-mbt` entries), plus matching `qnt-owner-roles.jsonl` (`semantic-core`)
and `generator-readiness.jsonl` rows naming the generator subset. Update
`BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION` to point at the new vocabulary
owner (either convert to `covered` or keep as the registry-validation row with
its `reason` rewritten to cite the QNT owner — implementer's call, recorded in
the row). `kernel-ir-boundaries.jsonl` `command` and `fill` rows gain the new
QNT owners as evidence.

## User Stories

1. As a cleanroom Rust implementer agent, I want the copied QNT corpus to
   define the hole/fill/subject vocabulary and frontier ordering, so that I can
   implement act discovery and fill validation without reading production
   TypeScript.
2. As a rule-core maintainer, I want protocol vocabulary at procedure-family
   grain, so that authored-spell growth does not grow the protocol.
3. As a battle-runtime maintainer, I want interrupt nesting and replay
   equivalence specified in QNT, so that dispatcher refactors have a parity
   gate instead of only regression tests.
4. As a coverage auditor, I want `BATTLE.HOLE.SEMANTIC_FRONTIER_CLASSIFICATION`
   to stop being `boundary-only` for reasons of missing ownership, so that the
   ledger's denominator honestly reflects protocol semantics.
5. As a future generator author, I want vocabulary and ordering as
   generator-subset-clean semantic core, so that generated Rust can consume
   the protocol directly.

## Implementation Decisions

- Family grain, not per-spell. Where a frontier `holeKind` is currently
  per-spell, either fold it into a family variant (possibly parameterized by a
  typed fact) or keep it temporarily with an explicit `followUpTaskIds` entry
  in its frontier row naming the fold task. No new per-spell kinds.
- `table-owned-fact` rows stay boundary-owned (ADR-0004).
  `BATTLE.PROTOCOL.MALFORMED_PAYLOAD_REJECTION` and
  `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` remain `boundary-only`; this PRD must
  not pull parsing or table geometry into QNT.
- Vocabulary leaves must not import `battle-runtime-model` or any behavioural
  module; `battle-runtime-model` may import the leaves (same direction as
  `battle-runtime-reaction-kinds.qnt`).
- Extend existing reaction/interrupt modules rather than adding a parallel
  spec; no second spelling of the reaction window.
- Renaming the 75 TS `BattleHole` variants is out of scope; the executable TS
  mapping table plus frontier rows carry the join. Folding TS variants is
  follow-up work named per row.
- The TS hole-family mapping lives in `@dnd/battle-runtime` (e.g. beside
  `hole-helpers.ts`), uses `effect/Match` with `Match.exhaustive` (no
  `default`), and is exported for the frontier contract test.
- New QNT files carry `// KERNEL-COVERAGE: qnt-owner <OBLIGATION_ID>` headers;
  new witnesses carry `// KERNEL-COVERAGE: parity-witness <OBLIGATION_ID>`
  (the claim-scan script reads these).
- SRD/UL grounding: ordering and interrupt rules must cite
  `.references/srd-5.2.1/Playing-the-Game.md` (Actions, Reactions, the attack
  sequence), `Rules-Glossary.md` (Reaction), and
  `Spells/Gaining-and-Casting.md` (casting times, reaction triggers);
  vocabulary names must come from `UBIQUITOUS_LANGUAGE.md`. Where the SRD does
  not prescribe an ordering the runtime nevertheless fixes (pure protocol
  choices), record the choice in the obligation row and, if it is a RAW
  interpretation, surface it to the project owner for `ASSUMPTIONS.md` rather
  than deciding silently.

## Milestones

- **M1 — vocabulary leaves + executable join.** Leaf modules; checker
  extensions (no-null `holeKind`, two-direction join); TS exhaustive mapping +
  contract test; `BATTLE.PROTOCOL.HOLE_FAMILY_VOCABULARY` row; frontier rows
  updated. Landable alone; unblocks cleanroom corpus immediately.
- **M2 — hole-frontier ordering slice + witness.** Ordering relations over the
  vocabulary; focused MBT witness per procedure shape (start with weapon
  attack and save-gated spell); obligation row.
- **M3 — interrupt/resume/replay slice + witnesses.** Nesting, resume with
  active-effect mutation, replay-from-root equivalence; obligation row.
- **M4 — registry closeout (done).** `qnt-owner-roles.jsonl`,
  `generator-readiness.jsonl`, `kernel-ir-boundaries.jsonl`, regenerate
  `plans/rules-kernel-coverage/REPORT.md` via the checker, and update
  `plans/QNT_COVERAGE_PROGRAM.md`'s queue map.

## Testing Decisions

- Each new obligation gets a focused `*.mbt.qnt` + `*.mbt.test.ts` parity
  witness driving production APIs (`resolveBattleSubject`,
  `resolveBattleInterrupt`, `snapshotBattle`); deterministic reducer tests
  cover fixed projections.
- If `prd/03`/`prd/04` have landed, write witnesses through the driver kit and
  typed witness protocol; otherwise follow the current driver shape and accept
  later mechanical migration.
- Run only the new focused MBT files and affected unit tests during
  development; `pnpm quality` runs the closure and coverage checkers. If a new
  `.qnt` has `run` blocks, run
  `pnpm --filter @dnd/battle-runtime test:qnt-proofs` once before merge.
- MBT failures: reproduce with the reported seed
  (`QUINT_SEED=… pnpm exec vitest run <file>`) before any fix.

## Acceptance Criteria

- A `*.mbt.qnt` witness can import the hole-kind leaf and stay within the
  ≤8-file closure budget (demonstrated by at least one migrated or new
  witness).
- `node scripts/rules-kernel-coverage-check.cjs` fails if a
  `semantic-frontier` frontier row has `holeKind: null` or a `holeKind` not
  present in the QNT vocabulary, and if a QNT vocabulary variant has no
  frontier row.
- Adding a `BattleHole` variant without extending the TS family mapping fails
  to compile (`Match.exhaustive`).
- New obligations are `covered` with `qntOwners`, `runtimeOwners`, and at
  least one `focused-mbt` parity witness each; claim-scan passes.
- `generator-readiness.jsonl` rows for the new slices are
  `generation-subset-clean` with explicit `generatorSubset` vocabulary.
- All focused MBT witnesses pass with `MBT_TRACES=1` default and a
  `MBT_TRACES=3` confidence run; `pnpm quality` green;
  `pnpm --filter @dnd/battle-runtime test` green.

## Verification

1. Reviewer-loop convergence: after implementation, run RAW-traceability,
   ubiquitous-language, architecture/connascence, and code-review passes; fix
   every reasonable finding or reject with a written reason; repeat until a
   round produces no reasonable findings (at least two rounds).
2. RAW/UL check: every ordering or interrupt rule modeled in M2/M3 cites a
   specific SRD passage in the obligation row's `surfaceEvidence`; vocabulary
   names checked against `UBIQUITOUS_LANGUAGE.md`. Anything the SRD leaves
   open is flagged to the project owner for `ASSUMPTIONS.md` before encoding.
3. Connascence check on the join: the frontier registry, QNT vocabulary, and
   TS mapping are three coupled artifacts — confirm the checker + exhaustive
   match make all three fail loudly on drift (no comment-only coupling).

## Out of Scope

- Whole-battle QNT, catalog enumeration, spatial geometry inference.
- Converting `BATTLE.PROTOCOL.MALFORMED_PAYLOAD_REJECTION`,
  `CREATION.PROTOCOL.MALFORMED_FILL_REJECTION`, or
  `BATTLE.TABLE.HOLE_FACT_BOUNDARIES` away from boundary status.
- Mass-renaming TS `BattleHole`/`BattleFill` variants.
- Implementing a QNT-to-Rust generator or committing generated Rust.
- The cleanroom readiness program itself
  (`plans/PRD_CLEANROOM_QNT_BRANCH_COVERAGE_AND_HARNESS.md` and
  `plans/CLEANROOM_QNT_BRANCH_COVERAGE_AND_HARNESS_IMPLEMENTATION_PLAN.md`
  own it).

## Further Notes

Measured baseline for later comparison (2026-06-10, master c5d64a4): 75 hole
variants / 46 fill kinds / ~40 subjects TS-owned; 121 frontier rows, 48
distinct `holeKind`s, 1 null; 6 obligations with empty `qntOwners`; reducer
composition layer 169 files / 111,153 lines. The architecture-review HTML with
diagrams is in the session record; the load-bearing numbers are restated here
so this PRD is self-sufficient.
