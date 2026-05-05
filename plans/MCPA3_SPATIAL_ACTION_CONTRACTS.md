# MCPA3 — Spatial Action Public Contracts

## Purpose

Define the bounded public contracts for `BATTLE_HELP_ATTACK` and `BATTLE_MOVE`
over explicit table/caller/session-supplied spatial facts.

## Non-Goal

Core, battle, and MCP do not gain pathfinders or persistent map models. Geometry
always comes from the table.
This remains aligned with [MOVEMENT_GEOMETRY_OWNERSHIP.md](./MOVEMENT_GEOMETRY_OWNERSHIP.md).
Table/caller/session code supplies spatial relations; battle consumes those facts
and applies mechanical consequences.

## RAW Anchors

- `Help [Action]` in `.references/srd-5.2.1/Rules-Glossary.md`: the helper
  distracts an enemy "within 5 feet of you," granting Advantage to the next
  allied attack roll against that enemy until the start of the helper's next
  turn.
- `Opportunity Attacks` in `.references/srd-5.2.1/Playing-the-Game.md`: a
  creature can make one melee attack with a weapon or an Unarmed Strike when a
  creature it can see leaves its reach, unless an exception such as Disengage
  applies.
- `Movement` in `.references/srd-5.2.1/Playing-the-Game.md`: movement is spent
  incrementally and may be broken up; difficult terrain and grapple dragging
  change movement cost.

## Contract: `BATTLE_HELP_ATTACK`

### Public Token

```typescript
{
  scope: "battle";
  actorId: string;
  type: "BATTLE_HELP_ATTACK";
  allyId: Hole<string>;
  targetId: Hole<string>;
  cost: ResourceCost;
  outcome: OutcomeDescription;
}
```

### Execute-Time Session Fact Surface

```typescript
{
  helperWithin5ftOfTarget: boolean;
}
```

### Ownership Boundary

- Caller/session owns `allyId` and `targetId`; the table/caller/session supplies
  the single proximity fact
  `helperWithin5ftOfTarget`.
- Battle owns action availability, dead/incapacitated checks, distinct/alive
  participant validation, help-target tracking, expiry at the helper's next
  turn, and consumption by the first qualifying attack.
- Core, battle, and MCP do not derive helper-target distance.

## Contract: `BATTLE_MOVE`

### Public Token

```typescript
{
  scope: "battle";
  actorId: string;
  type: "BATTLE_MOVE";
  cost: ResourceCost;
  outcome: OutcomeDescription;
}
```

Each public move token represents one table-supplied movement segment/checkpoint
with an explicit movement cost, not a pathfinding request or persistent
destination model. A 5-foot checkpoint is one valid grid-table convention, not a
runtime-owned movement unit.

### Execute-Time Session Fact Surface

```typescript
{
  movementCostFeet: number;
  provocationKind:
    | "provokesOpportunityAttacks"
    | "doesNotProvokeOpportunityAttacks";
  opportunityThreats: ReadonlyArray<{
    reactorId: string;
    canSeeMoverLeavingReach: true;
    leftReachOfAtLeastOneLegalOpportunityAttack: true;
  }>;
}
```

### Ownership Boundary

- The table/caller/session supplies movement cost and reach-exit classification
  for that segment: whether the movement can provoke Opportunity Attacks, and
  which reactors can see the mover leave reach for at least one legal OA attack
  option. `doesNotProvokeOpportunityAttacks` includes table-adjudicated causes
  such as teleportation or movement that does not use the creature's movement,
  action, Bonus Action, Reaction, or Speed.
- Battle owns movement-budget spend, dead/incapacitated gating, Disengage
  suppression, and filtering the supplied opportunity threats against
  battle-owned OA eligibility such as reaction availability and effects that
  block Opportunity Attacks. Grapple drag/carry cost is represented in the
  table-supplied total movement cost; battle validates budget spend rather than
  recomputing geometric distance moved.
- Core, battle, and MCP do not derive coordinates, path traces, terrain geometry, or
  persistent adjacency/reach caches.

## Opportunity Attack Follow-Up

`BATTLE_MOVE` may still open battle-driven OA follow-up tokens after dispatch.
MCPA3 settles only the public movement contract and the ownership boundary for
the movement-step facts above. The exact public/runtime shape for
`BATTLE_MOVEMENT_OA_ATTACK` remains future work and should be finalized in the
implementation slice that actually wires those reaction tokens.

## Summary

- `BATTLE_HELP_ATTACK` stays bounded to `allyId`, `targetId`, and one explicit
  helper-target proximity fact.
- `BATTLE_MOVE` stays bounded to one table-supplied movement segment/checkpoint
  plus explicit movement-cost and Opportunity Attack threat facts for that
  segment.
- Geometry ownership remains at the table, outside core, battle, and MCP.
