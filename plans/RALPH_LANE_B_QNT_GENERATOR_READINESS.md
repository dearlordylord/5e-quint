# Ralph Lane B: QNT Generator Readiness Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "QNTGR-B01-SELF-TRANSFORMATION-ASSESS",
      "status": "done",
      "title": "Assess self-transformation generator readiness"
    },
    {
      "number": 2,
      "id": "QNTGR-B02-MIRROR-IMAGE-ASSESS",
      "status": "done",
      "title": "Assess Mirror Image generator readiness"
    },
    {
      "number": 3,
      "id": "QNTGR-B03-MINIMAL-ATTACK-ASSESS",
      "status": "done",
      "title": "Assess minimal attack generator readiness"
    },
    {
      "number": 4,
      "id": "QNTGR-B04-CREATION-SLICE-RUN-BLOCK-SPLIT",
      "status": "done",
      "title": "Split character creation slice run blocks"
    },
    {
      "number": 5,
      "id": "QNTGR-B05-CREATION-FILL-BATCH-ASSESS",
      "status": "done",
      "title": "Assess creation fill-batch slice replay readiness"
    },
    {
      "number": 6,
      "id": "QNTGR-B06-CREATION-CHOICE-CARDINALITY-ASSESS",
      "status": "done",
      "title": "Assess creation choice discovery cardinality readiness"
    },
    {
      "number": 7,
      "id": "QNTGR-B07-GENERATOR-READINESS-REPORT-REFRESH",
      "status": "done",
      "title": "Refresh generator readiness reports"
    },
    {
      "number": 8,
      "id": "QNTGR-B08-NOT-ASSESSED-ZERO-GATE",
      "status": "done",
      "title": "Add or verify zero not-assessed gate"
    },
    {
      "number": 9,
      "id": "QNTGR-B09-GENERATOR-SUBSET-VOCAB-AUDIT",
      "status": "done",
      "title": "Audit generator subset vocabulary for new rows"
    },
    {
      "number": 10,
      "id": "QNTGR-B10-QNT-OWNER-ROLE-AUDIT",
      "status": "done",
      "title": "Audit QNT owner roles for assessed rows"
    },
    {
      "number": 11,
      "id": "QNTGR-B11-RUST-DRY-RUN-NEXT-VERTICAL",
      "status": "done",
      "title": "Plan or prototype next Rust dry-run vertical"
    },
    {
      "number": 12,
      "id": "QNTGR-B12-COMPOSITE-SLICE-CANDIDATES",
      "status": "done",
      "title": "Mine next composite slice candidates"
    },
    {
      "number": 13,
      "id": "QNTGR-B13-RUN-BLOCK-SCANNER-HARDENING",
      "status": "done",
      "title": "Harden run-block scanner expectations"
    },
    {
      "number": 14,
      "id": "QNTGR-B14-QNT-PROGRAM-ROLLUP-UPDATE",
      "status": "done",
      "title": "Update QNT coverage program rollup"
    },
    {
      "number": 15,
      "id": "QNTGR-B15-GENERATOR-CLOSURE-CLOSEOUT",
      "status": "done",
      "title": "Close out generator readiness closure state"
    },
    {
      "number": 16,
      "id": "QNTGR-B16-RECURSIVE-NEXT-BATCH",
      "status": "done",
      "title": "Plan the next QNT deepening batch if this lane drains"
    }
  ]
}
-->

This Ralph lane for QNT generator-readiness deepening is closed. Its first
target was the five `not-assessed` rows in
`plans/rules-kernel-coverage/generator-readiness.jsonl`; the checked readiness
queue now has zero missing or `not-assessed` rows.

## Context Budget

Read only these by default:

- `plans/QNT_COVERAGE_PROGRAM.md`
- `plans/rules-kernel-coverage/README.md`
- `plans/rules-kernel-coverage/generator-readiness.jsonl`
- `plans/rules-kernel-coverage/qnt-owner-roles.jsonl`
- `plans/rules-kernel-coverage/kernel-ir-boundaries.jsonl`
- The exact QNT owner files named by the current task

Do not read deleted historical Ralph lane plans. Do not start from broad
generated JSON unless a task explicitly requires it. For source code, prefer
the current QNT owner and its TS mirror or parity test.

## Lane Rules

- Before starting each task, verify the task base:
  `git log --oneline -1 master`, `git log --oneline -1 HEAD`, and
  `git merge-base --is-ancestor <declared-base-sha> HEAD`.
