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
      "status": "done",
      "title": "Witness-protocol batch migration 3"
    },
    {
      "number": 14,
      "id": "PDS-A14-WITNESS-BATCH-4",
      "status": "done",
      "title": "Witness-protocol batch migration 4"
    },
    {
      "number": 15,
      "id": "PDS-A15-WITNESS-BATCH-5",
      "status": "done",
      "title": "Witness-protocol batch migration 5 (drain)"
    },
    {
      "number": 16,
      "id": "PDS-A16-WITNESS-GATE-AND-CLOSEOUT",
      "status": "done",
      "title": "Add the witness-protocol convention gate, ADR addendum, README skeleton, and close out prd/04"
    },
    {
      "number": 17,
      "id": "PDS-A17-LITERAL-CAPTURE-PRD",
      "status": "done",
      "title": "Write the literal-capture-gate PRD from the research note (single-owner scope)"
    },
    {
      "number": 18,
      "id": "PDS-A18-RECURSIVE-NEXT-BATCH",
      "status": "done",
      "title": "Plan the next parity-seam batch if this lane drains"
    },
    {
      "number": 19,
      "id": "PDS-A19-SCENARIO-OUTCOME-AUDIT",
      "status": "done",
      "title": "Classify remaining qScenario outcome projections and choose the migration shape"
    },
    {
      "number": 20,
      "id": "PDS-A20-SCENARIO-OUTCOME-BATCH-1",
      "status": "done",
      "title": "Migrate the first qScenario outcome-projection batch"
    },
    {
      "number": 21,
      "id": "PDS-A21-SCENARIO-OUTCOME-BATCH-2",
      "status": "done",
      "title": "Migrate the second qScenario outcome-projection batch"
    },
    {
      "number": 22,
      "id": "PDS-A22-SCENARIO-OUTCOME-BATCH-3-DRAIN",
      "status": "done",
      "title": "Drain remaining qScenario outcome-projection stragglers"
    },
    {
      "number": 23,
      "id": "PDS-A23-CHARACTER-PACKAGE-WITNESS-FEASIBILITY",
      "status": "done",
      "title": "Decide whether the witness protocol should extend to character-package MBT"
    },
    {
      "number": 24,
      "id": "PDS-A24-CHARACTER-PACKAGE-MBT-CLEANUP-LANE",
      "status": "deferred",
      "title": "Open the character-package MBT cleanup lane after Lane C ownership resolves"
    },
    {
      "number": 25,
      "id": "PDS-A25-STAT-BLOCK-WITNESS-PROTOCOL-DRAIN",
      "status": "ready-for-research",
      "title": "Migrate the stat-block action ordering witness to WitnessProtocol"
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
`packages/character-sheet-runtime` — other lanes own them. The exception is
A23's research-only feasibility audit, which may inspect character-package MBT
files but must not edit Lane C-owned implementation files unless a later plan
adds an explicit cross-lane dependency.

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
  - **Scenario-outcome straggler:** a battle-runtime `*.mbt.qnt` matching
    `rg -l 'qScenario(Result|InvalidReason)' packages/battle-runtime --glob '*.mbt.qnt'`.
    These are not the old mutable protocol storage banned by
    A16; they are outcome projection labels that need a separate decision
    before migration.

## Verification

Every implementation task must include:

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

Planning-only tasks (A17, A18, A19, A23) do not run MBT unless they edit
executable driver or witness files. They still run `git diff --check`, and
they must record the commands or source reads that justify the planning
decision.

## DAG / Queue Order

|   # | Task                                          | Status   | Depends on                                                                                                         | Notes                                                                                                                                                                                                                                                              |
| --: | --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | PDS-A01-DRIVER-KIT-TRACER                     | done     | none                                                                                                               | Light research: kit API shape vs quint-connect exports (`transformITFValue`, ITF schemas, picks).                                                                                                                                                                  |
|   2 | PDS-A02-KIT-PILOTS                            | done     | PDS-A01-DRIVER-KIT-TRACER                                                                                          | Proves the kit on all driver shapes; merges `battle-runtime-mbt-fixtures.ts`.                                                                                                                                                                                      |
|   3 | PDS-A03-WITNESS-PROTOCOL-TRACER               | done     | PDS-A02-KIT-PILOTS                                                                                                 | Unblocks Lane B (`BPK-B04+`). Includes the quint 0.31.0 parameterized-type REPL check.                                                                                                                                                                             |
|   4 | PDS-A04-KIT-BATCH-1                           | done     | PDS-A03-WITNESS-PROTOCOL-TRACER                                                                                    | Self-discovering; ≤20 drivers.                                                                                                                                                                                                                                     |
|   5 | PDS-A05-KIT-BATCH-2                           | done     | PDS-A04-KIT-BATCH-1                                                                                                | Self-discovering; ≤20 drivers.                                                                                                                                                                                                                                     |
|   6 | PDS-A06-KIT-BATCH-3                           | done     | PDS-A05-KIT-BATCH-2                                                                                                |                                                                                                                                                                                                                                                                    |
|   7 | PDS-A07-KIT-BATCH-4                           | done     | PDS-A06-KIT-BATCH-3                                                                                                |                                                                                                                                                                                                                                                                    |
|   8 | PDS-A08-KIT-BATCH-5                           | done     | PDS-A07-KIT-BATCH-4                                                                                                | Drains the kit-unmigrated set.                                                                                                                                                                                                                                     |
|   9 | PDS-A09-KIT-GATE-AND-CLOSEOUT                 | deferred | PDS-A08-KIT-BATCH-5                                                                                                | Owner intervention 2026-06-11: repeated attempts showed the PRD/03 20% line-footprint target was missed by the completed kit batches and is not a prerequisite for prd/04 witness-protocol work. Revive only with explicit extraction scope or revised acceptance. |
|  10 | PDS-A10-WITNESS-PILOTS                        | done     | PDS-A08-KIT-BATCH-5                                                                                                | Trace-cost timing note and pilot line-delta report. Does not depend on PDS-A09 or the PRD/03 20% line-footprint metric.                                                                                                                                            |
|  11 | PDS-A11-WITNESS-BATCH-1                       | done     | PDS-A10-WITNESS-PILOTS                                                                                             | Self-discovering; ≤20 pairs; `MBT_TRACES=3` confidence pass per batch.                                                                                                                                                                                             |
|  12 | PDS-A12-WITNESS-BATCH-2                       | done     | PDS-A11-WITNESS-BATCH-1                                                                                            |                                                                                                                                                                                                                                                                    |
|  13 | PDS-A13-WITNESS-BATCH-3                       | done     | PDS-A12-WITNESS-BATCH-2                                                                                            |                                                                                                                                                                                                                                                                    |
|  14 | PDS-A14-WITNESS-BATCH-4                       | done     | PDS-A13-WITNESS-BATCH-3                                                                                            |                                                                                                                                                                                                                                                                    |
|  15 | PDS-A15-WITNESS-BATCH-5                       | done     | PDS-A14-WITNESS-BATCH-4                                                                                            | Drains the protocol-unmigrated set.                                                                                                                                                                                                                                |
|  16 | PDS-A16-WITNESS-GATE-AND-CLOSEOUT             | done     | PDS-A15-WITNESS-BATCH-5                                                                                            | Convention gate, ADR addendum, README skeleton, prd/04 closeout.                                                                                                                                                                                                   |
|  17 | PDS-A17-LITERAL-CAPTURE-PRD                   | done     | PDS-A10-WITNESS-PILOTS                                                                                             | HITL: owner reviews the PRD. Single-owner obligations only; multi-owner rows wait for BPK-B08.                                                                                                                                                                     |
|  18 | PDS-A18-RECURSIVE-NEXT-BATCH                  | done     | PDS-A16-WITNESS-GATE-AND-CLOSEOUT                                                                                  | Recursive audit found concrete follow-up work; Lane A is not drained.                                                                                                                                                                                              |
|  19 | PDS-A19-SCENARIO-OUTCOME-AUDIT                | done     | PDS-A18-RECURSIVE-NEXT-BATCH                                                                                       | All 60 `qScenario*` files are typed-outcome migration candidates; no string kept-label set. See `plans/SCENARIO_OUTCOME_AUDIT.md`.                                                                                                                                 |
|  20 | PDS-A20-SCENARIO-OUTCOME-BATCH-1              | done     | PDS-A19-SCENARIO-OUTCOME-AUDIT                                                                                     | First <=20 scenario-outcome stragglers, using the typed local-outcome shape in `plans/SCENARIO_OUTCOME_AUDIT.md`.                                                                                                                                                  |
|  21 | PDS-A21-SCENARIO-OUTCOME-BATCH-2              | done     | PDS-A20-SCENARIO-OUTCOME-BATCH-1                                                                                   | Next ≤20 scenario-outcome stragglers.                                                                                                                                                                                                                              |
|  22 | PDS-A22-SCENARIO-OUTCOME-BATCH-3-DRAIN        | done     | PDS-A21-SCENARIO-OUTCOME-BATCH-2                                                                                   | Final scenario-outcome stragglers; assert the discovery command is empty or that the kept-label set is documented.                                                                                                                                                 |
|  23 | PDS-A23-CHARACTER-PACKAGE-WITNESS-FEASIBILITY | done     | PDS-A18-RECURSIVE-NEXT-BATCH                                                                                       | Research-only stretch decision for the 24 non-battle MBT witness/driver pairs named by prd/03 and prd/04. See `plans/CHARACTER_PACKAGE_WITNESS_FEASIBILITY.md`.                                                                                                    |
|  24 | PDS-A24-CHARACTER-PACKAGE-MBT-CLEANUP-LANE    | deferred | PDS-A23-CHARACTER-PACKAGE-WITNESS-FEASIBILITY + Lane C ownership resolution for `packages/character-sheet-runtime` | Deferred follow-up opened by Task 23. Create the separate character-package MBT cleanup lane from `plans/CHARACTER_PACKAGE_WITNESS_FEASIBILITY.md`; do not edit character-sheet-runtime before the Lane C dependency lands.                                        |
|  25 | PDS-A25-STAT-BLOCK-WITNESS-PROTOCOL-DRAIN     | ready-for-research | PDS-A22-SCENARIO-OUTCOME-BATCH-3-DRAIN                                                                              | Migrate the remaining battle-runtime `qLastResult: str` / `qHoles` stat-block action ordering witness so the closure checker can be a green global gate again.                                                                                                      |

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

Status: `done` · Mode: AFK

Input: the protocol-unmigrated discovery rule applied at task start.

Output: the next ≤20 witness/driver pairs migrated to record state + step
helpers; enumerated literal-action families that are pure input sampling
collapsed to picks actions, or annotated with the one-line reason they stay
enumerated (prd/04 acceptance rule).

Acceptance: focused MBT green (`MBT_TRACES=1`) plus one `MBT_TRACES=3`
confidence pass; closure checker green, allowlist unchanged.

### Task 14 - PDS-A14-WITNESS-BATCH-4

Status: `done` · Mode: AFK

Input: the protocol-unmigrated discovery rule applied at task start.

Output: the next ≤20 witness/driver pairs migrated to record state + step
helpers; enumerated literal-action families that are pure input sampling
collapsed to picks actions, or annotated with the one-line reason they stay
enumerated (prd/04 acceptance rule).

Acceptance: focused MBT green (`MBT_TRACES=1`) plus one `MBT_TRACES=3`
confidence pass; closure checker green, allowlist unchanged.

### Task 15 - PDS-A15-WITNESS-BATCH-5

Status: `done` · Mode: AFK

Input: the protocol-unmigrated discovery rule applied at task start.

Output: the final protocol-unmigrated witness/driver batch migrated to record
state + step helpers; enumerated literal-action families that are pure input
sampling collapsed to picks actions, or annotated with the one-line reason
they stay enumerated (prd/04 acceptance rule).

Acceptance: focused MBT green (`MBT_TRACES=1`) plus one `MBT_TRACES=3`
confidence pass; closure checker green, allowlist unchanged; `grep -l 'var
qLastResult: str' *.mbt.qnt` is empty.

### Task 16 - PDS-A16-WITNESS-GATE-AND-CLOSEOUT

Status: `done` · Mode: AFK

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

Status: `done` · Mode: HITL (owner reviews the resulting PRD)

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

Status: `done` · Mode: AFK

Output: if witness/driver stragglers or follow-ups accumulated (e.g. the
remaining `qScenario*` projection strings recorded in the prd/04 closeout or
the character-package witnesses noted as stretch in prd/03/04), append a new
batch of tasks to this lane; otherwise mark the lane drained in
`plans/RALPH_QUINT_FIRST_WAVE.md`.

Result: Lane A is **not drained**. The old battle-runtime string protocol
storage is drained (`rg -l 'var qLastResult: str' packages/battle-runtime
--glob '*.mbt.qnt'` returns no files), but prd/04's separate closeout debt
remains: `rg -l 'qScenario(Result|InvalidReason)' packages/battle-runtime
--glob '*.mbt.qnt'` reports 60 battle-runtime witness files with scenario
outcome projection labels. The character-package stretch surface also remains
real: 9 character-creation, 11 character-sheet, and 4 character-battle MBT
drivers/witnesses still use package-local decoding and `qLastResult: str`.

### Task 19 - PDS-A19-SCENARIO-OUTCOME-AUDIT

Status: `done` · Mode: AFK

Input: prd/04 closeout, ADR-0001 addendum, and the current result of
`rg -l 'qScenario(Result|InvalidReason)' packages/battle-runtime --glob
'*.mbt.qnt'`.

Output: a short checked-in audit note or plan update classifying all 60
scenario-outcome files as either:

- typed scenario-outcome migration candidates; or
- explicit driver projection labels that should remain strings because their
  domain vocabulary is local to one witness and not protocol storage.

Acceptance: the audit chooses one migration shape for A20-A22, names the
self-discovery command those batches must use, and records whether a quality
gate should be added after the drain. No MBT is required unless this task edits
executable witnesses or drivers.

Result: `plans/SCENARIO_OUTCOME_AUDIT.md` classifies all 60 discovered
`qScenarioResult` / `qScenarioInvalidReason` witnesses as typed
scenario-outcome migration candidates and records no kept string projection
labels. A20-A22 should use local QNT variants or derive pure protocol outcomes
from `WitnessProtocol`, remove the `qScenario*` names, and add the post-drain
gate in A22.

### Task 20 - PDS-A20-SCENARIO-OUTCOME-BATCH-1

Status: `done` · Mode: AFK

Input: `plans/SCENARIO_OUTCOME_AUDIT.md` and the first ≤20 alphabetical files
from the A19 discovery command.

Output: the first batch of battle-runtime scenario-outcome projection
stragglers migrated or explicitly annotated according to A19. Paired drivers
must keep projected fields and assertions semantically unchanged.

Acceptance: focused MBT green for exactly the touched driver files
(`MBT_TRACES=1`); closure checker green; `git diff --check` green; batch
line-delta and remaining discovery count reported.

### Task 21 - PDS-A21-SCENARIO-OUTCOME-BATCH-2

Status: `done` · Mode: AFK

Input: the next ≤20 alphabetical files from the A19 discovery command after
A20 lands.

Output: second batch of scenario-outcome projection stragglers migrated or
annotated according to A19, with paired driver semantics preserved.

Acceptance: focused MBT green for exactly the touched driver files
(`MBT_TRACES=1`); closure checker green; `git diff --check` green; batch
line-delta and remaining discovery count reported.

### Task 22 - PDS-A22-SCENARIO-OUTCOME-BATCH-3-DRAIN

Status: `done` · Mode: AFK

Input: the remaining scenario-outcome projection stragglers after A21 lands.

Output: final scenario-outcome batch migrated or annotated according to A19.
If A19 selected a hard migration, add or update the appropriate quality gate;
if A19 selected an explicit kept-label set, record that set where future
reviewers will find it.

Acceptance: focused MBT green for exactly the touched driver files
(`MBT_TRACES=1`) plus one `MBT_TRACES=3` confidence pass over the final batch;
closure checker green; `git diff --check` green; discovery command returns
zero files or only the documented kept-label set.

Result: scenario-outcome projection labels are drained from battle-runtime MBT
witnesses, and the post-drain quality gate now rejects
`qScenarioResult` / `qScenarioInvalidReason`. The pre-existing
`battle-runtime-stat-block-action-ordering.mbt.qnt` protocol witness still
keeps the global closure checker red; PDS-A25 owns that remaining gate debt.

### Task 23 - PDS-A23-CHARACTER-PACKAGE-WITNESS-FEASIBILITY

Status: `done` · Mode: AFK

Input: prd/03's stretch note for non-battle drivers, prd/04's witness-outside
battle-runtime note, and the 24 current non-battle MBT witness/driver pairs in
`packages/character-creation-runtime`, `packages/character-sheet-runtime`, and
`packages/character-battle-runtime`.

Output: a feasibility decision that either:

- keeps the battle-runtime kit/protocol package-local and opens a separate
  future lane for character-package MBT cleanup; or
- proposes a shared test-support extraction with concrete file ownership,
  package boundaries, and verification commands.

Acceptance: no runtime behavior changes; no MBT required unless executable
files are edited. The output must respect Lane C ownership of
`packages/character-sheet-runtime` by either avoiding edits there or naming the
cross-lane dependency that must land first.

### Task 24 - PDS-A24-CHARACTER-PACKAGE-MBT-CLEANUP-LANE

Status: `deferred` · Mode: HITL

Input: `plans/CHARACTER_PACKAGE_WITNESS_FEASIBILITY.md`, Lane C's ownership
state for `packages/character-sheet-runtime`, and the 24 current character
package MBT witness/driver pairs across `packages/character-creation-runtime`,
`packages/character-sheet-runtime`, and `packages/character-battle-runtime`.

Output: a separate character-package MBT cleanup lane or PRD that owns the
post-Lane-C migration path for package-local typed witness protocols and any
later domain-neutral TS test-support extraction. The lane must keep the
battle-runtime kit/protocol package-local unless it deliberately opens a
shared-support extraction with concrete package boundaries and verification
commands.

Acceptance: deferred until Lane C either lands its `character-sheet-runtime`
ownership work or explicitly hands off that package. The new lane must keep
character-package witness cleanup separate from Lane A's battle-runtime
scenario-outcome batches, name the package-local QNT witness-protocol leaves or
state why they are not needed, and include verification commands for each
affected package. No executable character-package files are edited by this
placeholder task.

### Task 25 - PDS-A25-STAT-BLOCK-WITNESS-PROTOCOL-DRAIN

Status: `ready-for-research` · Mode: AFK

Input: `battle-runtime-stat-block-action-ordering.mbt.qnt`,
`src/stat-block-action-ordering.mbt.test.ts`, the A16 witness-protocol gate in
`scripts/check-mbt-driver-closure.cjs`, and the current closure-checker
failure for `var qLastResult: str` / `var qHoles`.

Output: migrate the stat-block action ordering witness from parallel mutable
`qLastResult: str` and `qHoles` variables to the package-local
`WitnessProtocol` record and helper constructors, updating the paired TS driver
decoder without changing the stat-block ordering stages, hole frontier, or
projected runtime assertions.

Acceptance: focused MBT green for
`src/stat-block-action-ordering.mbt.test.ts` (`MBT_TRACES=1`);
`node scripts/check-mbt-driver-closure.cjs` green; `git diff --check` green;
the discovery command returns zero files:

```bash
rg -l 'var qLastResult: str|var qHoles:' packages/battle-runtime --glob '*.mbt.qnt'
```
