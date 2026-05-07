# Unit Profile Coverage

This directory is the content/profile coverage layer for authored Surface Units.
It is intentionally separate from `plans/raw-coverage/`, which tracks coverage
of SRD rules text spans.

The Unit profile matrix answers which authored Units instantiate supported
mechanics profiles, which installed Units are explicitly unsupported or need
widening, which authored Surface Units are not yet admitted to the Unit catalog,
and which QNT/runtime/verification owners cover each supported profile.

## Collection Boundaries

`srd-5.2.1` is the shipped SRD Surface Unit collection. Its records must carry
only SRD 5.2.1 provenance and Creative Commons SRD distribution policy.

`classic-2024-non-srd-mechanics` is the public renamed mechanics-only lane for
Classic 2024 mechanics that are not already covered by the SRD collection. SRD
5.2.1 is conceptually part of Classic, but it is stored separately because it
has clean SRD provenance and distribution terms. The combined Classic library is
a derived view:

```text
classic2024UnitLibrary =
  srd521UnitCollection
  + classic2024NonSrdMechanicsUnitCollection
```

The derived view is never authored directly.

## Claim Convention

Owner artifacts use a separate claim prefix from RAW coverage:

```text
<claim-prefix> <claim-kind> <profile-id> [<profile-id> ...]
```

where `<claim-prefix>` is `UNIT-PROFILE-COVERAGE:`.

Supported claim kinds are `qnt-owner`, `runtime-owner`,
`verification-owner:qnt-proof`, `verification-owner:focused-mbt`,
and `verification-owner:runtime-test`.

`unit-evidence.jsonl` records concrete Unit identity evidence. The evidence row
does not restate profile ids; the checker derives those from `unit-claims.jsonl`
so profile classification stays single-source. Evidence owners must also carry
a matching marker:

```text
UNIT-IDENTITY-EVIDENCE marker fields:
<evidence-tag> <task-id> <unit-id> [<unit-id> ...]
```

Selected identity MBT evidence also requires owner-local replay markers:

```text
UNIT-IDENTITY-MBT-REPLAY marker fields:
<task-id> <unit-id> <driver-action> [<driver-action> ...]
```

The checker treats these replay markers as the executable witness for
`selected-identity-mbt`: every selected evidence row must name at least one MBT
driver action for that Unit id, every replay action must be declared in the
same file's `driverSchema`, every replay action must be reachable from the
Quint `step` action passed to that fixture's `run()` call, and each replay
action's driver body must bind the claimed Unit id at an explicit Unit-bearing
runtime boundary directly or through a local helper. Replay markers are
bidirectional with `unit-evidence.jsonl`. If a driver action name changes, falls
out of the executable Quint action set, or stops binding the claimed Unit id,
the marker must change with it or the coverage check fails.

Current evidence tags are:

- `deterministic-admission-projection`: a focused catalog/runtime test loads the
  authored Unit through the production Unit catalog and proves the production
  support/projection boundary admits it.
- `selected-identity-mbt`: a focused MBT fixture binds a concrete authored Unit
  id into production runtime entrypoints, names the identity-bearing driver
  replay actions with `UNIT-IDENTITY-MBT-REPLAY`, and compares
  QCORE-observable projections.

## Classic Non-SRD Authoring Lane

Classic non-SRD mechanics-only records may preserve exact mechanics facts:
level gates, prerequisites, action economy, resource cadence, dice, numbers,
conditions, durations, target shapes, and execution relationships.

This is the public surrogate lane for private PHB/XPHB mechanics pressure:
PHB/XPHB source identity must not appear in shipped ids, labels, names,
descriptions, or prose; only structured mechanics may be preserved, under
mushroom/fungi synthetic ids and labels.

They must not include protected expression: canonical names, descriptions,
flavor text, examples, rules prose, unique phrasing, table presentation,
artwork/lore labels, or avoidable copyrighted naming taxonomy. Human labels and
ids must use the stable mushroom/fungi synthetic namespace. The label is
decorative; matching and coverage use structured fields.

