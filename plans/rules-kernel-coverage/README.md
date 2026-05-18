# Rules Kernel Coverage

This lane tracks QNT-connected coverage for the executable reducer kernel.

The B/C product goal is captured in
[`PRD_B_C_COVERAGE_AND_GENERATOR_READINESS.md`](PRD_B_C_COVERAGE_AND_GENERATOR_READINESS.md).

The denominator is **TS-current reducer semantics**: behavior that current
runtime reducers admit and execute today. Surface schema support, catalog
presence, display payloads, parser failure, and unsupported profile rows do not
enter the QNT denominator by themselves.

## Coverage Chain

A supported reducer feature is covered only when the full chain exists:

```text
Surface record
  -> deterministic admission/projection evidence
  -> support profile
  -> semantic obligation id
  -> QNT owner
  -> executable TS parity witness
```

QNT owns reducer semantics. Deterministic Surface coverage owns concrete catalog
enumeration and display payload width. Focused MBT or deterministic QNT replay
connects the QNT oracle to current TS behavior.

## Terms

- **Semantic obligation:** a stable id for one reducer-owned rule fact. The id
  is the measurement unit; this lane is not code coverage.
- **Support profile:** the typed runtime procedure shape admitted from Surface.
  Multiple Surface records can map to one profile.
- **Parity witness:** an executable TS test that runs production runtime code and
  compares a QNT-owned projection.
- **Boundary-only:** parser/client/session/protocol behavior that does not
  change legal table-observable game state.

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
3. Add QNT owner/procedure/profile before the runtime change.
4. Add focused MBT, deterministic QNT replay, or QNT-generated projection
   witness against production TS while TS remains the implementation.
5. Implement the reducer against the modeled shape.
6. Add deterministic Surface admission/projection evidence when Surface records
   reach the profile.
7. Run `pnpm rules-kernel-coverage:check` and the relevant witness test.

## Anti-Explosion Rule

Do not model `Surface record x battle state x character build x target x dice x
reaction x effect` as one state space.

Model reusable procedure shapes and shallow composition contracts. Surface
catalog breadth remains deterministic admission/projection coverage. Integrated
MBT remains selective and high-risk.
