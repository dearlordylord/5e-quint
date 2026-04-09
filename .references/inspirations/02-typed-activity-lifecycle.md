# 02. Typed Activity Lifecycle

## Idea

Represent actions as typed activities with a shared lifecycle instead of as a flat pile of events.

## Current Fit In This Repo

- `packages/core/src/available-actions.ts` already groups actions by type, cost, holes, and outcome.
- `packages/core/src/types.ts` already has strong domain enums for action categories.
- `packages/core/src/machine-guards.ts` and machine events still carry much of the legality and execution vocabulary separately.

## Application To Our Code

The main gap is terminology, not raw capability.

Right now the repo has at least three overlapping ways to talk about actions:

- SRD action-economy terms
- machine event names
- available-action token names

This idea should be applied as a shared action taxonomy:

- attack activity
- spell activity
- reaction activity
- movement activity
- rest activity
- class-feature activity

Each activity should define:

- legality inputs
- costs
- holes
- deterministic outputs
- nondeterministic outcome schema

## Quint Impact

Indirect but useful. A cleaner activity taxonomy would make it easier to see which actions deserve Quint modeling as flow features and which are only TS content projections.

## Domain Language Impact

High. This can reduce drift between `DndEvent`, available-action tokens, and battle-domain vocabulary.

## Recommendation

Adopt at the support-layer boundary:

- one shared action taxonomy
- one shared cost vocabulary
- one shared outcome vocabulary

Do not move action authority out of `battle.qnt`; use the taxonomy to make projections and docs line up with it.
