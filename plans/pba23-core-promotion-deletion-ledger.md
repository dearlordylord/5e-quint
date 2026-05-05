# PBA23 Core Promotion Deletion Ledger

Task: PBA23 - Core Promotion Deletion Ledger
Status: complete ledger, source-only; no Core deletion performed.

## Scope

This ledger classifies the remaining reasons `@dnd/core` exists after PBA22.
It is intentionally broader than character creation: it covers live app imports,
Core battle reducer replacement, root Quint lanes, Core MBT/parity tests,
scripts, package metadata, and stale restore/source material.

PBA23 does not change promoted runtime behavior. The deletion cutover belongs to
PBA27 after app character and battle consumers have moved or been intentionally
quarantined.

## Inventory Summary

- Live production package consumer: `@dnd/app`.
- Promoted packages checked: `@dnd/mcp`, `@dnd/battle-runtime`, and
  `@dnd/character-creation-runtime` have no source imports of `@dnd/core`.
- Active package metadata keeping Core in the workspace graph:
  `packages/app/package.json`, `packages/app/tsconfig.json`, root
  `package.json`, `pnpm-workspace.yaml`, and `packages/core/package.json`.
- Root `battle.qnt`, `creature.qnt`, `character.qnt`,
  `character-creation.qnt`, and Core MBT/parity tests are legacy/Core proof or
  restore-source material, not promoted gates.
- Remaining `projected-*`, `PPR`, `PEA`, and `CPU` hits are Core-local residue
  or a known false positive in `PHASE1_WEAPON_SPEAR_UNIT_ID`; they must not be
  restored as promoted architecture.
- `plans/phase0-core-deletion-restore-audit.md` still contains historical
  `packages/mcp/src/legacy-core/**` and `packages/mcp/src/green/**` references.
  Those paths are stale for current-head inventory; this ledger uses current
  `packages/mcp/src/**` files as the active MCP evidence.

## Deletion Ledger

