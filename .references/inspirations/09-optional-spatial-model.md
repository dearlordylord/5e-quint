# 09. Optional Spatial Model With Graceful Degradation

## Idea

Treat spatial concerns as optional inputs rather than hard-coupling the engine to a grid.

## Current Fit In This Repo

- `ARCHITECTURE.md` already states that positions, distances, LOS, and cover geometry are outside the formal core.
- `battle.qnt` already models threatened sets and cover values as caller-provided inputs.

## Application To Our Code

This is not a missing feature. It is a validated project choice.

The useful follow-through is documentation discipline:

- always name spatial inputs explicitly
- keep them typed
- keep them caller-supplied
- avoid letting TS helpers smuggle geometry assumptions into the semantic core

## Quint Impact

High as a boundary, but not because it needs change. The important thing is to preserve this frontier.

## Domain Language Impact

Moderate. Terms like `threatenedBy`, `cover`, `attackerWithin5ft`, and `targetCanSeeAttacker` should stay explicit rather than collapsing into vague “position” logic.

## Recommendation

Keep the current architecture. This idea is useful as confirmation, not as a refactor prompt.
