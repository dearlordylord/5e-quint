# Forest of QNT slices, no single top, sibling language harnesses

The engine is QNT-verified via MBT parity and the long-term goal is generating implementations in multiple language targets from one Quint source. A whole-battle Quint model is infeasible — the `creature × turn × effect × hole × fill` cross-product explodes the MBT state space, as `creature.qnt` (307KB) and `battle.qnt` (211KB) already demonstrate at scale. Therefore the QNT corpus is structured as a forest of small composite slices that `import` shared atomic rule files, each slice with its own bounded MBT trace generator (state minimal, variability pushed into per-action `nondet`/fills). Composition across slices lives at the production reducer (command dispatch) and at one bounded-fixture-world integration MBT that witnesses cross-slice sequencing (never a generation input). Each language-target implementation is an independent MBT harness against the same Quint source via that language's `quint-connect` equivalent; harnesses do not call each other.

## Considered options

- **Monolithic whole-battle QNT** — rejected; `battle.qnt`/`creature.qnt` are exactly that path at scale, and the explosion is documented in CLAUDE.md (Apalache record-set enumeration becomes infeasible for large records; MBT trace generation slows under branch count).
- **Cross-language harness coupling (one harness driving multiple language implementations via FFI)** — rejected; entangles language targets, breaks linear scaling for adding new languages, adds plumbing nobody needs.

## Consequences

- "100% QNT coverage" is exhaustive for atomic + composite + per-Unit-identity tiers and *bounded-fixture* for cross-slice sequencing; the combinatorial whole-battle space is deliberately out of scope.
- Implementation completeness per language target is enforced by three orthogonal CI gates: the obligation registry (no slice forgotten), per-slice MBT parity (each handler matches its QNT), and language-level exhaustive dispatch (every command variant has a handler at compile time).
- Adding a new language target = adding its harness + per-slice drivers; no QNT changes, no changes to other languages' code.
