# Ralph Lane A: Parity Driver Seam (Kit + Typed Witness Protocol)

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "PDS-A01-DRIVER-KIT-TRACER",
      "status": "done",
      "title": "Build the parity-driver kit and migrate the death-saving-throw driver through it"
    },
    {
      "number": 2,
      "id": "PDS-A02-KIT-PILOTS",
      "status": "done",
      "title": "Migrate the remaining pilot drivers and merge battle-runtime-mbt-fixtures into the kit"
    },
    {
      "number": 3,
      "id": "PDS-A03-WITNESS-PROTOCOL-TRACER",
      "status": "done",
      "title": "Add the witness-protocol leaf and migrate the death-saving-throw witness/driver pair to record state and picks"
    },
    {
      "number": 4,
      "id": "PDS-A04-KIT-BATCH-1",
      "status": "done",
      "title": "Kit batch migration 1 (~20 drivers, self-discovering)"
    },
    {
      "number": 5,
      "id": "PDS-A05-KIT-BATCH-2",
      "status": "done",
      "title": "Kit batch migration 2"
    },
    {
      "number": 6,
      "id": "PDS-A06-KIT-BATCH-3",
      "status": "done",
      "title": "Kit batch migration 3"
    },
    {
      "number": 7,
      "id": "PDS-A07-KIT-BATCH-4",
      "status": "done",
      "title": "Kit batch migration 4"
    },
    {
      "number": 8,
      "id": "PDS-A08-KIT-BATCH-5",
      "status": "done",
      "title": "Kit batch migration 5 (drain)"
    },
    {
      "number": 9,
      "id": "PDS-A09-KIT-GATE-AND-CLOSEOUT",
      "status": "deferred",
      "title": "Deferred PRD/03 gate, docs, and line-footprint closeout"
    },
    {
      "number": 10,
      "id": "PDS-A10-WITNESS-PILOTS",
      "status": "done",
      "title": "Migrate two more witness/driver pilot pairs and record trace-cost and line-delta evidence"
    },
    {
      "number": 11,
      "id": "PDS-A11-WITNESS-BATCH-1",
      "status": "done",
      "title": "Witness-protocol batch migration 1 (~19 pairs, self-discovering)"
    },
    {
      "number": 12,
      "id": "PDS-A12-WITNESS-BATCH-2",
      "status": "done",
      "title": "Witness-protocol batch migration 2"
    },
    {
      "number": 13,
      "id": "PDS-A13-WITNESS-BATCH-3",
      "status": "ready-for-research",
      "title": "Witness-protocol batch migration 3"
    },
    {
      "number": 14,
      "id": "PDS-A14-WITNESS-BATCH-4",
      "status": "blocked",
      "title": "Witness-protocol batch migration 4"
    },
    {
      "number": 15,
      "id": "PDS-A15-WITNESS-BATCH-5",
      "status": "blocked",
      "title": "Witness-protocol batch migration 5 (drain)"
    },
    {
      "number": 16,
      "id": "PDS-A16-WITNESS-GATE-AND-CLOSEOUT",
      "status": "blocked",
      "title": "Add the witness-protocol convention gate, ADR addendum, README skeleton, and close out prd/04"
    },
    {
      "number": 17,
      "id": "PDS-A17-LITERAL-CAPTURE-PRD",
      "status": "ready-for-research",
      "title": "Write the literal-capture-gate PRD from the research note (single-owner scope)"
    },
    {
      "number": 18,
      "id": "PDS-A18-RECURSIVE-NEXT-BATCH",
      "status": "blocked",
      "title": "Plan the next parity-seam batch if this lane drains"
    }
  ]
}
-->

This lane implements `prd/03_MBT_PARITY_DRIVER_KIT.md` and then
`prd/04_TYPED_WITNESS_PROTOCOL.md`. The two PRDs are one seam (the
witness↔driver parity contract) and edit the same
`packages/battle-runtime/src/*.mbt.test.ts` files, so they live in one serial
lane. Task `PDS-A03` runs early (right after the kit pilots) because Lane B's
witness tasks (`BPK-B04+` in
`plans/RALPH_LANE_BATTLE_PROTOCOL_KERNEL.md`) are gated on it.

Wave coordination, parallelism matrix, and the global MBT mutex live in
`plans/RALPH_QUINT_FIRST_WAVE.md`.

## Context Budget

Read only these by default:

- The owning PRD for the current task (`prd/03_…` for A01–A09, `prd/04_…` for
  A03 and A10–A16, `plans/RESEARCH_witness_literal_capture_gate.md` for A17),
  including its Context Primer reading list.
