# QCORE0 Composition Research

Date: 2026-05-06

## Decision

Use stateless Quint contract/procedure modules as the reusable rule-core unit.
Stateful modules may import those contracts, but stateful modules should be
entrypoints or shallow delegates, not reusable transitive building blocks.

The production rule-core split should be:

- contract modules: pure types, projection-shaped records, pure procedure
  functions, and pure legality predicates;
- fixture modules: small authored/projection facts for one procedure family;
- implementation/proof modules: one owned state machine for one procedure
  family, importing stateless contracts;
- shallow integration modules: compose a few already-proved procedures to check
  cross-procedure invariants;
- no broad battle module until the shallow modules show a bounded branch budget.

## Upstream Findings

- Quint docs say `init` and `step` define the model entrypoint, and other
  definitions do not matter unless reachable from them:
  <https://github.com/informalsystems/quint/blob/main/docs/content/docs/language-basics.mdx>
- The simulator is not a verifier; OK means it did not find a violation in the
  sampled executions:
  <https://github.com/informalsystems/quint/blob/main/docs/content/docs/simulator.mdx>
- The upstream module examples support stateless imports, qualified imports, and
  parameterized instances:
  <https://github.com/informalsystems/quint/blob/main/examples/language-features/imports.qnt>
  and
  <https://github.com/informalsystems/quint/blob/main/examples/language-features/importFrom.qnt>
- Existing examples instantiate one implementation with bounded constants for
  verification/simulation modules, e.g. Bakery:
  <https://github.com/informalsystems/quint/blob/main/examples/classic/distributed/Bakery/bakery.qnt>
- Upstream recommends putting properties near the model and keeping instances as
  the outer layer when verifier/name-resolution issues appear:
  <https://github.com/informalsystems/quint/issues/1800>
- `export` and deep/chained imports are not reliable enough for this plan:
  <https://github.com/informalsystems/quint/issues/1800> and
  <https://github.com/informalsystems/quint/issues/1715>
- Multiple stateful modules can collide because state variables do not fully
  respect module namespaces:
  <https://github.com/informalsystems/quint/issues/1294>
- State-space cost is multiplicative across `any` branches and `nondet` choices;
  upstream tracks static estimation as an open need:
  <https://github.com/informalsystems/quint/issues/1566>
- The simulator previously evaluated all `any` branches before choosing one;
  this was closed by PR 1582, but broad `any` still matters for verifier branch
  counts and older/local backend behavior:
  <https://github.com/informalsystems/quint/issues/1552>
- The simulator does not currently provide visited-state estimates:
  <https://github.com/informalsystems/quint/issues/1069>
- The flattener was changed to compile dependencies of the main module, but
  compile/verify flattening remains the risk surface for composed modules:
  <https://github.com/informalsystems/quint/issues/731>

## Historical Spike Artifact

The local spike files were added in commit `368d4e28` and later removed from
the active tree after the rule-core layout they informed had been promoted into
`packages/shared-algebras/proofs/rule-core/`. Use Git history for the raw spike
fixtures; this file keeps the decision record.

The POC proves the useful shape:

- authored facts are projection-shaped fixture values, not Surface mirrors;
- reusable procedure contracts are stateless and pure;
- implementation modules own their vars and transitions;
- shallow integrations compose pure contracts, not multiple stateful imports;
- a qualified unused stateful import does not pollute the runtime trace vars.

## Experiment Results

Tooling:

- Quint: `pnpm exec quint --version` -> `0.31.0`
- Simulator backend: `rust`
- Verifier backend: Apalache `0.51.1`, JDK 17 from
  `~/.local/java/jdk-17.0.18+8-jre/bin`

| Experiment | Command summary | Result |
| --- | --- | --- |
| Stateless damage contract | `quint typecheck` and `quint test` on the spike damage contract | Pass, ~1s |
| Stateless action contract | `quint typecheck` and `quint test` on the spike action contract | Pass, ~1s |
| Contract-only consumer | `quint run ... --max-samples=1000 --max-steps=6` | Pass, 65ms simulator time |
| Stateful implementation | `quint run ... --max-samples=1000 --max-steps=6` | Pass, 59ms simulator time |
| Stateful delegate consumer | `quint run ... --max-samples=1000 --max-steps=6` | Pass, 42ms simulator time |
| Unused qualified stateful import | `quint run ... --max-samples=1000 --max-steps=6` | Pass, 20ms simulator time |
| Shallow two-contract integration | `quint run ... --max-samples=1000 --max-steps=6` | Pass, 17ms simulator time |
| Shallow integration verifier | `quint verify ... --max-steps=3` | Pass, ~3s |
| Stateful delegate verifier | `quint verify ... --max-steps=3` | Pass, ~4s |
| Unused import verifier | `quint verify ... --max-steps=3` | Pass, ~4s |
| Narrow branch POC | `quint verify` on the spike blowup POC with `--step=composedNarrowStep --max-steps=2` | Pass, ~3s |
| Wide branch POC | `quint verify` on the spike blowup POC with `--step=composedWideStep --max-steps=2` | Pass, ~4s |
| Narrow set POC | `quint verify` on the spike blowup POC with `--step=narrowSetStep --max-steps=1` | Pass, ~3s |
| Wide set POC | `quint verify` on the spike blowup POC with `--step=wideSetStep --max-steps=1` | Pass, ~4s |

The unused qualified stateful import generated an ITF trace with only
`qCounter` as a state variable. That means the import is not enough to pollute
runtime trace state when its vars/actions are unreachable from `init`, `step`,
or `invariant`.

Verifier runs must be serialized. Running multiple `quint verify` commands in
parallel contended on the Apalache server port and produced failing command
statuses without useful model failures.

## Architecture Rules

Allowed:

- Import stateless contract modules freely when they contain only pure
  definitions and type aliases.
- Use `import Module.* from "./file"` for stateless contracts when unqualified
  names improve readability.
- Use qualified `import Module from "./file"` for stateful implementation
  modules.
- Let a shallow wrapper delegate to exactly one stateful module's `init`,
  `step`, and `invariant` when a package-local entrypoint needs that shape.
- Put properties in the same module as the state machine, or the immediate
  wrapper module, rather than exporting properties through chains.
- Keep broad authored facts as fixture records local to the procedure family.

Banned or high-risk:

- Deep import chains.
- `export` as a core composition mechanism.
- Importing multiple stateful modules with overlapping variable names.
- Reusable stateful contracts.
- Broad battle-level `any` over many procedure families.
- Relying on simulator OK as proof.
- Parallel Apalache verifier runs.

## Next Plan

Create QCORE1 as the first production layout task:

- create `packages/rule-core` or the agreed proof package layout;
- add the first stateless rule procedure contract with SRD-traced fixture facts;
- add one small implementation/proof machine that imports only that contract;
- add one shallow integration only if the first rule needs cross-procedure
  behavior;
- record branch budget beside each `any` action.
