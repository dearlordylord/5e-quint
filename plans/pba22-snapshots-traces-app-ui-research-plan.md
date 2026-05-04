# PBA22 Research Plan - Battle Snapshots, Traces, And App UI

Task: PBA22 - Stabilize Battle Snapshots Traces And App UI

Status: pre-researched. This file is planning evidence and implementation guidance only.

## Research Inputs

- RAW lens: mostly no new D&D rule behavior. RAW is implicated only if UI derives rule labels instead of displaying runtime outcomes.
- Ubiquitous-language lens: user-facing battle terms in snapshots, traces, narration, and reaction choices.
- Architecture lens: Restore Ledger app rows, promoted runtime/MCP snapshot contracts, app Core battle UI, and trace visualizer paths.

## RAW Anchors

- PBA22 should usually preserve already-modeled runtime facts rather than model new rules.
- If UI computes "Save!" or "Fail!" by comparing roll total to DC, that display semantic traces to D20 Tests and Saving Throw DCs in `.references/srd-5.2.1/Playing-the-Game.md`.
- A cleaner promoted UI can avoid RAW recomputation by consuming runtime-provided outcomes.

## Ubiquitous Language Findings

- UI and old Core scene code still leak `Pass`/`Skip`; canonical reaction choice language is **Decline**.
- "Concentration check" / "Conc Check" should be **Concentration Saving Throw** or Constitution saving throw for Concentration.
- `Off-Hand Attack` conflicts with the repo's Holding/Wielding guidance. The Light property Bonus Action attack wording is closer.
- `KO!` and "Non-lethal" should become **Knock Out** where shown to users.
- Runtime snapshot `defeated` currently means `hp === 0`, which collapses dead, Unconscious, Stable, and death-save lifecycle. A stable public snapshot contract should expose explicit lifecycle facts or make `defeated` a display-only derived label.
- "Save" can remain shorthand in compact UI, but stable trace/snapshot labels should prefer "Saving Throw" where space allows.

## Architecture Findings

- Relevant files:
  - `packages/battle-runtime/src/index.ts`
  - `packages/mcp/src/battle-tool-output.ts`
  - `packages/mcp/src/battle-state-projection.ts`
  - `packages/mcp/src/battle-tools.ts`
  - `packages/app/src/battle-scene/BattlePage.tsx`
  - `packages/app/src/battle-scene/BattleInspector.tsx`
  - `packages/core/src/battle-scene/scene-snapshot.ts`
  - `packages/core/src/battle-scene/snapshot-diff.ts`
  - `packages/core/src/battle-scene/director.ts`
  - `packages/app/src/components/trace-visualizer/trace-replay.ts`
  - `packages/app/src/components/trace-visualizer/TraceVisualizer.tsx`
- Runtime `BattleSnapshot` already contains more facts than the MCP output schema exposes. MCP encoding can become the effective public contract and accidentally drop fields.
- App battle scene still consumes Core battle-machine and Core battle-scene helpers. Those are Restore Ledger reference material, not promoted contract sources.
- Trace visualizer rows are currently single-creature Quint-vs-XState comparisons. Promoted battle-runtime traces need multi-combatant battle snapshots plus holes/fills/results.
- `battleStateProjection` and `snapshotBattle` expose overlapping facts; UI should not choose the state projection for display facts that belong to the stable snapshot contract.

## Suggested Implementation Shape

- A stable UI-facing read model could derive from promoted `BattleSnapshot` plus retained Surface/catalog display metadata.
- MCP and app could share an exported schema/type for the promoted battle snapshot instead of maintaining a parallel MCP subset.
- A smaller app scene snapshot could be a deterministic projection from that public snapshot.
- Coordinates, sprites, and labels could remain display metadata, while HP, turn, resources, holes, pending reactions, movement, conditions, and lifecycle facts remain runtime projections.
- Trace rows could shift from old creature-machine fields to expected promoted battle-runtime/QNT snapshot versus runtime snapshot, with each step tied to subject/fill/result sequences.
- Old Core battle scene code can remain reference material for layout, cues, narration, and screenshot expectations, but not as contract source.
- A shared battle display vocabulary helper could own reaction labels, act labels, and narration terms for MCP snapshots, traces, and React UI.

## Verification Suggestions

- App checks:
  - `pnpm --filter @dnd/app typecheck`
  - focused app tests for snapshot projection and UI views.
- Contract checks:
  - MCP/runtime tests asserting encoded MCP `snapshot` contains every field the UI depends on.
- Visual checks:
  - Playwright screenshots for promoted battle page/embed views, trace/table views, and pending reaction/hole states after the UI exists.
- No battle MBT unless runtime semantics change.
- `/simplify` convergence remains required.