- `docs/adr/0001-forest-of-qnt-slices.md`.
- The exact driver/witness files named or discovered by the current task.
- `scripts/check-mbt-driver-closure.cjs` when a task touches witness imports.

Do not reread closed Ralph lanes. Do not read `packages/mcp` or
`packages/character-sheet-runtime` — other lanes own them.

## Lane Rules

- Before starting each task, verify the task base:
  `git log --oneline -1 <declared-base-ref>`, `git log --oneline -1 HEAD`, and
  `git merge-base --is-ancestor <declared-base-sha> HEAD`. On failure, stop
  and report; do not rebase.
- Migration tasks are semantics-frozen: same actions (modulo documented
  picks-collapses in prd/04 tasks), same projected fields, same assertions,
  same SRD meaning. If a migration exposes a latent driver bug, fix it in its
  own commit with the focused MBT rerun as evidence.
- prd/03 tasks (A01–A02, A04–A09) must not modify any `*.mbt.qnt` file.
- The oracle direction is fixed: never derive QNT expectations from TS
  results. Witness outcome literals are hand-stated SRD facts or
  REPL-captured per CLAUDE.md.
- The closure-gate allowlist in `scripts/check-mbt-driver-closure.cjs` must
  not grow.
- Treat battle MBT as scarce and globally mutexed (see wave doc). Default
  `MBT_TRACES=1`; confidence passes are named per task.
- Batch self-discovery rules:
  - **Kit-unmigrated driver:** a `src/*.mbt.test.ts` that declares its own
    `numberFromQuintInt`, `booleanField`, `quintStateRecord`, `isRecord`, or
    `quintVariantTag`, or does not import the kit module. Take the first ≤20
    in alphabetical order.
  - **Protocol-unmigrated witness:** a `*.mbt.qnt` matching
    `grep -l 'var qLastResult: str'`. Take the first ≤20 in alphabetical
    order and migrate each paired driver in the same task.

## Verification

Every task must include:

- Reviewer-loop convergence (RAW traceability, ubiquitous language,
  architecture/connascence, code review) until no reasonable findings remain.
- Focused MBT run of exactly the drivers touched by the task
  (`pnpm exec vitest run <files>` from `packages/battle-runtime`,
  `MBT_TRACES=1` unless the task says otherwise), using the CLAUDE.md
  background/timing protocol for runs expected >60s, after the MBT-mutex
  process check.
- `node scripts/check-mbt-driver-closure.cjs`
- `pnpm --filter @dnd/battle-runtime test` for tasks that change shared kit
  code (A01, A02, A09, A16); driver-only batches may run the focused files
  plus the kit unit tests.
- For prd/03 tasks: `git diff --name-only -- '*.mbt.qnt'` is empty.
- MBT failure protocol: reproduce with the reported `QUINT_SEED` before any
  fix; never dismiss as flaky.
- `git diff --check`

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | PDS-A01-DRIVER-KIT-TRACER | done | none | Light research: kit API shape vs quint-connect exports (`transformITFValue`, ITF schemas, picks). |
| 2 | PDS-A02-KIT-PILOTS | done | PDS-A01-DRIVER-KIT-TRACER | Proves the kit on all driver shapes; merges `battle-runtime-mbt-fixtures.ts`. |
| 3 | PDS-A03-WITNESS-PROTOCOL-TRACER | done | PDS-A02-KIT-PILOTS | Unblocks Lane B (`BPK-B04+`). Includes the quint 0.31.0 parameterized-type REPL check. |
| 4 | PDS-A04-KIT-BATCH-1 | done | PDS-A03-WITNESS-PROTOCOL-TRACER | Self-discovering; ≤20 drivers. |
| 5 | PDS-A05-KIT-BATCH-2 | done | PDS-A04-KIT-BATCH-1 | Self-discovering; ≤20 drivers. |
| 6 | PDS-A06-KIT-BATCH-3 | done | PDS-A05-KIT-BATCH-2 | |
| 7 | PDS-A07-KIT-BATCH-4 | done | PDS-A06-KIT-BATCH-3 | |
| 8 | PDS-A08-KIT-BATCH-5 | done | PDS-A07-KIT-BATCH-4 | Drains the kit-unmigrated set. |
| 9 | PDS-A09-KIT-GATE-AND-CLOSEOUT | deferred | PDS-A08-KIT-BATCH-5 | Owner intervention 2026-06-11: repeated attempts showed the PRD/03 20% line-footprint target was missed by the completed kit batches and is not a prerequisite for prd/04 witness-protocol work. Revive only with explicit extraction scope or revised acceptance. |
| 10 | PDS-A10-WITNESS-PILOTS | done | PDS-A08-KIT-BATCH-5 | Trace-cost timing note and pilot line-delta report. Does not depend on PDS-A09 or the PRD/03 20% line-footprint metric. |
| 11 | PDS-A11-WITNESS-BATCH-1 | done | PDS-A10-WITNESS-PILOTS | Self-discovering; ≤20 pairs; `MBT_TRACES=3` confidence pass per batch. |
| 12 | PDS-A12-WITNESS-BATCH-2 | done | PDS-A11-WITNESS-BATCH-1 | |
| 13 | PDS-A13-WITNESS-BATCH-3 | ready-for-research | PDS-A12-WITNESS-BATCH-2 | |
| 14 | PDS-A14-WITNESS-BATCH-4 | blocked | PDS-A13-WITNESS-BATCH-3 | |
| 15 | PDS-A15-WITNESS-BATCH-5 | blocked | PDS-A14-WITNESS-BATCH-4 | Drains the protocol-unmigrated set. |
| 16 | PDS-A16-WITNESS-GATE-AND-CLOSEOUT | blocked | PDS-A15-WITNESS-BATCH-5 | Convention gate, ADR addendum, README skeleton, prd/04 closeout. |
| 17 | PDS-A17-LITERAL-CAPTURE-PRD | ready-for-research | PDS-A10-WITNESS-PILOTS | HITL: owner reviews the PRD. Single-owner obligations only; multi-owner rows wait for BPK-B08. |
| 18 | PDS-A18-RECURSIVE-NEXT-BATCH | blocked | PDS-A16-WITNESS-GATE-AND-CLOSEOUT | Refill or close the lane. |

