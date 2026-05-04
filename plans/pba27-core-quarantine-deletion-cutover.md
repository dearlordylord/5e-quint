# PBA27 Research Plan - Core Quarantine And Deletion Cutover

Task: PBA27 - Core Quarantine And Deletion Cutover

Status: draft research plan.

## Purpose

Perform the final Core removal gate after promoted character creation, MCP/app
workflows, and battle-runtime restoration have enough coverage. This task should
not start until the Core Promotion Deletion Ledger has no production blockers
and any intentionally omitted behavior is recorded as obsolete or restore-source
only. PBA23 owns the broad research ledger; this task executes the approved
quarantine/deletion plan and reconciles only facts that changed after that
ledger was written.

## Research Scope

- Confirm no production package depends on `@dnd/core`.
- Confirm old Core battle reducer/machine behavior is either promoted through
  `@dnd/battle-runtime`, explicitly deferred in a restore ledger, or obsolete.
- Reconcile stale restore-ledger rows before deletion, using PBA23 as the
  source of truth. Current evidence says several previously blocked rows now
  have promoted or partial promoted coverage, while the broad "Old Core battle
  machine" row is too coarse for a final deletion gate.
- Confirm old Core character-domain behavior is either promoted through Surface
  and `@dnd/character-creation-runtime`, explicitly deferred, or obsolete.
- Confirm root Quint/Core MBT artifacts are no longer active gates.
- Remove or quarantine package scripts and workspace entries that keep Core in
  the active build/test path.
- Confirm app is no longer a Core consumer. Current evidence says `@dnd/app` is
  the only live package dependency on `@dnd/core`, with broad source imports and
  Core aliases in `packages/app/tsconfig.json`.
- Decide the fate of Core-only scripts such as `mbt-fuzz*.sh`,
  `compile-battle-spec.cjs`, invariant fuzz scripts over root `battle.qnt`, and
  `scripts/generate-character-creation-spell-data.ts`.

## Battle Reducer Deletion Blockers To Reconcile

Before cutover, the PBA23 ledger or follow-up tasks must classify these Core
battle reducer areas as promoted, explicitly deferred, or obsolete:

- Counterspell chain and broad reaction spell stack.
- Broad hit/damage/after-damage reactions such as Shield, Parry, Cutting Words,
  Redirect, Deflect, and retaliation/reactive-effect lanes.
- Broad spell families: save spells, Concentration checks, AoE,
  traversal-save effects, Bonus Action spells, Ready spell release, and
  split-target Magic Missile.
- Monster breadth: Multiattack, Stat Block Bonus Actions, long-range
  Disadvantage, and conditional attack riders.
- Legendary Resistance and save-failed reaction handling.
- Nonlethal melee Knock Out.
- Remaining Rage/Reckless Attack width not already promoted.
- Broad zero-HP recovery/handoff facts that belong to MCP/session rather than
  battle reducer state.

## Expected Implementation Direction

- Delete or move Core production imports first.
- Remove `@dnd/core` from app package metadata and Core path aliases.
- Then remove package-level dependencies, workspace discovery, and root scripts
  that explicitly filter `@dnd/core`.
- Then quarantine/delete old Core tests and proof material according to the
  ledger.
- Keep local SRD corpus, Surface, promoted runtime specs, and promoted package
  tests as the active proof path.
- Update README/architecture docs that still present old `creature.qnt` plus
  XState Core as the main project path.

## Verification

- `rg -n "@dnd/core|packages/core|from \"#/|from '#/" packages package.json pnpm-workspace.yaml turbo.json -S`
- `rg -n "@dnd/core" packages/app/src packages/app/package.json packages/app/tsconfig.json -S`
- `pnpm why @dnd/core -r` returns no dependents.
- Root `package.json` has no active `--filter @dnd/core` scripts.
- `rg -n "packages/core|cd packages/core|test:legacy-battle-mbt|battle-projection\\.mbt|creature\\.mbt|battle-machine\\.mbt" package.json packages scripts README.md AGENTS.md -S`
- `pnpm install --lockfile-only` only if package manifests change.
- `pnpm typecheck` or package-equivalent workspace typecheck.
- `pnpm test` or documented package subset if full workspace remains expensive.
- Promoted package checks for Surface, character-creation-runtime,
  battle-runtime, MCP, and app.
- No legacy Core MBT as a gate.
- `/simplify` convergence, minimum two rounds.
