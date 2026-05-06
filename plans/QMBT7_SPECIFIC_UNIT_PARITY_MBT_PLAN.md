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

- [ ] The plan defines what counts as deterministic admission/projection
      coverage for an executable supported Unit.
- [ ] The plan defines what counts as Specific Unit Parity MBT coverage.
- [ ] The matrix/report can distinguish profile parity from selected identity
      parity.
- [ ] QMBT7 explicitly remains a tracer; later expansion task boundaries are
      deferred until tracer learnings are recorded.
- [ ] No QNT file is required to enumerate authored Unit ids.

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

- [ ] The tracer uses real authored Unit ids from the matrix.
- [ ] The test verifies production admission/projection behavior, not copied
      expected behavior in a parallel registry.
- [ ] The matrix has a durable way to cite deterministic admission/projection
      evidence.
- [ ] Unsupported or widening Units remain explicit closure dispositions rather
      than hidden omissions.
- [ ] `pnpm unit-profile-coverage:check` passes after evidence wiring.

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

- [ ] The MBT fixture uses a concrete authored Unit id from the matrix.
- [ ] The MBT replay goes through production runtime entrypoints.
- [ ] The QNT side remains a bounded procedure/scenario spec, not a Unit
      catalog loop.
- [ ] The matrix/report can cite the selected identity MBT evidence separately
      from profile-level Procedure Parity evidence.
- [ ] The focused MBT run follows the standard timed MBT protocol.

---

## Phase 4: Learnings and Expansion Plan

**User stories**: 4, 8, 9, 10

### What To Build

Close QMBT7 by recording what the tracer taught about coverage denominators,
test placement, reusable projection vocabulary, and profile-risk selection.
Only then add QMBT8+ expansion tasks to `ACTIVE_PLAN`.

### Acceptance Criteria

- [ ] QMBT7 closeout states whether Specific Unit Parity should expand by
      feature profiles, spell profiles, stat-block identity, or another
      matrix-derived grouping.
- [ ] The report or plan defines the percentage denominator for future identity
      coverage.
- [ ] Any reusable helpers introduced by QMBT7 are justified by repeated
      projection vocabulary, not by speculative generalization.
- [ ] `ACTIVE_PLAN.md` contains follow-on tasks only after the tracer learnings
      justify their boundaries.

## Verification

- [ ] RAW/source check for any newly modeled behavior. If QMBT7 only wires
      evidence for already-modeled behavior, cite existing QCORE/QMBT RAW
      anchors rather than rereading unrelated SRD text.
- [ ] Matrix check: `pnpm unit-profile-coverage:check`.
- [ ] Package typecheck for touched runtime test packages.
- [ ] Focused deterministic tests for admission/projection coverage.
- [ ] Focused MBT only after behavior/evidence wiring is complete and only with
      the required timed MBT protocol.
- [ ] No broad battle MBT for matrix-only edits.
- [ ] `/simplify` convergence after implementation phases, minimum two rounds
      for nontrivial changes.
