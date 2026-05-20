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
Unit support profile to rules-kernel semantic obligations. Obligation rows do
not duplicate their profile lists; generated reports derive those lists from
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

`generator-readiness.jsonl` records the separate C-axis question: whether a
covered obligation's QNT owner is shaped like generator-ready semantic core.
Rows must point to real obligation ids and any referenced dry-run artifact.
Rows must explicitly declare `semanticCore`, `proofOnly`, `generatorSubset`, and
`blockedBy`; omitted arrays are invalid because empty and unknown are different
states.

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
- **Generator readiness:** a per-obligation assessment of which QNT files are
  semantic core, which are proof-only, and what language subset a future
  QNT-to-Rust generator would need.

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