The checker rejects SRD provenance in the Classic non-SRD collection, duplicate
Unit ids across collections, missing fungi-themed synthetic labels, protected
expression fields, and near-canonical ids/labels from its deny list.

## Coverage Flows

The coverage lane intentionally spans several ownership layers, but the work
does not always move through them in one direction.

For already-authored TypeScript content, the usual evidence flow is:

```text
authored Unit sources
  -> TypeScript catalog/support admission
  -> QNT Procedure Parity profiles
  -> focused QMBT Procedure Parity
  -> matrix profile/evidence accounting
  -> selective Specific Unit Parity MBT
```

For mechanics that are not implemented in TypeScript yet, the preferred
red/green flow can start from the matrix and QNT/MBT side:

```text
matrix gap or authored-source pressure
  -> QNT Procedure Parity profile
  -> focused Procedure Parity MBT expectation
  -> TypeScript catalog/support/runtime implementation
  -> deterministic admission/projection evidence
  -> selective Specific Unit Parity MBT when identity risk justifies it
```

Authored Unit sources currently include SRD-backed records in this repo,
public mechanics-only Classic fixtures, and private PHB/XPHB records outside
this repo. Private-source mechanics pressure must enter this repo only through
the public renamed Classic non-SRD lane, synthetic labels, matrix gaps, or
not-in-catalog admission gaps for records that are present but not installed.
Do not let private-source identity leak into shipped ids, labels, prose, or
provenance.

TypeScript catalog/support admission is one executable boundary, not the only
way work starts. An authored Unit may exist in `packages/surface/content/` but
still be absent from the installed Unit catalog, unsupported by battle-runtime
support gates, or not yet mapped to a stable profile. A matrix gap may also
exist before the TypeScript implementation. The matrix must keep those states
distinct instead of treating them as the same kind of missing work.

## Workflow

This matrix has two verification layers:

- **Procedure parity**: focused QMBT lanes prove structural QCORE profiles
  through production reducers. These are representative semantics tests for
  the profile, not a catalog loop over every authored Unit id.
- **Specific Unit parity**: Unit claims prove that each authored Unit id is
  classified into supported profiles or an explicit unsupported/widening
  disposition. Deterministic catalog/projection tests should cover supported
  Unit claims; focused MBT should be added only for representative or high-risk
  Unit identities.

Deterministic admission/projection coverage counts supported Unit ids with
`unit-evidence.jsonl` evidence tagged `deterministic-admission-projection`.
Selected identity MBT coverage counts supported Unit ids with evidence tagged
`selected-identity-mbt`. Both denominators are the supported Unit claims in
this matrix; unsupported and widening rows remain closure dispositions, not
test omissions.

Run:

```sh
pnpm unit-profile-coverage:check
```

The check command keeps `scripts/unit-profile-coverage-check.cjs` as the CLI
orchestrator and splits the matrix pipeline into owned modules:
`unit-profile-coverage-discovery.cjs` for installed/authored Unit discovery,
`unit-profile-coverage-claim-scan.cjs` for owner marker scanning,
`unit-profile-coverage-validation.cjs` for claim/evidence gates,
`unit-profile-coverage-report.cjs` for matrix metrics and Markdown rendering,
and `unit-profile-coverage-config.cjs` for shared coverage vocabulary. Add new
rules to the module that owns that boundary instead of growing the CLI script.

When intentionally changing claims or installed collection inventory, regenerate
the matrix and report with:

```sh
node scripts/unit-profile-coverage-check.cjs --write
```

New Unit authoring tasks must add or update `unit-claims.jsonl`. New QCORE work
that proves Unit-facing mechanics must cite profile ids. New QMBT work that
adds runtime parity must cite the same profile ids.

The generated matrix also audits every authored Unit-shaped JSON record under
`packages/surface/content/`. Records that are not installed through
`packages/surface/src/surface/unit-catalog.ts` are retained in the matrix with
`catalogAdmission.status = "not-in-unit-catalog"` so the gap between authored
content and shipped catalog inventory is explicit.
