# 12. Opportunity Attack Path Analysis

## Idea

Analyze movement as a path with stepwise threat transitions instead of only as a coarse move event.

## Current Fit In This Repo

- `battle.qnt` already treats OA during movement as a dedicated resolution flow.
- the spec currently abstracts threat membership as caller input instead of full geometry.
- `battle-machine-helpers.ts` and projection tests already work hard around movement, speed, grapples, and OA-blocking effects.

## Application To Our Code

This is the key insight:

The project should not import full spatial simulation, but it should refine its vocabulary for movement interruption.

Useful concepts:

- movement segment
- leave-threat boundary
- processed reactors
- OA checkpoint
- movement truncation after interruption

These concepts already exist informally. Naming them more explicitly would improve both `battle.qnt` and the support code.

## Quint Impact

High. OA is already one of the most interaction-heavy battle flows. Better path vocabulary would make the spec easier to reason about without abandoning the no-grid frontier.

## Domain Language Impact

High. Battle movement terms are currently one of the best candidates for tighter domain language in `battle/DOMAIN.md`.

## Recommendation

Adopt as a domain-language and helper-structure improvement, not as a mandate for concrete geometry. Keep the abstract spatial frontier while making movement interruption semantics more explicit.
