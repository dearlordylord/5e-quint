# PRD: Unit Profile Coverage and Specific Unit Parity MBT

Date: 2026-05-06

Status: Draft

Owner: Rule-core / battle-runtime architecture

## Problem Statement

The project now has promoted QCORE proofs and focused QMBT runtime parity for
core procedure families, but that does not answer a separate product question:
which authored Surface Units are covered by those procedure shapes?

QNT intentionally models reusable rule procedures, not a catalog of authored
Unit ids. That keeps the state space tractable, but it leaves a gap unless the
TypeScript side owns a second coverage layer:

- every shipped Unit must be classified as supported, unsupported, needing
  Surface widening, needing an assumption, or closed by assumption;
- supported Units must point to stable mechanics profiles;
- supported profiles must point to QNT owners, runtime owners, and verification
  owners;
- runtime parity must not accidentally mean "we tested one fixture and forgot
  the rest of the authored catalog";
- future feature work needs a red/green way to choose the next missing profile.

Without this layer, the project risks two bad outcomes:

- QNT grows into catalog enumeration and state-space explosion;
- authored Units stay trackable in a planning matrix but never prove they are
  actually admitted by production runtime paths.

## Solution

Keep the architecture split into two verification layers.

**Procedure Parity MBT** proves behavior shapes. Existing focused QMBT lanes
compare QCORE-observable projections against production reducers for bounded
procedure profiles. They do not enumerate authored Units.

**Specific Unit Parity MBT** proves selected authored identities. It binds
concrete Unit ids from the Unit profile matrix into production runtime fixtures
and compares the same scalar projections used by Procedure Parity MBT. This is
selective: representative and high-risk Units get MBT by identity.

Every executable Unit should receive deterministic matrix/projection/admission
coverage. MBT by identity is not required for every Unit.

The source artifacts for implementation detail are:

- [plans/unit-profile-coverage/README.md](/workspace/typescript/dnd/plans/unit-profile-coverage/README.md)
- [plans/unit-profile-coverage/UNIT_REPORT.md](/workspace/typescript/dnd/plans/unit-profile-coverage/UNIT_REPORT.md)
- [plans/UNIT_PROFILE_COVERAGE_MATRIX_PLAN.md](/workspace/typescript/dnd/plans/UNIT_PROFILE_COVERAGE_MATRIX_PLAN.md)
- [plans/QMBT1_QMBT5_PRE_RESEARCH.md](/workspace/typescript/dnd/plans/QMBT1_QMBT5_PRE_RESEARCH.md)
- [plans/ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md)

The durable coverage lane spans these ownership layers, but the work can move
through them in either direction depending on what already exists.

For already-authored TypeScript content, the usual evidence flow is:

```text
authored Unit sources
  -> TypeScript catalog/support admission
  -> QNT Procedure Parity profiles
  -> focused QMBT Procedure Parity
  -> matrix profile/evidence accounting
  -> selective Specific Unit Parity MBT
```

For not-yet-implemented mechanics, the preferred red/green flow may start from
matrix pressure and QNT/MBT before TypeScript implementation:

```text
matrix gap or authored-source pressure
  -> QNT Procedure Parity profile
  -> focused Procedure Parity MBT expectation
  -> TypeScript catalog/support/runtime implementation
  -> deterministic admission/projection evidence
  -> selective Specific Unit Parity MBT when identity risk justifies it
```

Authored Unit sources are not all the same boundary. SRD-backed Unit records
live in this repo. Private PHB/XPHB pressure lives outside this repo and must
only surface here through public mechanics-only Classic non-SRD records,
synthetic labels, matrix gaps, or not-in-catalog admission gaps for records
that exist in this repo but are not installed. Provenance, structured input,
and runtime projection remain separate throughout the flow.

## User Stories

1. As a rule-core maintainer, I want QNT to prove procedure shapes without
   authored Unit enumeration, so that proofs stay tractable.
2. As a runtime maintainer, I want each supported Unit profile to cite runtime
   owners, so that profile support is executable rather than merely documented.
3. As a Surface author, I want every shipped Unit to have a profile claim or an
   explicit closure disposition, so that unsupported work is visible.
4. As a planner, I want unsupported Units grouped by future owner and profile
   pressure, so that the next implementation slice is measurable.
5. As a reviewer, I want QMBT task claims to cite profile ids, so that "runtime
   parity" has a concrete scope.
6. As a tester, I want deterministic projection/admission tests to cover every
   executable Unit, so that broad catalog regressions are cheap to catch.
7. As a tester, I want MBT by concrete Unit id only for representative or
   high-risk Units, so that MBT remains useful without becoming a catalog loop.
