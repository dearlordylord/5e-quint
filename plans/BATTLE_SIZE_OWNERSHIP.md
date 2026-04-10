# Battle Size Ownership

Date: 2026-04-10

## Context

`BATTLE_GRAPPLE` currently carries `attackerSize` and `targetSize` directly in the event payload. That keeps the battle machine behavior testable, but it makes Size a caller-owned runtime fact even though Size is a stable creature/stat-block fact.

Task 18 in [MCP_EVENT_SURFACE_AUDIT.md](./MCP_EVENT_SURFACE_AUDIT.md) and Task 22 in [MCP_EVENT_SURFACE_COMPLETION_PLAN.md](./MCP_EVENT_SURFACE_COMPLETION_PLAN.md) should keep `BATTLE_GRAPPLE` blocked for public `get_available_actions` exposure until battle owns creature Size.

## Current Ownership

- `creature.qnt` owns `CreatureConfig.creatureSize`.
- `monster-types.ts` owns monster `creatureSize`.
- `machine-combat.ts` already owns the TS Size helpers: `withinOneSize`, `targetTwoSizesSmaller`, and `resolveGrapple`.
- `battle.qnt` does not store Size on `Combatant`; `doGrapple` nondeterministically chooses `attackerSize` and `targetSize`.
- `BattleCreatureState` does not store Size.
- `InitCreatureConfig` does not accept Size.
- `BATTLE_GRAPPLE` requires `attackerSize` and `targetSize` in the event payload.

## Proposed Direction

Make Size a battle-owned combatant fact:

- Add `creatureSize: Size` to `BattleCreatureState`.
- Add optional `creatureSize?: Size` to `InitCreatureConfig`, defaulting to `"medium"` for PCs and to the monster/stat-block size when the battle init path has that source available.
- Add the matching `creatureSize` field to the MCP `BATTLE_INIT` creature schema if battle initialization remains the public source of combatant configuration.
- Update `battleInit` to store the field.
- Update `BATTLE_GRAPPLE` so it no longer accepts `attackerSize` or `targetSize`; derive both from `BattleCreatureState`.
- Mirror the same ownership in `battle.qnt` by storing Size on combatants and deriving grapple legality from combatant state, not nondet event payloads.

## Why This Fits The MCP Surface Plan

This is not an MCP endpoint by itself, but it blocks a safe MCP surface for `BATTLE_GRAPPLE`. Without this cleanup, a public grapple action would need to accept `attackerSize` and `targetSize`, which would duplicate stable creature/stat-block state in the command payload.

This is not required for `BATTLE_RELEASE_GRAPPLE` or `BATTLE_ESCAPE_GRAPPLE`, because those actions use existing grapple links and do not need Size. It can proceed independently as a domain cleanup before exposing `BATTLE_GRAPPLE`.

## Why This Is Parallel-Safe

It may conflict with work that edits:

- `packages/core/src/battle-machine-types.ts`
- `packages/core/src/battle-machine-events.ts`
- `packages/core/src/battle-machine-actions-turn.ts`
- `packages/core/src/available-actions.ts`
- `battle.qnt`
- battle MBT projection files

If another worktree is focused on Task 19 release/escape grapple only, this audit note should not conflict. If another worktree starts Task 22 or direct grapple implementation, coordinate before implementing the state migration.

## Verification For Implementation

- Focused battle scenario tests for size-blocked and size-allowed grapples.
- `pnpm --filter @dnd/core typecheck`
- `pnpm --filter @dnd/core test -- src/battle-rules-scenarios.test.ts`
- Tier 1 battle MBT only after the Quint and bridge changes are complete.
