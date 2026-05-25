# Rules Kernel Coverage

This lane tracks QNT-connected coverage for the executable reducer kernel.
It does not own authored-content breadth. `plans/unit-profile-coverage/` owns
which Surface Units are admitted, supported, unsupported, widening, or outside a
strict level scope. This lane owns the reducer-semantic obligations underneath
those supported profiles.

The B/C product goal is captured in
[`PRD_B_C_COVERAGE_AND_GENERATOR_READINESS.md`](PRD_B_C_COVERAGE_AND_GENERATOR_READINESS.md).

The denominator is **TS-current reducer semantics**: behavior that current
runtime reducers admit and execute today. Surface schema support, catalog
presence, display payloads, parser failure, and unsupported profile rows do not
enter the QNT denominator by themselves.

## Coverage Chain

Rules-kernel obligations enter through one of two evidence paths.

Surface-backed profile obligations cover reducer semantics reached from authored
Surface Units:

```text
Surface record
  -> deterministic admission/projection evidence
  -> support profile
  -> semantic obligation id
  -> QNT owner
  -> executable TS parity witness
```

Direct reducer-entrypoint obligations cover reducer semantics that are not owned
by a Surface Unit profile:

```text
reducer entry point
  -> semantic obligation id
  -> QNT owner
  -> production TypeScript runtime owner
  -> executable TS parity witness
```

QNT owns reducer semantics. Deterministic Surface coverage owns concrete catalog
enumeration and display payload width. Focused random MBT, deterministic QNT
replay, or a profile-scoped runtime test connects the modeled obligation to
current TS behavior according to the witness-mode rules below.

`profile-obligations.jsonl` is the single source of truth for the join from a
Unit support profile to rules-kernel semantic obligations. A row either maps a
profile to one or more obligation ids or, for an intentionally open profile
join, names non-empty `followUpTaskIds` plus a `reason`. Obligation rows do not
duplicate their profile lists; generated reports derive those lists from
`profile-obligations.jsonl`.

`battle-hole-frontier.jsonl` is the single source of truth for the current
BattleHole/BattleFill frontier inventory. The checker parses
`packages/battle-runtime/src/battle-reducer.ts` and requires one
`battle-hole-family` row for every `BattleHole` union member and one
`battle-fill-kind` row for every `BattleFill` discriminant. Boundary/table-owned
rows must point at a non-semantic rules-kernel obligation; semantic rows must
point at a covered obligation or at the Ralph follow-up task that will add the
missing QNT/parity ownership. A semantic row may also point at a non-semantic
boundary obligation when the same hole or fill carries caller/table facts, but
that boundary coverage never substitutes for reducer-semantic ownership.