- Keep semantic-core QNT owners generator-facing: type declarations, pure defs,
  pure vals, imports, and admitted expression forms only. Move examples,
  fixtures, and `run` blocks to proof-only or test owners unless the row is
  deliberately classified with a checked blocker.
- Do not invent generated runtime state. Generator readiness targets existing
  kernel IR boundaries and existing TS runtime state.
- Runtime code must not dispatch on authored identity. SRD names may appear in
  content, tests, and evidence boundaries only.
- Run the reviewer loop until convergence: RAW traceability when rules behavior
  changes, ubiquitous-language/domain language, architecture/connascence, and
  code review.

## Verification

Every task must run the narrowest relevant checks, and at minimum for readiness
row changes:

- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- Focused QNT/parity tests named by the changed owner where available
- `node scripts/rules-kernel-coverage-check.cjs --self-test` when checker logic
  changes
- `git diff --check`

## Tasks

### Task 1 - QNTGR-B01-SELF-TRANSFORMATION-ASSESS - Assess self-transformation generator readiness

Status: `done`

Input: `BATTLE.SPELL.SELF_TRANSFORMATION_MODE`,
`packages/battle-runtime/battle-runtime-self-transformation.qnt`, owner-role
rows, and relevant profile-obligation rows.

Output: classify the generator-readiness row as `generation-subset-clean` with
exact `semanticCore`, `proofOnly`, and `generatorSubset`, or add precise
checked blockers. Do not change behavior unless classification exposes a real
owner mismatch.

Acceptance: no `not-assessed` row remains for self-transformation.

### Task 2 - QNTGR-B02-MIRROR-IMAGE-ASSESS - Assess Mirror Image generator readiness

Status: `done`

Input: `BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION`,
`packages/battle-runtime/battle-runtime-mirror-image.qnt`, owner-role rows,
and parity witness rows.

Output: classify the generator-readiness row with exact semantic/proof owners
and generator subset, or concrete blockers.

Acceptance: no `not-assessed` row remains for Mirror Image.

### Task 3 - QNTGR-B03-MINIMAL-ATTACK-ASSESS - Assess minimal attack generator readiness

Status: `done`

Input: `BATTLE.ATTACK.MINIMAL_RESOLUTION`,
`packages/battle-runtime/creature-attack.qnt`, `creature-attack.mbt.qnt`, and
the TS mirror.

Output: classify the generator-readiness row. If the composite slice has
fixture-only material mixed into semantic core, split or block precisely.

Acceptance: no `not-assessed` row remains for minimal attack.

### Task 4 - QNTGR-B04-CREATION-SLICE-RUN-BLOCK-SPLIT - Split character creation slice run blocks

Status: `done`

Input: `packages/character-creation-runtime/character-creation-runtime-slice.qnt`
and REPORT run-block findings.

Output: move or classify the listed `run` blocks so semantic-core readiness can
be assessed. Prefer proof-only/test extraction over leaving a blocker, unless
the bounded replay is genuinely inseparable.

Acceptance: REPORT no longer lists unexplained run-block coupling for the two
creation obligations.

### Task 5 - QNTGR-B05-CREATION-FILL-BATCH-ASSESS - Assess creation fill-batch slice replay readiness

Status: `done`

Input: `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY`,
character creation slice QNT, owner-role rows, and current run-block outcome.

Output: classify generator readiness with exact semantic/proof owners,
generator subset, and blockers if any.

Acceptance: no `not-assessed` row remains for fill-batch slice replay.

### Task 6 - QNTGR-B06-CREATION-CHOICE-CARDINALITY-ASSESS - Assess creation choice discovery cardinality readiness

Status: `done`

Input: `CREATION.CHOICE_DISCOVERY_CARDINALITY`,
character creation slice QNT, owner-role rows, and current run-block outcome.

Output: classify generator readiness with exact semantic/proof owners,
generator subset, and blockers if any.

Acceptance: no `not-assessed` row remains for choice discovery cardinality.

### Task 7 - QNTGR-B07-GENERATOR-READINESS-REPORT-REFRESH - Refresh generator readiness reports

Status: `done`

Input: results from Tasks 1-6.

Output: regenerated `matrix.json` and `REPORT.md`.

Acceptance: generated report shows zero stale `not-assessed` rows, or exact
remaining blocker rows.

### Task 8 - QNTGR-B08-NOT-ASSESSED-ZERO-GATE - Add or verify zero not-assessed gate

