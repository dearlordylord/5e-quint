# Plan: QMBT7 Specific Unit Parity MBT Deep Vertical

> Source PRD: [01_UNIT_PROFILE_PARITY_MBT.md](/workspace/typescript/dnd/prd/01_UNIT_PROFILE_PARITY_MBT.md)

## Architectural Decisions

Durable decisions that apply across all phases:

- **Task shape**: QMBT7 is a methodology tracer, not the full Specific Unit
  Parity expansion.
- **Verification split**: Procedure Parity MBT proves supported behavior
  shapes; Specific Unit Parity MBT proves selected authored identities.
- **QNT boundary**: QNT stays profile/scenario based and must not enumerate all
  authored Surface Units.
- **Matrix ownership**: `plans/unit-profile-coverage/` owns concrete Unit
  identity, profile claims, unsupported/widening dispositions, generated
  matrix, and generated report.
- **Runtime boundary**: Specific Unit parity must exercise production
  battle-runtime reducer entrypoints or production modules consumed by those
  reducers.
- **Coverage rule**: every executable supported Unit should receive
  deterministic admission/projection coverage; MBT by identity is reserved for
  representative or high-risk Units.
- **Expansion rule**: QMBT8+ tasks should be created only after QMBT7 records
  what the tracer teaches about denominators, ownership comments, and test
  placement.

---

## Phase 1: Methodology Contract

**User stories**: 1, 3, 4, 5, 7, 10

### What To Build

Define the exact coverage states and acceptance terms for Specific Unit Parity:
deterministic admission/projection coverage, selected identity MBT coverage,
profile-level Procedure Parity coverage, and matrix closure disposition. The
contract should say how those states appear in the matrix artifacts without
turning the matrix into a runtime registry.

### Acceptance Criteria

- [x] The plan defines what counts as deterministic admission/projection
      coverage for an executable supported Unit.
- [x] The plan defines what counts as Specific Unit Parity MBT coverage.
- [x] The matrix/report can distinguish profile parity from selected identity
      parity.
- [x] QMBT7 explicitly remains a tracer; later expansion task boundaries are
      deferred until tracer learnings are recorded.
- [x] No QNT file is required to enumerate authored Unit ids.

### Phase 1 Notes

Specific Unit Parity evidence lives in
`plans/unit-profile-coverage/unit-evidence.jsonl`. Evidence rows cite concrete
Unit ids and owner artifacts, while profile ids are derived from
`unit-claims.jsonl`; this keeps profile classification single-source.

Deterministic admission/projection coverage means a focused catalog/runtime
test loads the authored Unit through the production Unit catalog and proves the
production support or feature-projection boundary admits it. Selected identity
MBT coverage means a focused MBT fixture binds a concrete authored Unit id into
production runtime entrypoints and compares QCORE-observable projections.

The supported Unit denominator is the set of `supported-profile` claims in the
matrix. Unsupported and widening rows remain explicit closure dispositions.
QMBT7 remains a methodology tracer until Phase 4 records expansion boundaries
for QMBT8+.

---

## Phase 2: Deterministic Admission Tracer

**User stories**: 2, 3, 6, 8, 10

### What To Build

Add the first deterministic catalog/projection test path for executable
supported Unit claims. The tracer should bind a small feature-profile slice
from the current matrix, prove those authored Unit ids are admitted through the
production support boundary, and make the result visible in the matrix evidence
model.

Initial candidate identities:

- `fighter_second_wind`
- `barbarian_reckless_attack`
- `rogue_evasion`

These are good tracer candidates because they were just backfilled from
QCORE9/QMBT4 evidence and cover healing, ongoing/attack-roll state, and
save-damage replacement profiles.

### Acceptance Criteria

- [x] The tracer uses real authored Unit ids from the matrix.
- [x] The test verifies production admission/projection behavior, not copied
      expected behavior in a parallel registry.
- [x] The matrix has a durable way to cite deterministic admission/projection
      evidence.
- [x] Unsupported or widening Units remain explicit closure dispositions rather
      than hidden omissions.
- [x] `pnpm unit-profile-coverage:check` passes after evidence wiring.

---

## Phase 3: Selected Identity MBT Tracer

**User stories**: 5, 7, 8, 9

### What To Build