`generator-readiness.jsonl` records the separate C-axis question defined in
[Generator Readiness Source Of Truth](#generator-readiness-source-of-truth).
Generated reports summarize those rows but are not the source of truth.
The Ralph Lane A closeout summary is
[`GENERATOR_READINESS_CLOSURE_REPORT.md`](GENERATOR_READINESS_CLOSURE_REPORT.md);
it links back to the checker-owned artifacts rather than replacing them.

`kernel-ir-boundaries.jsonl` records the future kernel IR boundary inventory.
It is descriptive C-lane evidence, not a new runtime abstraction. Each row names
one checked boundary kind, existing runtime boundary paths, related obligation
ids, and a concise evidence note. The checker requires exactly one row for each
listed boundary kind: command, fill, result, state, active-effect,
support-profile, resource, and handoff.

`qnt-owner-roles.jsonl` records the C-lane role classification for every QNT
owner path cited by a covered obligation. Rows classify only the owner path;
the obligation list for each owner is derived from `obligations.jsonl` so the
owner-to-obligation join has one source of truth. The checker fails if a
covered QNT owner is missing a role row, if a role row points at a non-owner,
or if a generator-readiness `semanticCore` path is classified as anything other
than `semantic-core`.

## Generator Readiness Source Of Truth

Generator readiness is a per-obligation C-lane assessment of whether a covered
obligation's QNT owner can act as a future implementation source. It does not
change B-lane coverage, does not prove additional TS parity, and does not imply
generated Rust exists.

For runnable Rust migration or generator-readiness queue selection, start from
`plans/QNT_COVERAGE_PROGRAM.md#rust--generator-readiness-entrypoints`. This
README owns the row contract and vocabulary; it is not a historical task queue.
Closed QNT/QMBT planning files redirect to that entrypoint because the durable
facts now live in checked JSONL artifacts and the active A/B Ralph plans.

`generator-readiness.jsonl` is obligation-centered. Each row must point to a
real obligation id and must explicitly declare `semanticCore`, `proofOnly`,
`generatorSubset`, and `blockedBy`; omitted arrays are invalid because empty and
unknown are different states. If present, `dryRun` points at a checked manual
dry-run artifact. The checker requires a row for every covered obligation with
at least one QNT owner role classified as `semantic-core`; use `not-assessed`
with empty arrays until the C-lane classification is known.

- `semanticCore`: QNT owner files intended to supply executable rule semantics
  for the obligation. Every path must also be declared by the obligation's QNT
  owner list.
- `proofOnly`: QNT files that support proof, induction, fixtures, or tests but
  are not intended as generator input for implementation semantics.
- `generatorSubset`: the observed QNT language constructs a future generator
  would need for the row. The subset vocabulary is checked as row data today and
  is intentionally refined by the C-lane generation-subset tasks.
- `blockedBy`: concrete blockers that prevent treating the row as
  generation-subset-clean. `fixture-bound` and `blocked` rows require at least
  one blocker; other statuses use an empty array for no known blockers. Omitted
  arrays are invalid.
- `followUpTaskIds`: optional Ralph or rules-kernel follow-up task ids that own
  blocker resolution. `fixture-bound` and `blocked` rows require at least one
  follow-up task id so blocker rows cannot leave future work untracked. Ralph
  task ids are checked against the active A/B lane plans in `plans/`.

`generatorSubset` and `blockedBy` values are checked vocabularies documented in
`scripts/rules-kernel-coverage-config.cjs`. Keep the token catalog there so
readiness row data, checker validation, and token descriptions change together.
Generation-subset tokens name observed QNT constructs such as records, record
updates, variants, pure definitions, local bindings, conditionals, pattern
matches, collection operators, and integer/Boolean expressions. Blocker tokens
name concrete generator-cleanliness blockers such as run-block coupling, MBT
harness coupling, proof-helper coupling, fixture-world coupling, bridge
projection coupling, selected-identity coupling, or an unsupported construct;
they are not migration history labels.

Checker-produced generator-readiness blocker findings must also declare their
token in `generatorReadinessScannerBlockers` in
`scripts/rules-kernel-coverage-config.cjs`. The checker fails if a scanner
blocker is not present in the documented blocker vocabulary, so adding a new
scanner blocker requires adding its catalog description in the same file.

Generator-readiness statuses are:

- `not-assessed`: the obligation has no C-lane classification claim yet.
- `semantic-core-candidate`: semantic-core files and their observed subset are
  identified, but the row is not yet certified generation-subset-clean.
- `generation-subset-clean`: semantic-core files are identified, the subset is
  recorded, and there are no known blockers for generation-subset cleanliness.
- `fixture-bound`: executable semantics are present, but fixture, run-test, proof,
  or bounded-world coupling prevents direct generator consumption until the
  listed blockers are resolved.
- `blocked`: the row has a concrete generator-readiness blocker and is not a
  semantic-core candidate in its current shape.

QNT owner roles are:

- `semantic-core`: the QNT owner supplies executable rule semantics for at
  least one covered obligation and may be used in `semanticCore` readiness
  rows.
- `proof-only`: the QNT owner supports proof or induction but is not an
  implementation source.
- `mbt-fixture`: the QNT owner is a replay or MBT fixture with bounded cases,
  trace variables, or harness actions.
- `bridge`: the QNT owner projects between semantic facts and a runtime or MBT
  bridge shape.
- `selected-identity-trace`: the QNT owner proves a concrete selected Unit or
  authored catalog identity reaches a runtime entrypoint; it is content
  evidence, not reusable reducer semantics.
- `legacy-reference`: the QNT owner is reference material for a non-active
  proof lane and is not a generator input.

## Terms

- **Semantic obligation:** a stable id for one reducer-owned rule fact. The id
  is the measurement unit; this lane is not code coverage.
- **Support profile:** the typed runtime procedure shape admitted from Surface.
  Multiple Surface records can map to one profile.
- **Parity witness:** an executable TS test that runs production runtime code and
  either compares a QNT-owned projection or, for a profile-specific lifecycle
  already carrying profile-level QNT proof, exercises the deterministic runtime
  reducer path named by that profile.
- **Boundary-only:** parser/client/session/protocol behavior that does not
  change legal table-observable game state.
- **Battle hole frontier:** the current set of battle reducer holes and fills
  where caller/table decisions, random results, or table facts enter reducer
  replay. Frontier classification is executable coverage metadata; it is not a
  replacement for QNT ownership of reducer semantics.
- **Generator readiness:** the C-lane assessment defined in
  [Generator Readiness Source Of Truth](#generator-readiness-source-of-truth).
- **Kernel IR boundary:** a future generator-facing reducer boundary already
  visible in runtime ownership. The inventory names boundaries and
  evidence paths only; it does not introduce parallel state or generated Rust.

## Statuses

- `covered`: QNT owner, production runtime owner, and parity witness are all
  present and marked in source.
- `needs-qnt-owner`: reducer semantics exist, but no QNT owner is recorded.
- `needs-parity-witness`: QNT ownership exists, but current TS is not connected
  by an executable witness.
- `needs-surface-evidence`: reducer semantics exist, but the Surface/profile
  join is not yet proved by deterministic evidence.
- `boundary-only`: intentionally outside QNT reducer semantics.
- `unsupported-by-admission`: Surface/catalog pressure is known, but current TS
  should reject it before reducer execution.

During bootstrap, transitional statuses are allowed so the baseline can be
audited. After closure, new reducer semantics should enter only as `covered`,
`boundary-only`, or `unsupported-by-admission`.

## Source Markers

The checker scans source files for:

```text
KERNEL-COVERAGE: qnt-owner OBLIGATION.ID
KERNEL-COVERAGE: runtime-owner OBLIGATION.ID
KERNEL-COVERAGE: parity-witness OBLIGATION.ID
KERNEL-COVERAGE: boundary-owner OBLIGATION.ID
```

Rows in `obligations.jsonl` reference those files. A `covered` row fails if any
declared source file lacks the corresponding marker.

## New Feature Flow

New reducer semantics are QNT-first:

1. Read RAW from `.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md`.
2. Add or extend semantic obligation rows.
3. Add QNT owner/procedure before the runtime change; add a profile mapping
   when the obligation is Surface-backed.
4. Add focused random MBT or deterministic QNT replay witness against production
   TS while TS remains the implementation. Use a profile-scoped `runtime-test`
   witness only when the profile ledger already records QNT proof ownership and
   the remaining evidence gap is the deterministic TS reducer path.
5. Implement the reducer against the modeled shape.
6. Add deterministic Surface admission/projection evidence when Surface records
   reach the profile.
7. Run `pnpm rules-kernel-coverage:check` and the relevant witness test.

## Parity Witness Modes

Rules-kernel parity witness rows use the checked witness-kind vocabulary
`focused-mbt`, `deterministic-qnt-replay`, and `runtime-test`. MCP scenario
evidence uses `mcp-scenario` in `plans/unit-profile-coverage/`; it is an
ultra-golden user-flow layer, not a rules-kernel parity witness.

The default witness for reducer procedures is focused MBT with random traces.
Use it for sequencing, holes, reactions, resources, active-effect lifecycle,
interleavings, and any behavior where branch interaction is the risk.

Deterministic QNT replay is a replay witness, not MBT coverage. It is
acceptable for fixed projection/scalar checks or tiny finite state-transition
fixtures where the goal is to compare a known QNT-owned projection against
production TS. It must still call `quint-connect` `run()` and `stateCheck()`,
but it must not be described as narrow, selected, or broad MBT coverage.

An index-gated replay such as `qReplayIndex` is not the general MBT
architecture. It may be used only when all of these are true:

- the obligation is small enough that the intended cases are explicitly named;
- the fixture is closed over those named cases and random exploration would add
  no sequencing or interleaving value;
- the replay does not stand in for sequencing or interleaving coverage;
- the obligation row records the witness as `deterministic-qnt-replay`;
- the witness records a non-empty `deterministicReplayRationale`;
- a future reviewer can tell why focused random MBT would be the wrong tool.

Branch rarity is not enough reason to use index-gating. If the case list grows,
if action ordering matters beyond the fixture, or if the runtime has meaningful
cross-step choices, promote the witness to focused MBT instead of copying the
index-gated pattern.

Selected Unit identity replay in `plans/unit-profile-coverage/` is a separate
content-evidence pattern: it proves concrete Unit ids bind to production
entrypoints and that the named actions are reachable from QNT. It does not
replace rules-kernel MBT for reusable reducer semantics.

Profile-scoped runtime-test witnesses are narrower than MBT. They may close a
single Surface-backed lifecycle obligation when the corresponding profile row
already records QNT proof ownership and deterministic runtime parity. They must
not be used for reusable sequencing, interleaving, or shared reducer semantics
where branch interaction is the risk.

## Anti-Explosion Rule

Do not model `Surface record x battle state x character build x target x dice x
reaction x effect` as one state space.

Model reusable procedure shapes and shallow composition contracts. Surface
catalog breadth remains deterministic admission/projection coverage. Integrated
MBT remains selective and high-risk.
