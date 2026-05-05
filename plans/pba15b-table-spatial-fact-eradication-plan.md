# PBA15B Research Plan - Remove Runtime-Owned Spatiality And Distances

Task: PBA15B - Remove Runtime-Owned Spatiality And Distances

Status: researched. This file is planning evidence and implementation guidance
only.

## Decision

Spatiality is table-provided. Promoted battle code, MCP, and legacy Core must not
own coordinates, pairwise distance state, adjacency caches, pathfinding, line of
sight, cover derivation, or area inclusion. They may consume explicit
table/caller/session facts and apply non-spatial rules to them.

Authoritative rule dimensions such as weapon reach, weapon range, spell range,
and spell area radius remain authored content facts. The runtime may expose them
so the table can decide legality, but the runtime must not use them to compute
who is in reach, who is in range, who left reach, or who is inside an area.

Movement budget remains a battle-runtime economy in feet. That is distinct from
owning combatant-to-combatant spatial distance.

## Current Runtime-Owned Spatial Surfaces

- `packages/battle-runtime/src/distances.ts` owns `BattleCombatantDistance`,
  `BattleCombatantDistanceMap`, complete pair validation, a default 5-foot
  initial distance model, and distance clone/set/get helpers.
- `packages/battle-runtime/src/battle-reducer.ts` stores
  `BattleState.combatantDistances`.
- `StartBattleDistanceInput` allows raw or accepted distance inputs and
  `startBattle` initializes distance state.
- Movement fills require `distanceMovedFeet` and `destinationDistances` for
  every other combatant, then mutate the pairwise distance graph.
- Opportunity attacks are derived from old distance within reach and new
  distance outside reach.
- Attack target legality compares pairwise distance to melee reach or ranged
  normal range.
- Help, Grapple, spell target range, AoE affected-target discovery, and Sneak
  Attack adjacent ally checks read the stored distance graph.
- MCP exposes, validates, and projects `combatantDistances`.
- `packages/battle-runtime/battle-runtime.qnt` still models
  `fighterGoblinDistance`, `destinationDistance`, and OA as a distance mutation.
- Legacy Core still has coordinate-derived availability in
  `packages/core/src/available-actions.ts` through `battlePosition` and
  `squaresBetween`, even though root `battle.qnt` and
  `battle-machine-actions-movement.ts` already use caller-provided threatened
  facts.

## Target Shape

- Delete the promoted distance graph instead of replacing it with another
  geometry store.
- `startBattle` accepts combatants and non-spatial encounter facts only. It does
  not accept or default encounter distances.
- Movement fills carry battle-runtime movement cost plus table-provided spatial
  consequences, not destination distances. Opportunity attacks consume a
  table-provided reach-exit/threatened set such as `leftReachOf` or
  `opportunityThreats`.
- Opportunity-attack runtime logic filters table-provided threateners by
  reaction availability, creature lifecycle, incapacitation, Disengage, and
  effects that block opportunity attacks. It does not compare feet.
- Attack and spell target legality consumes table-provided legality/range-band
  facts. Runtime still owns authored reach/range metadata and non-spatial
  mechanics such as disadvantage, reactions, resources, and damage.
- AoE resolution fills carry `affectedTargetIds` supplied by the table. Runtime
  validates participant ids and spell/rule constraints that are not geometry,
  but never computes area membership.
- Grapple, Help, Sneak Attack, Sentinel-like future triggers, and similar
  spatially-triggered mechanics consume explicit table facts. Where runtime must
  verify creature state, side, incapacitation, or resource facts, it still does.
- Grapples do not auto-end from pairwise distance. Spatial separation becomes a
  table/session event or movement consequence.
- Legacy Core coordinate-derived availability is either removed, quarantined as
  restore-source only, or rewritten to consume explicit table facts before Core
  deletion work.

## Implementation Slices

1. Promote table spatial fact vocabulary in `@dnd/battle-runtime`.
   Define narrow fill/fact types for movement reach-exit, attack target spatial
   legality, spell target spatial legality, AoE affected targets, Help proximity,
   Grapple reach, and adjacent-ally facts. Make invalid states unrepresentable:
   do not carry both raw distances and table-derived facts.

2. Remove start-battle and state-owned distances.
   Delete `distances.ts`, `BattleState.combatantDistances`,
   `StartBattleDistanceInput`, initial distance validation, distance snapshot
   projection, and output schema fields.

3. Rewrite movement and opportunity attacks.
   Replace `distanceMovedFeet`/`destinationDistances` with movement cost plus
   table-provided reach-exit facts. Preserve movement budget and grapple drag
   cost semantics without deriving from geometric distance; the table-supplied
   movement cost is the executable boundary fact.

4. Rewrite target and area legality.
   Replace `combatantWithinFeet`, `combatantsWithinFeet`, and direct
   `combatantDistanceFeetFromDistances` checks with the new table facts. This
   includes Help, Grapple, attack target legality, spell target range, AoE
   affected targets, and Sneak Attack adjacent ally.

5. Update MCP.
   Remove `combatantDistances` from `start_battle` input and battle-state output.
   Update fill schemas and tool descriptions so MCP asks the caller/table for
   explicit spatial facts instead of pairwise distances or area choices derived
   by the runtime.

6. Update package-local QNT and tests.
   Bring `packages/battle-runtime/battle-runtime.qnt` to the same model as root
   `battle.qnt`: movement receives a caller/table reach-exit fact. Rewrite
   runtime and MCP tests that currently assert stored distances,
   `destinationDistances`, and runtime-generated `areaChoices`.

7. Quarantine or remove legacy Core spatial derivation.
   Remove `squaresBetween`/`battlePosition` availability derivations from
   production paths if those paths still execute. If a path remains only as
   restore-source material, mark it clearly so no new work depends on it.

8. Audit downstream plans.
   Remove or rewrite stale "table-supplied distance" language in later PBA/MCP
   plans. Downstream tasks should depend on table-provided legality facts,
   range-band facts, reach-exit facts, and affected-target allocations, not on
   target distances or distance-from-primary facts.

## Acceptance

- No production promoted battle-runtime state stores pairwise combatant
  distances or coordinates.
- No promoted runtime or MCP code computes adjacency, reach exit, target range,
  or AoE area membership from combatant geometry.
- Movement, OA, Help, Grapple, attack targeting, spell targeting, AoE, and Sneak
  Attack consume table-provided spatial facts where spatial legality is needed.
- Authored reach/range/radius facts remain content metadata, not runtime
  geometry ownership.
- Legacy Core production availability no longer derives geometry, or remaining
  derivations are explicitly quarantined for restore/deletion work.
- Docs in `ARCHITECTURE.md`, `packages/battle-runtime/README.md`,
  `packages/battle-runtime/ARCHITECTURE_GRAPH.md`, MCP docs, and linked plan
  files describe the table-spatial-fact boundary consistently.
- Later active plans do not instruct implementers to pass target distances,
  destination distances, distance-from-primary facts, or runtime-computed area
  choices as the replacement for geometry.

## Verification Suggestions

- RAW/UL check for Opportunity Attacks, Reach, Help, Grappling, movement cost,
  attack range, and every spell/feature touched by target/area rewrites.
- `pnpm --filter @dnd/battle-runtime typecheck`
- `pnpm --filter @dnd/battle-runtime test`
- `pnpm --filter @dnd/mcp typecheck`
- `pnpm --filter @dnd/mcp test`
- Focused Core tests only if legacy Core production availability paths are
  edited.
- Use the smallest promoted MBT tier needed after the package-local QNT rewrite.
  Do not run battle MBT for research-only cleanup.
- `/simplify` convergence, minimum two rounds.
