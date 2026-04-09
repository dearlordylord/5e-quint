# 10. First-Class Resource Consumption

## Idea

Model resource consumption as an explicit typed concept rather than as incidental event handling.

## Current Fit In This Repo

- `battle.qnt` and `creature.qnt` already have many spending helpers: actions, reactions, movement, slots, charges, legendary actions, daily uses.
- `packages/core/src/available-actions.ts` exposes costs, but the vocabulary is still fairly shallow.
- many TS feature bridges encode resource spending implicitly in event sequences.

## Application To Our Code

This is one of the strongest improvement ideas.

The repo already models spending everywhere, but not yet as one domain concept with a shared language. A typed consumption model could unify:

- action economy spending
- slot spending
- charge spending
- per-turn quotas
- immediate spend-then-refund cases
- ready-action upfront spending

This would help the spec because one-slot-per-turn and reaction/action spending are already correctness-critical.

## Quint Impact

High. Explicit consumption vocabulary would clarify several subtle rules:

- spend versus reserve
- spend versus refund
- per-turn quota versus resource pool
- immediate versus deferred consumption

## Domain Language Impact

Very high. Terms like `consume`, `refund`, `reserve`, `quota`, and `cost target` would make current spell and feature rules easier to state precisely.

## Recommendation

Adopt. A first-class consumption model is one of the best ways to improve the battle and creature specs while also simplifying action tokens, feature bridges, and MBT explanations.