| Category | Core artifact or import family | Current consumer | Promoted owner | Replacement task | Proof owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| app-runtime-consumer | `@dnd/core/machine.ts`, `machine-types.ts`, `machine-helpers.ts`, `machine-queries.ts`, `types.ts` | `packages/app/src/components/App.tsx`, `EventPanel.tsx`, `StatePanel.tsx`, `TransitionLog.tsx` | No promoted app session owner yet; future character sheet/session boundary | PBA26 | Future app/session tests plus promoted package tests | active app debt |
| app-feature-helper-consumer | `@dnd/core/features/feature-bridge.ts`, `feature-store.ts`, class feature helpers, `class-tables.ts` | `packages/app/src/features/*`, `FeaturePanel.tsx`, `MonkPanel.tsx`, `PaladinPanel.tsx`, `RoguePanel.tsx` | `@dnd/surface` Unit facts plus `@dnd/character-creation-runtime` retained choices and `@dnd/battle-runtime` support profiles | PBA25, then PBA24 for Cunning Action workaround removal | Character-creation runtime tests, battle-runtime support-profile tests, app tests | blocked restore work |
| app-character-creation-consumer | `character-domain.ts`, `character-ability-scores.ts`, `character-sheet-derived.ts`, `features/spell-registry.ts`, `features/class-tables.ts`, `types.ts` | `packages/app/src/components/character-creation/**` | `@dnd/character-creation-runtime` for Draft/Hole/Fill/Build, `@dnd/surface` for authored records/readers, `@dnd/shared-algebras` for progression algebra | PBA25 and PBA26 | Character-creation runtime QNT/MBT and package tests, app character workflow tests | blocked restore work |
| app-battle-view-consumer | `battle-scene/layout.ts`, visual scene types, dice/director/narration helpers | `packages/app/src/battle-scene/**`; active `/battle` still imports Core layout even though it uses promoted `BattleSnapshot` state | `@dnd/app` visual layer over `@dnd/battle-runtime` snapshots, or a promoted visual helper package if one is accepted | PBA27 unless a narrower app cleanup task is inserted | App route/projection tests and battle-runtime snapshot tests | active app debt |
| app-proof-visualizer-consumer | `battle-machine.ts`, `machine.ts`, Core scene replay/diff/director helpers | `/machines`, `/machine-viz`, `/embed/machine-viz`; old `/trace` routes now point at a promoted placeholder | No production runtime owner; future promoted trace/debug viewer should consume battle-runtime/MCP evidence | PBA27 or a later trace/debug viewer task | Future promoted trace viewer tests only if restored | restore-source-only |
| battle-reducer-replacement | `packages/core/src/battle-machine.ts`, `battle-machine-types.ts`, `battle-machine-actions-*`, `battle-machine-helpers.ts`, `battle-machine-creature.ts`, `battle-spell-access.ts`, `monster-catalog*`, `battle-ready-types.ts` | Core package tests, app legacy battle visualizer/proof tools | `@dnd/battle-runtime` owns `BattleState`, `BattleCreatureState`, subjects, replay fills, reactions, snapshots, and package-local `battle-runtime.qnt` | PBA27 for deletion/quarantine; PBA29 for pending multiattack dispatch tightening after PBA28 | `packages/battle-runtime/battle-runtime.qnt`, `src/battle-runtime.mbt.test.ts`, package tests | promoted for supported subset; restore-source-only for old-only breadth |
| battle-reducer-old-only-width | Counterspell chains, broad spell stack, Shield/Parry/Cutting Words/Redirect/Deflect/retaliation lanes, generic save/AoE/traversal spells, broad Ready spell release, legendary resistance/action breadth, remaining Rage/Reckless width, old zero-HP handoff details | Core battle reducer and root `battle.qnt` | Reusable SRD procedure families in `@dnd/battle-runtime`; MCP/session owns handoff facts where appropriate | PBA27 must reconcile or defer before deletion; PBA29 follows proof consolidation | Battle-runtime package-local QNT/tests for promoted rows; old Core MBT remains reference only | blocked restore work |
| root-quint-legacy-proof | `battle.qnt`, `creature.qnt`, `battleTraversalTest.qnt`, `dndTest.qnt`, `surface-runtime-correction-initiative.qnt` | Core MBT, invariant fuzz, QA generator, docs | `packages/battle-runtime/battle-runtime.qnt`, `packages/character-creation-runtime/*.qnt`, shared algebra proofs | PBA27/PBA28 | Package-local promoted QNT/MBT; root specs retained only as restore references until deleted/quarantined | restore-source-only |
| core-character-formalization-proof | `character.qnt`, `character-creation.qnt`, `character-creation-spell-data.qnt`, Core character parity tests | `packages/core/src/character-*quint-parity.test.ts`, Core character tests, spell data generator | `@dnd/character-creation-runtime`, `@dnd/surface`, `@dnd/shared-algebras` progression algebra | PBA25/PBA26; PBA28 for proof consolidation | Character-creation runtime QNT/MBT and package tests | restore-source-only until app/session migration completes |
| core-mbt-legacy-proof | `battle-machine.mbt.test.ts`, `battle-projection.mbt.test.ts`, `creature.mbt.test.ts`, `mbt-*`, `test-fixtures/battle-mbt-local/**` | `@dnd/core` only; battle MBT is opt-in through `RUN_LEGACY_CORE_BATTLE_MBT` | Promoted runtime package MBT/QNT where behavior is supported | PBA27/PBA28 | `@dnd/battle-runtime` and `@dnd/character-creation-runtime` package MBT/tests | restore-source-only |
| core-character-runtime | `character-domain*`, `character-sheet-*`, `character-ability-scores.ts`, `character-equipment*`, `character-proficiencies.ts`, `character-spellcasting*`, `character-resources.ts` | App character creation and Core tests | `@dnd/character-creation-runtime` plus `@dnd/surface` and `@dnd/shared-algebras` | PBA25/PBA26 | Character-creation runtime proof/tests | blocked restore work |
| core-feature-helper-runtime | `packages/core/src/features/**` and feature bridge/store files | App feature panels and Core tests | `@dnd/surface` authored Units/readers, battle-runtime support profiles, character-creation retained Unit choices | PBA25 and PBA24 | Surface reader tests, battle-runtime support-profile tests, character-creation tests | blocked restore work |
| core-monster-catalog-runtime | `monster-catalog*`, `monster-types.ts`, old `StatBlock` TS mirror | Core battle reducer/tests; old app battle visualizer | `@dnd/surface` SRD Stat Block collection plus `@dnd/battle-runtime` stat-block init/support profiles | PBA27; PBA29 for action dispatch tightening | Surface catalog tests and battle-runtime tests | promoted for current runtime subset; restore-source-only for old fixtures |
| projected-vocabulary-deletion-residue | `projected-action-bridge*`, `projected-persistent.ts`, `ActiveProjectedPersistent`, `PPR*` tests/comments | Core-only callers/tests | No promoted owner; model procedure facts directly in Surface/runtime package boundaries | PBA27 deletion/quarantine | None beyond replacement package tests | deletion residue |
| script-generated-artifact-consumer | `scripts/generate-character-creation-spell-data.ts` imports Core spell/class data and writes `packages/core/src/character-spellcasting-data.ts`; `scripts/compile-battle-spec.cjs` compiles root `battle.qnt`; `scripts/invariant-fuzz.sh` runs root `battle.qnt`; `scripts/qa/**` reads `creature.qnt` | Root scripts and Core-local generated artifacts | Surface/character-creation runtime data generation if still needed; battle-runtime package-local QNT for promoted battle | PBA27/PBA28 | Package-local promoted tests; QA pipeline remains separate and may have baseline failures | restore-source-only |
| package-config-boundary | `packages/app/package.json` dependency on `@dnd/core`; `packages/app/tsconfig.json` path alias; root `lint`/`circular` scripts filter `@dnd/core`; `pnpm-workspace.yaml` includes `packages/core`; `packages/core/package.json` package identity/scripts | Workspace/package manager | No direct owner; deletion cutover removes after consumers are gone | PBA27 | `pnpm why @dnd/core -r`, import searches, workspace typecheck/test after manifest edits | blocked deletion boundary |
| generated-research-residue | `scripts/content-surface-survey/results-srd/**/*.json` mentions `packages/core`, root QNT, and historical intended flows | Generated survey output only | None; do not treat generated survey prose as active architecture | PBA27 may archive/delete with script outputs if desired | None | obsolete |
| ralph-harness-noise | `scripts/ralph-dual-run.*` mentions `packages/core/node_modules`; Ralph task worktrees also stub fuzz scripts | Ralph orchestration/harness, not product runtime | Ralph harness owner outside product architecture | none for product plan | Ralph harness tests, outside this task | obsolete for Core deletion planning |

