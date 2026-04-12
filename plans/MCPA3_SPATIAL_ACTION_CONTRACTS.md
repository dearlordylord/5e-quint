# MCPA3 — Spatial Action Public Contracts

## Purpose

Define the bounded public contracts for `BATTLE_HELP_ATTACK` and `BATTLE_MOVE`
over explicit caller/session-owned spatial facts.

## Non-Goal

Core and MCP do not gain a geometry owner, pathfinder, or persistent map model.
This remains aligned with [MOVEMENT_GEOMETRY_OWNERSHIP.md](./MOVEMENT_GEOMETRY_OWNERSHIP.md).
Caller/session code owns spatial relations; battle consumes those facts and
applies mechanical consequences.

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

- Caller/session owns `allyId`, `targetId`, and the single proximity fact
  `helperWithin5ftOfTarget`.
- Battle owns action availability, dead/incapacitated checks, distinct/alive
  participant validation, help-target tracking, expiry at the helper's next
  turn, and consumption by the first qualifying attack.
- Core/MCP do not derive helper-target distance.

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

Each public move token represents one 5-foot movement checkpoint, not a
pathfinding request or persistent destination model.

### Execute-Time Session Fact Surface

```typescript
{
  provocationKind:
    | "provokesOpportunityAttacks"
    | "doesNotProvokeOpportunityAttacks";
  threatened: ReadonlyArray<string>;
}
```

### Ownership Boundary

- Caller/session owns the reach-exit classification for that 5-foot checkpoint:
  whether the move provokes, and which threatening creatures' reach is being
  left on that checkpoint.
- Battle owns movement-budget spend, dead/incapacitated gating, grapple-drag
  extra cost, Disengage suppression, and filtering the threatened set against
  battle-owned OA eligibility such as reaction availability.
- Core/MCP do not derive coordinates, path traces, terrain geometry, or
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
- `BATTLE_MOVE` stays bounded to one 5-foot checkpoint plus explicit
  provocation/threat facts for that checkpoint.
- Geometry ownership remains outside core and MCP.