Add one selective Specific Unit Parity MBT path for a high-value identity from
the deterministic tracer. The MBT should bind the concrete Unit id into a
production battle-runtime fixture and compare scalar QCORE-observable
projections. It should reuse Procedure Parity vocabulary where that vocabulary
is genuinely shared, but it should not force a catch-all helper layer.

### Acceptance Criteria

- [x] The MBT fixture uses a concrete authored Unit id from the matrix.
- [x] The MBT replay goes through production runtime entrypoints.
- [x] The QNT side remains a bounded procedure/scenario spec, not a Unit
      catalog loop.
- [x] The matrix/report can cite the selected identity MBT evidence separately
      from profile-level Procedure Parity evidence.
- [x] The focused MBT run follows the standard timed MBT protocol.

### Phase 3 Notes

QMBT7 uses `fighter_second_wind` as the selected identity tracer because the
existing focused feature MBT already binds that concrete authored Unit id into
production runtime discovery and resolution paths. The QNT side remains the
bounded QCORE9 feature procedure scenario, not a Unit catalog enumeration.

---

## Phase 4: Learnings and Expansion Plan

**User stories**: 4, 8, 9, 10

### What To Build

Close QMBT7 by recording what the tracer taught about coverage denominators,
test placement, reusable projection vocabulary, and profile-risk selection.
Only then add QMBT8+ expansion tasks to `ACTIVE_PLAN`.

### Acceptance Criteria

- [x] QMBT7 closeout states whether Specific Unit Parity should expand by
      feature profiles, spell profiles, stat-block identity, or another
      matrix-derived grouping.
- [x] The report or plan defines the percentage denominator for future identity
      coverage.
- [x] Any reusable helpers introduced by QMBT7 are justified by repeated
      projection vocabulary, not by speculative generalization.
- [x] `ACTIVE_PLAN.md` contains follow-on tasks only after the tracer learnings
      justify their boundaries.

### Phase 4 Notes

Expansion should proceed by matrix-derived supported Unit identities, grouped
first by Unit feature profiles and then by spell profiles. The deterministic
admission/projection denominator is supported Unit claims, currently 17 Units.
Selected identity MBT uses the same denominator for reporting but should remain
selective: add identities where the authored Unit shape is representative or
high-risk, not one random-walk fixture for every Unit.

QMBT7 introduced one durable matrix concept, `unit-evidence.jsonl`, because
both deterministic admission/projection evidence and selected identity MBT
evidence need the same Unit-id-to-owner citation shape. No runtime helper layer
was added; the deterministic test calls existing production catalog and feature
projection entrypoints directly.

Follow-on boundaries:

- QMBT8: expand deterministic admission/projection evidence for the remaining
  supported Unit feature identities before widening into spells.
- QMBT9: expand selected identity MBT evidence selectively from matrix risk,
  starting with feature identities that have production reducer state changes.
- Before broad all-Unit expansion, split or otherwise modularize the
  unit-profile checker/report pipeline so authored catalog discovery, claim
  validation, evidence validation, metrics, and report rendering do not all
  evolve inside one catch-all script.

## Verification

- [x] RAW/source check for any newly modeled behavior. If QMBT7 only wires
      evidence for already-modeled behavior, cite existing QCORE/QMBT RAW
      anchors rather than rereading unrelated SRD text.
- [x] Matrix check: `pnpm unit-profile-coverage:check`.
- [x] Package typecheck for touched runtime test packages.
- [x] Focused deterministic tests for admission/projection coverage.
- [x] Focused MBT only after behavior/evidence wiring is complete and only with
      the required timed MBT protocol.
- [x] No broad battle MBT for matrix-only edits.
- [x] `/simplify` convergence after implementation phases, minimum two rounds
      for nontrivial changes.

### Simplification Notes

- Round 1 localized evidence-tag literals in the checker so validation,
  metrics, and report rendering share one tag definition.
- Round 2 localized repeated Unit ids in the deterministic admission test and
  then addressed reviewer findings by making Unit identity evidence executable
  through owner-local `UNIT-IDENTITY-EVIDENCE` markers while removing duplicate
  QMBT7 profile/task claims.
- Round 3 addressed second-pass reviewer feedback by making owner-local Unit
  identity evidence markers bidirectional with `unit-evidence.jsonl`; no
  further important simplification issues remained. Task ids intentionally are
  not foreign-keyed to `ACTIVE_PLAN.md`, because that file is an active queue
  and completed tasks may be cleaned up.
