# Forest of QNT slices, no single top, sibling language harnesses

The engine is QNT-verified via MBT parity and the long-term goal is generating implementations in multiple language targets from one Quint source. A whole-battle Quint model is infeasible: the `creature x turn x effect x hole x fill` cross-product explodes the MBT state space, as the deleted root monoliths demonstrated at scale. Therefore the QNT corpus is structured as a forest of small composite slices that `import` shared atomic rule files, each slice with its own bounded MBT trace generator (state minimal, variability pushed into per-action `nondet`/fills). Composition across slices lives at the production reducer (command dispatch) and at one bounded-fixture-world integration MBT that witnesses cross-slice sequencing (never a generation input). Each language-target implementation is an independent MBT harness against the same Quint source via that language's `quint-connect` equivalent; harnesses do not call each other.

## Considered options

- **Monolithic whole-battle QNT** — rejected; the deleted root monoliths were exactly that path at scale, and the explosion is documented in CLAUDE.md (Apalache record-set enumeration becomes infeasible for large records; MBT trace generation slows under branch count).
- **Cross-language harness coupling (one harness driving multiple language implementations via FFI)** — rejected; entangles language targets, breaks linear scaling for adding new languages, adds plumbing nobody needs.

## Consequences

- "100% QNT coverage" is exhaustive for atomic + composite + per-Unit-identity tiers and *bounded-fixture* for cross-slice sequencing; the combinatorial whole-battle space is deliberately out of scope.
- Implementation completeness per language target is enforced by three orthogonal CI gates: the obligation registry (no slice forgotten), per-slice MBT parity (each handler matches its QNT), and language-level exhaustive dispatch (every command variant has a handler at compile time).
- Adding a new language target = adding its harness + per-slice drivers; no QNT changes, no changes to other languages' code.

## Refinement (2026-05): the dominant per-trace cost is import-closure instantiation

Empirical follow-up sharpened the "infeasible whole-battle model" rationale above. The MBT slowdown is **not** primarily state-space size, branch count, or step depth — a self-contained slice with 26 vars and 42 `nondet` branches simulates 50 steps × 200 samples in ~3.3s. The dominant cost is that the Quint evaluator **re-instantiates a simulated spec's entire transitive `import` closure on every generated trace**. Importing a barrel/aggregation or a behavioural rule module therefore taxes every trace, regardless of how little the driver uses from it. (The "MBT trace generation slows under branch count" note under Considered Options is secondary to this closure cost.)

Evidence: an _unused_ `import battle-runtime-model` took a 0.6s spec to 85s; a driver importing the full battle-runtime closure ran ~100× slower than an equivalent (larger) one importing only leaf modules; a 0-var type barrel that imported two behavioural bridges for four enums made all ~84 of its importers pay the bridges' 30-file closure until those enums were moved to leaves.

This yields three enforceable rules, consistent with "state minimal, composition at the reducer" above:

- **Simulated `*.mbt.qnt` drivers import leaves only** — small pure modules of types/tags and `pure def` facts, never a barrel or a behavioural rule module. Enforced by `scripts/check-mbt-driver-closure.cjs` (transitive import file-count ≤ 8), run in `pnpm quality`.
- **Type-vocabulary modules stay free of behavioural imports.** A widely-imported type module (e.g. `battle-runtime-model`) must source any type it needs from a leaf shared with the behaviour, never by importing the behaviour itself.
- **Prefer literal projection witnesses over computed-oracle drivers.** A deterministic scenario should assert its SRD outcome as literal facts (self-contained, fast). Import the rule reducer to _derive_ the projection only when it genuinely depends on mutable state the reducer computes; never reimplement the rule inside the witness to avoid the import — that duplicates rule logic and weakens parity.

## Addendum (2026-06-11): typed witness protocol and picks

Battle-runtime MBT witnesses use `packages/battle-runtime/battle-runtime-witness-protocol.qnt` for their replay protocol state. The leaf defines `WitnessResult`, `WitnessInvalidReason`, and `WitnessProtocol[h]` plus pure helper constructors such as `witnessInit`, `witnessNeedsHoles`, `witnessResolved`, and `witnessInvalid`. Witnesses keep procedure-specific facts in their local state record, but protocol result and holes live in the typed protocol record instead of the pre-protocol mutable names `qLastResult: str`, `qLastInvalidReason: str`, or `qHoles`.

The decision rule for Quint picks is:

- use picks for input sampling, such as die results, slot levels, or other table facts whose sampled value is forwarded to the production driver;
- keep separate actions for different procedure paths, such as discovery, fill, rejection, interrupt, or resume steps.

Literal witnesses still state their expected outcomes in Quint. A conditional literal keyed by a picked value is acceptable because the value travels in the trace; importing a reducer or reimplementing one inside the witness is still reserved for genuine computed-oracle drivers.

`scripts/check-mbt-driver-closure.cjs`, run by `pnpm quality`, enforces both the import-closure budget and the absence of those legacy mutable witness-protocol names in battle-runtime witnesses. It does not type all scenario outcome projection labels; remaining `qScenarioResult`-style domain strings are separate projection facts and need their own future migration if they should become variants.