## Task Details

### Task 1 - PDS-A01-DRIVER-KIT-TRACER

Status: `done` · Mode: AFK

Input: `prd/03_MBT_PARITY_DRIVER_KIT.md` (whole document; it is
self-contained), `src/death-saving-throw.mbt.test.ts`,
quint-connect `dist/simple.d.ts` + `dist/effect.d.ts`.

Output: the kit module (per prd/03 Solution §1–4: ITF decode, witness-protocol
decode + production recorder, run conventions, shared pick schemas) with its
own deterministic unit tests, plus `death-saving-throw.mbt.test.ts` migrated
to consume it end to end. Light research first: choose what the kit adapts
from quint-connect's exports versus implements; record the choice in the kit
module header.

Acceptance: kit unit tests green; migrated driver passes its focused MBT
(`MBT_TRACES=1` and once with `MBT_TRACES=3`); driver line count reported
(expect ~450 → ~150); no `*.mbt.qnt` diff; closure checker green;
`pnpm --filter @dnd/battle-runtime test` green.

### Task 2 - PDS-A02-KIT-PILOTS

Status: `done` · Mode: AFK

Input: prd/03 M1 pilot list: `direct-condition-lifecycle.mbt.test.ts`
(computed oracle with picks), one selected-identity driver,
`weapon-attack-skeleton.mbt.test.ts` (integration lane), and the 8 current
consumers of `battle-runtime-mbt-fixtures.ts`.

Output: all pilots on the kit; `battle-runtime-mbt-fixtures.ts`
responsibilities merged into the kit (no third helper layer remains).

