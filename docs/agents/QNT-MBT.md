# QNT And Battle MBT Agent Rules

Read this document only when changing or running Quint proofs, focused QNT
specifications, or battle-runtime model-based tests. General repository rules
remain in [`AGENTS.md`](../../AGENTS.md).

## SRD And Runtime Parity

Battle behavior must remain aligned with the relevant focused battle-runtime
QNT slice, the rule-core slice it imports from
`packages/shared-algebras/proofs/rule-core/`, and its focused parity test.
Reusable mechanics belong in rule-core; focused battle slices own integration.

Do not change runtime behavior first and then reinterpret the model to match it.
Read the relevant local SRD 5.2.1 passage and `UBIQUITOUS_LANGUAGE.md`, update
the QNT authority, then update runtime behavior and the focused witness.

## Resource And Process Safety

All proof and battle MBT commands must hold the repository's shared heavy
verification lock for their entire run. Public proof and MBT package scripts do
this automatically. Run them directly. Run a direct Quint or filtered MBT
command through:

```sh
. scripts/resource-lock-owner.sh && \
  with_resource_lock_owner scripts/with-mbt-lock.sh <command>
```

Never nest the broad-workspace and MBT wrappers.

Battle MBT is scarce:

- do not run it to inspect shapes or formats;
- run only the focused MBT file for the completed behavior change;
- run one MBT process at a time;
- before starting, check for live `vitest` and orphan `quint_evaluator`
  processes;
- run it in the background with elapsed-time output and a one-minute progress
  reporter when the run is expected to exceed a minute;
- after a failure, reproduce with the reported `QUINT_SEED` before changing
  code.

Once a failing trace exists, prefer a focused TypeScript replay test, offline
ITF inspection, and source tracing over regenerating the trace.

If a seed is unusually slow, try a fresh seed before narrowing a model domain.
If narrowing is necessary, preserve the domain-correct range in a comment and
document why verification uses a smaller bound.

If a command exits 137 or is killed by SIGKILL, follow the emergency procedure
in the root agent instructions. A partial run is not verification.

## QNT Proof Lane

Package-local `run` blocks are opt-in and must not be folded into the default
test lane. Use the owning package's public `test:qnt-proofs` script. The proof
harness discovers modules containing `run` blocks, applies a per-module timeout,
and emits `QNT_PROOF_EVENT` progress events on stderr. Treat those events as the
authoritative progress signal.

Run the proof lane before merging proof or specification changes.

## MBT Driver Closure

The evaluator instantiates a simulated spec's full transitive import closure for
every trace. A simulated `*.mbt.qnt` driver may import only small, pure leaf
modules containing types, tags, and pure facts. It must not import aggregation
or behavioral modules. `scripts/check-mbt-driver-closure.cjs` enforces the
closure budget in `pnpm quality`; shrink its allowlist rather than growing it.

Keep broadly imported type-vocabulary modules free of behavioral imports. Move
a shared type into a leaf module that both sides can import.

Choose driver shape deliberately:

- A literal projection witness asserts deterministic SRD outcomes as literal
  facts and is preferred for deterministic scenarios.
- A computed-oracle driver imports the owning reducer only when mutable state
  genuinely determines the expected projection. Do not turn it into a witness
  by reimplementing the reducer in the driver.

## Quint And ITF Gotchas

- `size` is reserved; use `creatureSize` for parameters.
- Integer `/` truncates toward zero rather than flooring.
- Cross-file imports require a `from` clause.
- Multiple run-block assertions use `all { assert(x), assert(y) }`.
- Use `quint test --match "pattern"` for per-test output.
- Rebuild the Rust evaluator with `./scripts/build-quint-evaluator.sh` after an
  `EPIPE` caused by a GLIBC mismatch or after `pnpm install` replaces it.
- A fresh worktree without a primed `.quint-cache` can report `QNT404`; reproduce
  in the main checkout before classifying it as a regression.
- `nondet` must have bare `oneOf()` or `apalache::generate` as its outermost
  expression.
- Apalache needs `var.in(Set)` before record-field access. Do not enumerate
  record sets for wide records with ten or more fields.
- The Rust backend reports a composite action name for a bare action in a
  `match` arm. Wrap single-action arms in `any { action, }` for leaf tracking.
- Parameterized ITF variants have `{ tag, value }` shape; read `value` rather
  than the first object value.

## MBT Coverage

`MBT_TRACES` controls the number of generated random walks. `MBT_MAX_SAMPLES`
is an invariant-search budget and does not increase MBT trace count.