Status: `done`

Input: checker logic and self-tests.

Output: if absent, add a self-test/checker assertion that scoped covered
semantic-core obligations cannot silently remain `not-assessed`. If already
present, document the existing executable gate and add missing regression only
if needed.

Acceptance: a fixture with an omitted or not-assessed covered semantic-core
row fails in self-test.

### Task 9 - QNTGR-B09-GENERATOR-SUBSET-VOCAB-AUDIT - Audit generator subset vocabulary for new rows

Status: `done`

Input: generator subset vocabulary and all rows touched by this lane.

Output: remove accidental vocabulary drift, over-broad constructs, or missing
constructs. Do not use unchecked free-text blocker or subset names.

Acceptance: checker green and new rows use only documented vocabulary.

### Task 10 - QNTGR-B10-QNT-OWNER-ROLE-AUDIT - Audit QNT owner roles for assessed rows

Status: `done`

Input: `qnt-owner-roles.jsonl` and owners touched by this lane.

Output: confirm every semantic/proof owner is classified once and consistently.

Acceptance: no assessed row relies on an owner whose role is missing or wrong.

### Task 11 - QNTGR-B11-RUST-DRY-RUN-NEXT-VERTICAL - Plan or prototype next Rust dry-run vertical

Status: `done`

Input: current `HIT_POINT_DAMAGE_RUST_DRY_RUN.md` and generation-subset-clean
rows after Tasks 1-10.

Output: either a small next dry-run plan or a tiny prototype if one is clearly
safe. Prefer a row with simple state and existing TS mirror. Do not start broad
Rust generation.

Acceptance: next Rust vertical is concrete, bounded, and does not duplicate TS
runtime state.

### Task 12 - QNTGR-B12-COMPOSITE-SLICE-CANDIDATES - Mine next composite slice candidates

Status: `done`

Input: `QNT_COVERAGE_PROGRAM.md`, profile obligations, and readiness rows.

Output: 5-10 candidate composite slice tasks with precise inputs/outputs, if
real gaps remain. If not, record why the current composite slice layer is
closed enough for the next phase.

Result: `plans/rules-kernel-coverage/COMPOSITE_SLICE_CANDIDATES.md` records
the candidate queue and the current non-blocking gate status.

Acceptance: future Ralph work can start without rereading historical lanes.

### Task 13 - QNTGR-B13-RUN-BLOCK-SCANNER-HARDENING - Harden run-block scanner expectations

Status: `done`

Input: REPORT run-block section and checker scanner code.

Output: ensure the scanner reports actionable line references and does not
overreport proof-only owners.

Acceptance: scanner self-test covers semantic-core `run` block detection and
proof-only exemption.

### Task 14 - QNTGR-B14-QNT-PROGRAM-ROLLUP-UPDATE - Update QNT coverage program rollup

Status: `done`

Input: this lane's closure state and `plans/QNT_COVERAGE_PROGRAM.md`.

Output: update top-level program statuses only where the checked artifacts
justify it. Remove stale claims that reference old A/B lanes or obsolete
not-assessed work.

Acceptance: `QNT_COVERAGE_PROGRAM.md` points to current source-of-truth
artifacts and no deleted plan names.

### Task 15 - QNTGR-B15-GENERATOR-CLOSURE-CLOSEOUT - Close out generator readiness closure state

Status: `done`

Input: results from Tasks 1-14.

Output: concise closeout in generated or planning artifacts: count of
generation-subset-clean rows, blocker rows, and next generator/Rust step.

Acceptance: no one has to infer closure state from raw JSON alone.

### Task 16 - QNTGR-B16-RECURSIVE-NEXT-BATCH - Plan the next QNT deepening batch if this lane drains

Status: `done`

Input: current generated reports after Task 15.

Output: if generator readiness is closed, create the next QNT deepening lane
with 10-20 atomic tasks. If not closed, append exact repair tasks here instead
of ending the run.

Result: generator readiness is closed, so
`plans/RALPH_LANE_C_QNT_DEEPENING.md` is the next runnable lane. It contains
12 atomic tasks covering the Hit Point recovery manual Rust dry run, focused
composite-slice MBT promotion for the highest-value battle obligations, closeout,
and recursive follow-up planning.

Acceptance: Ralph must not end merely because the initial list is done. It
either leaves a closed lane with a clear next plan committed, or appends new
runnable tasks discovered from current checker artifacts.