8. As a feature implementer, I want the matrix to support red/green work from a
   missing profile to QNT, runtime support, deterministic admission, and
   selective MBT evidence.
9. As a maintainer, I want Procedure Parity MBT and Specific Unit Parity MBT to
   share projection vocabulary where it is genuinely shared, so that tests
   compose without forcing a catch-all helper layer.
10. As a project owner, I want profile coverage percentages to be measurable,
    so that "how much is done" and "which is next" are answerable.

## Implementation Decisions

- Procedure Parity MBT and Specific Unit Parity MBT are distinct concepts.
- Existing QMBT2-QMBT6 lanes are Procedure Parity MBT.
- The Unit profile matrix owns concrete authored Unit identity coverage.
- QNT must not enumerate all Units or import authored Surface records.
- Supported profiles must be narrow, domain-named mechanics profiles rather
  than vague buckets.
- A supported executable profile must have QNT owner evidence when it claims
  rule-core semantics.
- A completed runtime parity claim must have focused MBT or runtime-test owner
  evidence.
- Every executable Unit must have deterministic matrix/projection/admission
  coverage before it is considered covered as authored content.
- Specific Unit Parity MBT should be chosen from risk, profile pressure, and
  representative identity value.
- Matrix-only edits must not require broad battle MBT.
- Matrix gaps can lead implementation for not-yet-implemented mechanics; the
  matrix is not only a retrospective report over TypeScript support.
- Classic non-SRD mechanics-only Units remain separate from SRD Units at the
  collection boundary; the combined Classic library is a derived view.
- Provenance, structured input, and runtime projection remain separate concepts.
- The unit-profile checker/report pipeline must stay modular enough to add all
  authored Units without turning one script or one generated report section into
  the only place where every matrix concern changes.

## Testing Decisions

- The Unit profile checker is the fast gate for matrix shape, owner claims,
  profile references, collection boundaries, expression gates, and generated
  reports.
- Deterministic runtime tests should cover broad Unit admission and projection
  from authored Surface records into supported runtime profiles.
- Focused MBT should cover behavior through production reducer entrypoints and
  compare scalar QCORE-observable projections, not full runtime state.
- Specific Unit Parity MBT should reuse focused projection vocabulary where it
  naturally matches existing QMBT lanes.
- MBT runs are reserved for completed behavior changes or selected identity
  parity slices. They are not used for exploratory matrix edits.
- Existing Procedure Parity prior art is QMBT2-QMBT6.

## Out of Scope

- Enumerating every authored Unit in QNT.
- Running MBT for every shipped Unit id.
- Duplicating Surface Unit mechanics into QNT fixtures.
- Making the Unit profile matrix a runtime registry.
- Treating unsupported profile rows as runtime behavior.
- Mixing SRD and Classic non-SRD provenance in one authored collection.
- Solving every unsupported Unit profile in the first Specific Unit Parity
  slice.
- Broad battle MBT as a matrix verification gate.

## Further Notes

Current matrix status after QMBT26's recursive planning review:

- 50 authored Units classified in the installed coverage collections.
- 15 stable executable profiles.
- 17 of 36 installed executable Units mapped to supported profiles.
- all executable supported profiles currently have QNT modeling, QNT proof,
  runtime mapping, and runtime parity evidence.
- deterministic admission/projection evidence covers all 17 supported Unit
  identities, including the QMBT21 Classic non-SRD mechanics-only
  `mycelium_step` row, QMBT22 `shield`, and QMBT25 `healing_word`.
- selected identity MBT covers 9 of 17 supported Unit identities. QMBT16
  explicitly decided not to add selected identity MBT for currently supported
  spell Units unless later evidence introduces identity-specific risk.
- authored Surface Unit catalog admission gaps are explicit in the generated
  report and matrix.
- `shield` is now counted as a supported `spell.reaction-shield` Unit with
  deterministic admission/projection evidence.
- `fire_bolt` is intentionally not counted as a supported spell Unit until
  object-targeting/object-ignition boundaries are represented or explicitly
  closed.
- `feat_archery` is the selected next SRD feature widening slice and remains
  authored not-in-catalog pressure until QMBT27 promotes
  `unit-feature.passive-ranged-attack-roll-bonus`.

QMBT26 appended QMBT27-QMBT30 rather than declaring the matrix lane complete.
The next batch promotes Archery's passive ranged attack-roll bonus, re-triages
spell admission candidates after Shield and Healing Word, selects the next SRD
feature-style widening slice after Archery, and then runs another recursive
planning review.