## Replacement Notes

Battle reducer replacement is not a single character-creation problem. The old
Core battle reducer is replaced by `@dnd/battle-runtime` only for the promoted
subset already admitted by support profiles and package-local proof. Old-only
breadth remains restore-source material or blocked restore work until PBA27
classifies each row as promoted, deferred, or obsolete. Deleting Core before
reconciling those rows would erase source knowledge for reaction stacks, broad
spell families, monster controls, and old zero-HP handoff behavior.

The active app `/battle` route is partially promoted: it consumes
`@dnd/battle-runtime` snapshots but still imports Core battle-scene layout
helpers. That is app visual debt, not evidence that Core remains the promoted
battle authority.

The app `/trace` and `/embed/trace` routes now render a promoted placeholder.
Core-backed trace replay code still exists under the machine visualizer and
legacy battle visualizer files, but it should be treated as restore/debug
material unless a future promoted trace viewer is planned.

## Verification Evidence

Commands run during the ledger pass:

```sh
rg -n "@dnd/core|packages/core|from \"#/|from '#/" packages plans scripts -S
rg -n "CPU|PEA|PPR|projected-executable|projected-compiler|projected-action-bridge|projected-persistent" packages/mcp packages/character-creation-runtime packages/battle-runtime packages/core -S
rg -n "@dnd/core" packages/mcp/src packages/character-creation-runtime packages/battle-runtime -S
rg -n "@dnd/core" packages/mcp/src packages/character-creation-runtime/src packages/battle-runtime/src -S
rg -n "@dnd/core" packages/app/src packages/app/package.json packages/app/tsconfig.json -S
rg -n '"@dnd/core"|@dnd/core|packages/core|--filter @dnd/core|cd packages/core' package.json pnpm-workspace.yaml turbo.json packages/*/package.json packages/*/tsconfig.json scripts -S
pnpm list --depth -1
```

Observed results:

- Promoted-runtime/MCP source files have no `@dnd/core` imports. Broad checks
  over `packages/battle-runtime` find documentation mentions only.
- `packages/app` has 45 source files importing `@dnd/core`, plus app package
  dependency and tsconfig alias entries.
- The old projected-vocabulary check finds Core-local projected modules/tests
  and the known `PHASE1_WEAPON_SPEAR_UNIT_ID` false positive in
  `@dnd/character-creation-runtime`; no promoted projected executable
  dependency was found.
- `pnpm list --depth -1` completed successfully with no output in this
  workspace.
- Two focused simplify review passes converged: the first fixed the stale-audit
  note and app import count, and the second found no remaining ledger coverage
  issue.

No package manifests or imports changed, so no typecheck/test command was
required for this source-only ledger. No old Core battle MBT was run.
