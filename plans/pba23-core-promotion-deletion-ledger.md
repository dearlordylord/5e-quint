# PBA23 Research Plan - Core Promotion Deletion Ledger

Task: PBA23 - Core Promotion Deletion Ledger

Status: draft research plan.

## Purpose

Create the deletion ledger that proves what still keeps `@dnd/core` alive and
which promoted package owns each replacement. This is broader than character
creation: Core includes character-domain helpers, app-facing character UI
contracts, XState battle/creature reducer code, root Quint specs, MBT bridges,
fixture data, and old proof-source material.

This is a source-only ledger task. It must not delete Core and must not change
promoted runtime behavior.

## Research Scope

- Inventory all production imports of `@dnd/core` and all package scripts or
  tests that assume `packages/core`.
- Treat `packages/app` as the main live external consumer unless a fresh import
  search finds more. Current evidence shows broad app imports plus
  `packages/app/package.json` and `packages/app/tsconfig.json`.
- Include scripts that import Core, especially generation scripts that write
  root Quint artifacts.
- Classify Core files by replacement owner:
  - `@dnd/surface` authored records/readers;
  - `@dnd/character-creation-runtime` draft, hole, fill, and build projection;
  - `@dnd/battle-runtime` battle reducer state, subjects, replay, snapshots;
  - `@dnd/mcp` composition/session/tool ownership;
  - `@dnd/app` UI workflows;
  - `@dnd/shared` or `@dnd/shared-algebras` reusable algebra.
- Separate legacy proof/restore sources from active promoted gates.
- Record behavior that is obsolete because it belongs to deleted projected
  vocabulary or old Core-only UI assumptions.
- Consume existing migration/restore material rather than superseding it,
  including `plans/CORRECTION_APPLICATION_MIGRATION_PLAN.md` and
  `plans/phase0-core-deletion-restore-audit.md`. Note any stale references in
  those documents instead of copying stale facts forward.

## Current Evidence

- `ARCHITECTURE.md` describes Core as the legacy/broad lane and promoted
  runtime packages as active owners.
- `plans/ACTIVE_PLAN_ARCHIVE_2026-05-04.md` records earlier Core/MCP isolation,
  battle authority, and restore-ledger work.
- `packages/app` still imports `@dnd/core` for character creation and several
  battle/feature UI surfaces.
- Root `battle.qnt`, `character.qnt`, `character-creation.qnt`, and
  `packages/core/src/*mbt*.test.ts` remain restore/proof material unless a
  promoted package has accepted equivalent coverage.
- Legacy Core battle MBT is already opt-in through `RUN_LEGACY_CORE_BATTLE_MBT`
  and `pnpm --filter @dnd/core test:legacy-battle-mbt`; it is not a promoted
  gate.
- `packages/mcp`, `packages/battle-runtime`, and
  `packages/character-creation-runtime` should remain Core-free. If this task
  finds a promoted-runtime Core import, that is a blocker.
- Core still contains projected-vocabulary deletion residue such as
  `projected-*`, `PPR`, `PEA`, and `CPU` references. Ledger those as Core-local
  residue, not as replacement architecture.

## Deliverable Shape

Add or update a concise ledger document with rows:

- Core artifact or import family;
- current consumer;
- promoted owner;
- replacement task;
- proof owner;
- status: promoted, blocked, obsolete, or restore-source-only.

The ledger must name battle reducer replacement explicitly. A character-only
ledger is insufficient.

Recommended categories:

- `app-runtime-consumer`;
- `app-proof-visualizer-consumer`;
- `app-character-creation-consumer`;
- `app-feature-helper-consumer`;
- `root-quint-legacy-proof`;
- `core-mbt-legacy-proof`;
- `core-character-formalization-proof`;
- `projected-vocabulary-deletion-residue`;
- `script-generated-artifact-consumer`;
- `package-config-boundary`.

## Verification

- `rg -n "@dnd/core|packages/core|from \"#/|from '#/" packages plans scripts -S`
- `rg -n "CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent" packages/mcp packages/character-creation-runtime packages/battle-runtime packages/core -S`
- Confirm promoted runtime/MCP packages remain Core-free:
  `rg -n "@dnd/core" packages/mcp/src packages/character-creation-runtime packages/battle-runtime -S`
- Confirm app/Core debt:
  `rg -n "@dnd/core" packages/app/src packages/app/package.json packages/app/tsconfig.json -S`
- Confirm root `battle.qnt`, Core battle MBT, and Core character parity tests
  are classified as legacy/Core restore source only, not promoted gates.
- `pnpm list --depth -1`
- Focused typecheck only if the task edits package manifests or imports.
- No battle MBT.
- `/simplify` convergence, minimum two rounds if the ledger changes follow-up
  task ordering.
