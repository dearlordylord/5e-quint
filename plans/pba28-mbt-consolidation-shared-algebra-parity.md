# PBA28 Research Plan - MBT Consolidation And Shared Algebra Parity

Task: PBA28 - MBT Consolidation And Shared Algebra Parity

Status: draft research plan.

## Purpose

After PBA27 quarantines or deletes old Core proof artifacts, consolidate the
active promoted proof graph. The goal is to make reusable reducer facts live in
package-local shared algebra parity lanes instead of rebuilding old broad Core
MBT or widening integrated battle-runtime MBT beyond the behavior it is meant to
prove.

This task should not add MBT for authored Unit, Spell, or Stat Block breadth.
Authored-record coverage remains a deterministic contract-test problem unless a
record introduces a new reducer procedure family.

## Research Scope

- Inventory `@dnd/shared-algebras` modules and classify each as:
  - state-transition semantic algebra;
  - pure scalar/helper algebra;
  - Surface adapter or parser;
  - validation helper.
- For every state-transition semantic algebra, confirm the active parity lane:
  deterministic TS tests plus Quint MBT replay against the imported TS module,
  or a documented Quint invariant/proof when MBT would not add transition
  coverage.
- Start with existing stateful candidates:
  - `action-economy-algebra`;
  - `conditions-algebra`;
  - `death-saves-algebra`;
  - `initiative-algebra`;
  - `elapsed-time-algebra` if its boundary-crossing behavior remains shared
    reducer state;
  - `runtime-hole-algebra` only if stable hole identity/refill behavior has a
    transition surface worth replaying.
- Do not force MBT onto pure helpers such as validation wrappers or one-shot
  parse/projection helpers.
- Standardize package-local Quint/proof naming, vitest bridge placement, and
  package scripts in `@dnd/shared-algebras`.
- Update package docs so future plans know where shared reducer behavior is
  proved after Core deletion.
- Keep `@dnd/battle-runtime` integrated MBT selective for public replay flows
  where discovery, holes, reducer state, and snapshots interact.

## Expected Implementation Direction

- Add a shared-algebras MBT/proof inventory document or README section that
  names the proof owner for each algebra.
- Add or normalize package-local commands for deterministic tests and selected
  Quint proof/MBT runs.
- Prefer small algebra state spaces with finite fixture domains. Do not import
  broad Surface catalogs into shared algebra MBT unless the algebra itself
  intentionally speaks Surface vocabulary.
- Make Quint the oracle for expected state. Do not generate expected Quint facts
  from TypeScript runtime output.
- If an algebra currently has a Quint invariant but no TS replay, decide whether
  the invariant is enough or whether a small Quint-connect bridge should compare
  the imported TS module against the model.
- If implementing MBT uncovers duplicated runtime/algebra logic, move the
  canonical transition into `@dnd/shared-algebras` and update consumers rather
  than adding adapters or parallel state.

## Verification

- RAW/UL check: confirm no new D&D rule behavior is modeled without reading the
  relevant `.references/srd-5.2.1/` passage and `UBIQUITOUS_LANGUAGE.md`.
- `pnpm --filter @dnd/shared-algebras typecheck`
- `pnpm --filter @dnd/shared-algebras test`
- Run the package-local shared-algebras Quint proof/MBT commands introduced or
  normalized by this task.
- `rg -n "packages/core|@dnd/core|battle-projection\\.mbt|creature\\.mbt|battle-machine\\.mbt" packages/shared-algebras packages/battle-runtime package.json turbo.json -S`
- Confirm battle-runtime docs still describe integrated MBT as selective and
  shared reducer algebras as modular proof owners.
- No legacy Core MBT as a gate.
- No broad battle MBT unless this task intentionally changes a promoted
  integrated battle-runtime MBT slice.
- `/simplify` convergence, minimum two rounds.