Acceptance: focused MBT green for every pilot; closure checker green; no
`*.mbt.qnt` diff; full package test green; parity-meaning audit (diff each
pilot's projection fields and assertions pre/post).

### Task 3 - PDS-A03-WITNESS-PROTOCOL-TRACER

Status: `done` · Mode: AFK

Input: `prd/04_TYPED_WITNESS_PROTOCOL.md` (whole document),
`battle-runtime-death-saving-throw.mbt.qnt` + its driver,
`battle-runtime-reaction-kinds.qnt` (leaf pattern).

Output: `battle-runtime-witness-protocol.qnt` leaf (result/reason variants,
protocol record, `pure def` step helpers); the 5-line REPL check for
parameterized type aliases on quint 0.31.0 with the outcome (polymorphic vs
monomorphic fallback) recorded in the leaf header; the death-saving-throw
pair migrated: single record state, `.with(...)` updates, the four roll
actions collapsed to one picks action (`Set(1, 5, 10, 20).oneOf()` with the
SRD rule-edge comment); kit decode extended for the record/variant shape so
drivers stay thin.

Acceptance: focused MBT green (`MBT_TRACES=1` and `MBT_TRACES=3`); closure
checker green with no allowlist growth (leaf adds 1 file); witness and driver
line deltas reported; this task's merge unblocks `BPK-B04`/`BPK-B06`.

### Task 4 - PDS-A04-KIT-BATCH-1

Status: `done` · Mode: AFK

Input: the kit-unmigrated discovery rule (Lane Rules) applied at task start.

Output: ≤20 drivers migrated per task, plumbing-only (fixtures, action
handlers, projections, assertions unchanged in meaning).

Acceptance per batch: focused MBT green for exactly the batch files; closure
checker green; no `*.mbt.qnt` diff; batch line-delta reported. A08
additionally asserts the discovery rule matches zero files.

Batch result: 20 drivers migrated; line delta `12046 -> 11884`, net `-162`.

### Task 5 - PDS-A05-KIT-BATCH-2

Status: `done` · Mode: AFK

Input: the kit-unmigrated discovery rule (Lane Rules) applied at task start.

Output: the next ≤20 drivers migrated, plumbing-only (fixtures, action
handlers, projections, assertions unchanged in meaning).

Acceptance: focused MBT green for exactly the batch files; closure checker
green; no `*.mbt.qnt` diff; batch line-delta reported.

Batch result: 20 drivers migrated; line delta `18619 -> 18424`, net `-195`.

### Task 6 - PDS-A06-KIT-BATCH-3

Status: `done` · Mode: AFK

Input: the kit-unmigrated discovery rule (Lane Rules) applied at task start.

Output: the next ≤20 drivers migrated, plumbing-only (fixtures, action
handlers, projections, assertions unchanged in meaning).

Acceptance: focused MBT green for exactly the batch files; closure checker
green; no `*.mbt.qnt` diff; batch line-delta reported.

Batch result: 20 drivers migrated; line delta `12086 -> 12005`, net `-81`.

### Task 7 - PDS-A07-KIT-BATCH-4

Status: `done` · Mode: AFK

Input: the kit-unmigrated discovery rule (Lane Rules) applied at task start.

Output: the next ≤20 drivers migrated, plumbing-only (fixtures, action
handlers, projections, assertions unchanged in meaning).

Acceptance: focused MBT green for exactly the batch files; closure checker
green; no `*.mbt.qnt` diff; batch line-delta reported.

### Task 8 - PDS-A08-KIT-BATCH-5

Status: `done` · Mode: AFK

Input: the kit-unmigrated discovery rule (Lane Rules) applied at task start.

Output: the final kit-unmigrated driver batch migrated, plumbing-only
(fixtures, action handlers, projections, assertions unchanged in meaning).

Acceptance: focused MBT green for exactly the batch files; closure checker
green; no `*.mbt.qnt` diff; batch line-delta reported; the discovery rule
matches zero files after the batch.

### Task 9 - PDS-A09-KIT-GATE-AND-CLOSEOUT

Status: `deferred` · Mode: HITL

Owner intervention, 2026-06-11: this task is deferred and removed from the
blocking path to prd/04. Repeated implementation/review rounds established
that the completed kit migration reduced comparable battle-runtime driver
source from the 64,410-line baseline to about 62,568 lines, not the <=51,528
lines required by the PRD/03 20% target. The attempted fix of moving driver
bodies into imported support modules did not reduce comparable source and
should not be treated as closeout.

This is not a hard dependency for PDS-A10 or later typed witness-protocol
tasks. Those tasks depend on the completed kit and witness-protocol tracer
work, not on the PRD/03 line-footprint success metric. Revive PDS-A09 only if
the owner chooses one of these scopes:

- add explicit extraction work sufficient to remove the remaining comparable
  source gap; or
- revise PRD/03 acceptance so the gate/docs/closeout task can record the
  missed 20% target without blocking prd/04.

### Task 10 - PDS-A10-WITNESS-PILOTS

Status: `done` · Mode: AFK

Output: two more pairs migrated to the witness protocol (one
selected-identity pair; `direct-condition-lifecycle` gaining the record
protocol on top of its existing picks); prd/04 M1 evidence: pilot line
reductions and a one-time trace-generation timing comparison (ADR-0001
closure-cost model) recorded in the task report.

Acceptance: focused MBT green for the pairs; closure checker green; timing
note shows no material per-trace regression.

Pilot result: witness QNT line count `250 -> 240`, net `-10`; focused
two-driver trace run completed in `7s`.

### Task 11 - PDS-A11-WITNESS-BATCH-1

Status: `done` · Mode: AFK

Input: the protocol-unmigrated discovery rule applied at task start.

Output: ≤20 witness/driver pairs per task migrated to record state + step
helpers; enumerated literal-action families that are pure input sampling
collapsed to picks actions, or annotated with the one-line reason they stay
enumerated (prd/04 acceptance rule).

Acceptance per batch: focused MBT green (`MBT_TRACES=1`) plus one
`MBT_TRACES=3` confidence pass; closure checker green, allowlist unchanged.
A15 additionally asserts `grep -l 'var qLastResult: str' *.mbt.qnt` is empty.

### Task 12 - PDS-A12-WITNESS-BATCH-2

Status: `done` · Mode: AFK

Input: the protocol-unmigrated discovery rule applied at task start.

Output: the next ≤20 witness/driver pairs migrated to record state + step
helpers; enumerated literal-action families that are pure input sampling
collapsed to picks actions, or annotated with the one-line reason they stay
enumerated (prd/04 acceptance rule).

Acceptance: focused MBT green (`MBT_TRACES=1`) plus one `MBT_TRACES=3`
confidence pass; closure checker green, allowlist unchanged.

### Task 13 - PDS-A13-WITNESS-BATCH-3

Status: `ready-for-research` · Mode: AFK

Input: the protocol-unmigrated discovery rule applied at task start.

Output: the next ≤20 witness/driver pairs migrated to record state + step
helpers; enumerated literal-action families that are pure input sampling
collapsed to picks actions, or annotated with the one-line reason they stay
enumerated (prd/04 acceptance rule).

Acceptance: focused MBT green (`MBT_TRACES=1`) plus one `MBT_TRACES=3`
confidence pass; closure checker green, allowlist unchanged.

### Task 14 - PDS-A14-WITNESS-BATCH-4

Status: `blocked` · Mode: AFK

Input: the protocol-unmigrated discovery rule applied at task start.

Output: the next ≤20 witness/driver pairs migrated to record state + step
helpers; enumerated literal-action families that are pure input sampling
collapsed to picks actions, or annotated with the one-line reason they stay
enumerated (prd/04 acceptance rule).

Acceptance: focused MBT green (`MBT_TRACES=1`) plus one `MBT_TRACES=3`
confidence pass; closure checker green, allowlist unchanged.

### Task 15 - PDS-A15-WITNESS-BATCH-5

Status: `blocked` · Mode: AFK

Input: the protocol-unmigrated discovery rule applied at task start.

Output: the final protocol-unmigrated witness/driver batch migrated to record
state + step helpers; enumerated literal-action families that are pure input
sampling collapsed to picks actions, or annotated with the one-line reason
they stay enumerated (prd/04 acceptance rule).

Acceptance: focused MBT green (`MBT_TRACES=1`) plus one `MBT_TRACES=3`
confidence pass; closure checker green, allowlist unchanged; `grep -l 'var
qLastResult: str' *.mbt.qnt` is empty.

### Task 16 - PDS-A16-WITNESS-GATE-AND-CLOSEOUT

Status: `blocked` · Mode: AFK

Output: quality gate forbidding string-protocol vars in battle-runtime
witnesses; the ADR (or ADR-0001 addendum) recording the witness-protocol
record and the picks decision rule ("picks for input sampling, separate
actions for different procedure paths"); README witness-authoring skeleton
using the migrated death-saving-throw pair as the example; prd/04 closeout
(corpus line totals vs the 15,903 baseline; registry paths confirmed
unchanged).

Acceptance: `pnpm quality` green including the new gate;
`pnpm --filter @dnd/battle-runtime test` green; if any new `.qnt` gained
`run` blocks, `pnpm --filter @dnd/battle-runtime test:qnt-proofs` green.

### Task 17 - PDS-A17-LITERAL-CAPTURE-PRD

Status: `ready-for-research` · Mode: HITL (owner reviews the resulting PRD)

Input: `plans/RESEARCH_witness_literal_capture_gate.md` (design, gates, and
do-not list), the post-A10 witness shape.

Output: `prd/05_WITNESS_LITERAL_CAPTURE_GATE.md` scoped to
single-`qntOwners` obligations, recommending the generated
`*-witness-samples-tests.qnt` proof-module design; multi-owner rows are
explicitly deferred to the disambiguation convention produced by `BPK-B08`.
No implementation in this task.

Acceptance: PRD follows the prd/02–04 house structure (context primer,
measured baseline, milestones, acceptance, verification); research-note
gates are restated as task gates.

### Task 18 - PDS-A18-RECURSIVE-NEXT-BATCH

Status: `blocked` · Mode: AFK

Output: if witness/driver stragglers or follow-ups accumulated (e.g. the
character-package witnesses noted as stretch in prd/03/04), append a new
batch of tasks to this lane; otherwise mark the lane drained in
`plans/RALPH_QUINT_FIRST_WAVE.md`.
